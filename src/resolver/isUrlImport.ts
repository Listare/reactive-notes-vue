import { parseImportSpecifier } from "./parseImportSpecifier";
import { resolveVaultPath, type ResolvePathContext } from "./resolveVaultPath";

/** `import … from 'https://…'` (or `http://`). */
export function isUrlImportSpecifier(specifier: string): boolean {
	const { path } = parseImportSpecifier(specifier);
	return /^https?:\/\//i.test(path);
}

/**
 * Stable module id for bundling: vault path, optional `?block=`, or full URL.
 */
export function resolveModuleCanonicalId(
	specifier: string,
	fromVaultPath: string,
	ctx: ResolvePathContext,
): string {
	if (isUrlImportSpecifier(specifier)) {
		return parseImportSpecifier(specifier).path;
	}
	const { block } = parseImportSpecifier(specifier);
	const vaultPath = resolveVaultPath(specifier, {
		...ctx,
		fromPath: fromVaultPath,
	});
	return block
		? `${vaultPath}?block=${encodeURIComponent(block)}`
		: vaultPath;
}
