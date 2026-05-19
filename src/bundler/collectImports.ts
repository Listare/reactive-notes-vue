import { isGetThemeBuiltinSpecifier } from "../builtin/isGetThemeBuiltin";
import { isMathBuiltinSpecifier } from "../builtin/isMathBuiltin";
import { isObsidianBuiltinSpecifier } from "../builtin/isObsidianBuiltin";

/** Static import sources in JS/TS (excludes built-in modules). */
const STATIC_IMPORT_RE =
	/^\s*import\s+(?:type\s+)?(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]\s*;?\s*$/gm;

const SCRIPT_SETUP_BODY_RE =
	/<script\s+[^>]*setup[^>]*>([\s\S]*?)<\/script>/i;

export function collectImportsFromCode(code: string): string[] {
	const specs = new Set<string>();
	let match: RegExpExecArray | null;
	STATIC_IMPORT_RE.lastIndex = 0;
	while ((match = STATIC_IMPORT_RE.exec(code)) !== null) {
		const line = match[0];
		if (/^\s*import\s+type\s+/i.test(line)) {
			continue;
		}
		const spec = match[1];
		if (
			spec &&
			spec !== "vue" &&
			!isObsidianBuiltinSpecifier(spec) &&
			!isGetThemeBuiltinSpecifier(spec) &&
			!isMathBuiltinSpecifier(spec)
		) {
			specs.add(spec);
		}
	}
	return [...specs];
}

export function collectImportsFromSfc(source: string): string[] {
	const scriptMatch = SCRIPT_SETUP_BODY_RE.exec(source);
	if (!scriptMatch?.[1]) return [];
	return collectImportsFromCode(scriptMatch[1]);
}
