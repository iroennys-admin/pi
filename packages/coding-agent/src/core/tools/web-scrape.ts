import type { AgentTool } from "@iroennys/iropi-agent-core";
import { Text } from "@iroennys/iropi-tui";
import { type Static, Type } from "typebox";
import type { Theme } from "../../modes/interactive/theme/theme.ts";
import type { ToolDefinition, ToolRenderResultOptions } from "../extensions/types.ts";
import { getTextOutput, invalidArgText, str } from "./render-utils.ts";
import { wrapToolDefinition } from "./tool-definition-wrapper.ts";

const extractEnum = Type.Union(
        [
                Type.Literal("text"),
                Type.Literal("html"),
                Type.Literal("links"),
                Type.Literal("images"),
                Type.Literal("tables"),
                Type.Literal("all"),
        ],
        { description: "Qué extraer: text, html, links, images, tables, all", default: "text" },
);

const webScrapeSchema = Type.Object({
        url: Type.String({ description: "URL de la página web a extraer" }),
        selector: Type.Optional(
                Type.String({ description: "Selector CSS para extraer elementos específicos (básico: etiqueta, .clase, #id)" }),
        ),
        extract: Type.Optional(extractEnum),
        maxLength: Type.Optional(
                Type.Number({ description: "Longitud máxima del contenido en caracteres (por defecto: 50000)", default: 50000 }),
        ),
});

export type WebScrapeToolInput = Static<typeof webScrapeSchema>;

export interface WebScrapeToolDetails {
        statusCode?: number;
        contentType?: string;
        extractMode?: string;
        truncated?: boolean;
        size?: number;
}

export interface WebScrapeToolOptions {
        /** Custom fetch function for testing or proxying */
        fetchFn?: typeof fetch;
}

const SCRAPE_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_LENGTH = 50_000;

type WebScrapeRenderState = {
        startedAt: number | undefined;
        endedAt: number | undefined;
};

function formatWebScrapeCall(
        args: { url?: string; extract?: string; selector?: string } | undefined,
        theme: Theme,
): string {
        const url = str(args?.url);
        const extract = str(args?.extract) || "text";
        const selector = str(args?.selector);
        const invalidArg = invalidArgText(theme);
        const urlDisplay = url === null ? invalidArg : url || theme.fg("toolOutput", "...");
        let text =
                theme.fg("toolTitle", theme.bold("web_scrape")) +
                " " +
                theme.fg("accent", urlDisplay) +
                " " +
                theme.fg("muted", `[${extract}]`);
        if (selector) {
                text += theme.fg("muted", ` selector="${selector}"`);
        }
        return text;
}

