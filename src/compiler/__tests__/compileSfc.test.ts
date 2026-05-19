import { describe, expect, it } from "vitest";
import { compileSfc } from "../compileSfc";
import { executeModule } from "../../runtime/executeModule";
import { createApp, nextTick, type App as VueApp } from "vue";

const COUNTER_SFC = `
<template>
  <button class="counter-btn" @click="count++">Count: {{ count }}</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<style scoped>
.counter-btn {
  padding: 0.5rem 1rem;
}
</style>
`;

describe("compileSfc", () => {
	it("compiles counter SFC and mounts", async () => {
		const { moduleCode, styles, scopeId } = compileSfc(COUNTER_SFC);
		expect(scopeId).toMatch(/^v-/);
		expect(styles.length).toBe(1);
		expect(styles[0]?.scoped).toBe(true);
		expect(moduleCode).toContain("__vue__");

		const component = executeModule(moduleCode);
		const mountPoint = document.createElement("div");
		document.body.appendChild(mountPoint);

		const app: VueApp = createApp(component);
		app.mount(mountPoint);

		const btn = mountPoint.querySelector("button");
		expect(btn?.textContent).toContain("Count: 0");
		btn?.click();
		await nextTick();
		expect(btn?.textContent).toContain("Count: 1");

		app.unmount();
		document.body.removeChild(mountPoint);
	});
});
