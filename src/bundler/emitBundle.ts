import type { BundledModuleRecord } from "./types";
import { rewriteModuleImports } from "./rewriteModuleImports";
import type { ResolvePathContext } from "../resolver/resolveVaultPath";

/**
 * Wraps modules into one IIFE body for `new Function('__vue__', code)`.
 * Uses lazy `__require__` so dependency factories run before dependents.
 */
export function emitBundle(
	modules: BundledModuleRecord[],
	entryCanonicalId: string,
	ctx: ResolvePathContext,
): string {
	const moduleMap = new Map(
		modules.map((m) => [m.canonicalId, m] as const),
	);

	const parts: string[] = [
		"const __moduleFactories__ = Object.create(null);",
		"const __moduleCache__ = Object.create(null);",
		"function __require__(id) {",
		"  if (Object.prototype.hasOwnProperty.call(__moduleCache__, id)) {",
		"    return __moduleCache__[id];",
		"  }",
		"  const factory = __moduleFactories__[id];",
		"  if (!factory) throw new Error('找不到模块: ' + id);",
		"  const exports = factory(__vue__, __require__);",
		"  __moduleCache__[id] = exports;",
		"  return exports;",
		"}",
	];

	for (const mod of modules) {
		const { code } = rewriteModuleImports(
			mod.code,
			mod.vaultPath,
			ctx,
		);
		parts.push(
			`__moduleFactories__[${JSON.stringify(mod.canonicalId)}] = function(__vue__, __require__) {`,
			"const __export = (function() {",
			code,
			"})();",
			"return __export && typeof __export === 'object' && __export !== null && 'default' in __export",
			"  ? __export",
			"  : { default: __export };",
			"};",
		);
	}

	if (!moduleMap.has(entryCanonicalId)) {
		throw new Error(`入口模块未注册: ${entryCanonicalId}`);
	}

	parts.push(
		`return __require__(${JSON.stringify(entryCanonicalId)}).default;`,
	);

	return parts.join("\n");
}
