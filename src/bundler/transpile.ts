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
		return result.code;
	} catch (e) {
		throw formatTranspileFailure(code, filePath, e);
	}
}
