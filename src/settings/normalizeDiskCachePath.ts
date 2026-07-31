import { normalizeVaultPath } from "../utils/posixPath";

/** Default vault-relative folder for on-disk compile/module caches. */
export const DEFAULT_DISK_CACHE_PATH = ".cache";

/** Trims and normalizes the vault-relative disk cache folder path. */
export function normalizeDiskCachePath(path: string): string {
	const trimmed = path.trim().replace(/\/+$/, "");
	return trimmed
		? normalizeVaultPath(trimmed)
		: DEFAULT_DISK_CACHE_PATH;
}
