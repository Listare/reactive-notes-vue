import { normalizeVaultPath } from "../utils/posixPath";

/** Trims and normalizes the vault-relative MathJax preamble file path. */
export function normalizeMathJaxPreamblePath(path: string): string {
	const trimmed = path.trim();
	return trimmed ? normalizeVaultPath(trimmed) : "";
}
