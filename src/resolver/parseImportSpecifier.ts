export interface ParsedImportSpecifier {
	/** Path without query (e.g. `./foo.md`, `@/lib/x.ts`). */
	path: string;
	/** Named markdown code block from `?block=名称`. */
	block?: string;
}

/** Splits `path?block=name` from an import specifier. */
export function parseImportSpecifier(specifier: string): ParsedImportSpecifier {
	if (/^https?:\/\//i.test(specifier)) {
		return { path: specifier };
	}
	const qIndex = specifier.indexOf("?");
	if (qIndex === -1) {
		return { path: specifier };
	}
	const path = specifier.slice(0, qIndex);
	const query = specifier.slice(qIndex + 1);
	const params = new URLSearchParams(query);
	const block = params.get("block")?.trim();
	return block ? { path, block } : { path };
}
