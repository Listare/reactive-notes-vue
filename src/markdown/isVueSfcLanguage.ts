/** True when a fenced block language is a Vue SFC (not plain TS/JS). */
export function isVueSfcLanguage(lang: string): boolean {
	const token = lang.trim().toLowerCase().split(/\s+/)[0] ?? "";
	return token === "vue" || token === "vue-interactive";
}
