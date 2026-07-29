import type { App } from "obsidian";
import { normalizeVaultPath, posixDirname } from "../utils/posixPath";

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

/** Creates parent folders as needed (vault API or adapter for `.obsidian/`). */
export async function ensureVaultFolder(
	app: App,
	folderPath: string,
): Promise<void> {
	const normalized = normalizeVaultPath(folderPath);
	if (!normalized) return;
	if (await vaultPathExists(app, normalized)) return;

	const parent = posixDirname(normalized);
	if (parent) {
		await ensureVaultFolder(app, parent);
	}

	if (isConfigFolderPath(normalized)) {
		await app.vault.adapter.mkdir(normalized);
		return;
	}

	const existing = app.vault.getAbstractFileByPath(normalized);
	if (isVaultFolder(existing)) return;
	await app.vault.createFolder(normalized);
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

/** True when `readVaultText` failed because the path is missing. */
export function isVaultFileNotFoundError(err: unknown): boolean {
	return err instanceof Error && err.message.startsWith("找不到文件:");
}

/**
 * Writes text to a vault-relative path (create or overwrite).
 * Creates parent folders; uses the data adapter for `.obsidian/` paths.
 */
export async function writeVaultText(
	app: App,
	path: string,
	content: string,
): Promise<void> {
	const normalized = normalizeVaultPath(path);
	const parent = posixDirname(normalized);
	if (parent) {
		await ensureVaultFolder(app, parent);
	}

	const file = app.vault.getAbstractFileByPath(normalized);
	if (isVaultFile(file)) {
		await app.vault.modify(
			file as Parameters<App["vault"]["modify"]>[0],
			content,
		);
		return;
	}

	if (isConfigFolderPath(normalized)) {
		await app.vault.adapter.write(normalized, content);
		return;
	}

	if (await app.vault.adapter.exists(normalized)) {
		await app.vault.adapter.write(normalized, content);
		return;
	}

	await app.vault.create(normalized, content);
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
