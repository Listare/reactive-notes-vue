import { describe, expect, it } from "vitest";
import {
	collectUrlImportsFromCode,
	rewriteUrlImports,
} from "../urlImports";
import {
	extractUrlDependenciesFromModuleCode,
	resolveUrlDependencies,
} from "../resolveUrlDependencies";

describe("urlImports", () => {
	it("collects static and dynamic https imports", () => {
		const code = `
import x from "https://esm.sh/a";
import "https://esm.sh/b";
const y = await import("https://esm.sh/c");
import z from "./local.js";
`;
		expect(collectUrlImportsFromCode(code).sort()).toEqual([
			"https://esm.sh/a",
			"https://esm.sh/b",
			"https://esm.sh/c",
		]);
	});

	it("rewrites mapped url imports to blob urls", () => {
		const map = new Map([
			["https://esm.sh/a", "blob:a"],
			["https://esm.sh/b", "blob:b"],
		]);
		const out = rewriteUrlImports(
			`import x from "https://esm.sh/a";\nimport("https://esm.sh/b");\nimport y from "https://esm.sh/c";`,
			map,
		);
		expect(out).toContain(`from "blob:a"`);
		expect(out).toContain(`import("blob:b")`);
		expect(out).toContain(`from "https://esm.sh/c"`);
	});
});

describe("resolveUrlDependencies", () => {
	it("prefers explicit list", () => {
		expect(
			resolveUrlDependencies({
				urlDependencies: ["https://esm.sh/x"],
				moduleCode: `__importUrl__("https://esm.sh/y")`,
			}),
		).toEqual(["https://esm.sh/x"]);
	});

	it("extracts from module code when list empty", () => {
		expect(
			extractUrlDependenciesFromModuleCode(
				`const m = await __importUrl__("https://esm.sh/lodash-es@4/debounce");`,
			),
		).toEqual(["https://esm.sh/lodash-es@4/debounce"]);
	});
});
