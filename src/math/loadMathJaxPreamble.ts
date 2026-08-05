import type { App } from "obsidian";
import { normalizeMathJaxPreamblePath } from "../settings/normalizeMathJaxPreamblePath";
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
	const normalized = normalizeMathJaxPreamblePath(preamblePath);
	if (!normalized) return "";
	const exists = await vaultPathExists(app, normalized);
	if (!exists) {
		throw new MathJaxPreambleError(
			`MathJax 前置文件不存在: ${normalized}。请在 **设置 → Reactive Notes Vue** 中修正路径。`,
		);
	}
	return (await readVaultText(app, normalized)).trim();
}
