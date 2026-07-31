import { requestUrl } from "obsidian";
import { isUrlImportSpecifier } from "../../resolver/isUrlImport";
import {
	lookupCachedEsm,
	setCachedEsm,
} from "../../cache/vueInteractiveCaches";
import { getDiskCacheHost } from "../../cache/diskCacheHost";
import { collectUrlImportsFromCode } from "./urlImports";

export type EsmSourceMap = Record<string, string>;

async function fetchEsmBody(url: string): Promise<string> {
	const response = await requestUrl({ url, throw: false });
	if (response.status < 200 || response.status >= 300) {
		throw new Error(`ESM 下载失败 (${response.status}): ${url}`);
	}
	return response.text;
}

/** Memory → disk → network; persists when disk cache host is enabled. */
export async function loadEsmSource(url: string): Promise<string> {
	if (!isUrlImportSpecifier(url)) {
		throw new Error(`不是有效的 ESM URL: ${url}`);
	}
	const cached = await lookupCachedEsm(url);
	if (cached !== undefined) return cached;
	const body = await fetchEsmBody(url);
	setCachedEsm(url, body);
	return body;
}

/**
 * Prefetches entry CDN URLs and their transitive http(s) imports.
 * Failed URLs are omitted (sandbox falls back to native `import`).
 */
export async function prefetchEsmGraph(
	entryUrls: readonly string[],
): Promise<EsmSourceMap> {
	const host = getDiskCacheHost();
	if (!host?.isEnabled() || entryUrls.length === 0) {
		return {};
	}

	const sources: EsmSourceMap = {};
	const queue = [...entryUrls.filter(isUrlImportSpecifier)];
	const seen = new Set<string>();

	while (queue.length > 0) {
		const url = queue.shift()!;
		if (seen.has(url)) continue;
		seen.add(url);
		try {
			const body = await loadEsmSource(url);
			sources[url] = body;
			for (const dep of collectUrlImportsFromCode(body)) {
				if (!seen.has(dep)) queue.push(dep);
			}
		} catch (e) {
			const err = e instanceof Error ? e : new Error(String(e));
			console.error("esm prefetch failed", url, err);
		}
	}

	return sources;
}
