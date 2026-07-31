import { MATH_BUILTIN_SPECIFIERS } from "../builtin/isMathBuiltin";
import {
	createBuiltinImportRewriter,
	joinSpecifierPattern,
} from "./createBuiltinImportRewriter";

const mathRewriter = createBuiltinImportRewriter({
	specifierPattern: joinSpecifierPattern(MATH_BUILTIN_SPECIFIERS),
	moduleAccess: () => "__math__",
	defaultAccess: (mod) => `${mod}.default ?? ${mod}.Latex`,
});

export const MATH_NAMED_IMPORT_RE = mathRewriter.namedImportRe;
export const MATH_DEFAULT_IMPORT_RE = mathRewriter.defaultImportRe;
export const MATH_NAMESPACE_IMPORT_RE = mathRewriter.namespaceImportRe;
export const MATH_SIDE_EFFECT_IMPORT_RE = mathRewriter.sideEffectImportRe;

/** Converts `@vue-interactive/math` import statements to bindings from `__math__`. */
export function rewriteMathImportsInCode(code: string): string {
	return mathRewriter.rewrite(code);
}
