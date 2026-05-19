import type { App } from "obsidian";
import { bundleGraph } from "../bundler/bundleGraph";
import { collectImportsFromSfc } from "../bundler/collectImports";
import type { CompileSfcResult } from "./compileSfc";
import { compileSfc } from "./compileSfc";
import { createVaultModuleLoader } from "../vault/vaultModuleLoader";
import type { ReactiveNotesVueSettings } from "../settings";
import { normalizeCustomScriptPath } from "../settings/normalizeCustomScriptPath";
import { transpileTypeScript } from "../bundler/transpile";

export interface CompileBlockContext {
	app: App;
	settings: ReactiveNotesVueSettings;
	/** Vault-relative path of the note containing the code block. */
	sourcePath: string;
}

function entryCanonicalId(sourcePath: string): string {
	return `${sourcePath}#vue-interactive-entry`;
}

export async function compileSfcWithImports(
	rawSource: string,
	ctx: CompileBlockContext,
): Promise<CompileSfcResult> {
	const resolveCtx = {
		fromPath: ctx.sourcePath,
		customScriptPath: normalizeCustomScriptPath(
			ctx.settings.customScriptPath,
		),
	};

	const loader = createVaultModuleLoader(ctx.app, resolveCtx);

	const compiled = compileSfc(rawSource, { bundleImports: false });
	const imports = collectImportsFromSfc(rawSource);
	const moduleCode = transpileTypeScript(
		compiled.moduleCode,
		`${ctx.sourcePath}.vue-interactive.ts`,
	);

	if (imports.length === 0) {
		return { ...compiled, moduleCode };
	}

	const entryId = entryCanonicalId(ctx.sourcePath);
	const bundled = await bundleGraph(
		{
			canonicalId: entryId,
			vaultPath: ctx.sourcePath,
			code: moduleCode,
			styles: compiled.styles,
		},
		resolveCtx,
		loader,
		imports,
	);

	return {
		scopeId: compiled.scopeId,
		moduleCode: bundled.moduleCode,
		styles: bundled.styles,
	};
}
