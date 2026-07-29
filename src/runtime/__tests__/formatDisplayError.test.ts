import { describe, expect, it } from "vitest";
import { isCompileTimeError } from "../formatDisplayError";

describe("formatDisplayError", () => {
	it("detects compile-time errors", () => {
		expect(isCompileTimeError(new SyntaxError("x"))).toBe(true);
		expect(
			isCompileTimeError(new Error("TypeScript 转译失败 (a.ts):\n…")),
		).toBe(true);
		expect(isCompileTimeError(new Error("setup 同步测试错误"))).toBe(false);
	});
});
