/** Virtual module specifiers for the Obsidian API (`import … from '@obsidian'`). */
export const OBSIDIAN_BUILTIN_SPECIFIERS = ["@obsidian", "obsidian"] as const;

export type ObsidianBuiltinSpecifier =
	(typeof OBSIDIAN_BUILTIN_SPECIFIERS)[number];

export function isObsidianBuiltinSpecifier(
	specifier: string,
): specifier is ObsidianBuiltinSpecifier {
	const { path } = splitSpecifierPath(specifier);
	return (OBSIDIAN_BUILTIN_SPECIFIERS as readonly string[]).includes(path);
}

function splitSpecifierPath(specifier: string): { path: string } {
	const q = specifier.indexOf("?");
	return { path: q === -1 ? specifier : specifier.slice(0, q) };
}
