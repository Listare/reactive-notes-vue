import { describe, expect, it, beforeEach, vi } from "vitest";
import {
	ensurePrism,
	getCachedPrism,
	resetPrismCacheForTests,
} from "../prismHost";

describe("ensurePrism", () => {
	beforeEach(() => {
		resetPrismCacheForTests();
	});

	it("caches a valid Prism-like object", async () => {
		const prism = {
			languages: { vue: {} },
			tokenize: (text: string) => [text],
		};
		const first = await ensurePrism(async () => prism);
		const second = await ensurePrism(async () => {
			throw new Error("should not reload");
		});
		expect(first).toBe(prism);
		expect(second).toBe(prism);
		expect(getCachedPrism()).toBe(prism);
	});

	it("returns null for invalid Prism shapes", async () => {
		expect(await ensurePrism(async () => ({}))).toBeNull();
		expect(getCachedPrism()).toBeNull();
	});

	it("returns null when load rejects", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			expect(
				await ensurePrism(async () => {
					throw new Error("boom");
				}),
			).toBeNull();
			expect(getCachedPrism()).toBeNull();
		} finally {
			errorSpy.mockRestore();
		}
	});
});
