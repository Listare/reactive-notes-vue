import { describe, expect, it } from "vitest";
import {
	flattenPrismTokensToRanges,
	mapPrismTypesToCmClass,
	type PrismTokenNode,
	tokenRangesForCode,
} from "../prismTokenRanges";

describe("mapPrismTypesToCmClass", () => {
	it("maps known Prism types to cm classes", () => {
		expect(mapPrismTypesToCmClass(["keyword"])).toBe("cm-keyword");
		expect(mapPrismTypesToCmClass(["string"])).toBe("cm-string");
		expect(mapPrismTypesToCmClass(["tag"])).toBe("cm-tag");
		expect(mapPrismTypesToCmClass(["attr-name"])).toBe("cm-attribute");
	});

	it("uses the first mapped type when multiple are present", () => {
		expect(mapPrismTypesToCmClass(["unknown", "keyword"])).toBe(
			"cm-keyword",
		);
	});

	it("returns null for unknown types", () => {
		expect(mapPrismTypesToCmClass(["not-a-real-token"])).toBeNull();
		expect(mapPrismTypesToCmClass([])).toBeNull();
	});
});

describe("flattenPrismTokensToRanges", () => {
	it("marks leaf string tokens with their type class", () => {
		const tokens: Array<string | PrismTokenNode> = [
			{ type: "keyword", content: "const" },
			" ",
			{ type: "function", content: "foo" },
		];
		expect(flattenPrismTokensToRanges(tokens)).toEqual([
			{ from: 0, to: 5, className: "cm-keyword" },
			{ from: 6, to: 9, className: "cm-variable" },
		]);
	});

	it("inherits parent type for nested plain strings", () => {
		const tokens: Array<string | PrismTokenNode> = [
			{
				type: "tag",
				content: [
					{ type: "punctuation", content: "<" },
					"div",
					{ type: "punctuation", content: ">" },
				],
			},
		];
		expect(flattenPrismTokensToRanges(tokens)).toEqual([
			{ from: 0, to: 1, className: "cm-punctuation" },
			{ from: 1, to: 4, className: "cm-tag" },
			{ from: 4, to: 5, className: "cm-punctuation" },
		]);
	});

	it("prefers alias when type is unmapped", () => {
		const tokens: Array<string | PrismTokenNode> = [
			{ type: "custom", alias: "keyword", content: "setup" },
		];
		expect(flattenPrismTokensToRanges(tokens)).toEqual([
			{ from: 0, to: 5, className: "cm-keyword" },
		]);
	});
});

describe("tokenRangesForCode", () => {
	it("returns empty for empty code", () => {
		expect(
			tokenRangesForCode("", () => [{ type: "keyword", content: "x" }], {}),
		).toEqual([]);
	});

	it("delegates to tokenize + flatten", () => {
		const ranges = tokenRangesForCode(
			"ab",
			(text) => [
				{ type: "keyword", content: text.slice(0, 1) },
				{ type: "string", content: text.slice(1) },
			],
			{},
		);
		expect(ranges).toEqual([
			{ from: 0, to: 1, className: "cm-keyword" },
			{ from: 1, to: 2, className: "cm-string" },
		]);
	});
});
