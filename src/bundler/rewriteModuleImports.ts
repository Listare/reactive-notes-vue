import {
	isUrlImportSpecifier,
	resolveModuleCanonicalId,
} from "../resolver/isUrlImport";
import type { ResolvePathContext } from "../resolver/resolveVaultPath";
import { isGetThemeBuiltinSpecifier } from "../builtin/isGetThemeBuiltin";
import { isMathBuiltinSpecifier } from "../builtin/isMathBuiltin";
import { isObsidianBuiltinSpecifier } from "../builtin/isObsidianBuiltin";
import {
	rewriteBuiltinImportsInCode,
	VUE_IMPORT_RE,
} from "../compiler/rewriteImports";
import { OBSIDIAN_SIDE_EFFECT_IMPORT_RE } from "../compiler/rewriteObsidianImports";

function toCanonicalId(
	specifier: string,
	fromVaultPath: string,
	ctx: ResolvePathContext,
): string {
	return resolveModuleCanonicalId(specifier, fromVaultPath, ctx);
}

function requireExpr(specifier: string, fromVaultPath: string, ctx: ResolvePathContext): string {
	const id = toCanonicalId(specifier, fromVaultPath, ctx);
	if (isUrlImportSpecifier(specifier)) {
		return `await __importUrl__(${JSON.stringify(id)})`;
	}
	return `await __require__(${JSON.stringify(id)})`;
}

const SIDE_EFFECT_IMPORT_RE = /^\s*import\s+['"]([^'"]+)['"]\s*;?\s*$/gm;

const NAMED_DEFAULT_IMPORT_RE =
	/^\s*import\s+(type\s+)?((?:\*\s+as\s+(\w+))|(?:\{([^}]*)\})|(?:(\w+)\s*,\s*\{([^}]*)\})|(\w+))\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm;

function rewriteNamedBinding(binding: string): string {
	return binding
		.split(",")
		.map((part) => {
			const trimmed = part.trim();
			if (!trimmed) return "";
			const asMatch = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(trimmed);
			if (asMatch) {
				return `${JSON.stringify(asMatch[1])}: ${asMatch[2]}`;
			}
			return `${JSON.stringify(trimmed)}: ${trimmed}`;
		})
		.filter(Boolean)
		.join(", ");
}

/** Per-binding import for CDN modules that only export `default` (e.g. esm.sh subpaths). */
function rewriteUrlNamedBindings(named: string, modVar: string): string {
	return named
		.split(",")
		.map((part) => {
			const trimmed = part.trim();
			if (!trimmed) return "";
			const asMatch = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(trimmed);
			const exportName = asMatch?.[1] ?? trimmed;
			const localName = asMatch?.[2] ?? trimmed;
			return `const ${localName} = ${modVar}[${JSON.stringify(exportName)}] ?? ${modVar}.default;`;
		})
		.filter(Boolean)
		.join("\n");
}

function isBuiltinSpecifier(spec: string): boolean {
	return (
		spec === "vue" ||
		isObsidianBuiltinSpecifier(spec) ||
		isGetThemeBuiltinSpecifier(spec) ||
		isMathBuiltinSpecifier(spec)
	);
}

/** Rewrites built-in modules and vault imports to sandbox helpers. */
export function rewriteModuleImports(
	code: string,
	fromVaultPath: string,
	ctx: ResolvePathContext,
): { code: string; dependencyIds: string[] } {
	const dependencyIds: string[] = [];
	const addDep = (spec: string) => {
		if (isBuiltinSpecifier(spec)) return;
		dependencyIds.push(toCanonicalId(spec, fromVaultPath, ctx));
	};

	let out = rewriteBuiltinImportsInCode(code);

	out = out.replace(SIDE_EFFECT_IMPORT_RE, (_full, spec: string) => {
		if (isBuiltinSpecifier(spec)) return "";
		addDep(spec);
		return `${requireExpr(spec, fromVaultPath, ctx)};\n`;
	});

	out = out.replace(
		NAMED_DEFAULT_IMPORT_RE,
		(
			_full,
			_typeKw: string | undefined,
			_kind: string,
			namespaceId: string | undefined,
			namedOnly: string | undefined,
			defaultId: string | undefined,
			namedWithDefault: string | undefined,
			defaultOnly: string | undefined,
			spec: string,
		) => {
			if (isBuiltinSpecifier(spec)) {
				return _full;
			}
			addDep(spec);
			const req = requireExpr(spec, fromVaultPath, ctx);

			if (namespaceId) {
				return `const ${namespaceId} = ${req};\n`;
			}

			const bindings: string[] = [];
			const def = defaultId ?? defaultOnly;
			if (def) {
				bindings.push(`const ${def} = (${req}).default;`);
			}
			const named = namedOnly ?? namedWithDefault;
			if (named) {
				if (isUrlImportSpecifier(spec) && !def) {
					const modVar = `__url_mod_${dependencyIds.length}`;
					bindings.unshift(`const ${modVar} = ${req};`);
					bindings.push(rewriteUrlNamedBindings(named, modVar));
				} else {
					const props = rewriteNamedBinding(named);
					bindings.push(`const { ${props} } = ${req};`);
				}
			}
			return bindings.join("\n") + "\n";
		},
	);

	// Remove any remaining built-in import lines missed by rewriteBuiltinImportsInCode
	out = out.replace(VUE_IMPORT_RE, "");
	out = out.replace(OBSIDIAN_SIDE_EFFECT_IMPORT_RE, "");

	out = out.replace(/export\s+default\s+/g, "return ");

	return { code: out.trim(), dependencyIds };
}
