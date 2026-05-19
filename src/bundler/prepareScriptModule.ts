import { prepareModuleCode } from "../compiler/rewriteImports";
import { transpileTypeScript } from "./transpile";

/** Safe `.ts` path for Sucrase (query strings break its lexer metadata). */
export function toTranspilePath(virtualPath: string): string {
	if (/\.(m?[jt]sx?)$/i.test(virtualPath)) return virtualPath;
	const block = /\?block=([^&]+)/.exec(virtualPath)?.[1];
	const base = virtualPath.replace(/\?.*$/, "").replace(/\.md$/i, "");
	if (block) {
		return `${base}/__block__-${block}.ts`;
	}
	return `${base}.ts`;
}

/** Transpiles (if needed) and prepares vault script / markdown-block code for the bundle. */
export function prepareScriptModule(source: string, virtualPath: string): string {
	const transpiled = transpileTypeScript(source, toTranspilePath(virtualPath));
	const prepared = prepareModuleCode(transpiled);
	if (!/\breturn\b/.test(prepared)) {
		return `${prepared}\nreturn {};`;
	}
	return prepared;
}
