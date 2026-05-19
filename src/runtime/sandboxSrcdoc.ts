/** Builds an opaque-origin srcdoc that inlines the runner (no external script URLs). */
export function buildSandboxSrcdoc(runnerScript: string): string {
	const safeScript = runnerScript.replace(/<\/script/gi, "<\\/script");
	const tag = "div";
	return [
		"<!DOCTYPE html>",
		'<html lang="en">',
		"<head><meta charset=\"utf-8\"></head>",
		"<body>",
		`<${tag} id="vue-interactive-mount"></${tag}>`,
		`<script>${safeScript}</script>`,
		"</body>",
		"</html>",
	].join("\n");
}
