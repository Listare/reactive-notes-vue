/** Walk `path` property keys starting from `root`; stop at nullish. */
export function resolvePropertyPath(root: unknown, path: string[]): unknown {
	let cur: unknown = root;
	for (const key of path) {
		if (cur == null) {
			return undefined;
		}
		cur = (cur as Record<string, unknown>)[key];
	}
	return cur;
}
