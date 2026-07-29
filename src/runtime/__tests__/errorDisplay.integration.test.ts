import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { compileSfc } from "../../compiler/compileSfc";
import { executeModule } from "../executeModule";
import { mountWithSuspense } from "../mountWithSuspense";
import {
	rewriteRuntimeStack,
	singleModuleStackRegion,
} from "../stackTrace";

describe("error display integration", () => {
	it("maps setup throw to the correct module line without plugin frames", async () => {
		const src = readFileSync("./test-vault/errors/03 - setup报错.md", "utf8");
		const m = /```vue-interactive\r?\n([\s\S]*?)\r?\n```/.exec(src)!;
		const compiled = compileSfc(m[1]!);
		const path = "errors/03 - setup报错.md";
		const moduleCode = `const __pinia__ = __piniaFor__(${JSON.stringify(path)});\n${compiled.moduleCode}`;
		const regions = [singleModuleStackRegion(path)];
		const throwLine =
			moduleCode.split("\n").findIndex((l) => l.includes("setup 同步测试错误")) +
			1;

		const component = await executeModule(
			moduleCode,
			undefined,
			undefined,
			undefined,
			undefined,
			regions,
		);

		const el = document.createElement("div");
		document.body.appendChild(el);
		const { whenReady } = mountWithSuspense(component, el);

		let failed: Error | undefined;
		try {
			await whenReady;
		} catch (e) {
			failed = e instanceof Error ? e : new Error(String(e));
		}

		expect(failed?.message).toBe("setup 同步测试错误");
		const stack = rewriteRuntimeStack(failed?.stack, regions) ?? "";
		expect(stack).toContain(`${path}:<anonymous>:${throwLine}:`);
		expect(stack).not.toMatch(
			/callWithErrorHandling|plugin:reactive-notes-vue|node_modules/,
		);
		expect(stack.match(/^\s*at\s+/gm)?.length).toBe(1);
	});
});
