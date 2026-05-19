import { describe, expect, it } from "vitest";
import { compileSfc } from "../compileSfc";

const EMPTY_SETUP_SFC = `
<template>
  <button class="chip">ok</button>
</template>

<script setup lang="ts">
</script>

<style scoped>
.chip { padding: 0.25rem; }
</style>
`;

describe("compileSfc empty script setup", () => {
	it("compiles SFC with whitespace-only script setup", () => {
		expect(() => compileSfc(EMPTY_SETUP_SFC)).not.toThrow();
		const result = compileSfc(EMPTY_SETUP_SFC);
		expect(result.moduleCode).toContain("__vue__");
		expect(result.styles.length).toBe(1);
	});
});
