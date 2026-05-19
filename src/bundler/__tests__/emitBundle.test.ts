import { describe, expect, it } from "vitest";
import { emitBundle } from "../emitBundle";
import { executeModule } from "../../runtime/executeModule";

describe("emitBundle", () => {
	it("loads dependencies before entry via lazy __require__", async () => {
		const { moduleCode: code } = emitBundle(
			[
				{
					canonicalId: "notes/entry.md#vue-interactive-entry",
					vaultPath: "notes/entry.md",
					code: `
import { ref } from 'vue'
import value from './dep.js'
const count = ref(value)
return { setup() { return () => null } }
`.trim(),
					styles: [],
				},
				{
					canonicalId: "notes/dep.js",
					vaultPath: "notes/dep.js",
					code: "return { default: 42 };",
					styles: [],
				},
			],
			"notes/entry.md#vue-interactive-entry",
			{ fromPath: "notes/entry.md", customScriptPath: "" },
		);

		await expect(executeModule(code)).resolves.toBeDefined();
	});
});
