import { describe, expect, it } from "vitest";
import {
	prepareModuleCode,
	validateScriptImports,
	UnsupportedImportError,
} from "../rewriteImports";

describe("validateScriptImports", () => {
	it("allows vue imports", () => {
		expect(() =>
			validateScriptImports(`
<template></template>
<script setup lang="ts">
import { ref } from 'vue'
</script>
`),
		).not.toThrow();
	});

	it("rejects non-vue imports", () => {
		expect(() =>
			validateScriptImports(`
<script setup>
import lodash from 'lodash'
</script>
`),
		).toThrow(UnsupportedImportError);
	});
});

describe("prepareModuleCode", () => {
	it("rewrites vue imports and export default", () => {
		const code = prepareModuleCode(`
import { ref, defineComponent as _defineComponent } from 'vue'
export default _defineComponent({ setup() { const x = ref(0); return () => null } })
`);
		expect(code).toContain("const { ref, defineComponent: _defineComponent } = __vue__");
		expect(code).toMatch(/return _defineComponent/);
		expect(code).not.toContain("import ");
	});
});
