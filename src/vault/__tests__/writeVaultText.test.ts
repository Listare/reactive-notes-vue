import { describe, expect, it, vi } from "vitest";
import {
	ensureVaultFolder,
	isVaultFileNotFoundError,
	writeVaultText,
} from "../vaultFileAccess";

function mockApp(options: {
	abstractByPath?: Record<string, unknown>;
	adapterExists?: Set<string>;
	files?: Map<string, string>;
}) {
	const abstractByPath = options.abstractByPath ?? {};
	const adapterExists = options.adapterExists ?? new Set<string>();
	const files = options.files ?? new Map<string, string>();

	return {
		vault: {
			getAbstractFileByPath: vi.fn((path: string) => abstractByPath[path] ?? null),
			read: vi.fn(async (file: { path: string }) => files.get(file.path) ?? ""),
			modify: vi.fn(async (file: { path: string }, content: string) => {
				files.set(file.path, content);
			}),
			create: vi.fn(async (path: string, content: string) => {
				files.set(path, content);
				abstractByPath[path] = { path, extension: "json" };
				return abstractByPath[path];
			}),
			createFolder: vi.fn(async (path: string) => {
				abstractByPath[path] = { path, children: [] };
			}),
			adapter: {
				exists: vi.fn(async (path: string) => adapterExists.has(path) || files.has(path)),
				read: vi.fn(async (path: string) => files.get(path) ?? ""),
				write: vi.fn(async (path: string, content: string) => {
					files.set(path, content);
					adapterExists.add(path);
				}),
				mkdir: vi.fn(async (path: string) => {
					adapterExists.add(path);
				}),
			},
		},
		_files: files,
	} as never as {
		vault: never;
		_files: Map<string, string>;
	};
}

describe("writeVaultText", () => {
	it("creates a new vault file", async () => {
		const app = mockApp({});
		await writeVaultText(app as never, "data/counter.json", '{\n  "n": 1\n}\n');
		expect(app._files.get("data/counter.json")).toContain('"n": 1');
	});

	it("modifies an existing indexed file", async () => {
		const files = new Map([["data/counter.json", '{"n":0}']]);
		const app = mockApp({
			abstractByPath: {
				"data/counter.json": { path: "data/counter.json", extension: "json" },
			},
			files,
		});
		await writeVaultText(app as never, "data/counter.json", '{"n":2}');
		expect(files.get("data/counter.json")).toBe('{"n":2}');
	});

	it("writes config-folder paths via adapter", async () => {
		const app = mockApp({});
		await writeVaultText(
			app as never,
			".obsidian/plugins/reactive-notes-vue/state.json",
			"{}",
		);
		expect(
			app._files.get(".obsidian/plugins/reactive-notes-vue/state.json"),
		).toBe("{}");
	});
});

describe("ensureVaultFolder", () => {
	it("creates nested folders", async () => {
		const app = mockApp({});
		await ensureVaultFolder(app as never, "a/b/c");
		expect(
			(app as { vault: { createFolder: ReturnType<typeof vi.fn> } }).vault
				.createFolder,
		).toHaveBeenCalled();
	});
});

describe("isVaultFileNotFoundError", () => {
	it("detects missing-file errors", () => {
		expect(isVaultFileNotFoundError(new Error("找不到文件: x.json"))).toBe(
			true,
		);
		expect(isVaultFileNotFoundError(new Error("other"))).toBe(false);
	});
});
