import { describe, expect, it } from "vitest";
import {
	compileCacheKey,
	getCachedCompile,
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
		};
		setCachedCompile(key, value);
		expect(getCachedCompile(key)).toBe(value);
		invalidateVueInteractiveCaches();
		expect(getCachedCompile(key)).toBeUndefined();
	});
});
