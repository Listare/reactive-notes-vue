import type { App } from "obsidian";
import { normalizeVaultPath } from "../utils/posixPath";

function isVaultFile(entry: unknown): boolean {
	return (
		entry !== null &&
		typeof entry === "object" &&
		"extension" in entry
	);
}

function isVaultFolder(entry: unknown): boolean {
	return (
		entry !== null &&
		typeof entry === "object" &&
		"children" in entry &&
		!("extension" in entry)
	);
}

/**
 * Paths under `.obsidian/` exist on disk but are not indexed as vault notes/attachments,
 * so `getAbstractFileByPath` returns null. The data adapter can still read them.
 */
export function isConfigFolderPath(path: string): boolean {
	const normalized = normalizeVaultPath(path);
	return (
		normalized === ".obsidian" ||
		normalized.startsWith(".obsidian/")
	);
}

export async function vaultPathExists(app: App, path: string): Promise<boolean> {
	const normalized = normalizeVaultPath(path);
	const entry = app.vault.getAbstractFileByPath(normalized);
	if (isVaultFile(entry) || isVaultFolder(entry)) {
		return true;
	}
	return app.vault.adapter.exists(normalized);
}

export async function readVaultText(app: App, path: string): Promise<string> {
	const normalized = normalizeVaultPath(path);
	const file = app.vault.getAbstractFileByPath(normalized);
	if (isVaultFile(file)) {
		return app.vault.read(file as Parameters<App["vault"]["read"]>[0]);
	}
	if (await app.vault.adapter.exists(normalized)) {
		return app.vault.adapter.read(normalized);
	}
	throw new Error(`找不到文件: ${path}`);
}

export async function getVaultResourceUrl(
	app: App,
	path: string,
): Promise<string | null> {
	const normalized = normalizeVaultPath(path);
	const file = app.vault.getAbstractFileByPath(normalized);
	if (isVaultFile(file)) {
		return app.vault.getResourcePath(
			file as Parameters<App["vault"]["getResourcePath"]>[0],
		);
	}
	if (!(await app.vault.adapter.exists(normalized))) {
		return null;
	}
	const adapter = app.vault.adapter as {
		getResourcePath?: (path: string) => string;
	};
	if (typeof adapter.getResourcePath === "function") {
		return adapter.getResourcePath(normalized);
	}
	return null;
}
