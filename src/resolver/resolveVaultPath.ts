import { parseImportSpecifier } from "./parseImportSpecifier";
import { normalizeVaultPath, posixDirname, posixJoin } from "../utils/posixPath";

export const CUSTOM_SCRIPT_PREFIX = "@custom-script/";
export const VAULT_ROOT_PREFIX = "@/";

export interface ResolvePathContext {
	/** Vault-relative path of the file that contains the import. */
	fromPath: string;
	/** Vault-relative custom script root (no trailing slash). */
	customScriptPath: string;
}

export class ImportPathError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ImportPathError";
	}
}

/**
 * Resolves an import specifier to a vault-relative file path.
 * Supports `./rel`, `@/vault-root`, `@custom-script/…`, and `?block=` (query only; block handled separately).
 */
export function resolveVaultPath(
	specifier: string,
	ctx: ResolvePathContext,
): string {
	const { path: rawPath } = parseImportSpecifier(specifier);
	if (!rawPath) {
		throw new ImportPathError("导入路径为空。");
	}
	if (rawPath === "vue") {
		throw new ImportPathError('内置模块 "vue" 不应走文件解析。');
	}
	if (rawPath === "@obsidian" || rawPath === "obsidian") {
		throw new ImportPathError('内置模块 "@obsidian" 不应走文件解析。');
	}
	if (
		rawPath === "@vue-interactive/theme" ||
		rawPath === "vue-interactive/theme"
	) {
		throw new ImportPathError(
			'内置模块 "@vue-interactive/theme" 不应走文件解析。',
		);
	}

	let resolved: string;

	if (rawPath.startsWith(CUSTOM_SCRIPT_PREFIX)) {
		if (!ctx.customScriptPath) {
			throw new ImportPathError(
				"未配置自定义脚本路径，无法解析 @custom-script/ 导入。请在插件设置中配置脚本路径。",
			);
		}
		const rest = rawPath.slice(CUSTOM_SCRIPT_PREFIX.length);
		resolved = posixJoin(ctx.customScriptPath, rest);
	} else if (rawPath.startsWith(VAULT_ROOT_PREFIX)) {
		resolved = normalizeVaultPath(rawPath.slice(VAULT_ROOT_PREFIX.length));
	} else if (rawPath.startsWith("./") || rawPath.startsWith("../")) {
		const baseDir = posixDirname(ctx.fromPath);
		resolved = posixJoin(baseDir, rawPath);
	} else {
		throw new ImportPathError(
			`不支持的导入路径 "${rawPath}"。请使用 ./相对路径、@/ 或 @custom-script/。`,
		);
	}

	return normalizeVaultPath(resolved);
}
