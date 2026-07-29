import { PINIA_BUILTIN_SPECIFIERS } from "../builtin/isPiniaBuiltin";

const PINIA_SPEC_PATTERN = PINIA_BUILTIN_SPECIFIERS.map((s) =>
	s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).join("|");

export const PINIA_NAMED_IMPORT_RE = new RegExp(
	`^\\s*import\\s*\\{\\s*([^}]+)\\s*\\}\\s*from\\s*['"](?:${PINIA_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const PINIA_DEFAULT_IMPORT_RE = new RegExp(
	`^\\s*import\\s+(\\w+)\\s+from\\s*['"](?:${PINIA_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const PINIA_NAMESPACE_IMPORT_RE = new RegExp(
	`^\\s*import\\s*\\*\\s+as\\s+(\\w+)\\s+from\\s*['"](?:${PINIA_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const PINIA_SIDE_EFFECT_IMPORT_RE = new RegExp(
	`^\\s*import\\s*['"](?:${PINIA_SPEC_PATTERN})['"]\\s*;?\\s*$`,
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

/** Converts `pinia` import statements to bindings from `__pinia__`. */
export function rewritePiniaImportsInCode(code: string): string {
	let out = code.replace(PINIA_NAMED_IMPORT_RE, (_, specifiers: string) => {
		const parts = specifiers
			.split(",")
			.map((s: string) => parseSpecifier(s))
			.filter(Boolean);
		return `const { ${parts.join(", ")} } = __pinia__;\n`;
	});

	out = out.replace(PINIA_DEFAULT_IMPORT_RE, (_, id: string) => {
		return `const ${id} = __pinia__.default ?? __pinia__;\n`;
	});

	out = out.replace(PINIA_NAMESPACE_IMPORT_RE, (_, id: string) => {
		return `const ${id} = __pinia__;\n`;
	});

	out = out.replace(PINIA_SIDE_EFFECT_IMPORT_RE, () => "");

	return out;
}
