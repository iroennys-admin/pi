import type { AgentTool } from "@iroennys/iropi-agent-core";
import { Text } from "@iroennys/iropi-tui";
import { type Static, Type } from "typebox";
import type { Theme } from "../../modes/interactive/theme/theme.ts";
import type { ToolDefinition, ToolRenderResultOptions } from "../extensions/types.ts";
import { getTextOutput, invalidArgText, str } from "./render-utils.ts";
import { wrapToolDefinition } from "./tool-definition-wrapper.ts";

const webSearchSchema = Type.Object({
	query: Type.String({ description: "Consulta de búsqueda" }),
	numResults: Type.Optional(
		Type.Number({ description: "Número de resultados a devolver (por defecto: 10)", default: 10 }),
	),
});

export type WebSearchToolInput = Static<typeof webSearchSchema>;

export interface WebSearchToolDetails {
	resultCount?: number;
	truncated?: boolean;
}

export interface WebSearchToolOptions {
	/** Custom fetch function for testing or proxying */
	fetchFn?: typeof fetch;
}

const SEARCH_TIMEOUT_MS = 30_000;
const DEFAULT_NUM_RESULTS = 10;

type WebSearchRenderState = {
	startedAt: number | undefined;
	endedAt: number | undefined;
};

function formatWebSearchCall(args: { query?: string; numResults?: number } | undefined, theme: Theme): string {
	const query = str(args?.query);
	const numResults = args?.numResults;
	const invalidArg = invalidArgText(theme);
	const queryDisplay = query === null ? invalidArg : query ? `"${query}"` : theme.fg("toolOutput", "...");
	let text = theme.fg("toolTitle", theme.bold("web_search")) + " " + theme.fg("accent", queryDisplay);
	if (numResults !== undefined && numResults !== DEFAULT_NUM_RESULTS) {
		text += theme.fg("muted", ` (${numResults} resultados)`);
	}
	return text;
}

function formatWebSearchResult(
	result: {
		content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
		details?: WebSearchToolDetails;
	},
	options: ToolRenderResultOptions,
	theme: Theme,
	showImages: boolean,
): string {
	const output = getTextOutput(result, showImages).trim();
	let text = "";
	if (output) {
		const lines = output.split("\n");
		const maxLines = options.expanded ? lines.length : 20;
		const displayLines = lines.slice(0, maxLines);
		const remaining = lines.length - maxLines;
		text += `\n${displayLines.map((line) => theme.fg("toolOutput", line)).join("\n")}`;
		if (remaining > 0) {
			text += theme.fg("muted", `\n... (${remaining} líneas más)`);
		}
	}

	const details = result.details;
	if (details?.truncated) {
		text += `\n${theme.fg("warning", `[Truncado: demasiados resultados]`)}`;
	}

	return text;
}

interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

/**
 * Extract all regex matches from a string.
 */
function extractAllMatches(regex: RegExp, text: string): RegExpExecArray[] {
	const results: RegExpExecArray[] = [];
	const re = new RegExp(regex.source, regex.flags);
	let match: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration pattern
	while ((match = re.exec(text)) !== null) {
		results.push(match);
	}
	return results;
}

/**
 * Parse DuckDuckGo HTML search results page to extract search results.
 */
function parseDuckDuckGoResults(html: string, maxResults: number): SearchResult[] {
	const results: SearchResult[] = [];

	// Find result blocks by their links
	const linkRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
	const linkMatches = extractAllMatches(linkRegex, html);

	for (const linkMatch of linkMatches) {
		if (results.length >= maxResults) break;

		const url = linkMatch[1];
		const titleHtml = linkMatch[2];
		const title = titleHtml.replace(/<[^>]+>/g, "").trim();

		// Try to find the snippet near this link
		const afterLink = html.slice(linkMatch.index);
		let snippet = "";

		const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i;
		const snippetMatch = afterLink.match(snippetRegex);
		if (snippetMatch) {
			snippet = snippetMatch[1].replace(/<[^>]+>/g, "").trim();
		}

		// Also try to get the display URL
		let displayUrl = url;
		const urlRegex = /<span[^>]*class="[^"]*result__url[^"]*"[^>]*>([\s\S]*?)<\/span>/i;
		const urlMatch = afterLink.match(urlRegex);
		if (urlMatch) {
			displayUrl = urlMatch[1].replace(/<[^>]+>/g, "").trim();
		}

		// Decode HTML entities in title and snippet
		const decodedTitle = decodeHtmlEntities(title);
		const decodedSnippet = decodeHtmlEntities(snippet);
		const decodedUrl = decodeHtmlEntities(displayUrl || url);

		if (decodedTitle && decodedUrl) {
			results.push({
				title: decodedTitle,
				url: decodedUrl.startsWith("http") ? decodedUrl : url,
				snippet: decodedSnippet,
			});
		}
	}

	// Fallback: if no results found with the structured parser, try a more generic approach
	if (results.length === 0) {
		const genericLinkRegex = /<a[^>]*href="(https?:\/\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
		const genericMatches = extractAllMatches(genericLinkRegex, html);

		for (const genericMatch of genericMatches) {
			if (results.length >= maxResults) break;

			const url = genericMatch[1];
			const title = genericMatch[2].replace(/<[^>]+>/g, "").trim();

			// Skip navigation/structural links
			if (
				!title ||
				url.includes("duckduckgo.com") ||
				url.includes("javascript:") ||
				title.length < 3 ||
				title.length > 200
			) {
				continue;
			}

			results.push({
				title: decodeHtmlEntities(title),
				url,
				snippet: "",
			});
		}
	}

	return results.slice(0, maxResults);
}

