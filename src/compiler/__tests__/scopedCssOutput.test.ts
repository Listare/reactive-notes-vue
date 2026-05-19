import { describe, expect, it } from "vitest";
import { compileSfc } from "../compileSfc";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BLOCK_A = readFileSync(
	join(process.cwd(), "test-vault/02 - 作用域样式.md"),
	"utf8",
).match(/```vue-interactive\n([\s\S]*?)```/)?.[1];

describe("scoped CSS output", () => {
	it("emits attribute selectors for block A", () => {
		if (!BLOCK_A) throw new Error("fixture missing");
		const { scopeId, styles } = compileSfc(BLOCK_A);
		const css = styles[0]?.css ?? "";
		expect(css).toContain(".chip-a");
		expect(css).toMatch(/data-v-|\.chip-a\[data-v/);
		expect(css).toContain("#ede9fe");
		expect(scopeId).toMatch(/^v-/);
	});
});
