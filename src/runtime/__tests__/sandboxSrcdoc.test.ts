import { describe, expect, it } from "vitest";
import { buildSandboxSrcdoc } from "../sandboxSrcdoc";

describe("buildSandboxSrcdoc", () => {
	it("inlines runner and escapes closing script tags", () => {
		const srcdoc = buildSandboxSrcdoc('console.log("</script>")');
		expect(srcdoc).toContain('console.log("<\\/script>")');
		expect(srcdoc).toContain("vue-interactive-mount");
		expect(srcdoc).not.toContain('console.log("</script>")');
	});
});
