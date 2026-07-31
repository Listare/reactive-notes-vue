import { describe, expect, it } from "vitest";
import { hashContent } from "../hashContent";

describe("hashContent", () => {
	it("is stable for the same input", () => {
		expect(hashContent("abc")).toBe(hashContent("abc"));
	});

	it("differs for different inputs", () => {
		expect(hashContent("a")).not.toBe(hashContent("b"));
	});

	it("returns 8 hex chars", () => {
		expect(hashContent("x")).toMatch(/^[0-9a-f]{8}$/);
	});
});
