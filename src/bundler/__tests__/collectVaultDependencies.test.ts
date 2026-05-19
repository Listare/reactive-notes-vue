import { describe, expect, it } from "vitest";
import { collectVaultDependencies } from "../collectVaultDependencies";
import type { BundledModuleRecord } from "../types";

describe("collectVaultDependencies", () => {
	const entryId = "notes/entry.md#vue-interactive-entry";

	it("excludes entry module and URL imports", () => {
		const records: BundledModuleRecord[] = [
			{
				canonicalId: entryId,
				vaultPath: "notes/entry.md",
				code: "",
				styles: [],
			},
			{
				canonicalId: "notes/dep.js",
				vaultPath: "notes/dep.js",
				code: "",
				styles: [],
			},
			{
				canonicalId: "https://esm.sh/lodash",
				vaultPath: "https://esm.sh/lodash",
				code: "",
				styles: [],
			},
		];
		expect(collectVaultDependencies(records, entryId)).toEqual(["notes/dep.js"]);
	});

	it("includes transitive vault modules", () => {
		const records: BundledModuleRecord[] = [
			{
				canonicalId: entryId,
				vaultPath: "notes/entry.md",
				code: "",
				styles: [],
			},
			{
				canonicalId: "notes/a.js",
				vaultPath: "notes/a.js",
				code: "",
				styles: [],
			},
			{
				canonicalId: "notes/b.js",
				vaultPath: "notes/b.js",
				code: "",
				styles: [],
			},
		];
		expect(collectVaultDependencies(records, entryId).sort()).toEqual([
			"notes/a.js",
			"notes/b.js",
		]);
	});
});
