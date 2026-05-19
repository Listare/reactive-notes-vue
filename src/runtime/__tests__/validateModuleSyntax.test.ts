import { describe, expect, it } from "vitest";
import { emitBundle } from "../../bundler/emitBundle";
import { validateModuleSyntax } from "../validateModuleSyntax";

describe("validateModuleSyntax", () => {
	it("maps sucrase parse errors to vault block line", () => {
		const { moduleCode, stackRegions } = emitBundle(
			[
				{
					canonicalId: "note.md#vue-interactive-entry",
					vaultPath: "note.md",
					code: `import fn from './note.md?block=helper'
return { setup() { return () => null } }`,
					styles: [],
				},
				{
					canonicalId: "note.md?block=helper",
					vaultPath: "note.md",
					code: `function boom() { return {{{ }
return { default: boom }`,
					styles: [],
				},
			],
			"note.md#vue-interactive-entry",
			{ fromPath: "note.md", customScriptPath: "" },
		);

		let message = "";
		try {
			validateModuleSyntax(moduleCode, stackRegions);
		} catch (e) {
			message = (e as Error).message;
		}
		expect(message).toMatch(/note\.md:helper:\d+:\d+/);
	});
});
