import type { App } from "obsidian";

export interface DiskCacheHostConfig {
	app: App;
	isEnabled: () => boolean;
	/** Vault-relative root folder (e.g. `.cache`). */
	getRootPath: () => string;
}

let hostConfig: DiskCacheHostConfig | null = null;

/** Wire Obsidian app + settings into the disk cache layer. */
export function configureDiskCacheHost(config: DiskCacheHostConfig): void {
	hostConfig = config;
}

export function getDiskCacheHost(): DiskCacheHostConfig | null {
	return hostConfig;
}

/** Test helper: clear host wiring. */
export function resetDiskCacheHost(): void {
	hostConfig = null;
}
