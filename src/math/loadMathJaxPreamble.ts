import type { App } from "obsidian";
import { readVaultText, vaultPathExists } from "../vault/vaultFileAccess";

export class MathJaxPreambleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "MathJaxPreambleError";
	}
}

/** Reads the configured MathJax preamble file from the vault. */
export async function loadMathJaxPreamble(
	app: App,
	preamblePath: string,
): Promise<string> {
	if (!preamblePath) return "";
	const exists = await vaultPathExists(app, preamblePath);
	if (!exists) {
		throw new MathJaxPreambleError(
			`MathJax 前置文件不存在: ${preamblePath}。请在 **设置 → Reactive Notes Vue** 中修正路径。`,
		);
	}
	return (await readVaultText(app, preamblePath)).trim();
}
