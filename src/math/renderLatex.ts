import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";

let adaptor: ReturnType<typeof liteAdaptor> | null = null;
let htmlDocument: ReturnType<typeof mathjax.document> | null = null;

function ensureEngine(): void {
	if (htmlDocument && adaptor) return;
	adaptor = liteAdaptor();
	RegisterHTMLHandler(adaptor);
	const tex = new TeX({
		packages: ["base", "ams", "noerrors", "noundefined"],
	});
	const svg = new SVG({ fontCache: "local" });
	htmlDocument = mathjax.document("", { InputJax: tex, OutputJax: svg });
}

/** Renders TeX/LaTeX to an SVG HTML fragment (MathJax 3). */
export function renderLatexToHtml(latex: string, display: boolean): string {
	const trimmed = latex.trim();
	if (!trimmed) return "";
	ensureEngine();
	if (!htmlDocument || !adaptor) {
		throw new Error("MathJax 未初始化。");
	}
	const node = htmlDocument.convert(trimmed, { display });
	return adaptor.outerHTML(node);
}
