import { describe, expect, it } from "vitest";
import { isPiniaBuiltinSpecifier } from "../isPiniaBuiltin";

describe("isPiniaBuiltin", () => {
	it("recognizes pinia only", () => {
		expect(isPiniaBuiltinSpecifier("pinia")).toBe(true);
		expect(isPiniaBuiltinSpecifier("Pinia")).toBe(false);
		expect(isPiniaBuiltinSpecifier("vue")).toBe(false);
	});
});
