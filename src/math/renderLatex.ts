import {
	ensureMathJaxEngine,
	getMathJaxDocument,
	prepareMathJax,
} from "./configureMathJax";

export { prepareMathJax, resetMathJaxForTests } from "./configureMathJax";

/** Renders TeX/LaTeX to an SVG HTML fragment (MathJax 3). */
export function renderLatexToHtml(latex: string, display: boolean): string {
	const trimmed = latex.trim();
	if (!trimmed) return "";
	ensureMathJaxEngine();
	const { htmlDocument, adaptor } = getMathJaxDocument();
	const node = htmlDocument.convert(trimmed, { display });
	return adaptor.outerHTML(node);
}
