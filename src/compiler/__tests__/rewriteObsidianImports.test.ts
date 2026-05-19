import { describe, expect, it } from "vitest";
import { rewriteObsidianImportsInCode } from "../rewriteObsidianImports";

describe("rewriteObsidianImportsInCode", () => {
	it("rewrites default import from @obsidian", () => {
		const code = rewriteObsidianImportsInCode(
			"import app from '@obsidian'\n",
		);
		expect(code).toContain("const app = __obsidian__.default");
		expect(code).not.toContain("import ");
	});

	it("rewrites named import from @obsidian", () => {
		const code = rewriteObsidianImportsInCode(
			"import { Notice, Modal } from '@obsidian'\n",
		);
		expect(code).toContain("const { Notice, Modal } = __obsidian__");
	});

	it("rewrites namespace import", () => {
		const code = rewriteObsidianImportsInCode(
			"import * as Obs from '@obsidian'\n",
		);
		expect(code).toContain("const Obs = __obsidian__");
	});
});
