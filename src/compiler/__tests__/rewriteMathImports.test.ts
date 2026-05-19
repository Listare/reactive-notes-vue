import { describe, expect, it } from "vitest";
import { rewriteMathImportsInCode } from "../rewriteMathImports";

describe("rewriteMathImportsInCode", () => {
	it("rewrites named import from @vue-interactive/math", () => {
		const code = rewriteMathImportsInCode(
			"import { Latex } from '@vue-interactive/math'\n",
		);
		expect(code).toBe("const { Latex } = __math__;\n");
	});

	it("rewrites default import", () => {
		const code = rewriteMathImportsInCode(
			"import Latex from '@vue-interactive/math'\n",
		);
		expect(code).toBe(
			"const Latex = __math__.default ?? __math__.Latex;\n",
		);
	});

	it("rewrites namespace import", () => {
		const code = rewriteMathImportsInCode(
			"import * as Math from '@vue-interactive/math'\n",
		);
		expect(code).toBe("const Math = __math__;\n");
	});
});
