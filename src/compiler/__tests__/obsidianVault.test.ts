import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listVisibleVueInteractiveBlocks } from "../../markdown/vueInteractiveFence";
import { compileSfc } from "../compileSfc";
import { prepareModuleCode } from "../rewriteImports";
import { collectImportsFromSfc } from "../../bundler/collectImports";
import { rewriteModuleImports } from "../../bundler/rewriteModuleImports";
import { emitBundle } from "../../bundler/emitBundle";
import { executeModule } from "../../runtime/executeModule";
import type { ObsidianSandboxModule } from "../../runtime/obsidian/proxyClient";

const VAULT_FIXTURE = readFileSync(
	join(process.cwd(), "test-vault/11 - Obsidian API.md"),
	"utf8",
);

const SFC_SOURCE = listVisibleVueInteractiveBlocks(VAULT_FIXTURE)[0]?.content;

const SOURCE_PATH = "11 - Obsidian API.md";

describe("test-vault/11 - Obsidian API", () => {
	it("fixture contains @obsidian imports", () => {
		expect(SFC_SOURCE).toBeTruthy();
		expect(SFC_SOURCE).toContain("from '@obsidian'");
	});

	it("collectImportsFromSfc excludes @obsidian", () => {
		const specs = collectImportsFromSfc(SFC_SOURCE!);
		expect(specs).not.toContain("@obsidian");
		expect(specs).not.toContain("obsidian");
	});

	it("prepareModuleCode rewrites @obsidian to __obsidian__", () => {
		const compiled = compileSfc(SFC_SOURCE!);
		const code = prepareModuleCode(compiled.moduleCode);
		expect(code).toContain("const app = __obsidian__.default");
		expect(code).toContain("const { Notice } = __obsidian__");
		expect(code).not.toMatch(/import\s+.*@obsidian/);
	});

	it("rewriteModuleImports keeps only __obsidian__ bindings", () => {
		const compiled = compileSfc(SFC_SOURCE!);
		const { code, dependencyIds } = rewriteModuleImports(
			compiled.moduleCode,
			SOURCE_PATH,
			{ fromPath: SOURCE_PATH, customScriptPath: "scripts" },
		);
		expect(code).toContain("__obsidian__");
		expect(dependencyIds).toHaveLength(0);
	});

	it("emitBundle entry uses __obsidian__ without vault deps", () => {
		const compiled = compileSfc(SFC_SOURCE!);
		const { code } = rewriteModuleImports(
			compiled.moduleCode,
			SOURCE_PATH,
			{ fromPath: SOURCE_PATH, customScriptPath: "" },
		);
		const { moduleCode } = emitBundle(
			[
				{
					canonicalId: `${SOURCE_PATH}#vue-interactive-entry`,
					vaultPath: SOURCE_PATH,
					code,
					styles: [],
				},
			],
			`${SOURCE_PATH}#vue-interactive-entry`,
			{ fromPath: SOURCE_PATH, customScriptPath: "" },
		);
		expect(moduleCode).toContain("__obsidian__");
		expect(moduleCode).toContain(
			"function(__vue__, __require__, __importUrl__, __obsidian__, __getTheme__)",
		);
	});

	it("executes with a mock Obsidian module", async () => {
		const compiled = compileSfc(SFC_SOURCE!);
		const { code } = rewriteModuleImports(
			compiled.moduleCode,
			SOURCE_PATH,
			{ fromPath: SOURCE_PATH, customScriptPath: "" },
		);
		const mockApp = {
			vault: {
				getName: () => "test-vault",
			},
			workspace: {
				getActiveFile: () => ({ path: SOURCE_PATH }),
			},
		};
		const Notice = vi.fn();
		const obsidian: ObsidianSandboxModule = {
			default: mockApp,
			Notice,
		};
		const component = await executeModule(code, obsidian);
		expect(component).toBeDefined();
	});
});
