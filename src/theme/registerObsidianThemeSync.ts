import type ReactiveNotesVuePlugin from "../main";
import { forEachVueBlock } from "../runtime/vueBlockRegistry";
import { syncVueInteractiveTheme } from "./syncVueInteractiveTheme";

export function applyVueInteractiveThemeSync(
	plugin: ReactiveNotesVuePlugin,
): void {
	syncVueInteractiveTheme(plugin);
	forEachVueBlock((child) => child.syncTheme());
}

function scheduleVueInteractiveThemeSync(
	plugin: ReactiveNotesVuePlugin,
): void {
	queueMicrotask(() => applyVueInteractiveThemeSync(plugin));
}

export function registerObsidianThemeSync(
	plugin: ReactiveNotesVuePlugin,
): void {
	plugin.registerEvent(
		plugin.app.workspace.on("css-change", () => {
			scheduleVueInteractiveThemeSync(plugin);
		}),
	);

	const observer = new MutationObserver(() =>
		scheduleVueInteractiveThemeSync(plugin),
	);
	observer.observe(document.body, {
		attributes: true,
		attributeFilter: ["class"],
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});
	plugin.register(() => observer.disconnect());
}

/** @deprecated use applyVueInteractiveThemeSync */
export const applyFollowObsidianThemeSync = applyVueInteractiveThemeSync;
