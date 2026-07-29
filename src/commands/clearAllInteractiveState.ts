import { Notice, TFile } from "obsidian";
import { listVisibleVueInteractiveBlocks } from "../markdown/vueInteractiveFence";
import {
	disposeAllPiniaStores,
	pausePiniaVaultPersistWrites,
	resumePiniaVaultPersistWrites,
	waitForPendingPiniaHydrates,
} from "../runtime/pinia/vaultPersistPlugin";
import { getSharedVueRuntime } from "../runtime/sharedRuntime";
import { forEachVueBlock } from "../runtime/vueBlockRegistry";
import type ReactiveNotesVuePlugin from "../main";

/**
 * Disposes all in-memory Pinia stores and remounts every live vue-interactive block.
 * Persisted JSON files are kept; remounted stores re-hydrate from those files.
 */
export async function clearAllInteractiveState(
	plugin: ReactiveNotesVuePlugin,
): Promise<void> {
	const { pinia } = getSharedVueRuntime();

	pausePiniaVaultPersistWrites();

	let disposed = 0;
	try {
		disposed = disposeAllPiniaStores(pinia);

		const markdownByPath = new Map<string, string>();
		const readMarkdown = async (
			sourcePath: string,
		): Promise<string | null> => {
			const cached = markdownByPath.get(sourcePath);
			if (cached != null) return cached;
			const file = plugin.app.vault.getAbstractFileByPath(sourcePath);
			if (!(file instanceof TFile)) return null;
			const markdown = await plugin.app.vault.read(file);
			markdownByPath.set(sourcePath, markdown);
			return markdown;
		};

		const tasks: Promise<void>[] = [];
		forEachVueBlock((child) => {
			tasks.push(
				(async () => {
					const markdown = await readMarkdown(child.sourcePath);
					if (markdown == null) return;
					const blocks = listVisibleVueInteractiveBlocks(markdown);
					const source = child.resolveSourceForRefresh(blocks);
					if (source == null) return;
					await child.render(source, markdown);
				})(),
			);
		});
		await Promise.all(tasks);
		// Remount creates stores synchronously; hydrate is async — wait before resuming writes.
		await waitForPendingPiniaHydrates();

		new Notice(
			disposed > 0
				? `已重置 ${disposed} 个 Pinia store 并从持久化文件重新加载。`
				: "已重置交互状态并从持久化文件重新加载。",
		);
	} catch (e) {
		const err = e instanceof Error ? e : new Error(String(e));
		console.error("[reactive-notes-vue] clearAllInteractiveState failed", err);
		new Notice(`清除状态失败：${err.message}`);
	} finally {
		resumePiniaVaultPersistWrites();
	}
}
