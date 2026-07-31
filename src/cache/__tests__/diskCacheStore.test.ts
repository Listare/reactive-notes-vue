import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	compileDiskFilePath,
	moduleDiskFilePath,
	esmDiskFilePath,
	readCompileFromDisk,
	readModuleFromDisk,
	writeCompileToDisk,
	writeModuleToDisk,
	clearDiskCacheFiles,
} from "../diskCacheStore";
import {
	configureDiskCacheHost,
	resetDiskCacheHost,
} from "../diskCacheHost";
import { hashContent } from "../../utils/hashContent";

const stubCompile = {
	moduleCode: "return {}",
	styles: [],
	scopeId: "s",
	stackRegions: [],
	vaultDependencies: [],
	urlDependencies: [],
	originalLineByEmitted: [],
};

const stubModule = {
	canonicalId: "lib/A.vue",
	vaultPath: "lib/A.vue",
	code: "return {}",
	styles: [],
	dependencies: [],
};

function mockApp(files: Map<string, string>) {
	return {
		vault: {
			getAbstractFileByPath: vi.fn((path: string) => {
				if (files.has(path)) {
					return { path, extension: "json" };
				}
				return null;
			}),
			read: vi.fn(async (file: { path: string }) => {
				const text = files.get(file.path);
				if (text == null) throw new Error(`找不到文件: ${file.path}`);
				return text;
			}),
			modify: vi.fn(async (file: { path: string }, data: string) => {
				files.set(file.path, data);
			}),
			create: vi.fn(async (path: string, data: string) => {
				files.set(path, data);
				return { path, extension: "json" };
			}),
			createFolder: vi.fn(async () => undefined),
			adapter: {
				exists: vi.fn(async (path: string) => files.has(path) || path === ".cache/reactive-notes-vue"),
				read: vi.fn(async () => ""),
				write: vi.fn(async () => undefined),
				mkdir: vi.fn(async () => undefined),
				rmdir: vi.fn(async (path: string) => {
					for (const key of [...files.keys()]) {
						if (key === path || key.startsWith(`${path}/`)) {
							files.delete(key);
						}
					}
				}),
			},
		},
	};
}

describe("diskCacheStore", () => {
	beforeEach(() => {
		resetDiskCacheHost();
	});

	it("builds stable hashed file paths", () => {
		const key = `note.md${"\0"}1${"\0"}${"\0"}abcd`;
		expect(compileDiskFilePath(".cache", key)).toBe(
			`.cache/reactive-notes-vue/compile/${hashContent(key)}.json`,
		);
		expect(
			moduleDiskFilePath(".cache", "a.vue", "hash", true),
		).toMatch(/^\.cache\/reactive-notes-vue\/modules\/[0-9a-f]{8}\.json$/);
		expect(esmDiskFilePath(".cache", "https://esm.sh/a")).toBe(
			`.cache/reactive-notes-vue/esm/${hashContent("https://esm.sh/a")}.json`,
		);
	});

	it("returns undefined when disk cache is disabled", async () => {
		const files = new Map<string, string>();
		const app = mockApp(files);
		configureDiskCacheHost({
			app: app as never,
			isEnabled: () => false,
			getRootPath: () => ".cache",
		});
		await writeCompileToDisk("k", stubCompile);
		expect(files.size).toBe(0);
		await expect(readCompileFromDisk("k")).resolves.toBeUndefined();
	});

	it("round-trips compile and module payloads", async () => {
		const files = new Map<string, string>();
		const app = mockApp(files);
		configureDiskCacheHost({
			app: app as never,
			isEnabled: () => true,
			getRootPath: () => ".cache",
		});

		await writeCompileToDisk("note\0key", stubCompile);
		await expect(readCompileFromDisk("note\0key")).resolves.toEqual(
			stubCompile,
		);
		await expect(readCompileFromDisk("other")).resolves.toBeUndefined();

		await writeModuleToDisk("lib/A.vue", "h1", false, stubModule);
		await expect(
			readModuleFromDisk("lib/A.vue", "h1", false),
		).resolves.toEqual(stubModule);
		await expect(
			readModuleFromDisk("lib/A.vue", "h2", false),
		).resolves.toBeUndefined();
	});

	it("clears the plugin cache folder", async () => {
		const files = new Map<string, string>();
		const app = mockApp(files);
		configureDiskCacheHost({
			app: app as never,
			isEnabled: () => true,
			getRootPath: () => ".cache",
		});
		await writeCompileToDisk("k", stubCompile);
		expect(files.size).toBeGreaterThan(0);
		await clearDiskCacheFiles();
		expect(app.vault.adapter.rmdir).toHaveBeenCalledWith(
			".cache/reactive-notes-vue",
			true,
		);
	});
});
