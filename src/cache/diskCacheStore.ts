import type { CompileSfcResult } from "../compiler/compileSfc";
import type { LoadedModuleSource } from "../bundler/types";
import { hashContent } from "../utils/hashContent";
import { posixJoin } from "../utils/posixPath";
import {
	isVaultFileNotFoundError,
	readVaultText,
	vaultPathExists,
	writeVaultText,
} from "../vault/vaultFileAccess";
import { getDiskCacheHost } from "./diskCacheHost";

const CACHE_FORMAT_VERSION = 1 as const;
const PLUGIN_CACHE_DIR = "reactive-notes-vue";

interface DiskCompilePayload {
	version: typeof CACHE_FORMAT_VERSION;
	key: string;
	result: CompileSfcResult;
}

interface DiskModulePayload {
	version: typeof CACHE_FORMAT_VERSION;
	canonicalId: string;
	contentHash: string;
	enableExtendedNodeBuiltins: boolean;
	module: LoadedModuleSource;
}

interface DiskEsmPayload {
	version: typeof CACHE_FORMAT_VERSION;
	url: string;
	body: string;
}

/** Serializes disk writes/clears so wipe does not race with persist. */
let diskQueue: Promise<void> = Promise.resolve();

function enqueueDiskOp(op: () => Promise<void>): Promise<void> {
	const run = diskQueue.then(op, op);
	diskQueue = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
}

function pluginCacheRoot(rootPath: string): string {
	return posixJoin(rootPath, PLUGIN_CACHE_DIR);
}

export function compileDiskFilePath(rootPath: string, cacheKey: string): string {
	return posixJoin(
		pluginCacheRoot(rootPath),
		"compile",
		`${hashContent(cacheKey)}.json`,
	);
}

export function moduleDiskFilePath(
	rootPath: string,
	canonicalId: string,
	contentHash: string,
	enableExtendedNodeBuiltins: boolean,
): string {
	const fileKey = hashContent(
		`${canonicalId}\0${contentHash}\0${enableExtendedNodeBuiltins ? "1" : "0"}`,
	);
	return posixJoin(pluginCacheRoot(rootPath), "modules", `${fileKey}.json`);
}

export function esmDiskFilePath(rootPath: string, url: string): string {
	return posixJoin(
		pluginCacheRoot(rootPath),
		"esm",
		`${hashContent(url)}.json`,
	);
}

export async function readCompileFromDisk(
	cacheKey: string,
): Promise<CompileSfcResult | undefined> {
	const host = getDiskCacheHost();
	if (!host?.isEnabled()) return undefined;
	const path = compileDiskFilePath(host.getRootPath(), cacheKey);
	try {
		const text = await readVaultText(host.app, path);
		const parsed = JSON.parse(text) as DiskCompilePayload;
		if (
			parsed?.version !== CACHE_FORMAT_VERSION ||
			parsed.key !== cacheKey ||
			!parsed.result ||
			typeof parsed.result.moduleCode !== "string"
		) {
			return undefined;
		}
		return {
			...parsed.result,
			urlDependencies: parsed.result.urlDependencies ?? [],
			vaultDependencies: parsed.result.vaultDependencies ?? [],
		};
	} catch (e) {
		if (isVaultFileNotFoundError(e)) return undefined;
		if (e instanceof SyntaxError) return undefined;
		console.error("read compile disk cache failed", e);
		return undefined;
	}
}

export async function writeCompileToDisk(
	cacheKey: string,
	result: CompileSfcResult,
): Promise<void> {
	const host = getDiskCacheHost();
	if (!host?.isEnabled()) return;
	const path = compileDiskFilePath(host.getRootPath(), cacheKey);
	const payload: DiskCompilePayload = {
		version: CACHE_FORMAT_VERSION,
		key: cacheKey,
		result,
	};
	await enqueueDiskOp(async () => {
		if (!host.isEnabled()) return;
		await writeVaultText(host.app, path, JSON.stringify(payload));
	});
}

export async function readModuleFromDisk(
	canonicalId: string,
	contentHash: string,
	enableExtendedNodeBuiltins: boolean,
): Promise<LoadedModuleSource | undefined> {
	const host = getDiskCacheHost();
	if (!host?.isEnabled()) return undefined;
	const path = moduleDiskFilePath(
		host.getRootPath(),
		canonicalId,
		contentHash,
		enableExtendedNodeBuiltins,
	);
	try {
		const text = await readVaultText(host.app, path);
		const parsed = JSON.parse(text) as DiskModulePayload;
		if (
			parsed?.version !== CACHE_FORMAT_VERSION ||
			parsed.canonicalId !== canonicalId ||
			parsed.contentHash !== contentHash ||
			parsed.enableExtendedNodeBuiltins !== enableExtendedNodeBuiltins ||
			!parsed.module ||
			typeof parsed.module.code !== "string"
		) {
			return undefined;
		}
		return parsed.module;
	} catch (e) {
		if (isVaultFileNotFoundError(e)) return undefined;
		if (e instanceof SyntaxError) return undefined;
		console.error("read module disk cache failed", e);
		return undefined;
	}
}

export async function writeModuleToDisk(
	canonicalId: string,
	contentHash: string,
	enableExtendedNodeBuiltins: boolean,
	module: LoadedModuleSource,
): Promise<void> {
	const host = getDiskCacheHost();
	if (!host?.isEnabled()) return;
	const path = moduleDiskFilePath(
		host.getRootPath(),
		canonicalId,
		contentHash,
		enableExtendedNodeBuiltins,
	);
	const payload: DiskModulePayload = {
		version: CACHE_FORMAT_VERSION,
		canonicalId,
		contentHash,
		enableExtendedNodeBuiltins,
		module,
	};
	await enqueueDiskOp(async () => {
		if (!host.isEnabled()) return;
		await writeVaultText(host.app, path, JSON.stringify(payload));
	});
}

export async function readEsmFromDisk(url: string): Promise<string | undefined> {
	const host = getDiskCacheHost();
	if (!host?.isEnabled()) return undefined;
	const path = esmDiskFilePath(host.getRootPath(), url);
	try {
		const text = await readVaultText(host.app, path);
		const parsed = JSON.parse(text) as DiskEsmPayload;
		if (
			parsed?.version !== CACHE_FORMAT_VERSION ||
			parsed.url !== url ||
			typeof parsed.body !== "string"
		) {
			return undefined;
		}
		return parsed.body;
	} catch (e) {
		if (isVaultFileNotFoundError(e)) return undefined;
		if (e instanceof SyntaxError) return undefined;
		console.error("read esm disk cache failed", e);
		return undefined;
	}
}

export async function writeEsmToDisk(url: string, body: string): Promise<void> {
	const host = getDiskCacheHost();
	if (!host?.isEnabled()) return;
	const path = esmDiskFilePath(host.getRootPath(), url);
	const payload: DiskEsmPayload = {
		version: CACHE_FORMAT_VERSION,
		url,
		body,
	};
	await enqueueDiskOp(async () => {
		if (!host.isEnabled()) return;
		await writeVaultText(host.app, path, JSON.stringify(payload));
	});
}

/** Removes the plugin cache folder under the configured root (memory untouched). */
export async function clearDiskCacheFiles(): Promise<void> {
	const host = getDiskCacheHost();
	if (!host) return;
	const root = pluginCacheRoot(host.getRootPath());
	await enqueueDiskOp(async () => {
		if (!(await vaultPathExists(host.app, root))) return;
		await host.app.vault.adapter.rmdir(root, true);
	});
}
