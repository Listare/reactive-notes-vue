import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractNamedCodeBlock } from "../extractNamedCodeBlock";
import { findVueInteractiveBlockByContent } from "../findVueInteractiveBlockByContent";

const FIXTURE_08 = readFileSync(
	join(process.cwd(), "test-vault/08 - 自引用.md"),
	"utf8",
);

describe("findVueInteractiveBlockByContent", () => {
	it("returns hide only when hide=true is set", () => {
		const md = `# x

\`\`\`vue-interactive {name=A}
<template><p>1</p></template>
<script setup lang="ts"></script>
\`\`\`

\`\`\`vue-interactive {name=B, hide=true}
<template><p>2</p></template>
<script setup lang="ts"></script>
\`\`\`
`;
		const blockA = extractNamedCodeBlock(md, "A")!.content;
		const blockB = extractNamedCodeBlock(md, "B")!.content;
		expect(findVueInteractiveBlockByContent(md, blockA)).toEqual({
			name: "A",
			hide: false,
		});
		expect(findVueInteractiveBlockByContent(md, blockB)).toEqual({
			name: "B",
			hide: true,
		});
	});

	it("Chip in fixture 08 is hidden via hide=true", () => {
		const chip = extractNamedCodeBlock(FIXTURE_08, "Chip")!.content;
		expect(findVueInteractiveBlockByContent(FIXTURE_08, chip)).toEqual({
			name: "Chip",
			hide: true,
		});
	});

	it("main block in fixture 08 is not hidden", () => {
		const re = /```vue-interactive[^\n]*\r?\n([\s\S]*?)```/g;
		let last: string | undefined;
		let match: RegExpExecArray | null;
		while ((match = re.exec(FIXTURE_08)) !== null) {
			last = match[1];
		}
		expect(findVueInteractiveBlockByContent(FIXTURE_08, last!)?.hide).toBe(
			false,
		);
	});
});
