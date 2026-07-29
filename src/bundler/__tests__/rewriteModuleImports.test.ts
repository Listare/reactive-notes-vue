import { describe, expect, it } from "vitest";
import { rewriteModuleImports } from "../rewriteModuleImports";

describe("rewriteModuleImports", () => {
	const ctx = { fromPath: "notes/demo.md", customScriptPath: "" };

	it("rewrites URL imports to await __importUrl__", () => {
		const { code } = rewriteModuleImports(
			`import { debounce } from 'https://esm.sh/lodash-es@4/debounce'\nreturn {}`,
			"notes/demo.md",
			ctx,
		);
		expect(code).toContain("await __importUrl__(");
		expect(code).toContain("https://esm.sh/lodash-es@4/debounce");
		expect(code).toMatch(/debounce.*\.default/);
		expect(code).not.toMatch(/import\s+.*from/);
	});

	it("leaves pinia imports to __pinia__", () => {
		const { code, dependencyIds } = rewriteModuleImports(
			`import { defineStore } from 'pinia'\nreturn {}`,
			"notes/demo.md",
			ctx,
		);
		expect(code).toContain("const { defineStore } = __pinia__");
		expect(dependencyIds).toEqual([]);
		expect(code).not.toMatch(/import\s+.*from/);
	});

	it("leaves @vue-interactive/theme imports to __getTheme__", () => {
		const { code } = rewriteModuleImports(
			`import { getTheme } from '@vue-interactive/theme'\nreturn {}`,
			"notes/demo.md",
			ctx,
		);
		expect(code).toContain("const { getTheme } = __getTheme__");
		expect(code).not.toMatch(/import\s+.*from/);
	});

	it("leaves @vue-interactive/math imports to __math__", () => {
		const { code } = rewriteModuleImports(
			`import { Latex } from '@vue-interactive/math'\nreturn {}`,
			"notes/demo.md",
			ctx,
		);
		expect(code).toContain("const { Latex } = __math__");
		expect(code).not.toMatch(/import\s+.*from/);
	});

	it("leaves @obsidian imports to __obsidian__", () => {
		const { code } = rewriteModuleImports(
			`import app from '@obsidian'\nimport { Notice } from '@obsidian'\nreturn {}`,
			"notes/demo.md",
			ctx,
		);
		expect(code).toContain("const app = __obsidian__.default");
		expect(code).toContain("const { Notice } = __obsidian__");
		expect(code).not.toMatch(/import\s+.*from/);
	});

	it("leaves node: imports to __node__", () => {
		const { code, dependencyIds } = rewriteModuleImports(
			`import { join } from 'node:path'\nreturn {}`,
			"notes/demo.md",
			ctx,
		);
		expect(code).toContain('const { join } = __node__["path"];');
		expect(dependencyIds).toEqual([]);
		expect(code).not.toMatch(/import\s+.*from/);
	});

	it("rewrites vault imports to __require__", () => {
		const { code } = rewriteModuleImports(
			`import x from './lib.js'\nreturn {}`,
			"notes/demo.md",
			ctx,
		);
		expect(code).toContain('await __require__("notes/lib.js")');
		expect(code).not.toContain("__importUrl__");
	});

	it("rewrites imports glued after Sucrase runtime helpers on the same line", () => {
		const glued =
			"function _optionalChain(ops) { return ops[0]; }import { Constraint, } from './solver.ts';\n" +
			"import { resize } from '../../utils/array-helper.ts';\n" +
			"return { Constraint, resize };";
		const { code } = rewriteModuleImports(
			glued,
			".reactive-notes-scripts/simplex/solver/big-m-solver.ts",
			{
				fromPath: ".reactive-notes-scripts/simplex/solver/big-m-solver.ts",
				customScriptPath: ".reactive-notes-scripts",
			},
		);
		expect(code).toContain("await __require__(");
		expect(code).toContain("Constraint");
		expect(code).toContain("resize");
		expect(code).not.toMatch(/\bimport\s+/);
	});

	it("falls back to default for vault named-only imports (Vue block)", () => {
		const { code } = rewriteModuleImports(
			`import { DistributionPanel } from './15 - 复杂场景.md?block=panel'\nreturn {}`,
			"test-vault/15 - 复杂场景.md",
			ctx,
		);
		expect(code).toMatch(
			/DistributionPanel.*\?\?.*__import_mod_\d+\.default/,
		);
	});
});
