import { describe, expect, it } from "vitest";
import { compileSfc } from "../compileSfc";
import { rewriteScopedCssForMountRoot, scopeDataAttribute } from "../rewriteScopedCss";
import { executeModule } from "../../runtime/executeModule";
import { createApp } from "vue";
import { readVaultVueInteractiveFixture } from "../../test/readVueInteractiveFixture";

const BLOCK_A = readVaultVueInteractiveFixture("test-vault/02 - 作用域样式.md");

describe("scoped mount", () => {
	it("applies scoped styles via mount-root rewrite", async () => {
		const { moduleCode, styles, scopeId } = compileSfc(BLOCK_A);
		const css = rewriteScopedCssForMountRoot(styles[0]?.css ?? "", scopeId);

		const styleEl = document.createElement("style");
		styleEl.textContent = css;
		document.head.appendChild(styleEl);

		const mountPoint = document.createElement("div");
		mountPoint.setAttribute(scopeDataAttribute(scopeId), "");
		document.body.appendChild(mountPoint);

		const component = await executeModule(moduleCode);
		const app = createApp(component);
		app.mount(mountPoint);

		const btn = mountPoint.querySelector("button");
		expect(btn).toBeTruthy();
		const bg = getComputedStyle(btn!).backgroundColor;
		expect(bg).toBe("rgb(237, 233, 254)");

		app.unmount();
		styleEl.remove();
		document.body.removeChild(mountPoint);
	});
});
