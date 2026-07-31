import { describe, expect, it } from "vitest";
import { compileSfc } from "../compileSfc";

describe("compileSfc error paths", () => {
	it("rejects SFC without script setup (normalize)", () => {
		expect(() =>
			compileSfc(`
<template>
  <div>hi</div>
</template>
`),
		).toThrow(/缺少 <script setup>/);
	});

	it("rejects SFC without template (normalize)", () => {
		expect(() =>
			compileSfc(`
<script setup lang="ts">
const x = 1
</script>
`),
		).toThrow(/缺少 <template>/);
	});

	it("rejects unparseable SFC with location detail when available", () => {
		expect(() =>
			compileSfc(`
<template>
  <div>
</template>

<script setup>
</script>
`),
		).toThrow(/SFC 解析失败/);
	});

	it("rejects template compile errors", () => {
		expect(() =>
			compileSfc(`
<template>
  <div>{{ }</div>
</template>

<script setup lang="ts">
</script>
`),
		).toThrow(/模板编译失败|SFC 解析失败/);
	});

	it("compiles unscoped styles", () => {
		const result = compileSfc(`
<template>
  <p class="plain">x</p>
</template>

<script setup lang="ts">
</script>

<style>
.plain { color: red; }
</style>
`);
		expect(result.styles).toHaveLength(1);
		expect(result.styles[0]?.scoped).toBe(false);
		expect(result.styles[0]?.css).toContain(".plain");
	});

	it("compiles multiple style blocks", () => {
		const result = compileSfc(`
<template>
  <div class="a b">x</div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.a { margin: 0; }
</style>
<style>
.b { padding: 0; }
</style>
`);
		expect(result.styles).toHaveLength(2);
		expect(result.styles.some((s) => s.scoped)).toBe(true);
		expect(result.styles.some((s) => !s.scoped)).toBe(true);
	});
});
