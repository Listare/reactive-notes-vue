import { parseImportSpecifier } from "../resolver/parseImportSpecifier";
import {
	resolveVaultPath,
	type ResolvePathContext,
} from "../resolver/resolveVaultPath";
import { rewriteVueImportsInCode, VUE_IMPORT_RE } from "../compiler/rewriteImports";

function toCanonicalId(
	specifier: string,
	fromVaultPath: string,
	ctx: ResolvePathContext,
): string {
	const { block } = parseImportSpecifier(specifier);
	const vaultPath = resolveVaultPath(specifier, {
		...ctx,
		fromPath: fromVaultPath,
	});
	return block ? `${vaultPath}?block=${encodeURIComponent(block)}` : vaultPath;
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

/** Rewrites `vue` and vault imports to `__vue__` / `__require__(id)`. */
export function rewriteModuleImports(
	code: string,
	fromVaultPath: string,
	ctx: ResolvePathContext,
): { code: string; dependencyIds: string[] } {
	const dependencyIds: string[] = [];
	const addDep = (spec: string) => {
		if (spec === "vue") return;
		dependencyIds.push(toCanonicalId(spec, fromVaultPath, ctx));
	};

	let out = rewriteVueImportsInCode(code);

	out = out.replace(SIDE_EFFECT_IMPORT_RE, (_full, spec: string) => {
		if (spec === "vue") return "";
		addDep(spec);
		const id = toCanonicalId(spec, fromVaultPath, ctx);
		return `__require__(${JSON.stringify(id)});\n`;
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
			if (spec === "vue") {
				return _full;
			}
			addDep(spec);
			const id = toCanonicalId(spec, fromVaultPath, ctx);
			const req = `__require__(${JSON.stringify(id)})`;

			if (namespaceId) {
				return `const ${namespaceId} = ${req};\n`;
			}

			const bindings: string[] = [];
			const def = defaultId ?? defaultOnly;
			if (def) {
				bindings.push(`const ${def} = ${req}.default;`);
			}
			const named = namedOnly ?? namedWithDefault;
			if (named) {
				const props = rewriteNamedBinding(named);
				bindings.push(`const { ${props} } = ${req};`);
			}
			return bindings.join("\n") + "\n";
		},
	);

	// Remove any remaining vue import lines missed by rewriteVueImportsInCode
	out = out.replace(VUE_IMPORT_RE, "");

	out = out.replace(/export\s+default\s+/g, "return ");

	return { code: out.trim(), dependencyIds };
}
