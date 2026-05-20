import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Matches ```vue-interactive fences (optional info string), CRLF or LF. */
const FENCE_RE = /```vue-interactive[^\n]*\r?\n([\s\S]*?)```/g;

export function extractVueInteractiveBlocks(markdown: string): string[] {
	const blocks: string[] = [];
	let match: RegExpExecArray | null;
	FENCE_RE.lastIndex = 0;
	while ((match = FENCE_RE.exec(markdown)) !== null) {
		const body = match[1];
		if (body !== undefined) blocks.push(body);
	}
	return blocks;
}

export function extractFirstVueInteractiveBlock(
	markdown: string,
): string | undefined {
	return extractVueInteractiveBlocks(markdown)[0];
}

export function extractLastVueInteractiveBlock(
	markdown: string,
): string | undefined {
	const blocks = extractVueInteractiveBlocks(markdown);
	return blocks[blocks.length - 1];
}

export function readVaultMarkdown(relativePath: string): string {
	return readFileSync(join(process.cwd(), relativePath), "utf8");
}

export function readVaultVueInteractiveFixture(
	relativePath: string,
	options: { which?: "first" | "last"; index?: number } = {},
): string {
	const markdown = readVaultMarkdown(relativePath);
	const blocks = extractVueInteractiveBlocks(markdown);
	if (options.which === "last") {
		const block = blocks[blocks.length - 1];
		if (!block) throw new Error(`fixture missing: ${relativePath}`);
		return block;
	}
	const index = options.index ?? 0;
	const block = blocks[index];
	if (!block) {
		throw new Error(`fixture missing block ${index}: ${relativePath}`);
	}
	return block;
}
