import { describe, expect, it } from "vitest";
import { bundleGraph } from "../bundleGraph";
import type { ModuleLoader } from "../types";

describe("bundleGraph", () => {
	it("inlines a local dependency", async () => {
		const loader: ModuleLoader = {
			fileExists: async () => true,
			loadModule: async ({ specifier }) => {
				if (specifier === "./dep.js") {
					return {
						canonicalId: "notes/dep.js",
						vaultPath: "notes/dep.js",
						code: "export default { n: 1 };",
						styles: [],
						dependencies: [],
					};
				}
				throw new Error(`unexpected ${specifier}`);
			},
		};

		const result = await bundleGraph(
			{
				canonicalId: "notes/entry.md#vue-interactive-entry",
				vaultPath: "notes/entry.md",
				code: `
import value from './dep.js'
return { setup() { return () => null } }
`.trim(),
				styles: [],
			},
			{ fromPath: "notes/entry.md", customScriptPath: "" },
			loader,
		);

		expect(result.moduleCode).toContain("__require__");
		expect(result.moduleCode).toContain("__moduleFactories__");
		expect(result.moduleCode).toContain("notes/dep.js");
		expect(result.moduleCode).not.toMatch(/import\s+.*from/);
	});

	it("does not require custom script path when @custom-script is unused", async () => {
		const loader: ModuleLoader = {
			fileExists: async () => false,
			loadModule: async ({ specifier }) => {
				if (specifier === "./dep.js") {
					return {
						canonicalId: "notes/dep.js",
						vaultPath: "notes/dep.js",
						code: "export default 1;",
						styles: [],
						dependencies: [],
					};
				}
				throw new Error(`unexpected ${specifier}`);
			},
		};

		await expect(
			bundleGraph(
				{
					canonicalId: "notes/entry.md#vue-interactive-entry",
					vaultPath: "notes/entry.md",
					code: "import x from './dep.js'\nreturn { setup: () => () => null }",
					styles: [],
				},
				{ fromPath: "notes/entry.md", customScriptPath: "scripts" },
				loader,
			),
		).resolves.toBeDefined();
	});
});
