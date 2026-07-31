import { describe, expect, it } from "vitest";
import { assembleModule } from "../assembleModule";

describe("assembleModule", () => {
	it("returns rewritten default export when template is omitted", () => {
		const { code, originalLineByEmitted } = assembleModule({
			scriptContent: `
import { ref } from 'vue'
export default { setup() { return { n: ref(1) } } }
`,
		});
		expect(code).toContain("const { ref } = __vue__");
		expect(code).toMatch(/^return /m);
		expect(code).not.toContain("export default");
		expect(originalLineByEmitted).toEqual([]);
	});

	it("wires render into __sfc_main when template is provided", () => {
		const { code } = assembleModule({
			scriptContent: `
import { ref } from 'vue'
export default { setup() { return { n: ref(0) } } }
`,
			templateCode: `
import { openBlock, createElementBlock } from 'vue'
export function render(_ctx, _cache) {
  return (openBlock(), createElementBlock("div"))
}
`,
		});
		expect(code).toContain("function render");
		expect(code).toContain("__sfc_main.render = render");
		expect(code).toContain("return __sfc_main");
		expect(code).toContain("const { openBlock, createElementBlock } = __vue__");
	});
});
