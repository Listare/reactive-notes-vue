import {
	collectUrlImportsFromCode,
	rewriteUrlImports,
} from "./urlImports";

type UrlModule = Record<string, unknown>;

class EsmCycleError extends Error {
	constructor(url: string) {
		super(`ESM_CYCLE:${url}`);
		this.name = "EsmCycleError";
	}
}

/**
 * Builds `__importUrl__`: prefers prefetched sources via blob URLs (with
 * transitive http(s) imports rewritten), otherwise native `import(url)`.
 */
export function createImportUrl(
	esmSources: Readonly<Record<string, string>> = {},
): (url: string) => Promise<UrlModule> {
	const moduleCache = Object.create(null) as Record<string, UrlModule>;
	const blobUrlBySource = new Map<string, string>();
	const stack = new Set<string>();

	async function materializeBlobUrl(url: string): Promise<string> {
		const existing = blobUrlBySource.get(url);
		if (existing) return existing;
		if (stack.has(url)) {
			throw new EsmCycleError(url);
		}

		const source = esmSources[url];
		if (source === undefined) {
			throw new Error(`缺少预取的 ESM 源码: ${url}`);
		}

		stack.add(url);
		try {
			const deps = collectUrlImportsFromCode(source).filter(
				(dep) => Object.prototype.hasOwnProperty.call(esmSources, dep),
			);
			for (const dep of deps) {
				try {
					await materializeBlobUrl(dep);
				} catch (e) {
					if (e instanceof EsmCycleError) continue;
					throw e;
				}
			}
			const rewritten = rewriteUrlImports(source, blobUrlBySource);
			const blobUrl = URL.createObjectURL(
				new Blob([rewritten], { type: "text/javascript" }),
			);
			blobUrlBySource.set(url, blobUrl);
			return blobUrl;
		} finally {
			stack.delete(url);
		}
	}

	return async (url: string): Promise<UrlModule> => {
		const cached = moduleCache[url];
		if (cached) return cached;

		let mod: UrlModule;
		if (Object.prototype.hasOwnProperty.call(esmSources, url)) {
			const blobUrl = await materializeBlobUrl(url);
			mod = (await import(
				/* @vite-ignore */
				blobUrl
			)) as UrlModule;
		} else {
			mod = (await import(
				/* @vite-ignore */
				url
			)) as UrlModule;
		}
		moduleCache[url] = mod;
		return mod;
	};
}
