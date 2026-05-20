import { rewriteGetThemeImportsInCode } from "./rewriteGetThemeImports";
import { rewriteMathImportsInCode } from "./rewriteMathImports";
import { rewriteObsidianImportsInCode } from "./rewriteObsidianImports";

export const VUE_IMPORT_RE =
	/import\s*{\s*([^}]+)\s*}\s*from\s*['"]vue['"];?\s*/g;

function parseSpecifier(spec: string): string {
	const trimmed = spec.trim();
	if (/^type\s+/i.test(trimmed)) return "";
	const asMatch = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(trimmed);
	if (asMatch) {
		return `${asMatch[1]}: ${asMatch[2]}`;
	}
	return trimmed;
}

/** Converts vue import statements to destructuring from __vue__. */
export function rewriteVueImportsInCode(code: string): string {
	return code.replace(VUE_IMPORT_RE, (_, specifiers: string) => {
		const parts = specifiers
			.split(",")
			.map((s: string) => parseSpecifier(s))
			.filter(Boolean);
		return `const { ${parts.join(", ")} } = __vue__;\n`;
	});
}

/** Rewrites built-in `vue`, `@obsidian`, theme, and math imports for sandbox execution. */
export function rewriteBuiltinImportsInCode(code: string): string {
	return rewriteMathImportsInCode(
		rewriteGetThemeImportsInCode(
			rewriteObsidianImportsInCode(rewriteVueImportsInCode(code)),
		),
	);
}

function stripNamedExports(code: string): {
	code: string;
	namedExports: string[];
	exportGroupBindings: string[];
} {
	const namedExports: string[] = [];
	const exportGroupBindings: string[] = [];

	const trackBinding = (exportName: string, localName?: string) => {
		if (localName && localName !== exportName) {
			exportGroupBindings.push(`${exportName}: ${localName}`);
			return;
		}
		if (!namedExports.includes(exportName)) {
			namedExports.push(exportName);
		}
	};

	let out = code;

	out = out.replace(
		/\bexport\s+(async\s+)?function\s+([\w$]+)/g,
		(_full, asyncKw: string | undefined, name: string) => {
			trackBinding(name);
			return `${asyncKw ?? ""}function ${name}`;
		},
	);

	out = out.replace(/\bexport\s+class\s+([\w$]+)/g, (_full, name: string) => {
		trackBinding(name);
		return `class ${name}`;
	});

	out = out.replace(
		/\bexport\s+(const|let|var)\s+([\w$]+)/g,
		(_full, kind: string, name: string) => {
			trackBinding(name);
			return `${kind} ${name}`;
		},
	);

	out = out.replace(/\bexport\s*\{([^}]+)\}\s*;?/g, (_full, bindings: string) => {
		for (const part of bindings.split(",")) {
			const trimmed = part.trim();
			if (!trimmed) continue;
			const asMatch = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(trimmed);
			const [, local, exported] = asMatch ?? [];
			if (local && exported) {
				trackBinding(exported, local);
			} else {
				trackBinding(trimmed);
			}
		}
		return "";
	});

	return { code: out, namedExports, exportGroupBindings };
}

/** Converts built-in imports and ESM exports into sandbox `return` for `new Function`. */
export function prepareModuleCode(compiled: string): string {
	let code = rewriteBuiltinImportsInCode(compiled);
	const { code: stripped, namedExports, exportGroupBindings } =
		stripNamedExports(code);
	code = stripped;

	const hasNamed = namedExports.length > 0 || exportGroupBindings.length > 0;
	const hasDefault = /\bexport\s+default\s+/.test(code);

	if (hasDefault) {
		if (hasNamed) {
			code = code.replace(
				/\bexport\s+default\s+([\s\S]+)$/,
				(_full, expr: string) => {
					const props = [
						`default: (${expr.trim()})`,
						...namedExports,
						...exportGroupBindings,
					].join(", ");
					return `return { ${props} };`;
				},
			);
		} else {
			code = code.replace(/\bexport\s+default\s+/, "return ");
		}
	} else if (hasNamed) {
		const props = [...namedExports, ...exportGroupBindings, "default: undefined"].join(
			", ",
		);
		code = `${code.trim()}\nreturn { ${props} };`;
	}

	return code.trim();
}
