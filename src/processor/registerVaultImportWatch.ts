import { TFile } from "obsidian";
import type ReactiveNotesVuePlugin from "../main";
import type { VueBlockChild } from "../runtime/VueBlockChild";
import {
	getVueBlocksWatchingVaultPath,
} from "../runtime/vueBlockDependencyIndex";
import { normalizeVaultPath } from "../utils/posixPath";

const DEBOUNCE_MS = 150;

export function registerVaultImportWatch(
	plugin: ReactiveNotesVuePlugin,
): void {
	const pendingPaths = new Set<string>();
	let timer: ReturnType<typeof setTimeout> | null = null;

	const schedulePath = (vaultPath: string): void => {
		pendingPaths.add(normalizeVaultPath(vaultPath));
		if (timer != null) return;
		timer = setTimeout(() => {
			timer = null;
			const paths = new Set(pendingPaths);
			pendingPaths.clear();
			void flushPending(plugin, paths);
		}, DEBOUNCE_MS);
	};

	plugin.registerEvent(
		plugin.app.vault.on("modify", (file) => {
			if (file instanceof TFile) schedulePath(file.path);
		}),
	);
	plugin.registerEvent(
		plugin.app.vault.on("rename", (file, oldPath) => {
			if (file instanceof TFile) {
				schedulePath(oldPath);
				schedulePath(file.path);
			}
		}),
	);
	plugin.registerEvent(
		plugin.app.vault.on("delete", (file) => {
			if (file instanceof TFile) schedulePath(file.path);
		}),
	);
}

async function flushPending(
	plugin: ReactiveNotesVuePlugin,
	paths: Set<string>,
): Promise<void> {
	const blocks = new Set<VueBlockChild>();
	for (const path of paths) {
		for (const block of getVueBlocksWatchingVaultPath(path)) {
			blocks.add(block);
		}
	}
	if (blocks.size === 0) return;

	await Promise.all(
		[...blocks].map((block) => refreshVueBlockFromVault(plugin, block)),
	);
}

async function refreshVueBlockFromVault(
	_plugin: ReactiveNotesVuePlugin,
	block: VueBlockChild,
): Promise<void> {
	await block.refreshFromVault();
}
