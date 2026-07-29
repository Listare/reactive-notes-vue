import { formatTranspileFailure } from "./formatTranspileFailure";
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
		// Sucrase injects helpers before the first statement; keep `import` on its own line
		// so downstream rewrite/collect regexes that scan for import statements still match.
		return result.code.replace(/\}(\s*import\b)/g, "}\n$1");
	} catch (e) {
		throw formatTranspileFailure(code, filePath, e);
	}
}
