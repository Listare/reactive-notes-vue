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

	it("rewrites vault imports to __require__", () => {
		const { code } = rewriteModuleImports(
			`import x from './lib.js'\nreturn {}`,
			"notes/demo.md",
			ctx,
		);
		expect(code).toContain('await __require__("notes/lib.js")');
		expect(code).not.toContain("__importUrl__");
	});
});
