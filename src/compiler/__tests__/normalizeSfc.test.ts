import { describe, expect, it } from "vitest";
import { normalizeSfc, SfcNormalizeError } from "../normalizeSfc";

const VALID_SFC = `
<template>
  <p>{{ n }}</p>
</template>
<script setup>
import { ref } from 'vue'
const n = ref(1)
</script>
`;

describe("normalizeSfc", () => {
	it("adds lang=ts to script setup when missing", () => {
		const result = normalizeSfc(VALID_SFC);
		expect(result).toMatch(/<script\s+[^>]*setup[^>]*\s+lang="ts"/i);
	});

	it("keeps existing lang attribute", () => {
		const sfc = VALID_SFC.replace(
			"<script setup>",
			'<script setup lang="ts">',
		);
		expect(normalizeSfc(sfc)).toContain('lang="ts"');
	});

	it("throws when template is missing", () => {
		expect(() =>
			normalizeSfc("<script setup>const x = 1</script>"),
		).toThrow(SfcNormalizeError);
	});

	it("throws when script setup is missing", () => {
		expect(() =>
			normalizeSfc("<template><p></p></template>"),
		).toThrow(SfcNormalizeError);
	});
});
