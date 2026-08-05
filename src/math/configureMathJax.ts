import type { mathjax as MathJaxNamespace } from "mathjax-full/js/mathjax.js";
import type { TeX as TeXClass } from "mathjax-full/js/input/tex.js";
import type { SVG as SVGClass } from "mathjax-full/js/output/svg.js";
import type { liteAdaptor as LiteAdaptorFn } from "mathjax-full/js/adaptors/liteAdaptor.js";

/**
 * Align with Obsidian / MathJax `input/tex` defaults:
 * - core: ams, newcommand, noundefined, configmacros, textmacros, noerrors, …
 * - `\require` + `autoload` (Obsidian includes both)
 * - remaining TeX extensions available offline via AllPackages + Loader.preLoad
 * - Safe handler (Obsidian enables Safe Extension Options)
 *
 * @see https://help.obsidian.md/Editing+and+formatting/Advanced+formatting+syntax#Math
 * @see https://docs.mathjax.org/en/v3.2/input/tex/extensions.html
 */
function buildTexPackages(allPackages: readonly string[]): string[] {
	return [...allPackages, "require", "autoload"];
}

/** Packages not listed in AllPackages but commonly `\require{}`'d in Obsidian. */
const EXTRA_PRELOAD = ["[tex]/require", "[tex]/autoload", "[tex]/physics"] as const;

let mathjax: typeof MathJaxNamespace | null = null;
let TeX: typeof TeXClass | null = null;
let SVG: typeof SVGClass | null = null;
let liteAdaptor: typeof LiteAdaptorFn | null = null;
let RegisterHTMLHandler: ((adaptor: ReturnType<typeof LiteAdaptorFn>) => unknown) | null =
	null;
let SafeHandler: ((handler: unknown) => unknown) | null = null;
let allPackages: readonly string[] | null = null;
let preLoad: ((...names: string[]) => void) | null = null;

let modulesLoadPromise: Promise<void> | null = null;
let adaptor: ReturnType<typeof LiteAdaptorFn> | null = null;
let htmlDocument: ReturnType<typeof MathJaxNamespace.document> | null = null;
let appliedPreamble = "";

function preloadTexPackagesForRequire(): void {
	if (!preLoad || !allPackages) return;
	preLoad(...allPackages.map((name) => `[tex]/${name}`), ...EXTRA_PRELOAD);
}

async function loadMathJaxModules(): Promise<void> {
	if (
		mathjax &&
		TeX &&
		SVG &&
		liteAdaptor &&
		RegisterHTMLHandler &&
		SafeHandler &&
		allPackages &&
		preLoad
	) {
		return;
	}
	if (modulesLoadPromise) return modulesLoadPromise;

	modulesLoadPromise = (async () => {
		const [
			mathjaxMod,
			texMod,
			svgMod,
			adaptorMod,
			handlerMod,
			safeMod,
			allPackagesMod,
			loaderMod,
		] = await Promise.all([
			import("mathjax-full/js/mathjax.js"),
			import("mathjax-full/js/input/tex.js"),
			import("mathjax-full/js/output/svg.js"),
			import("mathjax-full/js/adaptors/liteAdaptor.js"),
			import("mathjax-full/js/handlers/html.js"),
			import("mathjax-full/js/ui/safe/SafeHandler.js"),
			// Registers every TeX Configuration (side effects) + exports AllPackages.
			import("mathjax-full/js/input/tex/AllPackages.js"),
			import("mathjax-full/js/components/loader.js"),
			// Not part of AllPackages; required for Obsidian-compatible `\require` / autoload.
			import("mathjax-full/js/input/tex/require/RequireConfiguration.js"),
			import("mathjax-full/js/input/tex/autoload/AutoloadConfiguration.js"),
		]);
		mathjax = mathjaxMod.mathjax;
		TeX = texMod.TeX;
		SVG = svgMod.SVG;
		liteAdaptor = adaptorMod.liteAdaptor;
		RegisterHTMLHandler = handlerMod.RegisterHTMLHandler;
		SafeHandler = safeMod.SafeHandler as (handler: unknown) => unknown;
		allPackages = allPackagesMod.AllPackages;
		preLoad = loaderMod.Loader.preLoad.bind(loaderMod.Loader);
		preloadTexPackagesForRequire();
	})();

	return modulesLoadPromise;
}

function resetEngine(): void {
	adaptor = null;
	htmlDocument = null;
}

function buildEngine(): void {
	if (
		!mathjax ||
		!TeX ||
		!SVG ||
		!liteAdaptor ||
		!RegisterHTMLHandler ||
		!SafeHandler ||
		!allPackages
	) {
		throw new Error("MathJax 模块未加载。");
	}
	adaptor = liteAdaptor();
	// Obsidian runs MathJax with Safe Extension Options.
	SafeHandler(RegisterHTMLHandler(adaptor));
	const tex = new TeX({
		packages: buildTexPackages(allPackages),
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
