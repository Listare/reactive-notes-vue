import { rewriteBuiltinImportsInCode } from "./rewriteImports";
import {
	countCodeLines,
	lineMapFromSourceMap,
	placeLineMapAfterPreamble,
} from "./sourceLineMap";
import type { RawSourceMap } from "source-map-js";

export interface AssembleInput {
	scriptContent: string;
	templateCode?: string;
	/** Source map from `compileScript` (generated script → original SFC). */
	scriptSourceMap?: RawSourceMap | null;
}

export interface AssembleResult {
	code: string;
	/**
	 * 1-based emitted line → 1-based original SFC line.
	 * Sparse; only lines with a source mapping are set.
	 */
	originalLineByEmitted: number[];
}

function rewriteTemplateCode(templateCode: string): string {
	return templateCode
		.replace(VUE_IMPORT_RE, (_, specifiers: string) => {
			const parts = specifiers
				.split(",")
				.map((s: string) => parseImportSpecifier(s))
				.filter(Boolean);
			return `const { ${parts.join(", ")} } = __vue__;\n`;
		})
		.replace(/export\s+function\s+render/, "function render");
}

function rewriteScriptForAssembly(scriptContent: string): string {
	let code = rewriteBuiltinImportsInCode(scriptContent);
	code = code.replace(/export\s+default\s+/, "const __sfc_main = ");
	// Keep internal blank lines so compileScript source maps stay aligned.
	return code.replace(/^\uFEFF?/, "").replace(/\s+$/, "");
}

/**
 * Merges compiled script + template render into one executable snippet,
 * and builds an emitted→original SFC line map when a script source map is provided.
 */
export function assembleModule(input: AssembleInput): AssembleResult {
	const { scriptContent, templateCode, scriptSourceMap } = input;

	if (!templateCode) {
		let code = rewriteBuiltinImportsInCode(scriptContent);
		code = code.replace(/export\s+default\s+/, "return ");
		code = code.replace(/^\uFEFF?/, "").replace(/\s+$/, "");
		const originalLineByEmitted = scriptSourceMap
			? lineMapFromSourceMap(scriptSourceMap, countCodeLines(code))
			: [];
		return { code, originalLineByEmitted };
	}

	const renderFn = rewriteTemplateCode(templateCode).replace(/\s+$/, "");
	const script = rewriteScriptForAssembly(scriptContent);
	const epilogue = [
		'if (typeof __sfc_main !== "undefined" && typeof render === "function") {',
		"  __sfc_main.render = render;",
		"}",
		"return __sfc_main;",
	].join("\n");

	const code = `${renderFn}\n${script}\n${epilogue}`;
	const preambleLineCount = countCodeLines(renderFn);
	const totalLines = countCodeLines(code);

	let originalLineByEmitted: number[] = [];
	if (scriptSourceMap) {
		const scriptLineCount = countCodeLines(script);
		const scriptMap = lineMapFromSourceMap(
			scriptSourceMap,
			scriptLineCount,
		);
		originalLineByEmitted = placeLineMapAfterPreamble(
			scriptMap,
			preambleLineCount,
			totalLines,
		);
	}

	return { code, originalLineByEmitted };
}

const VUE_IMPORT_RE =
	/import\s*{\s*([^}]+)\s*}\s*from\s*['"]vue['"];?(?:\r?\n)?/g;

function parseImportSpecifier(spec: string): string {
	const trimmed = spec.trim();
	const asMatch = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(trimmed);
	if (asMatch) {
		return `${asMatch[1]}: ${asMatch[2]}`;
	}
	return trimmed;
}
