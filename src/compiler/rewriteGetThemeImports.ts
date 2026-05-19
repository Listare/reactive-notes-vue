import { GET_THEME_BUILTIN_SPECIFIERS } from "../builtin/isGetThemeBuiltin";

const GET_THEME_SPEC_PATTERN = GET_THEME_BUILTIN_SPECIFIERS.map((s) =>
	s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).join("|");

export const GET_THEME_NAMED_IMPORT_RE = new RegExp(
	`^\\s*import\\s*\\{\\s*([^}]+)\\s*\\}\\s*from\\s*['"](?:${GET_THEME_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const GET_THEME_DEFAULT_IMPORT_RE = new RegExp(
	`^\\s*import\\s+(\\w+)\\s+from\\s*['"](?:${GET_THEME_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const GET_THEME_NAMESPACE_IMPORT_RE = new RegExp(
	`^\\s*import\\s*\\*\\s+as\\s+(\\w+)\\s+from\\s*['"](?:${GET_THEME_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const GET_THEME_SIDE_EFFECT_IMPORT_RE = new RegExp(
	`^\\s*import\\s*['"](?:${GET_THEME_SPEC_PATTERN})['"]\\s*;?\\s*$`,
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

/** Converts `@vue-interactive/theme` import statements to bindings from `__getTheme__`. */
export function rewriteGetThemeImportsInCode(code: string): string {
	let out = code.replace(GET_THEME_NAMED_IMPORT_RE, (_, specifiers: string) => {
		const parts = specifiers
			.split(",")
			.map((s: string) => parseSpecifier(s))
			.filter(Boolean);
		return `const { ${parts.join(", ")} } = __getTheme__;\n`;
	});

	out = out.replace(GET_THEME_DEFAULT_IMPORT_RE, (_, id: string) => {
		return `const ${id} = __getTheme__.default ?? __getTheme__.getTheme;\n`;
	});

	out = out.replace(GET_THEME_NAMESPACE_IMPORT_RE, (_, id: string) => {
		return `const ${id} = __getTheme__;\n`;
	});

	out = out.replace(GET_THEME_SIDE_EFFECT_IMPORT_RE, () => "");

	return out;
}
