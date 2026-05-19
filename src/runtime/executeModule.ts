import * as Vue from "vue";
import type { Component } from "vue";

type UrlModule = Record<string, unknown>;

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

export async function executeModule(moduleCode: string): Promise<Component> {
	const importUrl = await createImportUrl();
	// Runs inside sandbox iframe only; strict mode + injected helpers limit globals.
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	const fn = new Function(
		"__vue__",
		"__importUrl__",
		`"use strict";\n${moduleCode}`,
	) as (
		vue: typeof Vue,
		importUrl: (url: string) => Promise<UrlModule>,
	) => Promise<Component>;
	const result = await fn(Vue, importUrl);
	if (result == null || typeof result !== "object") {
		throw new Error("模块未导出有效的 Vue 组件。");
	}
	return result;
}
