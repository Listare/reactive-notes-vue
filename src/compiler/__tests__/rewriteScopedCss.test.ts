import { describe, expect, it } from "vitest";
import {
	rewriteScopedCssForMountRoot,
	scopeDataAttribute,
} from "../rewriteScopedCss";

describe("rewriteScopedCssForMountRoot", () => {
	it("rewrites attribute selectors to mount-root descendants", () => {
		const scopeId = "v-5e46282c";
		const attr = scopeDataAttribute(scopeId);
		const css = `.chip[${attr}] { padding: 1rem; }
.chip-a[${attr}] { background: #ede9fe; }`;
		const out = rewriteScopedCssForMountRoot(css, scopeId);
		expect(out).toContain(`[${attr}] .chip {`);
		expect(out).toContain(`[${attr}] .chip-a {`);
		expect(out).toContain("#ede9fe");
	});
});
