import type { SandboxTailwindAssets } from "./sandboxTailwindBundle";

function escapeClosingStyle(css: string): string {
	return css.replace(/<\/style/gi, "<\\/style");
}

function escapeClosingScript(script: string): string {
	return script.replace(/<\/script/gi, "<\\/script");
}

/** Builds an opaque-origin srcdoc that inlines the runner (no external script URLs). */
export function buildSandboxSrcdoc(
	runnerScript: string,
	tailwind: SandboxTailwindAssets,
): string {
	const safeRunner = escapeClosingScript(runnerScript);
	const safeBrowser = escapeClosingScript(tailwind.browserScript);
	const safeConfigCss = escapeClosingStyle(tailwind.configCss);
	const safeStaticCss = escapeClosingStyle(tailwind.staticCss);
	const resetCss =
		"html,body{margin:0;padding:0;overflow:hidden;height:auto}" +
		"#vue-interactive-mount{display:flow-root}";
	const styleBlocks = [
		`<style data-vue-interactive="reset">${resetCss}</style>`,
		safeStaticCss
			? `<style data-vue-interactive="sandbox">${safeStaticCss}</style>`
			: "",
		safeConfigCss
			? `<style type="text/tailwindcss" data-vue-interactive="tailwind-config">${safeConfigCss}</style>`
			: "",
	].join("");
	const browserScriptBlock = safeBrowser
		? `<script data-vue-interactive="tailwind-browser">${safeBrowser}</script>`
		: "";
	return [
		"<!DOCTYPE html>",
		'<html lang="en">',
		`<head><meta charset="utf-8">${styleBlocks}${browserScriptBlock}</head>`,
		"<body>",
		'<div id="vue-interactive-mount"></div>',
		`<script>${safeRunner}</script>`,
		"</body>",
		"</html>",
	].join("\n");
}
