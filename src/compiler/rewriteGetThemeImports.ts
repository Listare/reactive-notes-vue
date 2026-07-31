import { GET_THEME_BUILTIN_SPECIFIERS } from "../builtin/isGetThemeBuiltin";
import {
	createBuiltinImportRewriter,
	joinSpecifierPattern,
} from "./createBuiltinImportRewriter";

const getThemeRewriter = createBuiltinImportRewriter({
	specifierPattern: joinSpecifierPattern(GET_THEME_BUILTIN_SPECIFIERS),
	moduleAccess: () => "__getTheme__",
	defaultAccess: (mod) => `${mod}.default ?? ${mod}.getTheme`,
});

export const GET_THEME_NAMED_IMPORT_RE = getThemeRewriter.namedImportRe;
export const GET_THEME_DEFAULT_IMPORT_RE = getThemeRewriter.defaultImportRe;
export const GET_THEME_NAMESPACE_IMPORT_RE = getThemeRewriter.namespaceImportRe;
export const GET_THEME_SIDE_EFFECT_IMPORT_RE = getThemeRewriter.sideEffectImportRe;

/** Converts `@vue-interactive/theme` import statements to bindings from `__getTheme__`. */
export function rewriteGetThemeImportsInCode(code: string): string {
	return getThemeRewriter.rewrite(code);
}
