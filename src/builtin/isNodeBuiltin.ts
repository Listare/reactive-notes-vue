/** Safe Node builtins always available via `import … from 'node:…'`. */
export const SAFE_NODE_BUILTIN_IDS = [
	"path",
	"path/posix",
	"path/win32",
	"url",
	"querystring",
	"buffer",
	"util",
	"events",
	"assert",
	"string_decoder",
	"timers",
	"timers/promises",
	"constants",
	"punycode",
] as const;

export type SafeNodeBuiltinId = (typeof SAFE_NODE_BUILTIN_IDS)[number];

const SAFE_SET = new Set<string>(SAFE_NODE_BUILTIN_IDS);

function splitSpecifierPath(specifier: string): { path: string } {
	const q = specifier.indexOf("?");
	return { path: q === -1 ? specifier : specifier.slice(0, q) };
}

/** True when the import specifier uses the `node:` protocol prefix. */
export function isNodeBuiltinSpecifier(specifier: string): boolean {
	const { path } = splitSpecifierPath(specifier);
	return path.startsWith("node:") && path.length > "node:".length;
}

/**
 * Returns the builtin id after `node:` (e.g. `path`, `fs/promises`).
 * Returns null when the specifier is not a `node:` builtin.
 */
export function normalizeNodeBuiltinId(specifier: string): string | null {
	if (!isNodeBuiltinSpecifier(specifier)) return null;
	const { path } = splitSpecifierPath(specifier);
	return path.slice("node:".length);
}

export function isSafeNodeBuiltinId(id: string): boolean {
	return SAFE_SET.has(id);
}

/**
 * Whether a Node builtin id may be imported given the extended-modules setting.
 * Does not verify the id is a real Node builtin (host does that at runtime).
 */
export function isNodeBuiltinAllowed(
	id: string,
	enableExtended: boolean,
): boolean {
	if (isSafeNodeBuiltinId(id)) return true;
	return enableExtended;
}

export function nodeBuiltinDeniedMessage(id: string): string {
	return `未允许的 Node 内置模块 "node:${id}"。默认仅开放安全子集；如需使用请在插件设置中开启「允许扩展 Node 内置模块」。`;
}
