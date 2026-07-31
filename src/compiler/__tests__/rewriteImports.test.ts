import { describe, expect, it } from "vitest";
import {
	prepareModuleCode,
	rewriteBuiltinImportsInCode,
	rewriteVueImportsInCode,
} from "../rewriteImports";

describe("rewriteVueImportsInCode", () => {
	it("drops type-only specifiers and keeps value aliases", () => {
		const code = rewriteVueImportsInCode(
			`import { ref, type Ref, computed as c } from 'vue'\n`,
		);
		expect(code).toBe("const { ref, computed: c } = __vue__;\n");
	});
});

describe("prepareModuleCode", () => {
	it("rewrites vue imports and export default", () => {
		const code = prepareModuleCode(`
import { ref, defineComponent as _defineComponent } from 'vue'
export default _defineComponent({ setup() { const x = ref(0); return () => null } })
`);
		expect(code).toContain(
			"const { ref, defineComponent: _defineComponent } = __vue__",
		);
		expect(code).toMatch(/return _defineComponent/);
		expect(code).not.toContain("import ");
	});

	it("rewrites named function exports for sandbox execution", () => {
		const code = prepareModuleCode(`
export function logGamma(z) {
  return z;
}
`);
		expect(code).not.toMatch(/\bexport\b/);
		expect(code).toMatch(/function logGamma/);
		expect(code).toMatch(/return \{ logGamma, default: undefined \}/);
	});

	it("rewrites async function, class, and const exports", () => {
		const code = prepareModuleCode(`
export async function load() { return 1 }
export class Box {}
export const answer = 42
export let mutable = 0
`);
		expect(code).toContain("async function load");
		expect(code).toContain("class Box");
		expect(code).toContain("const answer = 42");
		expect(code).toContain("let mutable = 0");
		expect(code).toMatch(
			/return \{ load, Box, answer, mutable, default: undefined \}/,
		);
		expect(code).not.toMatch(/\bexport\b/);
	});

	it("rewrites export group aliases into return object", () => {
		const code = prepareModuleCode(`
const local = 1
export { local as exported }
`);
		expect(code).toContain("exported: local");
		expect(code).toMatch(/return \{ exported: local, default: undefined \}/);
		expect(code).not.toMatch(/\bexport\b/);
	});

	it("merges default export with named exports", () => {
		const code = prepareModuleCode(`
export const helper = () => 1
export default { setup() { return () => null } }
`);
		expect(code).toMatch(/return \{ default: \(/);
		expect(code).toContain("helper");
		expect(code).not.toMatch(/\bexport\b/);
	});

	it("chains builtin import rewrites", () => {
		const code = rewriteBuiltinImportsInCode(`
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { Notice } from '@obsidian'
`);
		expect(code).toContain("const { ref } = __vue__");
		expect(code).toContain("const { defineStore } = __pinia__");
		expect(code).toContain("const { Notice } = __obsidian__");
	});
});
