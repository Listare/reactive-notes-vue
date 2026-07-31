import { describe, expect, it } from "vitest";
import {
	canonicalModuleId,
	classifyNamedBlockContent,
	classifyVaultModule,
	dataModuleCode,
	missingBinaryResourceError,
	missingNamedBlockError,
	parseJsonModule,
	wrapCompiledModuleCode,
} from "../vaultModuleKind";

describe("classifyVaultModule", () => {
	it.each([
		["notes/a.css", undefined, "css"],
		["img/a.PNG", undefined, "binary"],
		["doc.md", undefined, "markdown"],
		["doc.md", "Counter", "markdown"],
		["Comp.vue", undefined, "vue"],
		["data.json", undefined, "json"],
		["data.json", "block", "text"],
		["lib.ts", undefined, "script"],
		["lib.mjs", undefined, "script"],
		["readme.txt", undefined, "text"],
	] as const)("%s block=%s → %s", (path, block, kind) => {
		const result = classifyVaultModule(path, block);
		expect(result.kind).toBe(kind);
		if (result.kind === "markdown") {
			expect(result.hasBlock).toBe(Boolean(block));
		}
	});
});

describe("classifyNamedBlockContent", () => {
	it("distinguishes vue/script/json/opaque", () => {
		expect(classifyNamedBlockContent("vue", true, true)).toEqual({
			kind: "vue-sfc",
		});
		expect(classifyNamedBlockContent("ts", true, false)).toEqual({
			kind: "script",
		});
		expect(classifyNamedBlockContent("json", false, false)).toEqual({
			kind: "json",
		});
		expect(classifyNamedBlockContent("yaml", false, false)).toEqual({
			kind: "opaque",
		});
	});
});

describe("module helpers", () => {
	it("builds ids, wrappers, and data modules", () => {
		expect(canonicalModuleId("a.md")).toBe("a.md");
		expect(canonicalModuleId("a.md", "X")).toBe("a.md?block=X");
		expect(wrapCompiledModuleCode("({ setup() {} })")).toBe(
			"return ({ setup() {} })",
		);
		expect(wrapCompiledModuleCode("return { x: 1 }")).toBe("return { x: 1 }");
		expect(dataModuleCode({ a: 1 })).toBe(
			'return { default: {"a":1} };',
		);
	});

	it("parses JSON or throws labeled errors", () => {
		expect(parseJsonModule('{"ok":true}', "label")).toEqual({ ok: true });
		expect(() => parseJsonModule("{", "JSON 解析失败")).toThrow(
			/JSON 解析失败:/,
		);
		expect(missingNamedBlockError("a.md", "X").message).toContain(
			'名为 "X"',
		);
		expect(missingBinaryResourceError("x.png").message).toContain("x.png");
	});
});
