import { describe, expect, it } from "vitest";
import { buildSandboxSrcdoc } from "../sandboxSrcdoc";

describe("buildSandboxSrcdoc", () => {
	it("inlines runner, Tailwind browser, and escapes closing tags", () => {
		const srcdoc = buildSandboxSrcdoc('console.log("</script>")', {
			browserScript: 'console.log("</script>tw")',
			configCss: '@custom-variant dark (&:where(.dark *));</style>',
			staticCss: '.latex{color:red}</style>',
		});
		expect(srcdoc).toContain('console.log("<\\/script>")');
		expect(srcdoc).toContain("vue-interactive-mount");
		expect(srcdoc).toContain("data-vue-interactive=\"reset\"");
		expect(srcdoc).toContain("overflow:hidden");
		expect(srcdoc).toContain("display:flow-root");
		expect(srcdoc).not.toContain('console.log("</script>")');
		expect(srcdoc).toContain('data-vue-interactive="tailwind-browser"');
		expect(srcdoc).toContain('console.log("<\\/script>tw")');
		expect(srcdoc).toContain('type="text/tailwindcss"');
		expect(srcdoc).toContain('data-vue-interactive="tailwind-config"');
		expect(srcdoc).toContain("@custom-variant dark");
		expect(srcdoc).toContain("<\\/style>");
		expect(srcdoc).toContain('data-vue-interactive="sandbox"');
		expect(srcdoc).toContain(".latex{color:red}");
	});

	it("omits optional Tailwind blocks when empty", () => {
		const srcdoc = buildSandboxSrcdoc("void 0", {
			browserScript: "",
			configCss: "",
			staticCss: "",
		});
		expect(srcdoc).not.toContain("tailwind-browser");
		expect(srcdoc).not.toContain("text/tailwindcss");
		expect(srcdoc).not.toContain('data-vue-interactive="sandbox"');
		expect(srcdoc).toContain('data-vue-interactive="reset"');
	});
});
