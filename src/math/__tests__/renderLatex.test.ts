import { afterEach, describe, expect, it } from "vitest";
import {
	prepareMathJax,
	renderLatexToHtml,
	resetMathJaxForTests,
} from "../renderLatex";

describe("renderLatexToHtml", () => {
	afterEach(async () => {
		await resetMathJaxForTests();
	});

	it("renders inline math to SVG markup", async () => {
		await prepareMathJax("");
		const html = renderLatexToHtml("x^2", false);
		expect(html).toContain("<svg");
		expect(html).toContain("</svg>");
	});

	it("returns empty string for blank input", async () => {
		await prepareMathJax("");
		expect(renderLatexToHtml("  ", false)).toBe("");
	});

	it("applies macros from preamble", async () => {
		await prepareMathJax(String.raw`\newcommand{\RR}{\mathbb{R}}`);
		const html = renderLatexToHtml(String.raw`\RR`, false);
		expect(html).toContain("<svg");
		expect(html).toMatch(/R|ℝ|bold|mi/);
	});
});
