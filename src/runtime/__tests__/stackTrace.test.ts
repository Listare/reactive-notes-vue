import { describe, expect, it } from "vitest";
import { emitBundle } from "../../bundler/emitBundle";
import { executeModule } from "../executeModule";
import { rewriteRuntimeStack } from "../stackTrace";

describe("rewriteRuntimeStack", () => {
	it("maps eval <anonymous> lines to vault file and block", () => {
		const { moduleCode, stackRegions } = emitBundle(
			[
				{
					canonicalId: "note.md#vue-interactive-entry",
					vaultPath: "note.md",
					code: `import fn from './note.md?block=helper'
const _ = fn()
return { setup() { return () => null } }`,
					styles: [],
				},
				{
					canonicalId: "note.md?block=helper",
					vaultPath: "note.md",
					code: `function boom() { return 1 + boom() }
return { default: boom() }`,
					styles: [],
				},
			],
			"note.md#vue-interactive-entry",
			{ fromPath: "note.md", customScriptPath: "" },
		);

		let rawStack = "";
		try {
			executeModule(moduleCode);
		} catch (e) {
			rawStack = (e as Error).stack ?? "";
		}
		expect(rawStack).toMatch(/<anonymous>|about:srcdoc/);

		const rewritten = rewriteRuntimeStack(rawStack, stackRegions)!;
		expect(rewritten).toMatch(/note\.md:helper:\d+:\d+/);
		expect(rewritten).not.toMatch(/<anonymous>:\d+:\d+/);
	});
});
