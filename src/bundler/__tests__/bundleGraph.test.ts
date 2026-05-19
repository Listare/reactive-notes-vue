import { describe, expect, it } from "vitest";
import { bundleGraph } from "../bundleGraph";
import { executeModule } from "../../runtime/executeModule";
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
		expect(result.vaultDependencies).toEqual(["notes/dep.js"]);
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

	it("allows circular dependencies between modules", async () => {
		const loader: ModuleLoader = {
			fileExists: async () => true,
			loadModule: async ({ specifier }) => {
				if (specifier === "./a.js") {
					return {
						canonicalId: "notes/a.js",
						vaultPath: "notes/a.js",
						code: `
import b from './b.js'
export default function getA(skip = true) {
  return 'A' + (skip ? '' : b(false))
}
`.trim(),
						styles: [],
						dependencies: ["./b.js"],
					};
				}
				if (specifier === "./b.js") {
					return {
						canonicalId: "notes/b.js",
						vaultPath: "notes/b.js",
						code: `
import a from './a.js'
export default function getB(skip = true) {
  return 'B' + (skip ? '' : a(false))
}
`.trim(),
						styles: [],
						dependencies: ["./a.js"],
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
import getA from './a.js'
import getB from './b.js'
return { setup() { return () => null } }
`.trim(),
				styles: [],
			},
			{ fromPath: "notes/entry.md", customScriptPath: "" },
			loader,
		);

		await expect(executeModule(result.moduleCode)).resolves.toBeDefined();
	});

	it("records URL imports without calling the vault loader", async () => {
		const loader: ModuleLoader = {
			fileExists: async () => true,
			loadModule: async () => {
				throw new Error("vault loader should not run for URL imports");
			},
		};

		const url = "https://esm.sh/idb-keyval@6";
		const result = await bundleGraph(
			{
				canonicalId: "notes/entry.md#vue-interactive-entry",
				vaultPath: "notes/entry.md",
				code: `
import { get } from '${url}'
return { setup() { return () => null } }
`.trim(),
				styles: [],
			},
			{ fromPath: "notes/entry.md", customScriptPath: "" },
			loader,
			[url],
		);

		expect(result.moduleCode).toContain("__importUrl__");
		expect(result.moduleCode).toContain(url);
		expect(result.vaultDependencies).toEqual([]);
	});
});
