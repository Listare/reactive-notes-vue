/**
 * Shared factory for rewriting fixed builtin import statements into sandbox
 * bindings (`const { … } = __xxx__`).
 */

export function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function joinSpecifierPattern(specifiers: readonly string[]): string {
	return specifiers.map(escapeRegExp).join("|");
}

export function parseImportSpecifier(spec: string): string {
	const trimmed = spec.trim();
	if (/^type\s+/i.test(trimmed)) return "";
	const asMatch = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(trimmed);
	if (asMatch) {
		return `${asMatch[1]}: ${asMatch[2]}`;
	}
	return trimmed;
}

export interface BuiltinImportPatterns {
	namedImportRe: RegExp;
	defaultImportRe: RegExp;
	namespaceImportRe: RegExp;
	sideEffectImportRe: RegExp;
}

export interface BuiltinImportRewriter extends BuiltinImportPatterns {
	rewrite(code: string): string;
}

export interface CreateBuiltinImportRewriterOptions {
	/**
	 * Alternation / capture pattern used inside `from '…'` (no surrounding quotes).
	 * Fixed builtins: `pinia|pinia/…`. Dynamic Node: `node:([^'"]+)`.
	 */
	specifierPattern: string;
	/**
	 * JS expression for the module binding.
	 * Extra regex captures after the primary import capture are forwarded
	 * (e.g. Node module id).
	 */
	moduleAccess: (...captures: string[]) => string;
	/** Default-import RHS; defaults to `${moduleAccess}.default`. */
	defaultAccess?: (moduleAccess: string) => string;
}

export function createBuiltinImportPatterns(
	specifierPattern: string,
): BuiltinImportPatterns {
	return {
		namedImportRe: new RegExp(
			`^\\s*import\\s*\\{\\s*([^}]+)\\s*\\}\\s*from\\s*['"](?:${specifierPattern})['"]\\s*;?\\s*$`,
			"gm",
		),
		defaultImportRe: new RegExp(
			`^\\s*import\\s+(\\w+)\\s+from\\s*['"](?:${specifierPattern})['"]\\s*;?\\s*$`,
			"gm",
		),
		namespaceImportRe: new RegExp(
			`^\\s*import\\s*\\*\\s+as\\s+(\\w+)\\s+from\\s*['"](?:${specifierPattern})['"]\\s*;?\\s*$`,
			"gm",
		),
		sideEffectImportRe: new RegExp(
			`^\\s*import\\s*['"](?:${specifierPattern})['"]\\s*;?\\s*$`,
			"gm",
		),
	};
}

/** Extra capturing groups from a `String.replace` callback (after the primary ones). */
function replaceExtraCaptures(rest: unknown[]): string[] {
	let end = rest.length;
	if (end > 0 && typeof rest[end - 1] === "object") {
		end -= 1; // optional `groups` object
	}
	end -= 2; // offset, input
	if (end <= 0) return [];
	return rest.slice(0, end).filter((v): v is string => typeof v === "string");
}

export function createBuiltinImportRewriter(
	options: CreateBuiltinImportRewriterOptions,
): BuiltinImportRewriter {
	const patterns = createBuiltinImportPatterns(options.specifierPattern);
	const defaultAccess =
		options.defaultAccess ?? ((mod: string) => `${mod}.default`);

	return {
		...patterns,
		rewrite(code: string): string {
			let out = code.replace(
				patterns.namedImportRe,
				(_full: string, specifiers: string, ...rest: unknown[]) => {
					const mod = options.moduleAccess(...replaceExtraCaptures(rest));
					const parts = specifiers
						.split(",")
						.map((s) => parseImportSpecifier(s))
						.filter(Boolean);
					return `const { ${parts.join(", ")} } = ${mod};\n`;
				},
			);

			out = out.replace(
				patterns.defaultImportRe,
				(_full: string, local: string, ...rest: unknown[]) => {
					const mod = options.moduleAccess(...replaceExtraCaptures(rest));
					return `const ${local} = ${defaultAccess(mod)};\n`;
				},
			);

			out = out.replace(
				patterns.namespaceImportRe,
				(_full: string, local: string, ...rest: unknown[]) => {
					const mod = options.moduleAccess(...replaceExtraCaptures(rest));
					return `const ${local} = ${mod};\n`;
				},
			);

			out = out.replace(patterns.sideEffectImportRe, () => "");

			return out;
		},
	};
}
