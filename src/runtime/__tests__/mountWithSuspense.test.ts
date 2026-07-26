import { describe, expect, it } from "vitest";
import { compileSfc } from "../../compiler/compileSfc";
import { executeModule } from "../executeModule";
import { mountWithSuspense } from "../mountWithSuspense";
import { nextTick } from "vue";

const ASYNC_SETUP_SFC = `
<template>
  <p class="async-label">{{ label }}</p>
</template>

<script setup lang="ts">
const label = await Promise.resolve('ready')
</script>
`;

const SYNC_SETUP_SFC = `
<template>
  <p class="sync-label">{{ label }}</p>
</template>

<script setup lang="ts">
const label = 'sync'
</script>
`;

describe("mountWithSuspense", () => {
	it("renders sync setup immediately", async () => {
		const { moduleCode } = compileSfc(SYNC_SETUP_SFC);
		const component = await executeModule(moduleCode);
		const mountPoint = document.createElement("div");
		document.body.appendChild(mountPoint);

		const { app, whenReady } = mountWithSuspense(component, mountPoint);
		await whenReady;

		expect(mountPoint.querySelector(".sync-label")?.textContent).toBe("sync");

		app.unmount();
		document.body.removeChild(mountPoint);
	});

	it("renders after script-setup top-level await resolves", async () => {
		const { moduleCode } = compileSfc(ASYNC_SETUP_SFC);
		expect(moduleCode).toMatch(/async\s+setup/);

		const component = await executeModule(moduleCode);
		const mountPoint = document.createElement("div");
		document.body.appendChild(mountPoint);

		const { app, whenReady } = mountWithSuspense(component, mountPoint);
		await whenReady;
		await nextTick();

		expect(mountPoint.querySelector(".async-label")?.textContent).toBe("ready");

		app.unmount();
		document.body.removeChild(mountPoint);
	});
});
