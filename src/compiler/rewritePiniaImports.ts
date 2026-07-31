import { PINIA_BUILTIN_SPECIFIERS } from "../builtin/isPiniaBuiltin";
import {
	createBuiltinImportRewriter,
	joinSpecifierPattern,
} from "./createBuiltinImportRewriter";

const piniaRewriter = createBuiltinImportRewriter({
	specifierPattern: joinSpecifierPattern(PINIA_BUILTIN_SPECIFIERS),
	moduleAccess: () => "__pinia__",
	defaultAccess: (mod) => `${mod}.default ?? ${mod}`,
});

export const PINIA_NAMED_IMPORT_RE = piniaRewriter.namedImportRe;
export const PINIA_DEFAULT_IMPORT_RE = piniaRewriter.defaultImportRe;
export const PINIA_NAMESPACE_IMPORT_RE = piniaRewriter.namespaceImportRe;
export const PINIA_SIDE_EFFECT_IMPORT_RE = piniaRewriter.sideEffectImportRe;

/** Converts `pinia` import statements to bindings from `__pinia__`. */
export function rewritePiniaImportsInCode(code: string): string {
	return piniaRewriter.rewrite(code);
}
