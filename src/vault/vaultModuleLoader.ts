import { App, TFile, TFolder } from "obsidian";
import { normalizeVaultPath } from "../utils/posixPath";
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
import { parseImportSpecifier } from "../resolver/parseImportSpecifier";
import {
	resolveVaultPath,
	type ResolvePathContext,
} from "../resolver/resolveVaultPath";
import type { CompiledStyle } from "../compiler/compileSfc";

const BINARY_RESOURCE_EXT =
	/\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp3|mp4|webm|pdf)$/i;

function canonicalId(vaultPath: string, block?: string): string {
	return block
		? `${vaultPath}?block=${encodeURIComponent(block)}`
		: vaultPath;
}

function dataModuleCode(data: unknown): string {
	return `return { default: ${JSON.stringify(data)} };`;
}

export function createVaultModuleLoader(
	app: App,
	ctx: ResolvePathContext,
): ModuleLoader {
	const readText = async (path: string): Promise<string> => {
		const file = app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			throw new Error(`找不到文件: ${path}`);
		}
		return app.vault.read(file);
	};

	const loadModule = async (
		request: ModuleLoadRequest,
	): Promise<LoadedModuleSource> => {
		const { block } = parseImportSpecifier(request.specifier);
		const vaultPath = resolveVaultPath(request.specifier, {
			...ctx,
			fromPath: request.fromVaultPath,
		});
		const id = canonicalId(vaultPath, block);
		const lower = vaultPath.toLowerCase();

		if (lower.endsWith(".css")) {
			const css = await readText(vaultPath);
			const styles: CompiledStyle[] = [{ css, scoped: false }];
			return {
				canonicalId: id,
				vaultPath,
				code: "return {};",
				styles,
				dependencies: [],
			};
		}

		if (BINARY_RESOURCE_EXT.test(lower)) {
			const file = app.vault.getAbstractFileByPath(vaultPath);
			if (!(file instanceof TFile)) {
				throw new Error(`找不到资源文件: ${vaultPath}`);
			}
			const url = app.vault.getResourcePath(file);
			return {
				canonicalId: id,
				vaultPath,
				code: dataModuleCode(url),
				styles: [],
				dependencies: [],
			};
		}

		if (lower.endsWith(".md")) {
			const md = await readText(vaultPath);
			if (!block) {
				return {
					canonicalId: id,
					vaultPath,
					code: dataModuleCode(md),
					styles: [],
					dependencies: [],
				};
			}
			const extracted = extractNamedCodeBlock(md, block);
			if (!extracted) {
				throw new Error(
					`在 ${vaultPath} 中未找到名为 "${block}" 的代码块（需使用 \`{name=${block}}\` 标记）。`,
				);
			}
			if (isJsLikeLanguage(extracted.lang)) {
				const code = prepareScriptModule(
					extracted.content,
					`${vaultPath}?block=${block}`,
				);
				return {
					canonicalId: id,
					vaultPath,
					code,
					styles: [],
					dependencies: collectImportsFromCode(extracted.content),
				};
			}
			let parsed: unknown = {
				lang: extracted.lang,
				content: extracted.content,
			};
			if (extracted.lang.toLowerCase() === "json") {
				try {
					parsed = JSON.parse(extracted.content) as unknown;
				} catch (e) {
					const msg = e instanceof Error ? e.message : String(e);
					throw new Error(
						`代码块 "${block}" JSON 解析失败: ${msg}`,
					);
				}
			}
			return {
				canonicalId: id,
				vaultPath,
				code: dataModuleCode(parsed),
				styles: [],
				dependencies: [],
			};
		}

		if (lower.endsWith(".vue")) {
			const source = await readText(vaultPath);
			const compiled = compileSfc(source, { bundleImports: false });
			const code = compiled.moduleCode.includes("return ")
				? compiled.moduleCode
				: `return ${compiled.moduleCode}`;
			return {
				canonicalId: id,
				vaultPath,
				code,
				styles: compiled.styles,
				dependencies: collectImportsFromSfc(source),
			};
		}

		if (lower.endsWith(".json") && !block) {
			const text = await readText(vaultPath);
			let parsed: unknown;
			try {
				parsed = JSON.parse(text) as unknown;
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				throw new Error(`JSON 解析失败 (${vaultPath}): ${msg}`);
			}
			return {
				canonicalId: id,
				vaultPath,
				code: dataModuleCode(parsed),
				styles: [],
				dependencies: [],
			};
		}

		if (/\.(m?[jt]sx?)$/i.test(lower)) {
			const source = await readText(vaultPath);
			const code = prepareScriptModule(source, vaultPath);
			return {
				canonicalId: id,
				vaultPath,
				code,
				styles: [],
				dependencies: collectImportsFromCode(source),
			};
		}

		const text = await readText(vaultPath);
		return {
			canonicalId: id,
			vaultPath,
			code: dataModuleCode(text),
			styles: [],
			dependencies: [],
		};
	};

	return {
		loadModule,
		fileExists: async (path: string) => {
			const entry = app.vault.getAbstractFileByPath(
				normalizeVaultPath(path),
			);
			// Script root is a folder; imported targets are files.
			return entry instanceof TFile || entry instanceof TFolder;
		},
	};
}
