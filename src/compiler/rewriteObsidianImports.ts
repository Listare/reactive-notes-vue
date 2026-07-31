import { OBSIDIAN_BUILTIN_SPECIFIERS } from "../builtin/isObsidianBuiltin";
import {
	createBuiltinImportRewriter,
	joinSpecifierPattern,
} from "./createBuiltinImportRewriter";

const obsidianRewriter = createBuiltinImportRewriter({
	specifierPattern: joinSpecifierPattern(OBSIDIAN_BUILTIN_SPECIFIERS),
	moduleAccess: () => "__obsidian__",
});

export const OBSIDIAN_NAMED_IMPORT_RE = obsidianRewriter.namedImportRe;
export const OBSIDIAN_DEFAULT_IMPORT_RE = obsidianRewriter.defaultImportRe;
export const OBSIDIAN_NAMESPACE_IMPORT_RE = obsidianRewriter.namespaceImportRe;
export const OBSIDIAN_SIDE_EFFECT_IMPORT_RE = obsidianRewriter.sideEffectImportRe;

/** Converts `@obsidian` import statements to bindings from `__obsidian__`. */
export function rewriteObsidianImportsInCode(code: string): string {
	return obsidianRewriter.rewrite(code);
}
