import { describe, expect, it } from "vitest";
import { prepareModuleCode } from "../rewriteImports";

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
});
