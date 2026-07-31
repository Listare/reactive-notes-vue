import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_ID = "reactive-notes-vue";
const ARTIFACTS = ["main.js", "manifest.json", "styles.css"];

/**
 * @param {string} vaultRelative
 * @returns {boolean}
 */
function syncVault(vaultRelative) {
	const vaultPluginDir = join(
		ROOT,
		vaultRelative,
		".obsidian",
		"plugins",
		PLUGIN_ID,
	);

	if (!existsSync(join(ROOT, "main.js"))) {
		console.warn(
			"[sync-vault] main.js 不存在，请先运行 pnpm run dev 或 pnpm run build",
		);
		return false;
	}

	mkdirSync(vaultPluginDir, { recursive: true });

	for (const file of ARTIFACTS) {
		const src = join(ROOT, file);
		if (!existsSync(src)) {
			console.warn(`[sync-vault] 跳过缺失文件: ${file}`);
			continue;
		}
		copyFileSync(src, join(vaultPluginDir, file));
	}

	console.log(`[sync-vault] 已同步到 ${vaultPluginDir}`);
	return true;
}

/** Sync built plugin into the examples demo vault. */
export function syncExamples() {
	return syncVault("examples");
}

/** Sync built plugin into the WDIO e2e vault. */
export function syncE2eVault() {
	return syncVault("test/e2e-vault");
}

/** Sync into both examples and e2e vaults. */
export function syncAllVaults() {
	const okExamples = syncExamples();
	const okE2e = syncE2eVault();
	return okExamples && okE2e;
}

if (process.argv[1]?.endsWith("sync-examples.mjs")) {
	syncAllVaults();
}
