import type { App } from "obsidian";

export interface PiniaPersistHostConfig {
	app: App;
	/** Current custom-script root (may change when settings are saved). */
	getCustomScriptPath: () => string;
}

let hostConfig: PiniaPersistHostConfig | null = null;

/** Wire Obsidian app + settings into the shared Pinia vault-persist plugin. */
export function configurePiniaPersistHost(
	config: PiniaPersistHostConfig,
): void {
	hostConfig = config;
}

export function getPiniaPersistHost(): PiniaPersistHostConfig | null {
	return hostConfig;
}

/** Test helper: clear host wiring. */
export function resetPiniaPersistHost(): void {
	hostConfig = null;
}
