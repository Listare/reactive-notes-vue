import { describe, expect, it } from "vitest";
import { prepareScriptModule } from "../prepareScriptModule";
import { rewriteModuleImports } from "../rewriteModuleImports";

describe("prepareScriptModule + rewrite for Sucrase helpers", () => {
	it("leaves no bare import after transpile of optional chaining", () => {
		const source = [
			"import { Constraint } from './solver.ts';",
			"import { resize } from '../../utils/array-helper.ts';",
			"export class BigMSolver {",
			"  f(x?: { a?: number }) {",
			"    return x?.a ?? Constraint.Equal;",
			"  }",
			"}",
		].join("\n");
		const prepared = prepareScriptModule(
			source,
			".reactive-notes-scripts/simplex/solver/big-m-solver.ts",
		);
		expect(prepared).not.toMatch(/\}import\b/);

		const { code } = rewriteModuleImports(
			prepared,
			".reactive-notes-scripts/simplex/solver/big-m-solver.ts",
			{
				fromPath:
					".reactive-notes-scripts/simplex/solver/big-m-solver.ts",
				customScriptPath: ".reactive-notes-scripts",
			},
		);
		expect(code).not.toMatch(/\bimport\s+/);
		expect(code).toContain("await __require__(");
		expect(code).toContain("BigMSolver");
	});
});
