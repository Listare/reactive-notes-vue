import { describe, expect, it } from "vitest";
import { rewriteGetThemeImportsInCode } from "../rewriteGetThemeImports";

describe("rewriteGetThemeImportsInCode", () => {
	it("rewrites named import from @vue-interactive/theme", () => {
		const code = rewriteGetThemeImportsInCode(
			"import { getTheme } from '@vue-interactive/theme'\n",
		);
		expect(code).toBe("const { getTheme } = __getTheme__;\n");
	});

	it("rewrites default import", () => {
		const code = rewriteGetThemeImportsInCode(
			"import getTheme from '@vue-interactive/theme'\n",
		);
		expect(code).toBe(
			"const getTheme = __getTheme__.default ?? __getTheme__.getTheme;\n",
		);
	});

	it("rewrites namespace import", () => {
		const code = rewriteGetThemeImportsInCode(
			"import * as Theme from '@vue-interactive/theme'\n",
		);
		expect(code).toBe("const Theme = __getTheme__;\n");
	});
});
