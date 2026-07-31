import { describe, expect, it } from "vitest";
import {
	createBuiltinImportRewriter,
	joinSpecifierPattern,
	parseImportSpecifier,
} from "../createBuiltinImportRewriter";

describe("createBuiltinImportRewriter", () => {
	const rewriter = createBuiltinImportRewriter({
		specifierPattern: joinSpecifierPattern(["demo", "@demo/pkg"]),
		moduleAccess: () => "__demo__",
		defaultAccess: (mod) => `${mod}.default ?? ${mod}`,
	});

	it("rewrites named, default, namespace, and side-effect imports", () => {
		const code = rewriter.rewrite(`
import { a as b, type T } from 'demo'
import Demo from "@demo/pkg"
import * as NS from 'demo'
import 'demo'
`);
		expect(code).toContain("const { a: b } = __demo__;");
		expect(code).toContain("const Demo = __demo__.default ?? __demo__;");
		expect(code).toContain("const NS = __demo__;");
		expect(code).not.toContain("from 'demo'");
		expect(code).not.toContain('from "@demo/pkg"');
	});

	it("supports specifier capture groups (node-style)", () => {
		const nodeLike = createBuiltinImportRewriter({
			specifierPattern: "node:([^'\"]+)",
			moduleAccess: (id) => `__node__[${JSON.stringify(id)}]`,
		});
		const code = nodeLike.rewrite(
			`import { join } from 'node:path'\nimport fs from "node:fs"\n`,
		);
		expect(code).toBe(
			'const { join } = __node__["path"];\nconst fs = __node__["fs"].default;\n',
		);
	});
});

describe("parseImportSpecifier", () => {
	it("maps aliases and drops type imports", () => {
		expect(parseImportSpecifier("foo as bar")).toBe("foo: bar");
		expect(parseImportSpecifier("type Foo")).toBe("");
		expect(parseImportSpecifier("baz")).toBe("baz");
	});
});
