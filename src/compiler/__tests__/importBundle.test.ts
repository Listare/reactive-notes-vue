import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileSfc } from "../compileSfc";
import { collectImportsFromCode } from "../../bundler/collectImports";
import { transpileTypeScript } from "../../bundler/transpile";

const FIXTURE_06 = readFileSync(
	join(process.cwd(), "test-vault/06 - 导入示例.md"),
	"utf8",
).match(/```vue-interactive\n([\s\S]*?)```/)?.[1];

const FIXTURE_07 = readFileSync(
	join(process.cwd(), "test-vault/07 - 导入Markdown代码块.md"),
	"utf8",
).match(/```vue-interactive\n([\s\S]*?)```/)?.[1];

describe("import bundle fixtures", () => {
	it("compiled 06 moduleCode still lists vault imports", () => {
		expect(FIXTURE_06).toBeTruthy();
		const compiled = compileSfc(FIXTURE_06!);
		const specs = collectImportsFromCode(compiled.moduleCode);
		expect(specs).toContain("@custom-script/counter-util.ts");
	});

	it("transpiled 07 moduleCode has no TypeScript `as` assertions", () => {
		expect(FIXTURE_07).toBeTruthy();
		const compiled = compileSfc(FIXTURE_07!);
		const transpiled = transpileTypeScript(
			compiled.moduleCode,
			"07.vue-interactive.ts",
		);
		expect(transpiled).not.toMatch(/\sas\s+string\[\]/);
	});
});
