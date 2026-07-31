import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	configureDiskCacheHost,
	resetDiskCacheHost,
} from "../../../cache/diskCacheHost";
import { invalidateVueInteractiveCaches } from "../../../cache/vueInteractiveCaches";
import { loadEsmSource, prefetchEsmGraph } from "../prefetchEsmGraph";

const requestUrl = vi.fn();

vi.mock("obsidian", async () => {
	const actual = await vi.importActual<typeof import("obsidian")>("obsidian");
	return {
		...actual,
		requestUrl: (...args: unknown[]) =>
			requestUrl(...args) as ReturnType<typeof import("obsidian").requestUrl>,
	};
});

describe("prefetchEsmGraph", () => {
	beforeEach(() => {
		resetDiskCacheHost();
		invalidateVueInteractiveCaches();
		requestUrl.mockReset();
	});

	it("returns empty when disk cache disabled", async () => {
		configureDiskCacheHost({
			app: {} as never,
			isEnabled: () => false,
			getRootPath: () => ".cache",
		});
		await expect(
			prefetchEsmGraph(["https://esm.sh/a"]),
		).resolves.toEqual({});
		expect(requestUrl).not.toHaveBeenCalled();
	});

	it("fetches entry and transitive https imports when enabled", async () => {
		const files = new Map<string, string>();
		configureDiskCacheHost({
			app: {
				vault: {
					getAbstractFileByPath: vi.fn((path: string) =>
						files.has(path) ? { path, extension: "json" } : null,
					),
					read: vi.fn(async (file: { path: string }) => {
						const text = files.get(file.path);
						if (text == null) {
							throw new Error(`找不到文件: ${file.path}`);
						}
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
						exists: vi.fn(async () => false),
						mkdir: vi.fn(async () => undefined),
						rmdir: vi.fn(async () => undefined),
					},
				},
			} as never,
			isEnabled: () => true,
			getRootPath: () => ".cache",
		});

		requestUrl.mockImplementation(async (param: { url: string }) => {
			if (param.url === "https://esm.sh/a") {
				return {
					status: 200,
					text: `import "https://esm.sh/b";\nexport default 1;`,
				};
			}
			if (param.url === "https://esm.sh/b") {
				return {
					status: 200,
					text: `export default 2;`,
				};
			}
			return { status: 404, text: "" };
		});

		const sources = await prefetchEsmGraph(["https://esm.sh/a"]);
		expect(sources["https://esm.sh/a"]).toContain("https://esm.sh/b");
		expect(sources["https://esm.sh/b"]).toContain("export default 2");

		const again = await loadEsmSource("https://esm.sh/a");
		expect(again).toBe(sources["https://esm.sh/a"]);
		expect(requestUrl).toHaveBeenCalledTimes(2);
	});
});
