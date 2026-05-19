import { describe, expect, it } from "vitest";
import { renderLatexToHtml } from "../renderLatex";

describe("renderLatexToHtml", () => {
	it("renders inline math to SVG markup", () => {
		const html = renderLatexToHtml("x^2", false);
		expect(html).toContain("<svg");
		expect(html).toContain("</svg>");
	});

	it("returns empty string for blank input", () => {
		expect(renderLatexToHtml("  ", false)).toBe("");
	});
});
