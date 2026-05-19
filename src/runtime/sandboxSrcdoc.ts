/** Builds an opaque-origin srcdoc that inlines the runner (no external script URLs). */
export function buildSandboxSrcdoc(
	runnerScript: string,
	tailwindCss: string,
): string {
	const safeScript = runnerScript.replace(/<\/script/gi, "<\\/script");
	const safeCss = tailwindCss.replace(/<\/style/gi, "<\\/style");
	const styleBlock = safeCss
		? `<style data-vue-interactive="tailwind">${safeCss}</style>`
		: "";
	return [
		"<!DOCTYPE html>",
		'<html lang="en">',
		`<head><meta charset="utf-8">${styleBlock}</head>`,
		"<body>",
		'<div id="vue-interactive-mount"></div>',
		`<script>${safeScript}</script>`,
		"</body>",
		"</html>",
	].join("\n");
}
