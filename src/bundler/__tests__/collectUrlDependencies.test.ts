import { describe, expect, it } from "vitest";
import { collectUrlDependencies } from "../collectUrlDependencies";

describe("collectUrlDependencies", () => {
	it("collects http(s) module ids from bundle records", () => {
		expect(
			collectUrlDependencies([
				{
					canonicalId: "note.md#vue-interactive-entry",
					vaultPath: "note.md",
					code: "return {}",
					styles: [],
				},
				{
					canonicalId: "https://esm.sh/idb-keyval@6",
					vaultPath: "https://esm.sh/idb-keyval@6",
					code: "return {};",
					styles: [],
				},
				{
					canonicalId: "lib/a.ts",
					vaultPath: "lib/a.ts",
					code: "return {}",
					styles: [],
				},
			]),
		).toEqual(["https://esm.sh/idb-keyval@6"]);
	});
});
