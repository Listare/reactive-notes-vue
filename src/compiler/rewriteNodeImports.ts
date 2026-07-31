/**
 * Converts `node:…` import statements to bindings from `__node__[id]`.
 */

import { createBuiltinImportRewriter } from "./createBuiltinImportRewriter";

const NODE_SPEC = "node:([^'\"]+)";

const nodeRewriter = createBuiltinImportRewriter({
	specifierPattern: NODE_SPEC,
	moduleAccess: (id: string) => `__node__[${JSON.stringify(id)}]`,
});

export const NODE_NAMED_IMPORT_RE = nodeRewriter.namedImportRe;
export const NODE_DEFAULT_IMPORT_RE = nodeRewriter.defaultImportRe;
export const NODE_NAMESPACE_IMPORT_RE = nodeRewriter.namespaceImportRe;
export const NODE_SIDE_EFFECT_IMPORT_RE = nodeRewriter.sideEffectImportRe;

/** Converts `node:*` import statements to bindings from `__node__[id]`. */
export function rewriteNodeImportsInCode(code: string): string {
	return nodeRewriter.rewrite(code);
}
