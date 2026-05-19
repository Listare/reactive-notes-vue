import { CustomScriptPathError } from "./customScriptPathError";

/**
 * Validates the custom script root only when the module graph uses @custom-script/.
 */
export async function validateCustomScriptPathWhenUsed(
	customScriptPath: string,
	usesCustomScript: boolean,
	pathExists: (path: string) => Promise<boolean>,
): Promise<void> {
	if (!usesCustomScript) return;

	if (!customScriptPath) {
		throw new CustomScriptPathError(
			"使用了 @custom-script/ 导入，但未配置脚本路径。请在 **设置 → Reactive Notes Vue** 中配置。",
		);
	}

	const exists = await pathExists(customScriptPath);
	if (!exists) {
		throw new CustomScriptPathError(
			`自定义脚本路径不存在: ${customScriptPath}。请在 **设置 → Reactive Notes Vue** 中修正路径。`,
		);
	}
}
