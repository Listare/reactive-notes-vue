import { describe, expect, it } from "vitest";
import { rewriteNodeImportsInCode } from "../rewriteNodeImports";

describe("rewriteNodeImportsInCode", () => {
	it("rewrites named import from node:path", () => {
		const code = rewriteNodeImportsInCode(
			"import { join, dirname } from 'node:path'\n",
		);
		expect(code).toContain(
			'const { join, dirname } = __node__["path"];',
		);
		expect(code).not.toContain("import ");
	});

	it("rewrites default import", () => {
		const code = rewriteNodeImportsInCode(
			"import path from 'node:path'\n",
		);
		expect(code).toContain('const path = __node__["path"].default;');
	});

	it("rewrites namespace import", () => {
		const code = rewriteNodeImportsInCode(
			"import * as path from 'node:path'\n",
		);
		expect(code).toContain('const path = __node__["path"];');
	});

	it("rewrites fs/promises subpath", () => {
		const code = rewriteNodeImportsInCode(
			"import { readFile } from 'node:fs/promises'\n",
		);
		expect(code).toContain(
			'const { readFile } = __node__["fs/promises"];',
		);
	});

	it("strips side-effect imports", () => {
		const code = rewriteNodeImportsInCode("import 'node:path'\n");
		expect(code.trim()).toBe("");
	});
});
