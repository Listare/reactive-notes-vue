import { App } from "obsidian";
import {
	getVaultResourceUrl,
	readVaultTextCoalesced,
	vaultPathExists,
} from "./vaultFileAccess";
import { compileSfc } from "../compiler/compileSfc";
import { collectImportsFromCode, collectImportsFromSfc } from "../bundler/collectImports";
import { prepareScriptModule } from "../bundler/prepareScriptModule";
import type {
	LoadedModuleSource,
	ModuleLoadRequest,
	ModuleLoader,
} from "../bundler/types";
import { extractNamedCodeBlock } from "../markdown/extractNamedCodeBlock";
import { isJsLikeLanguage } from "../markdown/isJsLikeLanguage";
import { isVueSfcLanguage } from "../markdown/isVueSfcLanguage";
import { parseImportSpecifier } from "../resolver/parseImportSpecifier";
import {
	resolveVaultPath,
	type ResolvePathContext,
} from "../resolver/resolveVaultPath";
import type { CompiledStyle } from "../compiler/compileSfc";
import {
	collectNodeBuiltinSpecifiersFromCode,
	collectNodeBuiltinSpecifiersFromSfc,
	validateNodeBuiltinImports,
} from "../compiler/validateNodeBuiltinImports";
import {
	lookupCachedLoadedModule,
	setCachedLoadedModule,
} from "../cache/vueInteractiveCaches";
import { hashContent } from "../utils/hashContent";
import {
	canonicalModuleId,
	classifyNamedBlockContent,
	classifyVaultModule,
	dataModuleCode,
	missingBinaryResourceError,
	missingNamedBlockError,
	parseJsonModule,
	wrapCompiledModuleCode,
} from "./vaultModuleKind";

function validateNodeImportsForSource(
	source: string,
	ctx: ResolvePathContext,
	asSfc: boolean,
): void {
	const specs = asSfc
		? collectNodeBuiltinSpecifiersFromSfc(source)
		: collectNodeBuiltinSpecifiersFromCode(source);
	validateNodeBuiltinImports(
		specs,
		ctx.enableExtendedNodeBuiltins === true,
	);
}

function enableExtendedFlag(ctx: ResolvePathContext): boolean {
	return ctx.enableExtendedNodeBuiltins === true;
}

function rememberModule(
	ctx: ResolvePathContext,
	canonicalId: string,
	contentHash: string,
	module: LoadedModuleSource,
): LoadedModuleSource {
	setCachedLoadedModule(
		canonicalId,
		contentHash,
		enableExtendedFlag(ctx),
		module,
	);
	return module;
}

async function recallModule(
	ctx: ResolvePathContext,
	canonicalId: string,
	contentHash: string,
): Promise<LoadedModuleSource | undefined> {
	return lookupCachedLoadedModule(
		canonicalId,
		contentHash,
		enableExtendedFlag(ctx),
	);
}

async function loadMarkdownModule(options: {
	ctx: ResolvePathContext;
	vaultPath: string;
	id: string;
	block?: string;
	readText: (path: string) => Promise<string>;
}): Promise<LoadedModuleSource> {
	const { ctx, vaultPath, id, block, readText } = options;
	const md = await readText(vaultPath);
	if (!block) {
		const contentHash = hashContent(md);
		const cached = await recallModule(ctx, id, contentHash);
		if (cached) return cached;
		return rememberModule(ctx, id, contentHash, {
			canonicalId: id,
			vaultPath,
			code: dataModuleCode(md),
			styles: [],
			dependencies: [],
		});
	}
	const extracted = extractNamedCodeBlock(md, block);
	if (!extracted) {
		throw missingNamedBlockError(vaultPath, block);
	}
	const contentHash = hashContent(
		`${extracted.lang}\0${extracted.content}`,
	);
	const cached = await recallModule(ctx, id, contentHash);
	if (cached) return cached;

	const contentKind = classifyNamedBlockContent(
		extracted.lang,
		isJsLikeLanguage(extracted.lang),
		isVueSfcLanguage(extracted.lang),
	);
	if (contentKind.kind === "vue-sfc") {
		validateNodeImportsForSource(extracted.content, ctx, true);
		const compiled = compileSfc(extracted.content, {
			bundleImports: false,
		});
		return rememberModule(ctx, id, contentHash, {
			canonicalId: id,
			vaultPath,
			code: wrapCompiledModuleCode(compiled.moduleCode),
			styles: compiled.styles,
			dependencies: collectImportsFromSfc(extracted.content),
			originalLineByEmitted: compiled.originalLineByEmitted,
		});
	}
	if (contentKind.kind === "script") {
		const virtualPath = `${vaultPath}?block=${block}`;
		validateNodeImportsForSource(extracted.content, ctx, false);
		return rememberModule(ctx, id, contentHash, {
			canonicalId: id,
			vaultPath,
			code: prepareScriptModule(extracted.content, virtualPath),
			styles: [],
			dependencies: collectImportsFromCode(extracted.content),
		});
	}
	let parsed: unknown = {
		lang: extracted.lang,
		content: extracted.content,
	};
	if (contentKind.kind === "json") {
		parsed = parseJsonModule(
			extracted.content,
			`代码块 "${block}" JSON 解析失败`,
		);
	}
	return rememberModule(ctx, id, contentHash, {
		canonicalId: id,
		vaultPath,
		code: dataModuleCode(parsed),
		styles: [],
		dependencies: [],
	});
}

