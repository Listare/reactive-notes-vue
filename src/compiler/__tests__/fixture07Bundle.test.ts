import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileSfc } from "../compileSfc";
import { transpileTypeScript } from "../../bundler/transpile";
import { bundleGraph } from "../../bundler/bundleGraph";
import { collectImportsFromSfc } from "../../bundler/collectImports";
import { prepareScriptModule } from "../../bundler/prepareScriptModule";
import { extractNamedCodeBlock } from "../../markdown/extractNamedCodeBlock";
import { executeModule } from "../../runtime/executeModule";
import type { ModuleLoader } from "../../bundler/types";

const FIXTURE_07 = readFileSync(
	join(process.cwd(), "test-vault/07 - 导入Markdown代码块.md"),
	"utf8",
).match(/```vue-interactive\n([\s\S]*?)```/)?.[1]!;

const SNIPPETS = readFileSync(
	join(process.cwd(), "test-vault/shared/snippets.md"),
	"utf8",
);

describe("fixture 07 bundle", () => {
	it("executes without syntax errors", async () => {
		const sourcePath = "07 - 导入Markdown代码块.md";
		const compiled = compileSfc(FIXTURE_07);
		const imports = collectImportsFromSfc(FIXTURE_07);
		const moduleCode = transpileTypeScript(
			compiled.moduleCode,
			`${sourcePath}.vue-interactive.ts`,
		);

		const loader: ModuleLoader = {
			fileExists: async () => true,
			loadModule: async ({ specifier }) => {
				if (specifier.includes("addFn")) {
					const extracted = extractNamedCodeBlock(SNIPPETS, "addFn")!;
					return {
						canonicalId: "shared/snippets.md?block=addFn",
						vaultPath: "shared/snippets.md",
						code: prepareScriptModule(
							extracted.content,
							"shared/snippets.md?block=addFn",
						),
						styles: [],
						dependencies: [],
					};
				}
				if (specifier.includes("labels")) {
					return {
						canonicalId: "shared/snippets.md?block=labels",
						vaultPath: "shared/snippets.md",
						code: 'return { default: ["alpha","beta","gamma"] };',
						styles: [],
						dependencies: [],
					};
				}
				throw new Error(`unexpected ${specifier}`);
			},
		};

		const ctx = { fromPath: sourcePath, customScriptPath: "" };
		const entryId = `${sourcePath}#vue-interactive-entry`;
		const bundled = await bundleGraph(
			{
				canonicalId: entryId,
				vaultPath: sourcePath,
				code: moduleCode,
				styles: [],
			},
			ctx,
			loader,
			imports,
		);

		await expect(executeModule(bundled.moduleCode)).resolves.toBeDefined();
	});
});
