/** Minimal Prism token shape used for flatten/mapping (no Prism runtime). */
export interface PrismTokenNode {
	type: string | string[];
	content: string | Array<string | PrismTokenNode>;
	alias?: string | string[];
}

export interface PrismTokenRange {
	/** Offset relative to the start of the tokenized string. */
	from: number;
	to: number;
	/** CodeMirror mark class, e.g. `cm-keyword`. */
	className: string;
}

/** Prism token type / alias → Obsidian editor `.cm-*` class. */
export const PRISM_TOKEN_TO_CM_CLASS: Readonly<Record<string, string>> = {
	comment: "cm-comment",
	prolog: "cm-meta",
	doctype: "cm-meta",
	cdata: "cm-meta",
	punctuation: "cm-punctuation",
	property: "cm-property",
	tag: "cm-tag",
	boolean: "cm-atom",
	number: "cm-number",
	constant: "cm-atom",
	symbol: "cm-atom",
	deleted: "cm-deleted",
	selector: "cm-qualifier",
	"attr-name": "cm-attribute",
	string: "cm-string",
	char: "cm-string",
	builtin: "cm-builtin",
	inserted: "cm-inserted",
	operator: "cm-operator",
	entity: "cm-atom",
	url: "cm-link",
	keyword: "cm-keyword",
	atrule: "cm-keyword",
	"attr-value": "cm-string",
	function: "cm-variable",
	"class-name": "cm-variable-2",
	regex: "cm-string-2",
	important: "cm-keyword",
	variable: "cm-variable",
	"template-string": "cm-string",
	namespace: "cm-namespace",
	bold: "cm-strong",
	italic: "cm-em",
};

export function mapPrismTypesToCmClass(
	types: readonly string[],
): string | null {
	for (const type of types) {
		const mapped = PRISM_TOKEN_TO_CM_CLASS[type];
		if (mapped) return mapped;
	}
	return null;
}

function collectTypes(token: PrismTokenNode): string[] {
	const types: string[] = [];
	const push = (value: string | string[] | undefined): void => {
		if (!value) return;
		if (Array.isArray(value)) types.push(...value);
		else types.push(value);
	};
	push(token.type);
	push(token.alias);
	return types;
}

/**
 * Flattens Prism.tokenize output into leaf ranges with CM class names.
 * Nested tokens keep the nearest enclosing type for string leaves.
 */
export function flattenPrismTokensToRanges(
	tokens: ReadonlyArray<string | PrismTokenNode>,
	baseOffset = 0,
): PrismTokenRange[] {
	const ranges: PrismTokenRange[] = [];
	let pos = baseOffset;

	const walk = (
		nodes: ReadonlyArray<string | PrismTokenNode>,
		inheritedTypes: readonly string[],
	): void => {
		for (const node of nodes) {
			if (typeof node === "string") {
				const className = mapPrismTypesToCmClass(inheritedTypes);
				if (className && node.length > 0) {
					ranges.push({
						from: pos,
						to: pos + node.length,
						className,
					});
				}
				pos += node.length;
				continue;
			}
			const types = collectTypes(node);
			const nextTypes = types.length > 0 ? types : inheritedTypes;
			if (typeof node.content === "string") {
				const className = mapPrismTypesToCmClass(nextTypes);
				if (className && node.content.length > 0) {
					ranges.push({
						from: pos,
						to: pos + node.content.length,
						className,
					});
				}
				pos += node.content.length;
			} else {
				walk(node.content, nextTypes);
			}
		}
	};

	walk(tokens, []);
	return ranges;
}

/** Tokenize `code` with a Prism-like API and return relative CM ranges. */
export function tokenRangesForCode(
	code: string,
	tokenize: (
		text: string,
		grammar: unknown,
	) => Array<string | PrismTokenNode>,
	grammar: unknown,
): PrismTokenRange[] {
	if (!code || grammar == null) return [];
	const tokens = tokenize(code, grammar);
	return flattenPrismTokensToRanges(tokens);
}
