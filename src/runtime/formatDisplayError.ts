/** True for compile / parse / transpile failures (no stack panel). */
export function isCompileTimeError(error: Error): boolean {
	if (error instanceof SyntaxError) return true;
	const msg = error.message;
	return (
		msg.startsWith("SFC 解析失败") ||
		msg.startsWith("TypeScript 转译失败") ||
		msg.startsWith("脚本编译失败") ||
		msg.startsWith("模板编译失败") ||
		msg.startsWith("样式编译失败") ||
		msg.startsWith("需要 <") ||
		msg.startsWith("不支持的导入路径") ||
		msg.startsWith("找不到模块") ||
		error.name === "BundleError"
	);
}
