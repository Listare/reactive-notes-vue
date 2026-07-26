import { describe, expect, it } from "vitest";
import {
	isNodeBuiltinAllowed,
	isNodeBuiltinSpecifier,
	normalizeNodeBuiltinId,
	SAFE_NODE_BUILTIN_IDS,
} from "../isNodeBuiltin";

describe("isNodeBuiltin", () => {
	it("recognizes node: prefix only", () => {
		expect(isNodeBuiltinSpecifier("node:path")).toBe(true);
		expect(isNodeBuiltinSpecifier("node:fs/promises")).toBe(true);
		expect(isNodeBuiltinSpecifier("path")).toBe(false);
		expect(isNodeBuiltinSpecifier("node:")).toBe(false);
	});

	it("normalizes ids after node:", () => {
		expect(normalizeNodeBuiltinId("node:path")).toBe("path");
		expect(normalizeNodeBuiltinId("node:fs/promises")).toBe("fs/promises");
		expect(normalizeNodeBuiltinId("path")).toBeNull();
	});

	it("allows safe ids by default; extended only when enabled", () => {
		for (const id of SAFE_NODE_BUILTIN_IDS) {
			expect(isNodeBuiltinAllowed(id, false)).toBe(true);
		}
		expect(isNodeBuiltinAllowed("fs", false)).toBe(false);
		expect(isNodeBuiltinAllowed("fs", true)).toBe(true);
		expect(isNodeBuiltinAllowed("fs/promises", true)).toBe(true);
	});
});
