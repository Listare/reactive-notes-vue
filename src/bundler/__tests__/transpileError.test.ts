import { describe, expect, it } from "vitest";
import { formatTranspileFailure } from "../formatTranspileFailure";
import { transpileTypeScript } from "../transpile";

describe("transpileTypeScript errors", () => {
	it("includes a code frame like SFC parse errors", () => {
		const source = "export const brokenValue = {{{\n";
		expect(() =>
			transpileTypeScript(source, "errors/fixtures/broken-syntax.ts"),
		).toThrow(SyntaxError);

		try {
			transpileTypeScript(source, "errors/fixtures/broken-syntax.ts");
		} catch (e) {
			const err = e as SyntaxError;
			expect(err.message).toContain("TypeScript 转译失败");
			expect(err.message).toContain("errors/fixtures/broken-syntax.ts");
			expect(err.message).toMatch(/\d+ \| export const brokenValue/);
			expect(err.message).toContain("^");
			expect(err.stack).toBeUndefined();
		}
	});

	it("formatTranspileFailure falls back when loc is missing", () => {
		const err = formatTranspileFailure(
			"const x = 1",
			"a.ts",
			new Error("boom"),
		);
		expect(err).toBeInstanceOf(SyntaxError);
		expect(err.message).toContain("boom");
	});
});
