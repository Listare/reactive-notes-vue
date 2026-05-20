import { describe, expect, it } from "vitest";
import { compileSfc } from "../compileSfc";
import { readVaultVueInteractiveFixture } from "../../test/readVueInteractiveFixture";

const BLOCK_A = readVaultVueInteractiveFixture("test-vault/02 - 作用域样式.md");

describe("scoped CSS output", () => {
	it("emits attribute selectors for block A", () => {
		const { scopeId, styles } = compileSfc(BLOCK_A);
		const css = styles[0]?.css ?? "";
		expect(css).toContain(".chip-a");
		expect(css).toMatch(/data-v-|\.chip-a\[data-v/);
		expect(css).toContain("#ede9fe");
		expect(scopeId).toMatch(/^v-/);
	});
});
