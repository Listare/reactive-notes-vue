import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { compileSfc } from "../../../compiler/compileSfc";
import { executeModule } from "../../executeModule";
import { mountWithSuspense } from "../../mountWithSuspense";
import {
	configurePiniaPersistHost,
	resetPiniaPersistHost,
} from "../persistHost";
import { getSharedVueRuntime } from "../../sharedRuntime";

function createMemoryVault() {
	const files = new Map<string, string>();
	const folders = new Set<string>();
	const app = {
		vault: {
			getAbstractFileByPath: vi.fn((path: string) => {
				if (folders.has(path)) return { path, children: [] };
				if (files.has(path)) return { path, extension: "json" };
				return null;
			}),
			read: vi.fn(async (file: { path: string }) => files.get(file.path) ?? ""),
			modify: vi.fn(async (file: { path: string }, content: string) => {
				files.set(file.path, content);
			}),
			create: vi.fn(async (path: string, content: string) => {
				files.set(path, content);
				return { path, extension: "json" };
			}),
			createFolder: vi.fn(async (path: string) => {
				folders.add(path);
			}),
			adapter: {
				exists: vi.fn(async (path: string) => files.has(path) || folders.has(path)),
				read: vi.fn(async (path: string) => files.get(path) ?? ""),
				write: vi.fn(async (path: string, content: string) => {
					files.set(path, content);
				}),
				mkdir: vi.fn(async (path: string) => {
					folders.add(path);
				}),
			},
		},
	};
	return { app, files };
}

describe("pinia vault persist", () => {
	beforeEach(() => {
		resetPiniaPersistHost();
	});

	afterEach(() => {
		resetPiniaPersistHost();
	});

	it("hydrates from JSON and writes on change", async () => {
		const { app, files } = createMemoryVault();
		files.set(
			"notes/counter.json",
			JSON.stringify({ n: 7 }, null, 2) + "\n",
		);
		configurePiniaPersistHost({
			app: app as never,
			getCustomScriptPath: () => "",
		});

		// Ensure plugin is installed on the shared pinia (created in setup).
		getSharedVueRuntime();

		const storeId = `persist-counter-${Math.random().toString(36).slice(2)}`;
		const sfc = `
<template>
  <button class="btn" @click="store.inc()">{{ store.n }}</button>
</template>
<script setup lang="ts">
import { defineStore } from 'pinia'
const useCounter = defineStore(${JSON.stringify(storeId)}, {
  state: () => ({ n: 0 }),
  actions: { inc() { this.n += 1 } },
  persist: './counter.json',
})
const store = useCounter()
</script>
`;

		const { moduleCode } = compileSfc(sfc);
		const component = await executeModule(
			moduleCode,
			undefined,
			undefined,
			undefined,
			undefined,
			[{ vaultPath: "notes/demo.md", blockName: "entry", codeStartLine: 1 }],
		);

		const el = document.createElement("div");
		document.body.appendChild(el);
		const { app: vueApp, whenReady } = mountWithSuspense(component, el);
		await whenReady;
		await vi.waitFor(() => {
			expect(el.querySelector(".btn")?.textContent).toBe("7");
		});

		el.querySelector("button")?.click();
		await nextTick();
		expect(el.querySelector(".btn")?.textContent).toBe("8");

		await vi.waitFor(() => {
			const raw = files.get("notes/counter.json");
			expect(raw).toBeTruthy();
			expect(JSON.parse(raw!)).toEqual({ n: 8 });
		});

		vueApp.unmount();
		el.remove();
	});

	it("resolves @/ persist paths from vault root", async () => {
		const { app, files } = createMemoryVault();
		configurePiniaPersistHost({
			app: app as never,
			getCustomScriptPath: () => "scripts",
		});
		getSharedVueRuntime();

		const storeId = `persist-root-${Math.random().toString(36).slice(2)}`;
		const sfc = `
<template>
  <button class="btn" @click="store.inc()">{{ store.n }}</button>
</template>
<script setup lang="ts">
import { defineStore } from 'pinia'
const useCounter = defineStore(${JSON.stringify(storeId)}, {
  state: () => ({ n: 0 }),
  actions: { inc() { this.n += 1 } },
  persist: { path: '@/state/root-counter.json', debounceMs: 0 },
})
const store = useCounter()
</script>
`;

		const component = await executeModule(
			compileSfc(sfc).moduleCode,
			undefined,
			undefined,
			undefined,
			undefined,
			[{ vaultPath: "notes/demo.md", blockName: "entry", codeStartLine: 1 }],
		);
		const el = document.createElement("div");
		document.body.appendChild(el);
		const { app: vueApp, whenReady } = mountWithSuspense(component, el);
		await whenReady;
		await nextTick();

		el.querySelector("button")?.click();
		await nextTick();

		await vi.waitFor(() => {
			expect(JSON.parse(files.get("state/root-counter.json")!)).toEqual({
				n: 1,
			});
		});

		vueApp.unmount();
		el.remove();
	});
});
