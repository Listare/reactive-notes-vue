const JS_LIKE = new Set([
	"javascript",
	"js",
	"jsx",
	"typescript",
	"ts",
	"tsx",
	"vue",
	"vue-interactive",
]);

/** True when a fenced block should be compiled as executable JS/TS. */
export function isJsLikeLanguage(lang: string): boolean {
	return JS_LIKE.has(lang.trim().toLowerCase().split(/\s+/)[0] ?? "");
}
