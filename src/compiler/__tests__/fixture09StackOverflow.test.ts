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
import { rewriteRuntimeStack } from "../../runtime/stackTrace";
import type { ModuleLoader } from "../../bundler/types";

const FIXTURE_09 = readFileSync(
	join(process.cwd(), "test-vault/09 - 错误-递归过深.md"),
	"utf8",
);
const MAIN_BLOCK = FIXTURE_09.match(
	/```vue-interactive[^\n]*\r?\n([\s\S]*?)```/,
)?.[1]!;
const sourcePath = "09 - 错误-递归过深.md";

describe("fixture 09 stack overflow", () => {
	it("surfaces RangeError with stack instead of crashing the host", async () => {
		const recursive = extractNamedCodeBlock(FIXTURE_09, "recursiveRun")!;
		const loader: ModuleLoader = {
			fileExists: async () => true,
			loadModule: async ({ specifier }) => {
				if (!specifier.includes("recursiveRun")) {
					throw new Error(`unexpected ${specifier}`);
				}
				return {
					canonicalId: `${sourcePath}?block=recursiveRun`,
					vaultPath: sourcePath,
					code: prepareScriptModule(
						recursive.content,
						`${sourcePath}?block=recursiveRun`,
					),
					styles: [],
					dependencies: [],
				};
			},
		};

		const compiled = compileSfc(MAIN_BLOCK);
		const imports = collectImportsFromSfc(MAIN_BLOCK);
		const moduleCode = transpileTypeScript(
			compiled.moduleCode,
			`${sourcePath}.vue-interactive.ts`,
		);
		const { moduleCode: bundledCode, stackRegions } = await bundleGraph(
			{
				canonicalId: `${sourcePath}#vue-interactive-entry`,
				vaultPath: sourcePath,
				code: moduleCode,
				styles: [],
			},
			{ fromPath: sourcePath, customScriptPath: "" },
			loader,
			imports,
		);

		let thrown: Error | undefined;
		try {
			await executeModule(bundledCode);
		} catch (e) {
			thrown = e instanceof Error ? e : new Error(String(e));
		}

		expect(thrown).toBeDefined();
		const stack =
			rewriteRuntimeStack(thrown!.stack, stackRegions) ?? thrown!.stack ?? "";
		const msg = `${thrown!.message}\n${stack}`;
		expect(msg).toMatch(/stack|Maximum call stack/i);
		expect(stack).toMatch(
			new RegExp(`${sourcePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:recursiveRun:\\d+:\\d+`),
		);
		expect(stack).not.toMatch(/<anonymous>:\d+:\d+/);
	});
});
