import { describe, expect, it } from "vitest";
import { rewritePiniaImportsInCode } from "../rewritePiniaImports";
import { prepareModuleCode } from "../rewriteImports";

describe("rewritePiniaImportsInCode", () => {
	it("rewrites named imports", () => {
		const code = rewritePiniaImportsInCode(
			`import { defineStore, storeToRefs } from 'pinia'\n`,
		);
		expect(code).toBe("const { defineStore, storeToRefs } = __pinia__;\n");
	});

	it("rewrites namespace imports", () => {
		const code = rewritePiniaImportsInCode(`import * as Pinia from "pinia"\n`);
		expect(code).toBe("const Pinia = __pinia__;\n");
	});

	it("rewrites default imports", () => {
		const code = rewritePiniaImportsInCode(`import pinia from 'pinia'\n`);
		expect(code).toBe("const pinia = __pinia__.default ?? __pinia__;\n");
	});
});

describe("prepareModuleCode pinia", () => {
	it("rewrites pinia imports for sandbox execution", () => {
		const code = prepareModuleCode(`
import { defineStore } from 'pinia'
export default { setup() { return () => null } }
`);
		expect(code).toContain("const { defineStore } = __pinia__");
		expect(code).not.toContain("from 'pinia'");
	});
});
