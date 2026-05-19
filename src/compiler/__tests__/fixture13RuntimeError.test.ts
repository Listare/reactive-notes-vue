import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { nextTick } from "vue";
import { createApp } from "vue";
import { compileSfc } from "../compileSfc";
import { transpileTypeScript } from "../../bundler/transpile";
import { listVueInteractiveBlocks } from "../../markdown/vueInteractiveFence";
import { executeModule } from "../../runtime/executeModule";

const FIXTURE_13 = readFileSync(
	join(process.cwd(), "test-vault/13 - 错误-运行时.md"),
	"utf8",
);
const sourcePath = "13 - 错误-运行时.md";
const blocks = listVueInteractiveBlocks(FIXTURE_13);

function blockByName(name: string): string {
	const block = blocks.find((b) => b.name === name);
	if (!block) throw new Error(`fixture block missing: ${name}`);
	return block.content;
}

async function compileAndExecute(sfc: string): Promise<{
	component: Awaited<ReturnType<typeof executeModule>>;
	moduleCode: string;
}> {
	const compiled = compileSfc(sfc);
	const moduleCode = transpileTypeScript(
		compiled.moduleCode,
		`${sourcePath}.vue-interactive.ts`,
	);
	const component = await executeModule(moduleCode);
	return { component, moduleCode };
}

describe("fixture 13 runtime error", () => {
	it("compiles and executes onMounted block without throwing at import time", async () => {
		const { component } = await compileAndExecute(blockByName("onMounted"));
		expect(component).toBeTruthy();
	});

	it("surfaces onMounted error via Vue errorHandler after mount", async () => {
		const { component } = await compileAndExecute(blockByName("onMounted"));
		const mountPoint = document.createElement("div");
		document.body.appendChild(mountPoint);

		const errors: unknown[] = [];
		const app = createApp(component);
		app.config.errorHandler = (err) => {
			errors.push(err);
		};
		app.mount(mountPoint);
		// onMounted runs during mount() (post-flush), before mount() returns.
		expect(errors.length).toBeGreaterThan(0);
		expect(mountPoint.querySelector(".runtime-ok")).toBeTruthy();
		const err = errors[0];
		expect(err).toBeInstanceOf(Error);
		expect((err as Error).message).toMatch(/onMounted 测试错误/);

		app.unmount();
		document.body.removeChild(mountPoint);
	});

	it("compiles onClick block and only errors after user action", async () => {
		const { component } = await compileAndExecute(blockByName("onClick"));
		const mountPoint = document.createElement("div");
		document.body.appendChild(mountPoint);

		const errors: unknown[] = [];
		const app = createApp(component);
		app.config.errorHandler = (err) => {
			errors.push(err);
		};
		app.mount(mountPoint);
		await nextTick();

		expect(errors).toHaveLength(0);
		const btn = mountPoint.querySelector(".runtime-boom-btn") as HTMLButtonElement;
		expect(btn).toBeTruthy();
		btn.click();
		await nextTick();

		expect(errors.length).toBeGreaterThan(0);
		expect((errors[0] as Error).message).toMatch(/点击测试错误/);

		app.unmount();
		document.body.removeChild(mountPoint);
	});
});
