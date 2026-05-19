const SCRIPT_SETUP_BODY_RE =
	/<script\s+[^>]*setup[^>]*>([\s\S]*?)<\/script>/i;
const IMPORT_RE =
	/^\s*import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"];?\s*$/gm;
export const VUE_IMPORT_RE =
	/import\s*{\s*([^}]+)\s*}\s*from\s*['"]vue['"];?\s*/g;

export class UnsupportedImportError extends Error {
	constructor(specifier: string) {
		super(
			`MVP 不支持外部模块导入: "${specifier}"。仅允许 from 'vue'。`,
		);
		this.name = "UnsupportedImportError";
	}
}

/** Validates script-setup imports before compilation. */
export function validateScriptImports(source: string): void {
	const match = SCRIPT_SETUP_BODY_RE.exec(source);
	if (!match?.[1]) return;

	for (const importMatch of match[1].matchAll(IMPORT_RE)) {
		const specifier = importMatch[1];
		if (!specifier || specifier !== "vue") {
			throw new UnsupportedImportError(specifier ?? "unknown");
		}
	}
}

function parseSpecifier(spec: string): string {
	const trimmed = spec.trim();
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

/** Converts vue imports and `export default` into `return` for single-expression modules. */
export function prepareModuleCode(compiled: string): string {
	let code = rewriteVueImportsInCode(compiled);
	code = code.replace(/export\s+default\s+/, "return ");
	return code.trim();
}
