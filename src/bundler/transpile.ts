import { transform } from "sucrase";

export function transpileTypeScript(code: string, filePath: string): string {
	const isTsx = filePath.endsWith(".tsx");
	const isTs = filePath.endsWith(".ts") || isTsx;
	if (!isTs) return code;

	try {
		const result = transform(code, {
			transforms: ["typescript", "jsx"],
			jsxRuntime: "classic",
			production: true,
		});
		return result.code;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw new Error(`TypeScript 转译失败 (${filePath}): ${msg}`);
	}
}
