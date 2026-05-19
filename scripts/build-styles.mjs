import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = join(ROOT, "src/styles/sandbox.css");
const OUTPUT = join(ROOT, "sandbox-tailwind.css");
const CLI = join(ROOT, "node_modules", "@tailwindcss/cli", "dist", "index.mjs");

export function buildSandboxTailwind({ minify = false } = {}) {
	const args = ["-i", INPUT, "-o", OUTPUT];
	if (minify) args.push("--minify");
	execFileSync(process.execPath, [CLI, ...args], {
		cwd: ROOT,
		stdio: "inherit",
	});
	return OUTPUT;
}

if (process.argv[1]?.endsWith("build-styles.mjs")) {
	const minify = process.argv.includes("--minify");
	buildSandboxTailwind({ minify });
}
