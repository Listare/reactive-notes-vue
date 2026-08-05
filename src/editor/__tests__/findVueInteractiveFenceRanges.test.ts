import { describe, expect, it } from "vitest";
import {
	filterFenceRangesInViewport,
	findVueInteractiveFenceRanges,
} from "../findVueInteractiveFenceRanges";

describe("findVueInteractiveFenceRanges", () => {
	it("returns body offsets for a plain fence", () => {
		const md = `# title

\`\`\`vue-interactive
<template><p>hi</p></template>
<script setup lang="ts"></script>
\`\`\`
`;
		const ranges = findVueInteractiveFenceRanges(md);
		expect(ranges).toHaveLength(1);
		const range = ranges[0]!;
		expect(md.slice(range.from, range.to)).toBe(range.text);
		expect(range.text).toContain("<template><p>hi</p></template>");
		expect(range.text).toContain('<script setup lang="ts"></script>');
		expect(range.text.endsWith("\n") || range.text.endsWith("\r\n")).toBe(
			true,
		);
	});

	it("supports info strings like {name=Foo}", () => {
		const md = `\`\`\`vue-interactive {name=Foo, hide=true}
<template><span /></template>
<script setup lang="ts"></script>
\`\`\`
`;
		const ranges = findVueInteractiveFenceRanges(md);
		expect(ranges).toHaveLength(1);
		expect(md.slice(ranges[0]!.from, ranges[0]!.to)).toBe(ranges[0]!.text);
		expect(ranges[0]!.text).toContain("<template><span /></template>");
	});

	it("returns multiple fences in document order", () => {
		const md = `\`\`\`vue-interactive
A
\`\`\`

\`\`\`vue-interactive {name=B}
B
\`\`\`
`;
		const ranges = findVueInteractiveFenceRanges(md);
		expect(ranges).toHaveLength(2);
		expect(ranges[0]!.text.startsWith("A")).toBe(true);
		expect(ranges[1]!.text.startsWith("B")).toBe(true);
		expect(ranges[0]!.to).toBeLessThan(ranges[1]!.from);
	});

	it("ignores unrelated fences", () => {
		const md = `\`\`\`vue
<template />
\`\`\`

\`\`\`js
console.log(1)
\`\`\`
`;
		expect(findVueInteractiveFenceRanges(md)).toEqual([]);
	});
});

describe("filterFenceRangesInViewport", () => {
	it("keeps ranges that intersect the viewport", () => {
		const ranges = [
			{ from: 0, to: 10, text: "a" },
			{ from: 20, to: 30, text: "b" },
			{ from: 40, to: 50, text: "c" },
		];
		expect(filterFenceRangesInViewport(ranges, 5, 25)).toEqual([
			ranges[0],
			ranges[1],
		]);
		expect(filterFenceRangesInViewport(ranges, 30, 40)).toEqual([]);
		expect(filterFenceRangesInViewport(ranges, 29, 41)).toEqual([
			ranges[1],
			ranges[2],
		]);
	});
});
