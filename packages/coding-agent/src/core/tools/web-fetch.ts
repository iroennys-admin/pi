import type { AgentTool } from "@iroennys/iropi-agent-core";
import { Text } from "@iroennys/iropi-tui";
import { type Static, Type } from "typebox";
import type { Theme } from "../../modes/interactive/theme/theme.ts";
import type { ToolDefinition, ToolRenderResultOptions } from "../extensions/types.ts";
import { getTextOutput, invalidArgText, str } from "./render-utils.ts";
import { wrapToolDefinition } from "./tool-definition-wrapper.ts";

const webFetchSchema = Type.Object({
	url: Type.String({ description: "URL a obtener" }),
	method: Type.Optional(
		Type.String({ description: "Método HTTP (GET, POST, PUT, DELETE, etc.). Por defecto: GET", default: "GET" }),
	),
	headers: Type.Optional(
		Type.Record(Type.String(), Type.String(), {
			description: "Cabeceras HTTP personalizadas como pares clave-valor",
		}),
	),
	body: Type.Optional(Type.String({ description: "Cuerpo de la petición para POST/PUT" })),
	maxLength: Type.Optional(
		Type.Number({
			description: "Longitud máxima de la respuesta en caracteres (por defecto: 50000)",
			default: 50000,
		}),
	),
});

export type WebFetchToolInput = Static<typeof webFetchSchema>;

export interface WebFetchToolDetails {
	statusCode?: number;
	contentType?: string;
	size?: number;
	truncated?: boolean;
}

export interface WebFetchToolOptions {
	/** Custom fetch function for testing or proxying */
	fetchFn?: typeof fetch;
}

const FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_LENGTH = 50_000;

type WebFetchRenderState = {
	startedAt: number | undefined;
	endedAt: number | undefined;
};

function formatWebFetchCall(args: { url?: string; method?: string } | undefined, theme: Theme): string {
	const url = str(args?.url);
	const method = str(args?.method) || "GET";
	const invalidArg = invalidArgText(theme);
	const urlDisplay = url === null ? invalidArg : url || theme.fg("toolOutput", "...");
	return (
		theme.fg("toolTitle", theme.bold("web_fetch")) +
		" " +
		theme.fg("muted", method.toUpperCase()) +
		" " +
		theme.fg("accent", urlDisplay)
	);
}

function formatWebFetchResult(
	result: {
		content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
		details?: WebFetchToolDetails;
	},
	options: ToolRenderResultOptions,
	theme: Theme,
	showImages: boolean,
): string {
	const output = getTextOutput(result, showImages).trim();
	let text = "";
	if (output) {
		const lines = output.split("\n");
		const maxLines = options.expanded ? lines.length : 15;
		const displayLines = lines.slice(0, maxLines);
		const remaining = lines.length - maxLines;
		text += `\n${displayLines.map((line) => theme.fg("toolOutput", line)).join("\n")}`;
		if (remaining > 0) {
			text += theme.fg("muted", `\n... (${remaining} líneas más)`);
		}
	}

	const details = result.details;
	if (details?.truncated) {
		text += `\n${theme.fg("warning", `[Truncado: contenido limitado a ${details.size} caracteres]`)}`;
	}

	return text;
}

/**
 * Basic HTML-to-text conversion that strips tags and preserves structure.
 */
