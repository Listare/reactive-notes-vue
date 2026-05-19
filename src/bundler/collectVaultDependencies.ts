import type { BundledModuleRecord } from "./types";
import { isUrlImportSpecifier } from "../resolver/isUrlImport";
import { normalizeVaultPath } from "../utils/posixPath";

/** Vault paths imported by a bundle (excludes entry pseudo-module, URLs, and built-ins). */
export function collectVaultDependencies(
	records: Iterable<BundledModuleRecord>,
	entryCanonicalId: string,
): string[] {
	const paths = new Set<string>();
	for (const rec of records) {
		if (rec.canonicalId === entryCanonicalId) continue;
		if (isUrlImportSpecifier(rec.vaultPath)) continue;
		paths.add(normalizeVaultPath(rec.vaultPath));
	}
	return [...paths];
}
