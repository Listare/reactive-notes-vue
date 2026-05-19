import { describe, expect, it } from "vitest";
import { isUrlImportSpecifier } from "../isUrlImport";
import { parseImportSpecifier } from "../parseImportSpecifier";

describe("isUrlImportSpecifier", () => {
	it("detects https imports", () => {
		expect(isUrlImportSpecifier("https://esm.sh/lodash@4")).toBe(true);
	});

	it("detects http imports", () => {
		expect(isUrlImportSpecifier("http://example.com/pkg.js")).toBe(true);
	});

	it("rejects vault paths", () => {
		expect(isUrlImportSpecifier("./lib.ts")).toBe(false);
		expect(isUrlImportSpecifier("@/shared/x.js")).toBe(false);
	});
});

describe("parseImportSpecifier (URL)", () => {
	it("preserves query strings in CDN URLs", () => {
		const spec = "https://esm.sh/vue?target=esnext";
		expect(parseImportSpecifier(spec)).toEqual({ path: spec });
	});
});
