const BINARY_RESOURCE_EXT =
	/\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp3|mp4|webm|pdf)$/i;

export type VaultModuleKind =
	| { kind: "css" }
	| { kind: "binary" }
	| { kind: "markdown"; hasBlock: boolean }
	| { kind: "vue" }
	| { kind: "json" }
	| { kind: "script" }
	| { kind: "text" };

export type NamedBlockContentKind =
	| { kind: "vue-sfc" }
	| { kind: "script" }
	| { kind: "json" }
	| { kind: "opaque" };

/** Stable module id used by the bundler graph. */
export function canonicalModuleId(vaultPath: string, block?: string): string {
	return block
		? `${vaultPath}?block=${encodeURIComponent(block)}`
		: vaultPath;
}

/** Classify how a vault path (+ optional named block) should be loaded. */
export function classifyVaultModule(
	vaultPath: string,
	block?: string,
): VaultModuleKind {
	const lower = vaultPath.toLowerCase();
	if (lower.endsWith(".css")) return { kind: "css" };
	if (BINARY_RESOURCE_EXT.test(lower)) return { kind: "binary" };
	if (lower.endsWith(".md")) {
		return { kind: "markdown", hasBlock: block != null && block !== "" };
	}
	if (lower.endsWith(".vue")) return { kind: "vue" };
	if (lower.endsWith(".json") && !block) return { kind: "json" };
	if (/\.(m?[jt]sx?)$/i.test(lower)) return { kind: "script" };
	return { kind: "text" };
}

export function classifyNamedBlockContent(
	lang: string,
	isJsLike: boolean,
	isVueSfc: boolean,
): NamedBlockContentKind {
	if (isJsLike) {
		return isVueSfc ? { kind: "vue-sfc" } : { kind: "script" };
	}
	if (lang.toLowerCase() === "json") return { kind: "json" };
	return { kind: "opaque" };
}

/** Wrap compiled SFC output so `new Function` can return the module exports. */
export function wrapCompiledModuleCode(moduleCode: string): string {
	return moduleCode.includes("return ")
		? moduleCode
		: `return ${moduleCode}`;
}

export function dataModuleCode(data: unknown): string {
	return `return { default: ${JSON.stringify(data)} };`;
}

export function parseJsonModule(
	text: string,
	errorLabel: string,
): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw new Error(`${errorLabel}: ${msg}`);
	}
}

export function missingNamedBlockError(
	vaultPath: string,
	block: string,
): Error {
	return new Error(
		`在 ${vaultPath} 中未找到名为 "${block}" 的代码块（需使用 \`{name=${block}}\` 标记）。`,
	);
}

export function missingBinaryResourceError(vaultPath: string): Error {
	return new Error(`找不到资源文件: ${vaultPath}`);
}
