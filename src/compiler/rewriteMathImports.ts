import { MATH_BUILTIN_SPECIFIERS } from "../builtin/isMathBuiltin";

const MATH_SPEC_PATTERN = MATH_BUILTIN_SPECIFIERS.map((s) =>
	s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).join("|");

export const MATH_NAMED_IMPORT_RE = new RegExp(
	`^\\s*import\\s*\\{\\s*([^}]+)\\s*\\}\\s*from\\s*['"](?:${MATH_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const MATH_DEFAULT_IMPORT_RE = new RegExp(
	`^\\s*import\\s+(\\w+)\\s+from\\s*['"](?:${MATH_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const MATH_NAMESPACE_IMPORT_RE = new RegExp(
	`^\\s*import\\s*\\*\\s+as\\s+(\\w+)\\s+from\\s*['"](?:${MATH_SPEC_PATTERN})['"]\\s*;?\\s*$`,
	"gm",
);

export const MATH_SIDE_EFFECT_IMPORT_RE = new RegExp(
	`^\\s*import\\s*['"](?:${MATH_SPEC_PATTERN})['"]\\s*;?\\s*$`,
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

/** Converts `@vue-interactive/math` import statements to bindings from `__math__`. */
export function rewriteMathImportsInCode(code: string): string {
	let out = code.replace(MATH_NAMED_IMPORT_RE, (_, specifiers: string) => {
		const parts = specifiers
			.split(",")
			.map((s: string) => parseSpecifier(s))
			.filter(Boolean);
		return `const { ${parts.join(", ")} } = __math__;\n`;
	});

	out = out.replace(MATH_DEFAULT_IMPORT_RE, (_, id: string) => {
		return `const ${id} = __math__.default ?? __math__.Latex;\n`;
	});

	out = out.replace(MATH_NAMESPACE_IMPORT_RE, (_, id: string) => {
		return `const ${id} = __math__;\n`;
	});

	out = out.replace(MATH_SIDE_EFFECT_IMPORT_RE, () => "");

	return out;
}
