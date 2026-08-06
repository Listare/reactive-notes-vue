/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { nextTick, type Component } from "vue";
import { compileSfc } from "../../compiler/compileSfc";
import { executeModule } from "../executeModule";
import { mountWithSuspense } from "../mountWithSuspense";
import { getSharedVueRuntime } from "../sharedRuntime";
import {
	createSandboxTeleport,
	resolveSandboxTeleportProps,
	withSandboxTeleport,
} from "../sandboxTeleport";

describe("resolveSandboxTeleportProps", () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it("rewrites string to to an Element from document.querySelector", () => {
		const resolved = resolveSandboxTeleportProps({ to: "body" });
		expect(resolved?.to).toBe(document.body);
		expect(resolved?.disabled).toBeUndefined();
	});

	it("disables when the selector misses (never leaves a string to)", () => {
		const resolved = resolveSandboxTeleportProps({
			to: "#missing-teleport-target",
		});
		expect(typeof resolved?.to).not.toBe("string");
		expect(resolved?.disabled).toBe(true);
	});
});

describe("withSandboxTeleport", () => {
	it("overrides Teleport without mutating the shared Vue namespace", () => {
		const { Vue } = getSharedVueRuntime();
		const original = Vue.Teleport;
		const patched = withSandboxTeleport(Vue);

		expect(patched.Teleport).not.toBe(original);
		expect(Vue.Teleport).toBe(original);
		expect(
			(patched.Teleport as unknown as { __isTeleport?: boolean })
				.__isTeleport,
		).toBe(true);
		expect(patched.ref).toBe(Vue.ref);
	});

	it("createSandboxTeleport keeps __isTeleport", () => {
		const { Vue } = getSharedVueRuntime();
		const t = createSandboxTeleport(Vue) as unknown as {
			__isTeleport?: boolean;
		};
		expect(t.__isTeleport).toBe(true);
	});
});

describe("executeModule Teleport integration", () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it("teleports to body via the sandbox Teleport wrapper", async () => {
		const sfc = `
<template>
  <div class="in-place">root</div>
  <Teleport to="body">
    <div class="teleported-panel">panel</div>
  </Teleport>
</template>

<script setup lang="ts">
</script>
`;
		const { moduleCode } = compileSfc(sfc);
		const component: Component = await executeModule(moduleCode);
		const mountPoint = document.createElement("div");
		mountPoint.id = "vue-interactive-mount";
		document.body.appendChild(mountPoint);

		const { app, whenReady } = mountWithSuspense(component, mountPoint);
		await whenReady;
		await nextTick();

		expect(mountPoint.querySelector(".in-place")?.textContent).toBe("root");
		const panel = document.body.querySelector(".teleported-panel");
		expect(panel?.textContent).toBe("panel");
		expect(mountPoint.contains(panel)).toBe(false);

		app.unmount();
	});

	it("updates teleported content when v-if becomes true", async () => {
		const sfc = `
<template>
  <button class="open-btn" type="button" @click="open = true">Open</button>
  <Teleport to="body">
    <div v-if="open" class="teleported-panel">panel</div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>
`;
		const { moduleCode } = compileSfc(sfc);
		const component: Component = await executeModule(moduleCode);
		const mountPoint = document.createElement("div");
		mountPoint.id = "vue-interactive-mount";
		document.body.appendChild(mountPoint);

		const { app, whenReady } = mountWithSuspense(component, mountPoint);
		await whenReady;
		await nextTick();

		expect(document.body.querySelector(".teleported-panel")).toBeNull();
		mountPoint.querySelector("button.open-btn")?.dispatchEvent(
			new MouseEvent("click", { bubbles: true }),
		);
		await nextTick();

		const panel = document.body.querySelector(".teleported-panel");
		expect(panel?.textContent).toBe("panel");
		expect(mountPoint.contains(panel)).toBe(false);

		app.unmount();
	});
});
