/** `defineStore` option: vault-relative JSON path (same rules as imports). */
export type PiniaVaultPersistOption =
	| string
	| {
			/** Vault path using `./`、`@/`、`@custom-script/` (resolved like imports). */
			path: string;
			/** Debounce writes after state changes (ms). Default 300. */
			debounceMs?: number;
	  };

export interface NormalizedPiniaVaultPersist {
	pathSpecifier: string;
	debounceMs: number;
}

export const DEFAULT_PERSIST_DEBOUNCE_MS = 300;

/** Internal: module vault path used to resolve relative persist paths. */
export const PERSIST_FROM_PATH_KEY = "__persistFromPath";

export function normalizePiniaVaultPersist(
	persist: unknown,
): NormalizedPiniaVaultPersist | null {
	if (persist == null || persist === false) return null;
	if (typeof persist === "string") {
		const pathSpecifier = persist.trim();
		if (!pathSpecifier) return null;
		return {
			pathSpecifier,
			debounceMs: DEFAULT_PERSIST_DEBOUNCE_MS,
		};
	}
	if (typeof persist === "object") {
		const record = persist as Record<string, unknown>;
		const pathSpecifier =
			typeof record.path === "string" ? record.path.trim() : "";
		if (!pathSpecifier) return null;
		const debounceMs =
			typeof record.debounceMs === "number" &&
			Number.isFinite(record.debounceMs) &&
			record.debounceMs >= 0
				? record.debounceMs
				: DEFAULT_PERSIST_DEBOUNCE_MS;
		return { pathSpecifier, debounceMs };
	}
	return null;
}
