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

	// First prepareMathJax cold-loads mathjax-full (incl. AMS packages).
	it("renders inline math to SVG markup", { timeout: 30_000 }, async () => {
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

	it("renders ams cases environment", async () => {
		await prepareMathJax("");
		const html = renderLatexToHtml(
			String.raw`\begin{cases} a & b \\ c & d \end{cases}`,
			true,
		);
		expect(html).toContain("<svg");
		expect(html).not.toMatch(/data-mjx-error|Unknown environment/i);
	});

	it("renders parse errors as merror with background rect", async () => {
		await prepareMathJax("");
		const html = renderLatexToHtml(
			String.raw`\begin{not-an-env}x\end{not-an-env}`,
			true,
		);
		expect(html).toContain('data-mml-node="merror"');
		expect(html).toContain("data-mjx-error");
		expect(html).toContain('data-background="true"');
	});
});
