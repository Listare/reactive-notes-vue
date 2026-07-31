import type { BundledModuleRecord } from "./types";
import { isUrlImportSpecifier } from "../resolver/isUrlImport";

/** Absolute http(s) module URLs referenced by a bundle. */
export function collectUrlDependencies(
	records: Iterable<BundledModuleRecord>,
): string[] {
	const urls = new Set<string>();
	for (const rec of records) {
		if (isUrlImportSpecifier(rec.canonicalId)) {
			urls.add(rec.canonicalId);
		} else if (isUrlImportSpecifier(rec.vaultPath)) {
			urls.add(rec.vaultPath);
		}
	}
	return [...urls];
}
