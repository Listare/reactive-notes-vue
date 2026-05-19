import { parseFenceInfo } from "./extractNamedCodeBlock";
import { isVueSfcLanguage } from "./isVueSfcLanguage";

const VUE_INTERACTIVE_FENCE_RE =
	/^```vue-interactive([^\n]*)\r?\n([\s\S]*?)^```/gm;

export interface VueInteractiveFenceMatch {
	name?: string;
	hide: boolean;
}

/** Locates a vue-interactive fence whose body matches `source`. */
export function findVueInteractiveBlockByContent(
	markdown: string,
	source: string,
): VueInteractiveFenceMatch | null {
	const normalized = source.trim();
	let match: RegExpExecArray | null;
	VUE_INTERACTIVE_FENCE_RE.lastIndex = 0;
	while ((match = VUE_INTERACTIVE_FENCE_RE.exec(markdown)) !== null) {
		const content = (match[2] ?? "").replace(/\n$/, "");
		if (content.trim() !== normalized) continue;
		const info = parseFenceInfo(`vue-interactive${match[1] ?? ""}`);
		if (!isVueSfcLanguage(info.lang || "vue-interactive")) continue;
		return {
			name: info.name,
			hide: info.hide === true,
		};
	}
	return null;
}
