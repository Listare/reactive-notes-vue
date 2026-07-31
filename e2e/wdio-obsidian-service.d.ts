import type ReactiveNotesVuePlugin from "../src/main";

declare module "wdio-obsidian-service" {
	interface InstalledPlugins {
		reactiveNotesVue: ReactiveNotesVuePlugin;
	}
}

export {};