export function createVaultModuleLoader(
	app: App,
	ctx: ResolvePathContext,
): ModuleLoader {
	const readText = (path: string) => readVaultTextCoalesced(app, path);

	const loadModule = async (
		request: ModuleLoadRequest,
	): Promise<LoadedModuleSource> => {
		const { block } = parseImportSpecifier(request.specifier);
		const vaultPath = resolveVaultPath(request.specifier, {
			...ctx,
			fromPath: request.fromVaultPath,
		});
		const id = canonicalModuleId(vaultPath, block);
		const kind = classifyVaultModule(vaultPath, block);

		switch (kind.kind) {
			case "css": {
				const css = await readText(vaultPath);
				const contentHash = hashContent(css);
				const cached = await recallModule(ctx, id, contentHash);
				if (cached) return cached;
				const styles: CompiledStyle[] = [{ css, scoped: false }];
				return rememberModule(ctx, id, contentHash, {
					canonicalId: id,
					vaultPath,
					code: "return {};",
					styles,
					dependencies: [],
				});
			}
			case "binary": {
				const url = await getVaultResourceUrl(app, vaultPath);
				if (!url) {
					throw missingBinaryResourceError(vaultPath);
				}
				const contentHash = hashContent(url);
				const cached = await recallModule(ctx, id, contentHash);
				if (cached) return cached;
				return rememberModule(ctx, id, contentHash, {
					canonicalId: id,
					vaultPath,
					code: dataModuleCode(url),
					styles: [],
					dependencies: [],
				});
			}
			case "markdown":
				return loadMarkdownModule({
					ctx,
					vaultPath,
					id,
					block,
					readText,
				});
			case "vue": {
				const source = await readText(vaultPath);
				const contentHash = hashContent(source);
				const cached = await recallModule(ctx, id, contentHash);
				if (cached) return cached;
				validateNodeImportsForSource(source, ctx, true);
				const compiled = compileSfc(source, { bundleImports: false });
				return rememberModule(ctx, id, contentHash, {
					canonicalId: id,
					vaultPath,
					code: wrapCompiledModuleCode(compiled.moduleCode),
					styles: compiled.styles,
					dependencies: collectImportsFromSfc(source),
					originalLineByEmitted: compiled.originalLineByEmitted,
				});
			}
			case "json": {
				const text = await readText(vaultPath);
				const contentHash = hashContent(text);
				const cached = await recallModule(ctx, id, contentHash);
				if (cached) return cached;
				const parsed = parseJsonModule(
					text,
					`JSON 解析失败 (${vaultPath})`,
				);
				return rememberModule(ctx, id, contentHash, {
					canonicalId: id,
					vaultPath,
					code: dataModuleCode(parsed),
					styles: [],
					dependencies: [],
				});
			}
			case "script": {
				const source = await readText(vaultPath);
				const contentHash = hashContent(source);
				const cached = await recallModule(ctx, id, contentHash);
				if (cached) return cached;
				validateNodeImportsForSource(source, ctx, false);
				return rememberModule(ctx, id, contentHash, {
					canonicalId: id,
					vaultPath,
					code: prepareScriptModule(source, vaultPath),
					styles: [],
					dependencies: collectImportsFromCode(source),
				});
			}
			case "text": {
				const text = await readText(vaultPath);
				const contentHash = hashContent(text);
				const cached = await recallModule(ctx, id, contentHash);
				if (cached) return cached;
				return rememberModule(ctx, id, contentHash, {
					canonicalId: id,
					vaultPath,
					code: dataModuleCode(text),
					styles: [],
					dependencies: [],
				});
			}
		}
	};

	return {
		loadModule,
		fileExists: (path: string) => vaultPathExists(app, path),
	};
}
