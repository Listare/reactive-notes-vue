import { describe, expect, it } from "vitest";
import {
	ImportPathError,
	resolveVaultPath,
} from "../resolveVaultPath";

describe("resolveVaultPath", () => {
	const ctx = {
		fromPath: "notes/demo.md",
		customScriptPath: "scripts",
	};

	it("resolves relative paths from the importing file", () => {
		expect(resolveVaultPath("./lib/util.ts", ctx)).toBe("notes/lib/util.ts");
	});

	it("resolves @/ to vault root", () => {
		expect(resolveVaultPath("@/shared/x.js", ctx)).toBe("shared/x.js");
	});

	it("resolves @custom-script/", () => {
		expect(resolveVaultPath("@custom-script/foo.ts", ctx)).toBe(
			"scripts/foo.ts",
		);
	});

	it("ignores ?block= in path resolution", () => {
		expect(resolveVaultPath("./doc.md?block=util", ctx)).toBe(
			"notes/doc.md",
		);
	});

	it("errors for built-in @vue-interactive/theme", () => {
		expect(() =>
			resolveVaultPath("@vue-interactive/theme", ctx),
		).toThrow(ImportPathError);
	});

	it("errors when @custom-script without configured root", () => {
		expect(() =>
			resolveVaultPath("@custom-script/a.ts", {
				...ctx,
				customScriptPath: "",
			}),
		).toThrow(ImportPathError);
	});
});
