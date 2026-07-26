import { describe, expect, it } from "vitest";
import { collectImportsFromCode } from "../collectImports";
import { collectNodeBuiltinSpecifiersFromCode } from "../../compiler/validateNodeBuiltinImports";

describe("collectImports with node:", () => {
	it("excludes node: from vault dependency collection", () => {
		const specs = collectImportsFromCode(`
import { join } from 'node:path'
import x from './lib.js'
`);
		expect(specs).toEqual(["./lib.js"]);
	});

	it("still discovers node: via dedicated collector", () => {
		expect(
			collectNodeBuiltinSpecifiersFromCode(
				`import { join } from 'node:path'\n`,
			),
		).toEqual(["node:path"]);
	});
});
