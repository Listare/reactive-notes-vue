import { describe, expect, it } from "vitest";
import { hashScopeId } from "../hashScopeId";

describe("hashScopeId", () => {
	it("returns stable ids for the same source", () => {
		expect(hashScopeId("abc")).toBe(hashScopeId("abc"));
	});

	it("returns different ids for different sources", () => {
		expect(hashScopeId("a")).not.toBe(hashScopeId("b"));
	});

	it("uses v- prefix", () => {
		expect(hashScopeId("x")).toMatch(/^v-[0-9a-f]{8}$/);
	});
});
