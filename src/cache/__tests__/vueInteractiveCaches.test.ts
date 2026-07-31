import { describe, expect, it, beforeEach, vi } from "vitest";
import {
	compileCacheKey,
	getCachedCompile,
	getCachedLoadedModule,
	invalidateCompileCacheForNote,
	invalidateVueInteractiveCaches,
	lookupCachedCompile,
	setCachedCompile,
	setCachedLoadedModule,
} from "../vueInteractiveCaches";
import {
	configureDiskCacheHost,
	resetDiskCacheHost,
} from "../diskCacheHost";
import { writeCompileToDisk } from "../diskCacheStore";
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

describe("vueInteractiveCaches", () => {
	beforeEach(() => {
		resetDiskCacheHost();
		invalidateVueInteractiveCaches();
	});

	it("stores and clears compile results by key", () => {
		const key = compileCacheKey("note.md", "<template></template>");
		setCachedCompile(key, stubCompile);
		expect(getCachedCompile(key)).toEqual(stubCompile);
		invalidateVueInteractiveCaches();
		expect(getCachedCompile(key)).toBeUndefined();
	});

	it("invalidates only entries for one note", () => {
		const a = compileCacheKey("a.md", "block-a");
		const b = compileCacheKey("b.md", "block-b");
		const a2 = compileCacheKey("a.md", "block-a2");
		setCachedCompile(a, stubCompile);
		setCachedCompile(b, stubCompile);
		setCachedCompile(a2, stubCompile);
		invalidateCompileCacheForNote("a.md");
		expect(getCachedCompile(a)).toBeUndefined();
		expect(getCachedCompile(a2)).toBeUndefined();
		expect(getCachedCompile(b)).toEqual(stubCompile);
	});

	it("includes customScriptPath in compile cache key", () => {
		const a = compileCacheKey("note.md", "src", false, "scripts");
		const b = compileCacheKey("note.md", "src", false, "other");
		expect(a).not.toBe(b);
	});

	it("uses content hash so keys stay short", () => {
		const long = "x".repeat(10_000);
		const key = compileCacheKey("note.md", long);
		expect(key.length).toBeLessThan(200);
		expect(key).toContain(hashContent(long));
	});

	it("caches loaded modules by content hash", () => {
		const module = {
			canonicalId: "lib/Button.vue",
			vaultPath: "lib/Button.vue",
			code: "return {}",
			styles: [{ css: ".a{}", scoped: false }],
			dependencies: ["./x"],
		};
		const hash = hashContent("<template></template>");
		setCachedLoadedModule("lib/Button.vue", hash, false, module);
		const hit = getCachedLoadedModule("lib/Button.vue", hash, false);
		expect(hit).toEqual(module);
		expect(hit).not.toBe(module);
		expect(
			getCachedLoadedModule("lib/Button.vue", hashContent("other"), false),
		).toBeUndefined();
		expect(getCachedLoadedModule("lib/Button.vue", hash, true)).toBeUndefined();
	});

	it("evicts oldest compile entries when over capacity", () => {
		for (let i = 0; i < 70; i++) {
			setCachedCompile(compileCacheKey(`n${i}.md`, `src-${i}`), {
				...stubCompile,
				moduleCode: `return ${i}`,
			});
		}
		expect(getCachedCompile(compileCacheKey("n0.md", "src-0"))).toBeUndefined();
		expect(
			getCachedCompile(compileCacheKey("n69.md", "src-69"))?.moduleCode,
		).toBe("return 69");
	});

	it("lookupCachedCompile hydrates memory from disk when enabled", async () => {
		const files = new Map<string, string>();
		const app = {
			vault: {
				getAbstractFileByPath: vi.fn((path: string) =>
					files.has(path) ? { path, extension: "json" } : null,
				),
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
					exists: vi.fn(async () => false),
					mkdir: vi.fn(async () => undefined),
					rmdir: vi.fn(async () => undefined),
				},
			},
		};
		configureDiskCacheHost({
			app: app as never,
			isEnabled: () => true,
			getRootPath: () => ".cache",
		});
		const key = compileCacheKey("disk.md", "src");
		await writeCompileToDisk(key, {
			...stubCompile,
			moduleCode: "from-disk",
		});
		expect(getCachedCompile(key)).toBeUndefined();
		const hit = await lookupCachedCompile(key);
		expect(hit?.moduleCode).toBe("from-disk");
		expect(getCachedCompile(key)?.moduleCode).toBe("from-disk");
	});
});
