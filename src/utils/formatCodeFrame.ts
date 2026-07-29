/**
 * Formats a short code frame (Vue / Babel style) around a 1-based line.
 * `column` is 0-based (Sucrase `loc.column`, Babel-style).
 */
export function formatCodeFrame(
	source: string,
	line: number,
	column: number,
	filePath?: string,
): string {
	const lines = source.split(/\r?\n/);
	const index = line - 1;
	if (index < 0 || index >= lines.length) {
		return filePath ? `${filePath}:${line}:${column}` : `:${line}:${column}`;
	}

	const lineText = lines[index] ?? "";
	const gutter = String(line);
	const pad = " ".repeat(gutter.length);
	const col = Math.max(0, column);
	const pointer = `${pad} | ${" ".repeat(col)}^`;

	const parts: string[] = [];
	if (filePath) parts.push(filePath);
	parts.push(`${gutter} | ${lineText}`);
	parts.push(pointer);
	return parts.join("\n");
}
