const FENCE_RE = /^```([^\s`]+)([^\n]*)\r?\n([\s\S]*?)^```/gm;
const NAME_ATTR_RE = /\{name=([^}]+)\}/;

export interface ExtractedCodeBlock {
	lang: string;
	content: string;
}

export function parseFenceInfo(info: string): { lang: string; name?: string } {
	const trimmed = info.trim();
	const nameMatch = NAME_ATTR_RE.exec(trimmed);
	const name = nameMatch?.[1]?.trim();
	const lang = trimmed.replace(NAME_ATTR_RE, "").trim().split(/\s+/)[0] ?? "";
	return name ? { lang, name } : { lang };
}

/** Lists all named fenced code blocks in markdown (`lang {name=…}`). */
export function listNamedCodeBlocks(
	markdown: string,
): { name: string; lang: string; content: string }[] {
	const blocks: { name: string; lang: string; content: string }[] = [];
	let match: RegExpExecArray | null;
	FENCE_RE.lastIndex = 0;
	while ((match = FENCE_RE.exec(markdown)) !== null) {
		const langToken = match[1] ?? "";
		const infoRest = match[2] ?? "";
		const content = (match[3] ?? "").replace(/\n$/, "");
		const { lang, name } = parseFenceInfo(`${langToken}${infoRest}`);
		if (name) {
			blocks.push({ name, lang: lang || langToken, content });
		}
	}
	return blocks;
}

/** Returns the named block or null if not found. */
export function extractNamedCodeBlock(
	markdown: string,
	blockName: string,
): ExtractedCodeBlock | null {
	for (const block of listNamedCodeBlocks(markdown)) {
		if (block.name === blockName) {
			return { lang: block.lang, content: block.content };
		}
	}
	return null;
}
