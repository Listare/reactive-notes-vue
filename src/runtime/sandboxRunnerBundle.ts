import { SANDBOX_RUNNER_SCRIPT } from "@sandbox-runner-script";

/** IIFE sandbox runner, inlined into main.js at build time (no runtime fetch). */
export function getSandboxRunnerScript(): string {
	if (!SANDBOX_RUNNER_SCRIPT) {
		throw new Error(
			"沙盒脚本未内联。请运行 pnpm run build 重新生成 main.js。",
		);
	}
	return SANDBOX_RUNNER_SCRIPT;
}
