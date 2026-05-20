import { describe, expect, it } from "vitest";
import { compileSfc } from "../compileSfc";
import { collectImportsFromCode } from "../../bundler/collectImports";
import { transpileTypeScript } from "../../bundler/transpile";
import { readVaultVueInteractiveFixture } from "../../test/readVueInteractiveFixture";

const FIXTURE_06 = readVaultVueInteractiveFixture("test-vault/06 - 导入示例.md");
const FIXTURE_07 = readVaultVueInteractiveFixture(
	"test-vault/07 - 导入Markdown代码块.md",
);

describe("import bundle fixtures", () => {
	it("compiled 06 moduleCode still lists vault imports", () => {
		expect(FIXTURE_06).toBeTruthy();
		const compiled = compileSfc(FIXTURE_06);
		const specs = collectImportsFromCode(compiled.moduleCode);
		expect(specs).toContain("@custom-script/counter-util.ts");
	});

	it("transpiled 07 moduleCode has no TypeScript `as` assertions", () => {
		expect(FIXTURE_07).toBeTruthy();
		const compiled = compileSfc(FIXTURE_07);
		const transpiled = transpileTypeScript(
			compiled.moduleCode,
			"07.vue-interactive.ts",
		);
		expect(transpiled).not.toMatch(/\sas\s+string\[\]/);
	});
});
