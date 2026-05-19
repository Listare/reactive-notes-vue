import type ReactiveNotesVuePlugin from "../main";
import { refreshVueInteractiveBlocksOnActivePage } from "./refreshVueInteractiveBlocks";

export function registerCommands(plugin: ReactiveNotesVuePlugin): void {
	plugin.addCommand({
		id: "refresh-vue-interactive-blocks",
		name: "刷新当前笔记中的 vue-interactive 块",
		callback: () => {
			void refreshVueInteractiveBlocksOnActivePage(plugin);
		},
	});
}
