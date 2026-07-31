import { describe, expect, it, vi } from "vitest";
import {
	isConfigFolderPath,
	readVaultText,
	readVaultTextCoalesced,
	vaultPathExists,
} from "../vaultFileAccess";

function mockApp(options: {
	abstract?: unknown;
	adapterExists?: boolean;
	adapterRead?: string;
}) {
	return {
		vault: {
			getAbstractFileByPath: vi.fn(() => options.abstract ?? null),
			read: vi.fn(async () => "from-tfile"),
			adapter: {
				exists: vi.fn(async () => options.adapterExists ?? false),
				read: vi.fn(async () => options.adapterRead ?? ""),
			},
		},
	} as never;
}

describe("isConfigFolderPath", () => {
	it("detects .obsidian paths", () => {
		expect(isConfigFolderPath(".obsidian/plugins/foo/scripts")).toBe(true);
		expect(isConfigFolderPath("scripts/foo.ts")).toBe(false);
	});
});

describe("vaultPathExists", () => {
	it("returns true for indexed files", async () => {
		const app = mockApp({
			abstract: { path: "scripts/a.ts", extension: "ts" },
		});
		await expect(vaultPathExists(app, "scripts/a.ts")).resolves.toBe(true);
	});

	it("falls back to adapter for config-folder paths", async () => {
		const app = mockApp({ adapterExists: true });
		await expect(
			vaultPathExists(app, ".obsidian/plugins/reactive-notes/scripts"),
		).resolves.toBe(true);
	});
});

describe("readVaultText", () => {
	it("reads via adapter when not indexed", async () => {
		const app = mockApp({
			adapterExists: true,
			adapterRead: "vue source",
		});
		await expect(
			readVaultText(
				app,
				".obsidian/plugins/reactive-notes/scripts/Panel.vue",
			),
		).resolves.toBe("vue source");
	});

	it("throws when missing everywhere", async () => {
		const app = mockApp({});
		await expect(readVaultText(app, "missing.vue")).rejects.toThrow(
			"找不到文件: missing.vue",
		);
	});
});

describe("readVaultTextCoalesced", () => {
	it("shares one in-flight read for the same path", async () => {
		let resolveRead!: (value: string) => void;
		const readPromise = new Promise<string>((resolve) => {
			resolveRead = resolve;
		});
		const read = vi.fn(() => readPromise);
		const app = {
			vault: {
				getAbstractFileByPath: vi.fn(() => ({
					path: "note.md",
					extension: "md",
				})),
				read,
				adapter: {
					exists: vi.fn(async () => false),
					read: vi.fn(async () => ""),
				},
			},
		} as never;

		const a = readVaultTextCoalesced(app, "note.md");
		const b = readVaultTextCoalesced(app, "note.md");
		expect(a).toBe(b);
		expect(read).toHaveBeenCalledTimes(1);
		resolveRead("shared");
		await expect(Promise.all([a, b])).resolves.toEqual(["shared", "shared"]);
	});
});
