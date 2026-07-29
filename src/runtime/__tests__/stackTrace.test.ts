import { describe, expect, it } from "vitest";
import { emitBundle } from "../../bundler/emitBundle";
import { executeModule } from "../executeModule";
import {
	enhanceModuleLoadError,
	NEW_FUNCTION_HEADER_LINES,
	MODULE_LOAD_STRICT_LINES,
	resolveModuleLoadLocation,
	rewriteRuntimeStack,
} from "../stackTrace";

describe("resolveModuleLoadLocation", () => {
	const regions = [
		{
			vaultPath: "note.md",
			blockName: "helper",
			codeStartLine: 1,
		},
	];

	it("maps v8 anonymous lines through Function header + use strict", () => {
		// module line 14 → V8 line = 14 + 2 + 1 = 17
		const located = resolveModuleLoadLocation(
			regions,
			14 + NEW_FUNCTION_HEADER_LINES + MODULE_LOAD_STRICT_LINES,
			7,
			"v8Anonymous",
		);
		expect(located?.line).toBe(14);
		expect(located?.column).toBe(7);
	});

	it("maps moduleBody lines (Sucrase) with only use strict offset", () => {
		const located = resolveModuleLoadLocation(
			regions,
			15,
			3,
			"moduleBody",
		);
		expect(located?.line).toBe(14);
	});
});

describe("rewriteRuntimeStack", () => {
	it("maps eval <anonymous> lines to vault file and block", async () => {
		const { moduleCode, stackRegions } = emitBundle(
			[
				{
					canonicalId: "note.md#vue-interactive-entry",
					vaultPath: "note.md",
					code: `import fn from './note.md?block=helper'
const _ = fn()
return { setup() { return () => null } }`,
					styles: [],
				},
				{
					canonicalId: "note.md?block=helper",
					vaultPath: "note.md",
					code: `function boom() { return 1 + boom() }
return { default: boom() }`,
					styles: [],
				},
			],
			"note.md#vue-interactive-entry",
			{ fromPath: "note.md", customScriptPath: "" },
		);

		let rawStack = "";
		try {
			await executeModule(moduleCode);
		} catch (e) {
			rawStack = (e as Error).stack ?? "";
		}
		expect(rawStack).toMatch(/<anonymous>|about:srcdoc/);

		const rewritten = rewriteRuntimeStack(rawStack, stackRegions)!;
		expect(rewritten).toMatch(/note\.md:helper:\d+:\d+/);
		expect(rewritten).not.toMatch(/<anonymous>:\d+:\d+/);
		expect(rewritten).not.toMatch(/node_modules/);
		expect(rewritten).not.toMatch(/callWithErrorHandling/);
	});

	it("enhances SyntaxError when stack includes eval body line", () => {
		const regions = [
			{
				vaultPath: "note.md",
				blockName: "helper",
				codeStartLine: 40,
			},
		];
		const syntax = new SyntaxError("Unexpected token '{'");
		// V8 line for module line 41 (region-relative line 2): 40+2-1 + header+strict = 44
		const v8Line =
			40 + 1 + NEW_FUNCTION_HEADER_LINES + MODULE_LOAD_STRICT_LINES;
		syntax.stack = [
			"SyntaxError: Unexpected token '{'",
			"    at new Function (<anonymous>)",
			`    at about:srcdoc:${v8Line}:7`,
		].join("\n");

		const enhanced = enhanceModuleLoadError(syntax, regions);
		expect(enhanced.message).toMatch(/note\.md:helper:2:7/);
		expect(enhanced.stack).toBeUndefined();
	});

	it("keeps only user frames after rewrite", () => {
		const regions = [
			{
				vaultPath: "errors/03.md",
				blockName: null,
				codeStartLine: 1,
			},
		];
		const v8Line = 14 + NEW_FUNCTION_HEADER_LINES + MODULE_LOAD_STRICT_LINES;
		const stack = [
			"Error: setup 同步测试错误",
			`    at setup (eval at executeModule (plugin:reactive-notes-vue:11:8), <anonymous>:${v8Line}:7)`,
			"    at callWithErrorHandling (plugin:reactive-notes-vue:13:1935)",
			"    at setupStatefulComponent (plugin:reactive-notes-vue:13:45008)",
		].join("\n");

		const rewritten = rewriteRuntimeStack(stack, regions)!;
		expect(rewritten).toContain("errors/03.md:<anonymous>:14:7");
		expect(rewritten).not.toContain("plugin:reactive-notes-vue");
		expect(rewritten).not.toContain("callWithErrorHandling");
		expect(rewritten.match(/^\s*at\s+/gm)?.length).toBe(1);
	});
});
