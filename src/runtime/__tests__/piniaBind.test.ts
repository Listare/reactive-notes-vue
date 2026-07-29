import { describe, expect, it } from "vitest";
import { wrapModuleCodeWithPiniaBind } from "../executeModule";
import { emitBundle } from "../../bundler/emitBundle";

describe("wrapModuleCodeWithPiniaBind", () => {
	it("prepends bind for single modules", () => {
		const out = wrapModuleCodeWithPiniaBind("return {}", "notes/a.md");
		expect(out).toContain(
			'const __pinia__ = __piniaFor__("notes/a.md");',
		);
		expect(out).toContain("return {}");
	});

	it("leaves bundled code that already uses __piniaFor__", () => {
		const code = "const x = __piniaFor__; return {}";
		expect(wrapModuleCodeWithPiniaBind(code, "notes/a.md")).toBe(code);
	});
});

describe("emitBundle pinia bind", () => {
	it("binds __pinia__ per module vault path", () => {
		const { moduleCode } = emitBundle(
			[
				{
					canonicalId: "notes/entry.md#vue-interactive-entry",
					vaultPath: "notes/entry.md",
					code: "return { setup() { return () => null } }",
					styles: [],
				},
			],
			"notes/entry.md#vue-interactive-entry",
			{ fromPath: "notes/entry.md", customScriptPath: "" },
		);
		expect(moduleCode).toContain("__piniaFor__");
		expect(moduleCode).toContain(
			'const __pinia__ = __piniaFor__("notes/entry.md");',
		);
	});
});
