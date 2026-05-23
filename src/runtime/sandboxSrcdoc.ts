/** Builds an opaque-origin srcdoc that inlines the runner (no external script URLs). */
export function buildSandboxSrcdoc(
	runnerScript: string,
	tailwindCss: string,
): string {
	const safeScript = runnerScript.replace(/<\/script/gi, "<\\/script");
	const safeCss = tailwindCss.replace(/<\/style/gi, "<\\/style");
	const resetCss =
		"html,body{margin:0;padding:0;overflow:hidden;height:auto}";
	const styleBlock = [
		`<style data-vue-interactive="reset">${resetCss}</style>`,
		safeCss
			? `<style data-vue-interactive="tailwind">${safeCss}</style>`
			: "",
	].join("");
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
