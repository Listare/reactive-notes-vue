import type { mathjax as MathJaxNamespace } from "mathjax-full/js/mathjax.js";
import type { TeX as TeXClass } from "mathjax-full/js/input/tex.js";
import type { SVG as SVGClass } from "mathjax-full/js/output/svg.js";
import type { liteAdaptor as LiteAdaptorFn } from "mathjax-full/js/adaptors/liteAdaptor.js";

const TEX_PACKAGES = [
	"base",
	"ams",
	"noerrors",
	"noundefined",
	"newcommand",
] as const;

let mathjax: typeof MathJaxNamespace | null = null;
let TeX: typeof TeXClass | null = null;
let SVG: typeof SVGClass | null = null;
let liteAdaptor: typeof LiteAdaptorFn | null = null;
let RegisterHTMLHandler: ((adaptor: ReturnType<typeof LiteAdaptorFn>) => void) | null =
	null;

let modulesLoadPromise: Promise<void> | null = null;
let adaptor: ReturnType<typeof LiteAdaptorFn> | null = null;
let htmlDocument: ReturnType<typeof MathJaxNamespace.document> | null = null;
let appliedPreamble = "";

async function loadMathJaxModules(): Promise<void> {
	if (mathjax && TeX && SVG && liteAdaptor && RegisterHTMLHandler) return;
	if (modulesLoadPromise) return modulesLoadPromise;

	modulesLoadPromise = (async () => {
		const [
			mathjaxMod,
			texMod,
			svgMod,
			adaptorMod,
			handlerMod,
		] = await Promise.all([
			import("mathjax-full/js/mathjax.js"),
			import("mathjax-full/js/input/tex.js"),
			import("mathjax-full/js/output/svg.js"),
			import("mathjax-full/js/adaptors/liteAdaptor.js"),
			import("mathjax-full/js/handlers/html.js"),
			// Side-effect imports register TeX packages listed in TEX_PACKAGES.
			import("mathjax-full/js/input/tex/ams/AmsConfiguration.js"),
			import(
				"mathjax-full/js/input/tex/noerrors/NoErrorsConfiguration.js"
			),
			import(
				"mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration.js"
			),
			import(
				"mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js"
			),
		]);
		mathjax = mathjaxMod.mathjax;
		TeX = texMod.TeX;
		SVG = svgMod.SVG;
		liteAdaptor = adaptorMod.liteAdaptor;
		RegisterHTMLHandler = handlerMod.RegisterHTMLHandler;
	})();

	return modulesLoadPromise;
}

function resetEngine(): void {
	adaptor = null;
	htmlDocument = null;
}

function buildEngine(): void {
	if (!mathjax || !TeX || !SVG || !liteAdaptor || !RegisterHTMLHandler) {
		throw new Error("MathJax 模块未加载。");
	}
	adaptor = liteAdaptor();
	RegisterHTMLHandler(adaptor);
	const tex = new TeX({
		packages: [...TEX_PACKAGES],
	});
	const svg = new SVG({ fontCache: "local" });
	htmlDocument = mathjax.document("", { InputJax: tex, OutputJax: svg });
}

function applyPreambleContent(preamble: string): void {
	if (!htmlDocument) {
		throw new Error("MathJax 未初始化。");
	}
	htmlDocument.convert(preamble, { display: false });
}

/**
 * Loads MathJax (deferred until first render) and applies vault preamble TeX.
 * Must complete before mounting components that use `Latex`.
 *
 * Always builds the engine here so preamble macros stay on the same TeX jax
 * that later `renderLatexToHtml` calls use (avoid rebuild via ensureMathJaxEngine).
 */
export async function prepareMathJax(preamble: string): Promise<void> {
	await loadMathJaxModules();

	const normalized = preamble.trim();
	if (normalized === appliedPreamble && htmlDocument) return;

	resetEngine();
	appliedPreamble = normalized;

	try {
		buildEngine();
		if (normalized) {
			applyPreambleContent(normalized);
		}
	} catch (err) {
		resetEngine();
		appliedPreamble = "";
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`MathJax 前置文件解析失败: ${message}`);
	}
}

export function ensureMathJaxEngine(): void {
	if (htmlDocument && adaptor) return;
	if (!mathjax || !TeX) {
		throw new Error("MathJax 尚未就绪，请先完成沙盒渲染初始化。");
	}
	buildEngine();
}

export function getMathJaxDocument(): {
	htmlDocument: ReturnType<typeof MathJaxNamespace.document>;
	adaptor: ReturnType<typeof LiteAdaptorFn>;
} {
	ensureMathJaxEngine();
	if (!htmlDocument || !adaptor) {
		throw new Error("MathJax 未初始化。");
	}
	return { htmlDocument, adaptor };
}

/**
 * @internal Resets engine/preamble state between tests.
 * Keeps loaded MathJax modules — re-importing every test is slow and flaky.
 */
export async function resetMathJaxForTests(): Promise<void> {
	appliedPreamble = "";
	resetEngine();
}
