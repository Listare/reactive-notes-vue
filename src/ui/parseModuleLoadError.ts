import type { ErrorLocation } from "./renderError";

/** Parses `位置: vault:block:line:column` appended by module load error formatters. */
export function parseModuleLoadErrorLocation(
	message: string,
): ErrorLocation | undefined {
	const match = /\n位置: [^:]+:[^:]+:(\d+):(\d+)\s*$/.exec(message);
	if (!match) return undefined;
	return {
		line: Number(match[1]),
		column: Number(match[2]),
	};
}