function formatWebScrapeResult(
        result: {
                content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
                details?: WebScrapeToolDetails;
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

// ============================================================================
// HTML Parsing Utilities (no external dependencies)
// ============================================================================

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
 * Apply a basic CSS selector filter to extract matching elements from HTML.
 * Supports: tag, .class, #id, tag.class, tag#id combinations.
 */
function applyCssSelector(html: string, selector: string): string {
        const sel = selector.trim();
        if (!sel) return html;

        // Parse selector into tag, class, id
        let tag: string | undefined;
        let className: string | undefined;
        let id: string | undefined;

        const tagMatch = sel.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
        if (tagMatch) tag = tagMatch[1].toLowerCase();

        const classMatch = sel.match(/\.([a-zA-Z][a-zA-Z0-9_-]*)/);
        if (classMatch) className = classMatch[1];

        const idMatch = sel.match(/#([a-zA-Z][a-zA-Z0-9_-]*)/);
        if (idMatch) id = idMatch[1];

        // Build regex pattern for matching elements
        // We'll find all elements matching the tag (or all elements if no tag specified)
        const tagPattern = tag || "[a-zA-Z][a-zA-Z0-9]*";
        const openTagRegex = new RegExp(`<(${tagPattern})(\\s[^>]*)?>`, "gi");

        const results: string[] = [];
        const openTagMatches = extractAllMatches(openTagRegex, html);

        for (const match of openTagMatches) {
                const elementTag = match[1].toLowerCase();
                const attrs = match[2] || "";

                // Check class match
                if (className) {
                        const classAttr = attrs.match(/class=["']([^"']*)["']/i);
                        if (!classAttr || !classAttr[1].split(/\s+/).includes(className)) continue;
                }

                // Check id match
                if (id) {
                        const idAttr = attrs.match(/id=["']([^"']*)["']/i);
                        if (!idAttr || idAttr[1] !== id) continue;
                }

                // Find the closing tag for this element
                const closeTag = `</${elementTag}>`;
                const startIndex = match.index;
                const afterOpenTag = startIndex + match[0].length;

                // Simple approach: find the matching closing tag
                // For self-closing or void elements, just capture the tag itself
                const voidElements = new Set([
                        "area",
                        "base",
                        "br",
                        "col",
                        "embed",
                        "hr",
                        "img",
                        "input",
                        "link",
                        "meta",
                        "param",
                        "source",
                        "track",
                        "wbr",
                ]);

                if (voidElements.has(elementTag)) {
                        results.push(match[0]);
                        continue;
                }

                // Find matching close tag, handling nesting
                let depth = 1;
                let searchPos = afterOpenTag;
                let endIndex = -1;

                while (depth > 0 && searchPos < html.length) {
                        const nextOpen = html.indexOf(`<${elementTag}`, searchPos);
                        const nextClose = html.indexOf(closeTag, searchPos);

                        if (nextClose === -1) {
                                // No closing tag found; take the rest
                                endIndex = html.length;
                                break;
                        }

                        if (nextOpen !== -1 && nextOpen < nextClose) {
                                depth++;
                                searchPos = nextOpen + 1;
                        } else {
                                depth--;
                                if (depth === 0) {
                                        endIndex = nextClose + closeTag.length;
                                } else {
                                        searchPos = nextClose + closeTag.length;
                                }
                        }
                }

                if (endIndex !== -1) {
                        results.push(html.slice(startIndex, endIndex));
                }
        }

        return results.join("\n");
}

/**
 * Extract text content from HTML, stripping tags but preserving structure.
 */
function extractText(html: string): string {
        let text = html;
        // Replace <br> with newlines
        text = text.replace(/<br\s*\/?>/gi, "\n");
        // Add newlines for block elements
        text = text.replace(
                /<\/(p|div|h[1-6]|li|tr|dt|dd|blockquote|pre|section|article|header|footer|nav|aside|main|figure|figcaption|details|summary|td|th)>/gi,
                "\n",
        );
        text = text.replace(
                /<(p|div|h[1-6]|li|tr|dt|dd|blockquote|pre|section|article|header|footer|nav|aside|main|figure|figcaption|details|summary|td|th)[^>]*>/gi,
                "",
        );
        // Remove all remaining tags
        text = text.replace(/<[^>]+>/g, "");
        // Decode HTML entities
        text = text.replace(/&amp;/g, "&");
        text = text.replace(/&lt;/g, "<");
        text = text.replace(/&gt;/g, ">");
        text = text.replace(/&quot;/g, '"');
        text = text.replace(/&#39;/g, "'");
        text = text.replace(/&nbsp;/g, " ");
        // Collapse excessive whitespace
        text = text.replace(/\n{3,}/g, "\n\n");
        return text.trim();
}

/**
 * Extract all links (<a href>) from HTML.
 */
function extractLinks(html: string): string {
        const linkRegex = /<a\s[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi;
        const links: Array<{ url: string; text: string }> = [];
        const linkMatches = extractAllMatches(linkRegex, html);

        for (const match of linkMatches) {
                const url = match[1];
                const text = match[2].trim();
                if (url && !url.startsWith("#") && !url.startsWith("javascript:")) {
                        links.push({ url, text });
                }
        }

        if (links.length === 0) return "No se encontraron enlaces.";

        return links.map((link, i) => `${i + 1}. ${link.text || "(sin texto)"}\n   ${link.url}`).join("\n\n");
}

/**
 * Extract all images (<img>) from HTML.
 */
function extractImages(html: string): string {
        const imgRegex = /<img\s[^>]*src=["']([^"']*)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
        const images: Array<{ src: string; alt: string }> = [];

        // Also try the reverse order for alt before src
        const imgRegex2 = /<img\s[^>]*(?:alt=["']([^"']*)["'])?[^>]*src=["']([^"']*)["'][^>]*>/gi;

        for (const m of extractAllMatches(imgRegex, html)) {
                images.push({ src: m[1], alt: m[2] || "" });
        }

        // Catch images where alt comes before src
        for (const m of extractAllMatches(imgRegex2, html)) {
                const src = m[2];
                const alt = m[1] || "";
                // Avoid duplicates
                if (!images.some((img) => img.src === src)) {
                        images.push({ src, alt });
                }
        }

        if (images.length === 0) return "No se encontraron imágenes.";

        return images.map((img, i) => `${i + 1}. ${img.alt || "(sin descripción)"}\n   ${img.src}`).join("\n\n");
}

/**
 * Extract tables from HTML and format as structured text.
 */
function extractTables(html: string): string {
        const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        const tables: string[] = [];
        let tableIndex = 0;

        for (const tableMatch of extractAllMatches(tableRegex, html)) {
                tableIndex++;
                const tableContent = tableMatch[1];
                const rows: string[][] = [];

                // Extract header rows
                const thRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

                for (const rowMatch of extractAllMatches(thRegex, tableContent)) {
                        const rowContent = rowMatch[1];
                        const cells: string[] = [];

                        const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
                        for (const cellMatch of extractAllMatches(cellRegex, rowContent)) {
                                cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim());
                        }

                        if (cells.length > 0) {
                                rows.push(cells);
                        }
                }

                if (rows.length > 0) {
                        const formatted = rows.map((row) => row.join(" | ")).join("\n");
                        tables.push(`Tabla ${tableIndex}:\n${formatted}`);
                }
        }

        if (tables.length === 0) return "No se encontraron tablas.";
        return tables.join("\n\n");
}

export function createWebScrapeToolDefinition(
        _cwd: string,
        options?: WebScrapeToolOptions,
): ToolDefinition<typeof webScrapeSchema, WebScrapeToolDetails | undefined, WebScrapeRenderState> {
        const fetchFn = options?.fetchFn ?? fetch;
        return {
                name: "web_scrape",
                label: "WebScrape",
                description:
                        "Extrae contenido estructurado de páginas web. Soporta selectores CSS para extraer elementos específicos, extraer enlaces, imágenes, tablas y texto. Ideal para web scraping y recolección de datos.",
                promptSnippet: "Extraer contenido estructurado de páginas web",
                promptGuidelines: [
                        "Usa web_scrape para extraer datos específicos de páginas web.",
                        "Usa selectores CSS para filtrar elementos específicos cuando sea posible.",
                        "El modo 'links' extrae todos los enlaces, 'images' todas las imágenes, 'tables' todas las tablas.",
                ],
                parameters: webScrapeSchema,
                async execute(
                        _toolCallId,
                        { url, selector, extract, maxLength }: WebScrapeToolInput,
                        signal?: AbortSignal,
                        _onUpdate?,
                        _ctx?,
                ) {
                        const extractMode = extract ?? "text";
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
                        const timeoutId = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);
                        const onSignalAbort = () => controller.abort();
                        signal?.addEventListener("abort", onSignalAbort, { once: true });

                        try {
                                const response = await fetchFn(url, {
                                        method: "GET",
                                        headers: {
                                                "User-Agent": "Pi-Coding-Agent/1.0",
                                                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.1",
                                        },
                                        signal: controller.signal,
                                        redirect: "follow",
                                });

                                const contentType = response.headers.get("content-type") ?? "unknown";
                                const html = await response.text();

                                // Apply CSS selector filter if provided
                                const filteredHtml = selector ? applyCssSelector(html, selector) : html;

                                if (selector && !filteredHtml) {
                                        return {
                                                content: [
                                                        {
                                                                type: "text",
                                                                text: `No se encontraron elementos para el selector "${selector}" en ${url}`,
                                                        },
                                                ],
                                                details: {
                                                        statusCode: response.status,
                                                        contentType,
                                                        extractMode,
                                                        truncated: false,
                                                        size: 0,
                                                },
                                        };
                                }

                                // Extract content based on mode
                                let outputText: string;
                                switch (extractMode) {
                                        case "text":
                                                outputText = extractText(filteredHtml);
                                                break;
                                        case "html":
                                                outputText = filteredHtml;
                                                break;
                                        case "links":
                                                outputText = extractLinks(filteredHtml);
                                                break;
                                        case "images":
                                                outputText = extractImages(filteredHtml);
                                                break;
                                        case "tables":
                                                outputText = extractTables(filteredHtml);
                                                break;
                                        case "all": {
                                                const parts: string[] = [];
                                                parts.push("=== TEXTO ===");
                                                parts.push(extractText(filteredHtml));
                                                parts.push("\n=== ENLACES ===");
                                                parts.push(extractLinks(filteredHtml));
                                                parts.push("\n=== IMÁGENES ===");
                                                parts.push(extractImages(filteredHtml));
                                                parts.push("\n=== TABLAS ===");
                                                parts.push(extractTables(filteredHtml));
                                                outputText = parts.join("\n");
                                                break;
                                        }
                                        default:
                                                outputText = extractText(filteredHtml);
                                }

                                const truncated = outputText.length > effectiveMaxLength;
                                if (truncated) {
                                        outputText = outputText.slice(0, effectiveMaxLength);
                                }

                                // Build metadata header
                                const metaLines: string[] = [
                                        `URL: ${url}`,
                                        `Estado: ${response.status} ${response.statusText}`,
                                        `Modo de extracción: ${extractMode}${selector ? ` (selector: ${selector})` : ""}`,
                                        `Tamaño: ${outputText.length} caracteres${truncated ? ` (truncado)` : ""}`,
                                ];

                                return {
                                        content: [{ type: "text", text: `${metaLines.join("\n")}\n\n${outputText}` }],
                                        details: {
                                                statusCode: response.status,
                                                contentType,
                                                extractMode,
                                                truncated,
                                                size: outputText.length,
                                        },
                                };
                        } catch (err) {
                                if (err instanceof Error) {
                                        if (err.name === "AbortError") {
                                                if (signal?.aborted) {
                                                        throw new Error("Operación cancelada");
                                                }
                                                throw new Error(`Tiempo de espera agotado al obtener ${url} (${SCRAPE_TIMEOUT_MS / 1000}s)`);
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
                        text.setText(formatWebScrapeCall(args, theme));
                        return text;
                },
                renderResult(result, options, theme, context) {
                        const state = context.state;
                        if (!options.isPartial || context.isError) {
                                state.endedAt ??= Date.now();
                        }
                        const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
                        text.setText(formatWebScrapeResult(result as any, options, theme, context.showImages));
                        return text;
                },
        };
}

export function createWebScrapeTool(cwd: string, options?: WebScrapeToolOptions): AgentTool<typeof webScrapeSchema> {
        return wrapToolDefinition(createWebScrapeToolDefinition(cwd, options));
}
