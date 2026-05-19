import { rewriteObsidianImportsInCode } from "./rewriteObsidianImports";

export const VUE_IMPORT_RE =
	/import\s*{\s*([^}]+)\s*}\s*from\s*['"]vue['"];?\s*/g;

function parseSpecifier(spec: string): string {
	const trimmed = spec.trim();
	if (/^type\s+/i.test(trimmed)) return "";
	const asMatch = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(trimmed);
	if (asMatch) {
		return `${asMatch[1]}: ${asMatch[2]}`;
	}
	return trimmed;
}

/** Converts vue import statements to destructuring from __vue__. */
export function rewriteVueImportsInCode(code: string): string {
	return code.replace(VUE_IMPORT_RE, (_, specifiers: string) => {
		const parts = specifiers
			.split(",")
			.map((s: string) => parseSpecifier(s))
			.filter(Boolean);
		return `const { ${parts.join(", ")} } = __vue__;\n`;
	});
}

/** Rewrites built-in `vue` and `@obsidian` imports for sandbox execution. */
export function rewriteBuiltinImportsInCode(code: string): string {
	return rewriteObsidianImportsInCode(rewriteVueImportsInCode(code));
}

/** Converts built-in imports and `export default` into `return` for single-expression modules. */
export function prepareModuleCode(compiled: string): string {
	let code = rewriteBuiltinImportsInCode(compiled);
	code = code.replace(/export\s+default\s+/, "return ");
	return code.trim();
}