function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/g, "'")
		.replace(/&nbsp;/g, " ");
}

export function createWebSearchToolDefinition(
	_cwd: string,
	options?: WebSearchToolOptions,
): ToolDefinition<typeof webSearchSchema, WebSearchToolDetails | undefined, WebSearchRenderState> {
	const fetchFn = options?.fetchFn ?? fetch;
	return {
		name: "web_search",
		label: "WebSearch",
		description:
			"Realiza búsquedas web usando motores de búsqueda. Devuelve resultados con títulos, URLs y descripciones. Útil para encontrar información actual, documentación, y respuestas a preguntas.",
		promptSnippet: "Buscar información en la web",
		promptGuidelines: [
			"Usa web_search para encontrar información actualizada en la web.",
			"Forma consultas concisas y específicas para mejores resultados.",
			"Los resultados incluyen título, URL y fragmento descriptivo.",
		],
		parameters: webSearchSchema,
		async execute(_toolCallId, { query, numResults }: WebSearchToolInput, signal?: AbortSignal, _onUpdate?, _ctx?) {
			const effectiveNumResults = numResults ?? DEFAULT_NUM_RESULTS;

			if (!query.trim()) {
				throw new Error("La consulta de búsqueda no puede estar vacía");
			}

			// Create abort controller combining signal and timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
			const onSignalAbort = () => controller.abort();
			signal?.addEventListener("abort", onSignalAbort, { once: true });

			try {
				const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

				const response = await fetchFn(searchUrl, {
					method: "GET",
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
						Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
						"Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
					},
					signal: controller.signal,
					redirect: "follow",
				});

				if (!response.ok) {
					throw new Error(`Error del motor de búsqueda: ${response.status} ${response.statusText}`);
				}

				const html = await response.text();
				const searchResults = parseDuckDuckGoResults(html, effectiveNumResults);

				if (searchResults.length === 0) {
					return {
						content: [
							{
								type: "text",
								text: `No se encontraron resultados para: "${query}"`,
							},
						],
						details: { resultCount: 0, truncated: false },
					};
				}

				// Format results
				const formattedResults = searchResults
					.map((result, index) => {
						let entry = `${index + 1}. ${result.title}\n   ${result.url}`;
						if (result.snippet) {
							entry += `\n   ${result.snippet}`;
						}
						return entry;
					})
					.join("\n\n");

				const header = `Resultados para: "${query}" (${searchResults.length} resultados)`;
				const outputText = `${header}\n\n${formattedResults}`;

				return {
					content: [{ type: "text", text: outputText }],
					details: {
						resultCount: searchResults.length,
						truncated: searchResults.length >= effectiveNumResults,
					},
				};
			} catch (err) {
				if (err instanceof Error) {
					if (err.name === "AbortError") {
						if (signal?.aborted) {
							throw new Error("Operación cancelada");
						}
						throw new Error(`Tiempo de espera agotado buscando "${query}" (${SEARCH_TIMEOUT_MS / 1000}s)`);
					}
					throw new Error(`Error al buscar "${query}": ${err.message}`);
				}
				throw new Error(`Error desconocido al buscar "${query}"`);
			} finally {
				clearTimeout(timeoutId);
				signal?.removeEventListener("abort", onSignalAbort);
			}
		},
		renderCall(args, theme, context) {
			const state = context.state;
			if (context.executionStarted && state.startedAt === undefined) {
				state.startedAt = Date.now();
				state.endedAt = undefined;
			}
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatWebSearchCall(args, theme));
			return text;
		},
		renderResult(result, options, theme, context) {
			const state = context.state;
			if (!options.isPartial || context.isError) {
				state.endedAt ??= Date.now();
			}
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatWebSearchResult(result as any, options, theme, context.showImages));
			return text;
		},
	};
}

export function createWebSearchTool(cwd: string, options?: WebSearchToolOptions): AgentTool<typeof webSearchSchema> {
	return wrapToolDefinition(createWebSearchToolDefinition(cwd, options));
}
