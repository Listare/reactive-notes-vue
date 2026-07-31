import { isUrlImportSpecifier } from "../../resolver/isUrlImport";

const FROM_URL_RE = /\bfrom\s+(['"])(https?:\/\/[^'"]+)\1/g;
const SIDE_EFFECT_URL_RE = /\bimport\s+(['"])(https?:\/\/[^'"]+)\1/g;
const DYNAMIC_URL_RE = /\bimport\s*\(\s*(['"])(https?:\/\/[^'"]+)\1\s*\)/g;

/** Collects absolute http(s) import URLs from ESM/JS source (static + dynamic). */
export function collectUrlImportsFromCode(code: string): string[] {
	const specs = new Set<string>();
	const add = (url: string) => {
		if (isUrlImportSpecifier(url)) specs.add(url);
	};

	for (const re of [FROM_URL_RE, SIDE_EFFECT_URL_RE, DYNAMIC_URL_RE]) {
		re.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = re.exec(code)) !== null) {
			const url = match[2];
			if (url) add(url);
		}
	}
	return [...specs];
}

/**
 * Rewrites http(s) import/export specifiers to mapped blob (or other) URLs.
 * Unmapped URLs are left unchanged.
 */
export function rewriteUrlImports(
	code: string,
	urlMap: ReadonlyMap<string, string>,
): string {
	const replace = (_full: string, quote: string, url: string): string => {
		const mapped = urlMap.get(url);
		if (!mapped) return _full;
		return _full.replace(
			`${quote}${url}${quote}`,
			`${quote}${mapped}${quote}`,
		);
	};

	let out = code.replace(FROM_URL_RE, replace);
	out = out.replace(SIDE_EFFECT_URL_RE, replace);
	out = out.replace(DYNAMIC_URL_RE, replace);
	return out;
}
