import { formatCodeFrame } from "../utils/formatCodeFrame";

/**
 * Turns a Sucrase/Babel-style syntax failure into a message with source context.
 */
export function formatTranspileFailure(
	source: string,
	filePath: string,
	error: unknown,
): SyntaxError {
	const base = error instanceof Error ? error : new Error(String(error));
	const loc = (error as { loc?: { line: number; column: number } }).loc;
	const parsed = loc ?? parseLineColumnFromMessage(base.message);

	let detail = base.message;
	if (parsed) {
		const frame = formatCodeFrame(
			source,
			parsed.line,
			parsed.column,
			filePath,
		);
		detail = `${stripTrailingLineColumn(base.message)}\n\n${frame}`;
	}

	const err = new SyntaxError(`TypeScript 转译失败 (${filePath}):\n${detail}`);
	err.stack = undefined;
	return err;
}

function parseLineColumnFromMessage(
	message: string,
): { line: number; column: number } | undefined {
	const match = /\((\d+):(\d+)\)\s*$/.exec(message);
	if (!match) return undefined;
	return { line: Number(match[1]), column: Number(match[2]) };
}

function stripTrailingLineColumn(message: string): string {
	return message.replace(/\s*\(\d+:\d+\)\s*$/, "");
}
