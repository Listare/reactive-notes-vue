import type { CompileSfcResult } from "../compiler/compileSfc";

const compileCache = new Map<string, CompileSfcResult>();

export function compileCacheKey(
	sourcePath: string,
	rawSource: string,
): string {
	return `${sourcePath}\0${rawSource}`;
}

export function getCachedCompile(
	key: string,
): CompileSfcResult | undefined {
	return compileCache.get(key);
}

export function setCachedCompile(
	key: string,
	result: CompileSfcResult,
): void {
	compileCache.set(key, result);
}

/** Clears all plugin-side caches before a forced re-render. */
export function invalidateVueInteractiveCaches(): void {
	compileCache.clear();
}
