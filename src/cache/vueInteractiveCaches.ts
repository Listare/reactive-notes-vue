import type { CompileSfcResult } from "../compiler/compileSfc";
import type { LoadedModuleSource } from "../bundler/types";
import { hashContent } from "../utils/hashContent";
import {
	clearDiskCacheFiles,
	readCompileFromDisk,
	readEsmFromDisk,
	readModuleFromDisk,
	writeCompileToDisk,
	writeEsmToDisk,
	writeModuleToDisk,
} from "./diskCacheStore";

const COMPILE_CACHE_MAX = 64;
const MODULE_CACHE_MAX = 200;
const ESM_CACHE_MAX = 200;

const compileCache = new Map<string, CompileSfcResult>();
const moduleCache = new Map<string, ModuleCacheEntry>();
const esmCache = new Map<string, string>();

interface ModuleCacheEntry {
	contentHash: string;
	enableExtendedNodeBuiltins: boolean;
	module: LoadedModuleSource;
}

export interface CacheWriteOptions {
	/** When false, skip persisting to disk (e.g. hydrating from disk). Default true. */
	persist?: boolean;
}

export function compileCacheKey(
	sourcePath: string,
	rawSource: string,
	enableExtendedNodeBuiltins = false,
	customScriptPath = "",
): string {
	const contentKey = hashContent(rawSource);
	return `${sourcePath}\0${enableExtendedNodeBuiltins ? "1" : "0"}\0${customScriptPath}\0${contentKey}`;
}

/** Sync memory lookup (tests / callers that already hydrated). */
export function getCachedCompile(
	key: string,
): CompileSfcResult | undefined {
	const hit = compileCache.get(key);
	if (!hit) return undefined;
	compileCache.delete(key);
	compileCache.set(key, hit);
	return hit;
}

/** Memory first, then optional disk hydrate. */
export async function lookupCachedCompile(
	key: string,
): Promise<CompileSfcResult | undefined> {
	const mem = getCachedCompile(key);
	if (mem) return mem;
	const disk = await readCompileFromDisk(key);
	if (!disk) return undefined;
	setCachedCompile(key, disk, { persist: false });
	return disk;
}

export function setCachedCompile(
	key: string,
	result: CompileSfcResult,
	options?: CacheWriteOptions,
): void {
	if (compileCache.has(key)) {
		compileCache.delete(key);
	}
	compileCache.set(key, result);
	trimCache(compileCache, COMPILE_CACHE_MAX);
	if (options?.persist === false) return;
	void writeCompileToDisk(key, result);
}

export function getCachedLoadedModule(
	canonicalId: string,
	contentHash: string,
	enableExtendedNodeBuiltins: boolean,
): LoadedModuleSource | undefined {
	const entry = moduleCache.get(canonicalId);
	if (!entry) return undefined;
	if (entry.contentHash !== contentHash) return undefined;
	if (entry.enableExtendedNodeBuiltins !== enableExtendedNodeBuiltins) {
		return undefined;
	}
	moduleCache.delete(canonicalId);
	moduleCache.set(canonicalId, entry);
	return cloneLoadedModule(entry.module);
}

export async function lookupCachedLoadedModule(
	canonicalId: string,
	contentHash: string,
	enableExtendedNodeBuiltins: boolean,
): Promise<LoadedModuleSource | undefined> {
	const mem = getCachedLoadedModule(
		canonicalId,
		contentHash,
		enableExtendedNodeBuiltins,
	);
	if (mem) return mem;
	const disk = await readModuleFromDisk(
		canonicalId,
		contentHash,
		enableExtendedNodeBuiltins,
	);
	if (!disk) return undefined;
	setCachedLoadedModule(
		canonicalId,
		contentHash,
		enableExtendedNodeBuiltins,
		disk,
		{ persist: false },
	);
	return cloneLoadedModule(disk);
}

export function setCachedLoadedModule(
	canonicalId: string,
	contentHash: string,
	enableExtendedNodeBuiltins: boolean,
	module: LoadedModuleSource,
	options?: CacheWriteOptions,
): void {
	if (moduleCache.has(canonicalId)) {
		moduleCache.delete(canonicalId);
	}
	moduleCache.set(canonicalId, {
		contentHash,
		enableExtendedNodeBuiltins,
		module: cloneLoadedModule(module),
	});
	trimCache(moduleCache, MODULE_CACHE_MAX);
	if (options?.persist === false) return;
	void writeModuleToDisk(
		canonicalId,
		contentHash,
		enableExtendedNodeBuiltins,
		module,
	);
}

export function getCachedEsm(url: string): string | undefined {
	const hit = esmCache.get(url);
	if (hit === undefined) return undefined;
	esmCache.delete(url);
	esmCache.set(url, hit);
	return hit;
}

export async function lookupCachedEsm(url: string): Promise<string | undefined> {
	const mem = getCachedEsm(url);
	if (mem !== undefined) return mem;
	const disk = await readEsmFromDisk(url);
	if (disk === undefined) return undefined;
	setCachedEsm(url, disk, { persist: false });
	return disk;
}

export function setCachedEsm(
	url: string,
	body: string,
	options?: CacheWriteOptions,
): void {
	if (esmCache.has(url)) {
		esmCache.delete(url);
	}
	esmCache.set(url, body);
	trimCache(esmCache, ESM_CACHE_MAX);
	if (options?.persist === false) return;
	void writeEsmToDisk(url, body);
}

/** Clears memory caches and schedules a disk wipe. */
export function invalidateVueInteractiveCaches(): void {
	compileCache.clear();
	moduleCache.clear();
	esmCache.clear();
	void clearDiskCacheFiles();
}

/** Clears memory + awaits disk wipe (settings "清除缓存"). */
export async function clearAllVueInteractiveCaches(): Promise<void> {
	compileCache.clear();
	moduleCache.clear();
	esmCache.clear();
	await clearDiskCacheFiles();
}

/** Drops compile cache entries for one note (memory only; disk orphans until clear). */
export function invalidateCompileCacheForNote(sourcePath: string): void {
	const prefix = `${sourcePath}\0`;
	for (const key of [...compileCache.keys()]) {
		if (key.startsWith(prefix)) {
			compileCache.delete(key);
		}
	}
}

function trimCache<V>(cache: Map<string, V>, max: number): void {
	while (cache.size > max) {
		const oldest = cache.keys().next().value;
		if (oldest === undefined) break;
		cache.delete(oldest);
	}
}

function cloneLoadedModule(module: LoadedModuleSource): LoadedModuleSource {
	return {
		canonicalId: module.canonicalId,
		vaultPath: module.vaultPath,
		code: module.code,
		styles: module.styles.map((s) => ({ ...s })),
		dependencies: [...module.dependencies],
		originalLineByEmitted: module.originalLineByEmitted
			? [...module.originalLineByEmitted]
			: undefined,
	};
}
