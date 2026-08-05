/** Vitest stub — Obsidian is provided by the host app at runtime. */
export class Notice {
	constructor(public message: string) {}
}

/** Stub for editor highlight unit tests that import loadPrism. */
export async function loadPrism(): Promise<{
	languages: Record<string, unknown>;
	tokenize: (text: string, grammar: unknown) => unknown;
}> {
	return {
		languages: {},
		tokenize: (text) => [text],
	};
}
