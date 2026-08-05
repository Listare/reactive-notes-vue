/** Subset of Prism used for vue-interactive editor highlighting. */
export interface PrismLike {
	languages: Record<string, unknown>;
	tokenize: (text: string, grammar: unknown) => unknown;
}

let prismPromise: Promise<PrismLike | null> | null = null;
let prismCached: PrismLike | null | undefined;

/**
 * Loads Obsidian's Prism once. Returns null if unavailable.
 * Callers should treat a resolved null as permanent for this session.
 */
export function ensurePrism(load: () => Promise<unknown>): Promise<PrismLike | null> {
	if (prismCached !== undefined) {
		return Promise.resolve(prismCached);
	}
	if (!prismPromise) {
		prismPromise = load()
			.then((value) => {
				const prism = asPrismLike(value);
				prismCached = prism;
				return prism;
			})
			.catch((err: unknown) => {
				const error =
					err instanceof Error ? err : new Error(String(err));
				console.error("loadPrism for vue-interactive highlight", error);
				prismCached = null;
				return null;
			});
	}
	return prismPromise;
}

export function getCachedPrism(): PrismLike | null {
	return prismCached ?? null;
}

/** Test helper — clears memoized Prism. */
export function resetPrismCacheForTests(): void {
	prismPromise = null;
	prismCached = undefined;
}

function asPrismLike(value: unknown): PrismLike | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as {
		languages?: unknown;
		tokenize?: unknown;
	};
	if (
		!candidate.languages ||
		typeof candidate.languages !== "object" ||
		typeof candidate.tokenize !== "function"
	) {
		return null;
	}
	return value as PrismLike;
}
