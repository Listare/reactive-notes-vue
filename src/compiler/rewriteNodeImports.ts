/**
 * Converts `node:…` import statements to bindings from `__node__[id]`.
 */

const NODE_SPEC = "node:([^'\"]+)";

export const NODE_NAMED_IMPORT_RE = new RegExp(
	`^\\s*import\\s*\\{\\s*([^}]+)\\s*\\}\\s*from\\s*['"]${NODE_SPEC}['"]\\s*;?\\s*$`,
	"gm",
);

export const NODE_DEFAULT_IMPORT_RE = new RegExp(
	`^\\s*import\\s+(\\w+)\\s+from\\s*['"]${NODE_SPEC}['"]\\s*;?\\s*$`,
	"gm",
);

export const NODE_NAMESPACE_IMPORT_RE = new RegExp(
	`^\\s*import\\s*\\*\\s+as\\s+(\\w+)\\s+from\\s*['"]${NODE_SPEC}['"]\\s*;?\\s*$`,
	"gm",
);

export const NODE_SIDE_EFFECT_IMPORT_RE = new RegExp(
	`^\\s*import\\s*['"]${NODE_SPEC}['"]\\s*;?\\s*$`,
	"gm",
);

function parseSpecifier(spec: string): string {
	const trimmed = spec.trim();
	if (/^type\s+/i.test(trimmed)) return "";
	const asMatch = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(trimmed);
	if (asMatch) {
		return `${asMatch[1]}: ${asMatch[2]}`;
	}
	return trimmed;
}

function nodeAccess(id: string): string {
	return `__node__[${JSON.stringify(id)}]`;
}

/** Converts `node:*` import statements to bindings from `__node__[id]`. */
export function rewriteNodeImportsInCode(code: string): string {
	let out = code.replace(
		NODE_NAMED_IMPORT_RE,
		(_, specifiers: string, id: string) => {
			const parts = specifiers
				.split(",")
				.map((s: string) => parseSpecifier(s))
				.filter(Boolean);
			return `const { ${parts.join(", ")} } = ${nodeAccess(id)};\n`;
		},
	);

	out = out.replace(NODE_DEFAULT_IMPORT_RE, (_, local: string, id: string) => {
		return `const ${local} = ${nodeAccess(id)}.default;\n`;
	});

	out = out.replace(
		NODE_NAMESPACE_IMPORT_RE,
		(_, local: string, id: string) => {
			return `const ${local} = ${nodeAccess(id)};\n`;
		},
	);

	out = out.replace(NODE_SIDE_EFFECT_IMPORT_RE, () => "");

	return out;
}