function stripHtmlTags(html: string): string {
	// Replace <br>, <br/>, <br /> with newlines
	let text = html.replace(/<br\s*\/?>/gi, "\n");
	// Replace block-level closing tags with newlines
	text = text.replace(
		/<\/(p|div|h[1-6]|li|tr|dt|dd|blockquote|pre|section|article|header|footer|nav|aside|main|figure|figcaption|details|summary)>/gi,
		"\n",
	);
	// Replace opening block tags with newlines
	text = text.replace(
		/<(p|div|h[1-6]|li|tr|dt|dd|blockquote|pre|section|article|header|footer|nav|aside|main|figure|figcaption|details|summary)[^>]*>/gi,
		"\n",
	);
	// Remove all remaining HTML tags
	text = text.replace(/<[^>]+>/g, "");
	// Decode common HTML entities
	text = text.replace(/&amp;/g, "&");
	text = text.replace(/&lt;/g, "<");
	text = text.replace(/&gt;/g, ">");
	text = text.replace(/&quot;/g, '"');
	text = text.replace(/&#39;/g, "'");
	text = text.replace(/&nbsp;/g, " ");
	// Collapse multiple blank lines into at most two newlines
	text = text.replace(/\n{3,}/g, "\n\n");
	return text.trim();
}

export function createWebFetchToolDefinition(
	_cwd: string,
	options?: WebFetchToolOptions,
): ToolDefinition<typeof webFetchSchema, WebFetchToolDetails | undefined, WebFetchRenderState> {
	const fetchFn = options?.fetchFn ?? fetch;
	return {
		name: "web_fetch",
		label: "WebFetch",
		description:
			"Obtiene el contenido de una URL y lo devuelve como texto. Soporta páginas web, APIs REST, y archivos de texto. Útil para leer documentación, consumir APIs, o descargar contenido web.",
		promptSnippet: "Obtener contenido de URLs y APIs web",
		promptGuidelines: ["Usa web_fetch para leer contenido web en lugar de curl en bash."],
		parameters: webFetchSchema,
		async execute(
			_toolCallId,
			{ url, method, headers, body, maxLength }: WebFetchToolInput,
			signal?: AbortSignal,
			_onUpdate?,
			_ctx?,
		) {
			const effectiveMethod = (method ?? "GET").toUpperCase();
			const effectiveMaxLength = maxLength ?? DEFAULT_MAX_LENGTH;

			// Validate URL
			let parsedUrl: URL;
			try {
				parsedUrl = new URL(url);
			} catch {
				throw new Error(`URL inválida: ${url}`);
			}

			if (!["http:", "https:"].includes(parsedUrl.protocol)) {
				throw new Error(`Protocolo no soportado: ${parsedUrl.protocol}. Solo se permiten http: y https:`);
			}

			// Create abort controller combining signal and timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

			const onSignalAbort = () => controller.abort();
			signal?.addEventListener("abort", onSignalAbort, { once: true });

			try {
				const fetchHeaders: Record<string, string> = {
					"User-Agent": "Pi-Coding-Agent/1.0",
					Accept:
						"text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,application/json;q=0.7,*/*;q=0.1",
					...headers,
				};

				const fetchOptions: RequestInit = {
					method: effectiveMethod,
					headers: fetchHeaders,
					signal: controller.signal,
					redirect: "follow",
				};

				if (body && ["POST", "PUT", "PATCH"].includes(effectiveMethod)) {
					fetchOptions.body = body;
				}

				const response = await fetchFn(url, fetchOptions);
				const contentType = response.headers.get("content-type") ?? "unknown";
				const isHtml = /html/i.test(contentType);
				const isJson = /json/i.test(contentType);
				const isText = /text/i.test(contentType) || isHtml || isJson;

				let rawContent: string;
				if (isText || !contentType.includes("application/octet-stream")) {
					rawContent = await response.text();
				} else {
					rawContent = `[Contenido binario: ${contentType}]`;
				}

				let outputText: string;
				if (isHtml && !isJson) {
					outputText = stripHtmlTags(rawContent);
				} else {
					outputText = rawContent;
				}

				const truncated = outputText.length > effectiveMaxLength;
				if (truncated) {
					outputText = outputText.slice(0, effectiveMaxLength);
				}

				// Build metadata header
				const metaLines: string[] = [
					`Estado: ${response.status} ${response.statusText}`,
					`Tipo de contenido: ${contentType}`,
					`Tamaño: ${outputText.length} caracteres${truncated ? ` (truncado de ${rawContent.length})` : ""}`,
				];

				const details: WebFetchToolDetails = {
					statusCode: response.status,
					contentType,
					size: outputText.length,
					truncated,
				};

				const resultText = `${metaLines.join("\n")}\n\n${outputText}`;

				return {
					content: [{ type: "text", text: resultText }],
					details,
				};
			} catch (err) {
				if (err instanceof Error) {
					if (err.name === "AbortError") {
						if (signal?.aborted) {
							throw new Error("Operación cancelada");
						}
						throw new Error(`Tiempo de espera agotado al obtener ${url} (${FETCH_TIMEOUT_MS / 1000}s)`);
					}
					throw new Error(`Error al obtener ${url}: ${err.message}`);
				}
				throw new Error(`Error desconocido al obtener ${url}`);
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
			text.setText(formatWebFetchCall(args, theme));
			return text;
		},
		renderResult(result, options, theme, context) {
			const state = context.state;
			if (!options.isPartial || context.isError) {
				state.endedAt ??= Date.now();
			}
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatWebFetchResult(result as any, options, theme, context.showImages));
			return text;
		},
	};
}

export function createWebFetchTool(cwd: string, options?: WebFetchToolOptions): AgentTool<typeof webFetchSchema> {
	return wrapToolDefinition(createWebFetchToolDefinition(cwd, options));
}
