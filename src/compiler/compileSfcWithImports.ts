import type { App } from "obsidian";
import {
	compileCacheKey,
	lookupCachedCompile,
	setCachedCompile,
} from "../cache/vueInteractiveCaches";
import { bundleGraph } from "../bundler/bundleGraph";
import { collectImportsFromSfc } from "../bundler/collectImports";
import type { CompileSfcResult } from "./compileSfc";
import { compileSfc } from "./compileSfc";
import { createVaultModuleLoader } from "../vault/vaultModuleLoader";
import type { ReactiveNotesVueSettings } from "../settings";
import { normalizeCustomScriptPath } from "../settings/normalizeCustomScriptPath";
import { singleModuleStackRegion } from "../runtime/stackTrace";
import { shiftLineMapDown } from "./sourceLineMap";
import {
	collectNodeBuiltinSpecifiersFromSfc,
	validateNodeBuiltinImports,
} from "./validateNodeBuiltinImports";

export interface CompileBlockContext {
	app: App;
	settings: ReactiveNotesVueSettings;
	/** Vault-relative path of the note containing the code block. */
	sourcePath: string;
}

function entryCanonicalId(sourcePath: string): string {
	return `${sourcePath}#vue-interactive-entry`;
}

export type CompileBlockOutput = CompileSfcResult & { fromCache: boolean };

export async function compileSfcWithImports(
	rawSource: string,
	ctx: CompileBlockContext,
): Promise<CompileBlockOutput> {
	const enableExtended = ctx.settings.enableExtendedNodeBuiltins;
	const customScriptPath = normalizeCustomScriptPath(
		ctx.settings.customScriptPath,
	);
	const cacheKey = compileCacheKey(
		ctx.sourcePath,
		rawSource,
		enableExtended,
		customScriptPath,
	);
	const cached = await lookupCachedCompile(cacheKey);
	if (cached) {
		return { ...cached, fromCache: true };
	}

	validateNodeBuiltinImports(
		collectNodeBuiltinSpecifiersFromSfc(rawSource),
		enableExtended,
	);

	const resolveCtx = {
		fromPath: ctx.sourcePath,
		customScriptPath,
		enableExtendedNodeBuiltins: enableExtended,
	};

	const loader = createVaultModuleLoader(ctx.app, resolveCtx);

	const compiled = compileSfc(rawSource, { bundleImports: false });
	const imports = collectImportsFromSfc(rawSource);
	const moduleCode = compiled.moduleCode;

	let result: CompileSfcResult;

	if (imports.length === 0) {
		const piniaPrelude = `const __pinia__ = __piniaFor__(${JSON.stringify(ctx.sourcePath)});\n`;
		result = {
			...compiled,
			moduleCode: `${piniaPrelude}${moduleCode}`,
			stackRegions: [
				singleModuleStackRegion(
					ctx.sourcePath,
					entryCanonicalId(ctx.sourcePath),
					shiftLineMapDown(compiled.originalLineByEmitted, 1),
				),
			],
			vaultDependencies: [],
		};
	} else {
		const entryId = entryCanonicalId(ctx.sourcePath);
		const bundled = await bundleGraph(
			{
				canonicalId: entryId,
				vaultPath: ctx.sourcePath,
				code: moduleCode,
				styles: compiled.styles,
				originalLineByEmitted: compiled.originalLineByEmitted,
			},
			resolveCtx,
			loader,
			imports,
		);

		result = {
			scopeId: compiled.scopeId,
			moduleCode: bundled.moduleCode,
			styles: bundled.styles,
			stackRegions: bundled.stackRegions,
			vaultDependencies: bundled.vaultDependencies,
			urlDependencies: bundled.urlDependencies,
			originalLineByEmitted: compiled.originalLineByEmitted,
		};
	}

	setCachedCompile(cacheKey, result);
	return { ...result, fromCache: false };
}
