import { describe, expect, it, vi } from "vitest";
import {
	isConfigFolderPath,
	readVaultText,
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
