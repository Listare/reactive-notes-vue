import { OBSIDIAN_BUILTIN_SPECIFIERS } from "../builtin/isObsidianBuiltin";

const OBSIDIAN_SPEC_PATTERN = OBSIDIAN_BUILTIN_SPECIFIERS.map((s) =>
	s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).join("|");

export const OBSIDIAN_NAMED_IMPORT_RE = new RegExp(
	`^\\s*import\\s*\\{\\s*([^}]+)\\s*\\}\\s*from\\s*['"](?:${OBSIDIAN_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const OBSIDIAN_DEFAULT_IMPORT_RE = new RegExp(
	`^\\s*import\\s+(\\w+)\\s+from\\s*['"](?:${OBSIDIAN_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const OBSIDIAN_NAMESPACE_IMPORT_RE = new RegExp(
	`^\\s*import\\s*\\*\\s+as\\s+(\\w+)\\s+from\\s*['"](?:${OBSIDIAN_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const OBSIDIAN_SIDE_EFFECT_IMPORT_RE = new RegExp(
	`^\\s*import\\s*['"](?:${OBSIDIAN_SPEC_PATTERN})['"]\\s*;?\\s*$`,
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

/** Converts `@obsidian` import statements to bindings from `__obsidian__`. */
export function rewriteObsidianImportsInCode(code: string): string {
	let out = code.replace(OBSIDIAN_NAMED_IMPORT_RE, (_, specifiers: string) => {
		const parts = specifiers
			.split(",")
			.map((s: string) => parseSpecifier(s))
			.filter(Boolean);
		return `const { ${parts.join(", ")} } = __obsidian__;\n`;
	});

	out = out.replace(OBSIDIAN_DEFAULT_IMPORT_RE, (_, id: string) => {
		return `const ${id} = __obsidian__.default;\n`;
	});

	out = out.replace(OBSIDIAN_NAMESPACE_IMPORT_RE, (_, id: string) => {
		return `const ${id} = __obsidian__;\n`;
	});

	out = out.replace(OBSIDIAN_SIDE_EFFECT_IMPORT_RE, () => "");

	return out;
}
