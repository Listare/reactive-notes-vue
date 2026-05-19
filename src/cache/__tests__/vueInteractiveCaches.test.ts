import { describe, expect, it } from "vitest";
import {
	compileCacheKey,
	getCachedCompile,
	invalidateCompileCacheForNote,
	invalidateVueInteractiveCaches,
	setCachedCompile,
} from "../vueInteractiveCaches";

describe("vueInteractiveCaches", () => {
	it("stores and clears compile results by key", () => {
		const key = compileCacheKey("note.md", "<template></template>");
		const value = {
			moduleCode: "return {}",
			styles: [],
			scopeId: "s",
			stackRegions: [],
			vaultDependencies: [],
		};
		setCachedCompile(key, value);
		expect(getCachedCompile(key)).toBe(value);
		invalidateVueInteractiveCaches();
		expect(getCachedCompile(key)).toBeUndefined();
	});

	it("invalidates only entries for one note", () => {
		const a = compileCacheKey("a.md", "block-a");
		const b = compileCacheKey("b.md", "block-b");
		const a2 = compileCacheKey("a.md", "block-a2");
		const stub = {
			moduleCode: "return {}",
			styles: [],
			scopeId: "s",
			stackRegions: [],
			vaultDependencies: [],
		};
		setCachedCompile(a, stub);
		setCachedCompile(b, stub);
		setCachedCompile(a2, stub);
		invalidateCompileCacheForNote("a.md");
		expect(getCachedCompile(a)).toBeUndefined();
		expect(getCachedCompile(a2)).toBeUndefined();
		expect(getCachedCompile(b)).toBe(stub);
	});
});
