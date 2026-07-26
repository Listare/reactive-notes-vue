import {
	isNodeBuiltinSpecifier,
	normalizeNodeBuiltinId,
	isNodeBuiltinAllowed,
	nodeBuiltinDeniedMessage,
} from "../builtin/isNodeBuiltin";

/** Static import sources including `node:` builtins. */
const STATIC_IMPORT_RE =
	/^\s*import\s+(?:type\s+)?(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]\s*;?\s*$/gm;

const SCRIPT_SETUP_BODY_RE =
	/<script\s+[^>]*setup[^>]*>([\s\S]*?)<\/script>/i;

export function collectNodeBuiltinSpecifiersFromCode(code: string): string[] {
	const specs = new Set<string>();
	let match: RegExpExecArray | null;
	STATIC_IMPORT_RE.lastIndex = 0;
	while ((match = STATIC_IMPORT_RE.exec(code)) !== null) {
		const line = match[0];
		if (/^\s*import\s+type\s+/i.test(line)) {
			continue;
		}
		const spec = match[1];
		if (spec && isNodeBuiltinSpecifier(spec)) {
			specs.add(spec);
		}
	}
	return [...specs];
}

export function collectNodeBuiltinSpecifiersFromSfc(source: string): string[] {
	const scriptMatch = SCRIPT_SETUP_BODY_RE.exec(source);
	if (!scriptMatch?.[1]) return [];
	return collectNodeBuiltinSpecifiersFromCode(scriptMatch[1]);
}

export class NodeBuiltinImportError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NodeBuiltinImportError";
	}
}

/** Throws when any `node:` import is outside the allowed set for current settings. */
export function validateNodeBuiltinImports(
	specifiers: Iterable<string>,
	enableExtended: boolean,
): void {
	for (const spec of specifiers) {
		const id = normalizeNodeBuiltinId(spec);
		if (id == null) continue;
		if (!isNodeBuiltinAllowed(id, enableExtended)) {
			throw new NodeBuiltinImportError(nodeBuiltinDeniedMessage(id));
		}
	}
}
