import { describe, expect, it } from "vitest";
import { formatCodeFrame } from "../formatCodeFrame";

describe("formatCodeFrame", () => {
	it("renders a Vue-style pointer", () => {
		const frame = formatCodeFrame(
			"export const brokenValue = {{{\n",
			1,
			28,
			"broken.ts",
		);
		expect(frame).toBe(
			["broken.ts", "1 | export const brokenValue = {{{", "  |                             ^"].join(
				"\n",
			),
		);
	});
});
