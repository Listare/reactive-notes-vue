import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileSfc } from "../compileSfc";
import { transpileTypeScript } from "../../bundler/transpile";
import { bundleGraph } from "../../bundler/bundleGraph";
import {
	collectImportsFromCode,
	collectImportsFromSfc,
} from "../../bundler/collectImports";
import { prepareScriptModule } from "../../bundler/prepareScriptModule";
import { extractNamedCodeBlock } from "../../markdown/extractNamedCodeBlock";
import { executeModule } from "../../runtime/executeModule";
import type { ModuleLoader } from "../../bundler/types";

const FIXTURE_PATH = join(process.cwd(), "test-vault/08 - 自引用.md");
const FIXTURE_08 = readFileSync(FIXTURE_PATH, "utf8");
function lastVueInteractiveBlock(markdown: string): string {
	const re = /```vue-interactive[^\n]*\r?\n([\s\S]*?)```/g;
	let last: string | undefined;
	let match: RegExpExecArray | null;
	while ((match = re.exec(markdown)) !== null) {
		last = match[1];
	}
	if (!last) throw new Error("fixture missing main vue-interactive block");
	return last;
}

const MAIN_BLOCK = lastVueInteractiveBlock(FIXTURE_08);
const sourcePath = "08 - 自引用.md";

function blockContent(name: string): string {
	const extracted = extractNamedCodeBlock(FIXTURE_08, name);
	if (!extracted) throw new Error(`missing block ${name}`);
	return extracted.content;
}

describe("fixture 08 self-reference", () => {
	const loader: ModuleLoader = {
		fileExists: async () => true,
		loadModule: async ({ specifier }) => {
			const blockMatch = /\?block=([^&'"]+)/.exec(specifier);
			const block = blockMatch?.[1];
			if (!block) throw new Error(`unexpected ${specifier}`);

			if (block === "double") {
				return {
					canonicalId: `${sourcePath}?block=double`,
					vaultPath: sourcePath,
					code: prepareScriptModule(
						blockContent("double"),
						`${sourcePath}?block=double`,
					),
					styles: [],
					dependencies: [],
				};
			}

			if (block === "Chip") {
				const compiled = compileSfc(blockContent("Chip"));
				let code = compiled.moduleCode.includes("return ")
					? compiled.moduleCode
					: `return ${compiled.moduleCode}`;
				code = transpileTypeScript(
					code,
					`${sourcePath}/__block__-Chip.ts`,
				);
				return {
					canonicalId: `${sourcePath}?block=Chip`,
					vaultPath: sourcePath,
					code,
					styles: compiled.styles,
					dependencies: collectImportsFromSfc(blockContent("Chip")),
				};
			}

			if (block === "modA" || block === "modB") {
				return {
					canonicalId: `${sourcePath}?block=${block}`,
					vaultPath: sourcePath,
					code: prepareScriptModule(
						blockContent(block),
						`${sourcePath}?block=${block}`,
					),
					styles: [],
					dependencies: collectImportsFromCode(blockContent(block)),
				};
			}

			throw new Error(`unexpected block ${block}`);
		},
	};

	it("bundles same-file blocks including circular modA/modB", async () => {
		const compiled = compileSfc(MAIN_BLOCK);
		const imports = collectImportsFromSfc(MAIN_BLOCK);
		const moduleCode = transpileTypeScript(
			compiled.moduleCode,
			`${sourcePath}.vue-interactive.ts`,
		);
		const entryId = `${sourcePath}#vue-interactive-entry`;

		const bundled = await bundleGraph(
			{
				canonicalId: entryId,
				vaultPath: sourcePath,
				code: moduleCode,
				styles: [],
			},
			{ fromPath: sourcePath, customScriptPath: "" },
			loader,
			imports,
		);

		expect(bundled.moduleCode).toContain("__require__");
		expect(bundled.moduleCode).toContain("?block=double");
		expect(bundled.moduleCode).toContain("?block=Chip");
		expect(bundled.moduleCode).toContain("?block=modA");
		expect(bundled.moduleCode).toContain("?block=modB");
		await expect(executeModule(bundled.moduleCode)).resolves.toBeDefined();
	});
});
