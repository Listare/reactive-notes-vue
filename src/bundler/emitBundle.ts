import type { BundledModuleRecord } from "./types";
import { rewriteModuleImports } from "./rewriteModuleImports";
import type { ResolvePathContext } from "../resolver/resolveVaultPath";
import {
	blockNameFromCanonicalId,
	countLines,
	type StackCodeRegion,
} from "../runtime/stackTrace";

export interface EmitBundleResult {
	moduleCode: string;
	stackRegions: StackCodeRegion[];
}

/**
 * Wraps modules into one async body for sandbox `new Function` helpers including `__math__`.
 * Uses lazy `__require__` so dependency factories run before dependents.
 */
export function emitBundle(
	modules: BundledModuleRecord[],
	entryCanonicalId: string,
	ctx: ResolvePathContext,
): EmitBundleResult {
	const moduleMap = new Map(
		modules.map((m) => [m.canonicalId, m] as const),
	);

	const parts: string[] = [];
	const stackRegions: StackCodeRegion[] = [];
	let currentLine = 1;

	const append = (chunk: string): void => {
		parts.push(chunk);
		currentLine += countLines(chunk);
	};

	append("const __moduleFactories__ = Object.create(null);");
	append("const __moduleCache__ = Object.create(null);");
	append(
		[
			"async function __require__(id) {",
			"  if (Object.prototype.hasOwnProperty.call(__moduleCache__, id)) {",
			"    return __moduleCache__[id];",
			"  }",
			"  const factory = __moduleFactories__[id];",
			"  if (!factory) throw new Error('找不到模块: ' + id);",
			"  const exports = {};",
			"  __moduleCache__[id] = exports;",
			"  const raw = await factory(__vue__, __require__, __importUrl__, __obsidian__, __getTheme__, __math__);",
			"  const resolved = raw && typeof raw === 'object' && raw !== null && 'default' in raw",
			"    ? raw",
			"    : { default: raw };",
			"  Object.assign(exports, resolved);",
			"  return exports;",
			"}",
		].join("\n"),
	);

	for (const mod of modules) {
		const { code } = rewriteModuleImports(
			mod.code,
			mod.vaultPath,
			ctx,
		);
		append(
			`__moduleFactories__[${JSON.stringify(mod.canonicalId)}] = function(__vue__, __require__, __importUrl__, __obsidian__, __getTheme__, __math__) {`,
		);
		append("return (async function() {");
		append("const __export = await (async function() {");
		const codeStartLine = currentLine;
		append(code);
		stackRegions.push({
			vaultPath: mod.vaultPath,
			blockName: blockNameFromCanonicalId(mod.canonicalId),
			codeStartLine,
		});
		append("})();");
		append(
			[
				"return __export && typeof __export === 'object' && __export !== null && 'default' in __export",
				"  ? __export",
				"  : { default: __export };",
				"})();",
				"};",
			].join("\n"),
		);
	}

	if (!moduleMap.has(entryCanonicalId)) {
		throw new Error(`入口模块未注册: ${entryCanonicalId}`);
	}

	append(
		`return (async () => (await __require__(${JSON.stringify(entryCanonicalId)})).default)();`,
	);

	return { moduleCode: parts.join("\n"), stackRegions };
}
