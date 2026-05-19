import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileSfc } from "../compileSfc";
import { extractNamedCodeBlock } from "../../markdown/extractNamedCodeBlock";
import { executeModule } from "../../runtime/executeModule";
import { transpileTypeScript } from "../../bundler/transpile";

describe("transpile SFC output", () => {
	it("Chip block runs after transpile (no TS type annotations in output)", () => {
		const md = readFileSync(
			join(process.cwd(), "test-vault/08 - 自引用.md"),
			"utf8",
		);
		const chip = extractNamedCodeBlock(md, "Chip")!.content;
		const { moduleCode } = compileSfc(chip);
		const js = transpileTypeScript(
			moduleCode,
			"08 - 自引用/__block__-Chip.ts",
		);
		expect(js).not.toMatch(/:\s*any\b/);
		expect(() => executeModule(js)).not.toThrow();
	});
});
