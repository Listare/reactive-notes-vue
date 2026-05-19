import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_ID = "reactive-notes-vue";
const VAULT_PLUGIN_DIR = join(
	ROOT,
	"test-vault",
	".obsidian",
	"plugins",
	PLUGIN_ID,
);

const ARTIFACTS = ["main.js", "manifest.json", "styles.css"];

export function syncTestVault() {
	if (!existsSync(join(ROOT, "main.js"))) {
		console.warn(
			"[sync-test-vault] main.js 不存在，请先运行 pnpm run dev 或 pnpm run build",
		);
		return false;
	}

	mkdirSync(VAULT_PLUGIN_DIR, { recursive: true });

	for (const file of ARTIFACTS) {
		const src = join(ROOT, file);
		if (!existsSync(src)) {
			console.warn(`[sync-test-vault] 跳过缺失文件: ${file}`);
			continue;
		}
		copyFileSync(src, join(VAULT_PLUGIN_DIR, file));
	}

	console.log(`[sync-test-vault] 已同步到 ${VAULT_PLUGIN_DIR}`);
	return true;
}

if (process.argv[1]?.endsWith("sync-test-vault.mjs")) {
	syncTestVault();
}
