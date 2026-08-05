import { describe, expect, it } from "vitest";
import {
	iterVueInteractiveFenceMatches,
	listVisibleVueInteractiveBlocks,
	listVueInteractiveBlocks,
} from "../vueInteractiveFence";

describe("iterVueInteractiveFenceMatches", () => {
	it("yields absolute body offsets that slice back to body", () => {
		const md = `\`\`\`vue-interactive {name=A}
line1
\`\`\`
`;
		const matches = [...iterVueInteractiveFenceMatches(md)];
		expect(matches).toHaveLength(1);
		const fence = matches[0]!;
		expect(md.slice(fence.from, fence.to)).toBe(fence.body);
		expect(fence.infoSuffix).toContain("name=A");
		expect(fence.body.replace(/\n$/, "")).toBe("line1");
	});
});

describe("listVueInteractiveBlocks", () => {
	it("returns fences in document order with hide flag", () => {
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
		expect(listVueInteractiveBlocks(md)).toEqual([
			{
				content: `<template><p>1</p></template>
<script setup lang="ts"></script>`,
				name: "A",
				hide: false,
			},
			{
				content: `<template><p>2</p></template>
<script setup lang="ts"></script>`,
				name: "B",
				hide: true,
			},
		]);
	});

	it("listVisibleVueInteractiveBlocks omits hidden fences", () => {
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
		expect(listVisibleVueInteractiveBlocks(md)).toHaveLength(1);
		expect(listVisibleVueInteractiveBlocks(md)[0]?.name).toBe("A");
	});
});
