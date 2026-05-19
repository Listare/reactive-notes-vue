import { rewriteBuiltinImportsInCode } from "./rewriteImports";

export interface AssembleInput {
	scriptContent: string;
	templateCode?: string;
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
	return code.trim();
}

/**
 * Merges compiled script + template render into one executable snippet.
 */
export function assembleModule(input: AssembleInput): string {
	const { scriptContent, templateCode } = input;

	if (!templateCode) {
		let code = rewriteBuiltinImportsInCode(scriptContent);
		code = code.replace(/export\s+default\s+/, "return ");
		return code.trim();
	}

	const renderFn = rewriteTemplateCode(templateCode);
	const script = rewriteScriptForAssembly(scriptContent);

	return `
${renderFn}
${script}
if (typeof __sfc_main !== "undefined" && typeof render === "function") {
  __sfc_main.render = render;
}
return __sfc_main;
`.trim();
}

const VUE_IMPORT_RE =
	/import\s*{\s*([^}]+)\s*}\s*from\s*['"]vue['"];?\s*/g;

function parseImportSpecifier(spec: string): string {
	const trimmed = spec.trim();
	const asMatch = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(trimmed);
	if (asMatch) {
		return `${asMatch[1]}: ${asMatch[2]}`;
	}
	return trimmed;
}
