import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { bundleGraph } from "../../bundler/bundleGraph";
import { prepareScriptModule } from "../../bundler/prepareScriptModule";
import { compileSfc } from "../compileSfc";
import { collectImportsFromSfc } from "../../bundler/collectImports";
import type { ModuleLoader } from "../../bundler/types";
import { executeModule } from "../../runtime/executeModule";
import { validateModuleSyntax } from "../../runtime/validateModuleSyntax";
import { extractFirstVueInteractiveBlock } from "../../test/readVueInteractiveFixture";

const ROOT = process.cwd();
const readVault = (vaultPath: string) =>
	readFileSync(join(ROOT, vaultPath.replace(/\\/g, "/")), "utf8");

const PANEL = readVault("test-vault/scripts/DistributionPanel.vue");
const CHART = readVault("test-vault/scripts/DistributionChart.vue");
const DISTRIBUTIONS = readVault("test-vault/scripts/distributions.ts");

function loaderForScripts(): ModuleLoader {
	return {
		fileExists: async () => true,
		loadModule: async ({ specifier }) => {
			if (specifier === "@custom-script/DistributionPanel.vue") {
				const compiled = compileSfc(PANEL);
				return {
					canonicalId: "scripts/DistributionPanel.vue",
					vaultPath: "scripts/DistributionPanel.vue",
					code: compiled.moduleCode,
					styles: compiled.styles,
					dependencies: collectImportsFromSfc(PANEL),
				};
			}
			if (specifier === "./DistributionChart.vue") {
				const compiled = compileSfc(CHART);
				return {
					canonicalId: "scripts/DistributionChart.vue",
					vaultPath: "scripts/DistributionChart.vue",
					code: compiled.moduleCode,
					styles: compiled.styles,
					dependencies: collectImportsFromSfc(CHART),
				};
			}
			if (specifier === "@custom-script/distributions.ts") {
				return {
					canonicalId: "scripts/distributions.ts",
					vaultPath: "scripts/distributions.ts",
					code: prepareScriptModule(DISTRIBUTIONS, "scripts/distributions.ts"),
					styles: [],
					dependencies: [],
				};
			}
			throw new Error(`unexpected ${specifier}`);
		},
	};
}

describe("DistributionPanel.vue compile", () => {
	it("compileSfc strips TypeScript from script", () => {
		const { moduleCode } = compileSfc(PANEL);
		expect(moduleCode).not.toMatch(/:\s*Distribution\b/);
		expect(moduleCode).not.toMatch(/Record<string,\s*number>/);
	});

	it("bundled note 16 produces executable module", async () => {
		const note = readVault("test-vault/16 - 复杂场景-分离.md");
		const fence = extractFirstVueInteractiveBlock(note);
		expect(fence).toBeTruthy();

		const entryCompiled = compileSfc(fence!);
		const imports = collectImportsFromSfc(fence!);
		const loader = loaderForScripts();

		const bundled = await bundleGraph(
			{
				canonicalId: "test-vault/16 - 复杂场景-分离.md#vue-interactive-entry",
				vaultPath: "test-vault/16 - 复杂场景-分离.md",
				code: entryCompiled.moduleCode,
				styles: entryCompiled.styles,
			},
			{ fromPath: "test-vault/16 - 复杂场景-分离.md", customScriptPath: "scripts" },
			loader,
			imports,
		);

		validateModuleSyntax(bundled.moduleCode, bundled.stackRegions);
		await expect(executeModule(bundled.moduleCode)).resolves.toBeDefined();
	});
});
