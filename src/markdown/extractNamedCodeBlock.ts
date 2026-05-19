const FENCE_RE = /^```([^\s`]+)([^\n]*)\r?\n([\s\S]*?)^```/gm;
const BRACE_ATTRS_RE = /\{([^}]+)\}/;

export interface ExtractedCodeBlock {
	lang: string;
	content: string;
}

export interface ParsedFenceInfo {
	lang: string;
	name?: string;
	/** When true, the block is not rendered in reading mode (import-only). */
	hide?: boolean;
}

function parseBraceAttributes(info: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const match = BRACE_ATTRS_RE.exec(info);
	if (!match?.[1]) return attrs;
	for (const part of match[1].split(",")) {
		const eq = part.indexOf("=");
		if (eq === -1) continue;
		const key = part.slice(0, eq).trim().toLowerCase();
		const value = part.slice(eq + 1).trim();
		if (key) attrs[key] = value;
	}
	return attrs;
}

export function parseFenceInfo(info: string): ParsedFenceInfo {
	const trimmed = info.trim();
	const attrs = parseBraceAttributes(trimmed);
	const lang =
		trimmed.replace(BRACE_ATTRS_RE, "").trim().split(/\s+/)[0] ?? "";
	const parsed: ParsedFenceInfo = { lang };
	const name = attrs.name;
	if (name) parsed.name = name;
	if (attrs.hide?.toLowerCase() === "true") parsed.hide = true;
	return parsed;
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
