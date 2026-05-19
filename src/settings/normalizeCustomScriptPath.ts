import { normalizeVaultPath } from "../utils/posixPath";

/** Trims and normalizes the vault-relative custom script folder path. */
export function normalizeCustomScriptPath(path: string): string {
	const trimmed = path.trim().replace(/\/+$/, "");
	return trimmed ? normalizeVaultPath(trimmed) : "";
}
