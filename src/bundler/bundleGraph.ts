import type {
	BundleResult,
	BundledModuleRecord,
	ModuleLoader,
} from "./types";
import { collectImportsFromCode } from "./collectImports";
import { emitBundle } from "./emitBundle";
import { parseImportSpecifier } from "../resolver/parseImportSpecifier";
import {
	CUSTOM_SCRIPT_PREFIX,
	resolveVaultPath,
	type ResolvePathContext,
} from "../resolver/resolveVaultPath";
import { validateCustomScriptPathWhenUsed } from "../settings/validateCustomScriptPath";

export class BundleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BundleError";
	}
}

function usesCustomScriptPrefix(specifiers: Iterable<string>): boolean {
	for (const spec of specifiers) {
		const { path } = parseImportSpecifier(spec);
		if (path.startsWith(CUSTOM_SCRIPT_PREFIX)) return true;
	}
	return false;
}

function canonicalIdFromRequest(
	specifier: string,
	fromVaultPath: string,
	ctx: ResolvePathContext,
): string {
	const { block } = parseImportSpecifier(specifier);
	const vaultPath = resolveVaultPath(specifier, {
		...ctx,
		fromPath: fromVaultPath,
	});
	return block
		? `${vaultPath}?block=${encodeURIComponent(block)}`
		: vaultPath;
}

/**
 * Resolves the full import graph and emits a single executable module string.
 */
export async function bundleGraph(
	entry: {
		canonicalId: string;
		vaultPath: string;
		code: string;
		styles: import("./types").BundledModuleRecord["styles"];
	},
	ctx: ResolvePathContext,
	loader: ModuleLoader,
	/** Extra specifiers from raw SFC (in case compiler output omits import lines). */
	seedSpecifiers: string[] = [],
): Promise<BundleResult> {
	const records = new Map<string, BundledModuleRecord>();
	const visiting = new Set<string>();
	const visited = new Set<string>();
	const allSpecifiers: string[] = [];

	const queue: { specifier: string; fromVaultPath: string }[] = [];

	const enqueueSpecifier = (specifier: string, fromVaultPath: string) => {
		allSpecifiers.push(specifier);
		queue.push({ specifier, fromVaultPath });
	};

	const enqueueFromCode = (code: string, fromVaultPath: string) => {
		for (const spec of collectImportsFromCode(code)) {
			enqueueSpecifier(spec, fromVaultPath);
		}
	};

	records.set(entry.canonicalId, {
		canonicalId: entry.canonicalId,
		vaultPath: entry.vaultPath,
		code: entry.code,
		styles: [...entry.styles],
	});
	for (const spec of seedSpecifiers) {
		enqueueSpecifier(spec, entry.vaultPath);
	}
	enqueueFromCode(entry.code, entry.vaultPath);

	const allStyles = [...entry.styles];

	while (queue.length > 0) {
		const { specifier, fromVaultPath } = queue.shift()!;
		const id = canonicalIdFromRequest(specifier, fromVaultPath, ctx);

		if (records.has(id)) continue;

		if (visiting.has(id)) {
			throw new BundleError(`检测到循环依赖: ${id}`);
		}
		visiting.add(id);

		const loaded = await loader.loadModule({ specifier, fromVaultPath });
		visiting.delete(id);
		visited.add(id);

		records.set(id, {
			canonicalId: loaded.canonicalId,
			vaultPath: loaded.vaultPath,
			code: loaded.code,
			styles: loaded.styles,
		});
		allStyles.push(...loaded.styles);

		for (const dep of loaded.dependencies) {
			allSpecifiers.push(dep);
			queue.push({ specifier: dep, fromVaultPath: loaded.vaultPath });
		}
	}

	const usesCustomScript = usesCustomScriptPrefix(allSpecifiers);
	try {
		await validateCustomScriptPathWhenUsed(
			ctx.customScriptPath,
			usesCustomScript,
			(p) => loader.fileExists(p),
		);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw new BundleError(msg);
	}

	const moduleCode = emitBundle([...records.values()], entry.canonicalId, ctx);
	return { moduleCode, styles: allStyles };
}
