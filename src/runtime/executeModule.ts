import * as Vue from "vue";
import type { Component } from "vue";
import type { GetThemeSandboxModule } from "./getThemeSandboxModule";
import type { ObsidianSandboxModule } from "./obsidian/proxyClient";

type UrlModule = Record<string, unknown>;

const EMPTY_OBSIDIAN: ObsidianSandboxModule = { default: {} };

const EMPTY_GET_THEME: GetThemeSandboxModule = {
	getTheme: () => "light",
	default: () => "light",
};

async function createImportUrl(): Promise<(url: string) => Promise<UrlModule>> {
	const cache = Object.create(null) as Record<string, UrlModule>;
	return async (url: string): Promise<UrlModule> => {
		const cached = cache[url];
		if (cached) {
			return cached;
		}
		const mod = (await import(
			/* @vite-ignore */
			url
		)) as UrlModule;
		cache[url] = mod;
		return mod;
	};
}

export async function executeModule(
	moduleCode: string,
	obsidian: ObsidianSandboxModule = EMPTY_OBSIDIAN,
	getThemeModule: GetThemeSandboxModule = EMPTY_GET_THEME,
): Promise<Component> {
	const importUrl = await createImportUrl();
	// Runs inside sandbox iframe only; strict mode + injected helpers limit globals.
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	const fn = new Function(
		"__vue__",
		"__importUrl__",
		"__obsidian__",
		"__getTheme__",
		`"use strict";\n${moduleCode}`,
	) as (
		vue: typeof Vue,
		importUrl: (url: string) => Promise<UrlModule>,
		obsidianModule: ObsidianSandboxModule,
		getThemeModuleArg: GetThemeSandboxModule,
	) => Promise<Component>;
	const result = await fn(Vue, importUrl, obsidian, getThemeModule);
	if (result == null || typeof result !== "object") {
		throw new Error("模块未导出有效的 Vue 组件。");
	}
	return result;
}
