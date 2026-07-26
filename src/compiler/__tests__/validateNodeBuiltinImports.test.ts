import { describe, expect, it } from "vitest";
import {
	collectNodeBuiltinSpecifiersFromCode,
	validateNodeBuiltinImports,
	NodeBuiltinImportError,
} from "../validateNodeBuiltinImports";

describe("validateNodeBuiltinImports", () => {
	it("collects node: imports", () => {
		const specs = collectNodeBuiltinSpecifiersFromCode(`
import { join } from 'node:path'
import { readFile } from "node:fs/promises"
import { ref } from 'vue'
`);
		expect(specs).toEqual(
			expect.arrayContaining(["node:path", "node:fs/promises"]),
		);
		expect(specs).toHaveLength(2);
	});

	it("allows safe modules when extended is off", () => {
		expect(() =>
			validateNodeBuiltinImports(["node:path", "node:url"], false),
		).not.toThrow();
	});

	it("rejects extended modules when setting is off", () => {
		expect(() =>
			validateNodeBuiltinImports(["node:fs"], false),
		).toThrow(NodeBuiltinImportError);
		expect(() =>
			validateNodeBuiltinImports(["node:fs"], false),
		).toThrow(/允许扩展 Node 内置模块/);
	});

	it("allows extended modules when setting is on", () => {
		expect(() =>
			validateNodeBuiltinImports(["node:fs", "node:os"], true),
		).not.toThrow();
	});
});
