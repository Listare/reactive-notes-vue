import { describe, expect, it } from "vitest";
import { compileSfc } from "../../compiler/compileSfc";
import { executeModule } from "../executeModule";
import { mountWithSuspense } from "../mountWithSuspense";
import { getSharedVueRuntime } from "../sharedRuntime";
import { nextTick } from "vue";

describe("shared pinia", () => {
	it("shares one pinia instance across two mounted apps", async () => {
		const storeId = `shared-counter-${Math.random().toString(36).slice(2)}`;

		const sfcA = `
<template>
  <button class="a-btn" @click="store.inc()">{{ store.n }}</button>
</template>
<script setup lang="ts">
import { defineStore } from 'pinia'
const useCounter = defineStore(${JSON.stringify(storeId)}, {
  state: () => ({ n: 0 }),
  actions: { inc() { this.n += 1 } },
})
const store = useCounter()
</script>
`;

		const sfcB = `
<template>
  <span class="b-label">{{ store.n }}</span>
</template>
<script setup lang="ts">
import { defineStore } from 'pinia'
const useCounter = defineStore(${JSON.stringify(storeId)}, {
  state: () => ({ n: 0 }),
  actions: { inc() { this.n += 1 } },
})
const store = useCounter()
</script>
`;

		const { pinia } = getSharedVueRuntime();
		expect(pinia).toBe(getSharedVueRuntime().pinia);

		const compA = await executeModule(compileSfc(sfcA).moduleCode);
		const compB = await executeModule(compileSfc(sfcB).moduleCode);

		const elA = document.createElement("div");
		const elB = document.createElement("div");
		document.body.append(elA, elB);

		const mountA = mountWithSuspense(compA, elA);
		const mountB = mountWithSuspense(compB, elB);
		await Promise.all([mountA.whenReady, mountB.whenReady]);

		expect(elA.querySelector(".a-btn")?.textContent).toBe("0");
		expect(elB.querySelector(".b-label")?.textContent).toBe("0");

		elA.querySelector("button")?.click();
		await nextTick();

		expect(elA.querySelector(".a-btn")?.textContent).toBe("1");
		expect(elB.querySelector(".b-label")?.textContent).toBe("1");

		mountA.app.unmount();
		mountB.app.unmount();
		elA.remove();
		elB.remove();
	});
});
