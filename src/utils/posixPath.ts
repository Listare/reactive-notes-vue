/** Vault paths use forward slashes (Obsidian convention). */

export function posixDirname(filePath: string): string {
	const normalized = normalizeVaultPath(filePath);
	const idx = normalized.lastIndexOf("/");
	if (idx <= 0) return "";
	return normalized.slice(0, idx);
}

export function posixJoin(...segments: string[]): string {
	const joined = segments
		.filter((s) => s.length > 0)
		.join("/")
		.replace(/\\/g, "/");
	return normalizeVaultPath(joined);
}

export function normalizeVaultPath(filePath: string): string {
	const parts = filePath.replace(/\\/g, "/").split("/");
	const stack: string[] = [];
	for (const part of parts) {
		if (part === "" || part === ".") continue;
		if (part === "..") {
			stack.pop();
			continue;
		}
		stack.push(part);
	}
	return stack.join("/");
}
