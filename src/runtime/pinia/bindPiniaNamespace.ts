import type * as PiniaNS from "pinia";
import { PERSIST_FROM_PATH_KEY } from "./persistTypes";

type DefineStore = (typeof PiniaNS)["defineStore"];

/**
 * Returns a Pinia module namespace whose `defineStore` stamps the defining
 * module's vault path for relative `persist` resolution.
 */
export function bindPiniaNamespace(
	piniaNs: typeof PiniaNS,
	fromPath: string,
): typeof PiniaNS {
	const defineStore = ((
		id: string,
		setupOrOptions: unknown,
		extraOptions?: unknown,
	) => {
		if (typeof setupOrOptions === "function") {
			const opts = {
				...(extraOptions !== null &&
				typeof extraOptions === "object"
					? (extraOptions as Record<string, unknown>)
					: {}),
				[PERSIST_FROM_PATH_KEY]: fromPath,
			};
			return piniaNs.defineStore(
				id,
				setupOrOptions as never,
				opts as never,
			);
		}
		const opts = {
			...(setupOrOptions !== null && typeof setupOrOptions === "object"
				? (setupOrOptions as Record<string, unknown>)
				: {}),
			[PERSIST_FROM_PATH_KEY]: fromPath,
		};
		return piniaNs.defineStore(id, opts as never);
	}) as DefineStore;

	return new Proxy(piniaNs, {
		get(target, prop, receiver) {
			if (prop === "defineStore") return defineStore;
			return Reflect.get(target, prop, receiver) as unknown;
		},
	});
}

/** Factory injected as `__piniaFor__` into sandbox modules. */
export type PiniaForPath = (fromPath: string) => typeof PiniaNS;

export function createPiniaForPath(
	piniaNs: typeof PiniaNS,
): PiniaForPath {
	const cache = new Map<string, typeof PiniaNS>();
	return (fromPath: string) => {
		const key = fromPath || "";
		const cached = cache.get(key);
		if (cached) return cached;
		const bound = bindPiniaNamespace(piniaNs, key);
		cache.set(key, bound);
		return bound;
	};
}
