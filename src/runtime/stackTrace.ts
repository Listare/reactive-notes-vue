/** Maps a line in emitted `moduleCode` to a vault file / named block. */
export interface StackCodeRegion {
	vaultPath: string;
	/** Named markdown fence block; `null` → display as `<anonymous>`. */
	blockName: string | null;
	/** 1-based line in `moduleCode` where this region's executable code begins. */
	codeStartLine: number;
}

export function blockNameFromCanonicalId(canonicalId: string): string | null {
	const match = /\?block=([^&]+)/.exec(canonicalId);
	if (match?.[1]) return decodeURIComponent(match[1]);
	return null;
}

export function formatStackLocation(
	region: StackCodeRegion,
	line: number,
	column: number,
): string {
	const block = region.blockName ?? "<anonymous>";
	return `${region.vaultPath}:${block}:${line}:${column}`;
}

export function countLines(text: string): number {
	if (!text) return 0;
	return text.split("\n").length;
}

/** Regions for a single unbundled module (entire `moduleCode` is one file). */
export function singleModuleStackRegion(
	vaultPath: string,
	canonicalId?: string,
): StackCodeRegion {
	return {
		vaultPath,
		blockName: canonicalId
			? blockNameFromCanonicalId(canonicalId)
			: null,
		codeStartLine: 1,
	};
}

/**
 * Rewrites V8 `new Function` stack locations (`<anonymous>`, `about:srcdoc`, nested eval)
 * into `vaultPath:block:line:column`.
 */
export function rewriteRuntimeStack(
	stack: string | undefined,
	regions: StackCodeRegion[],
): string | undefined {
	if (!stack || regions.length === 0) return stack;

	const sorted = [...regions].sort(
		(a, b) => a.codeStartLine - b.codeStartLine,
	);

	return stack.replace(/^(\s*at\s.+)$/gm, (frame) => {
		const locMatch = frame.match(
			/(?:<anonymous>|about:srcdoc):(\d+):(\d+)\)?\s*$/,
		);
		if (!locMatch) return frame;

		const stackLine = Number(locMatch[1]);
		const column = Number(locMatch[2]);
		// `executeModule` prepends `"use strict";` as the first line of the function body.
		const bundleLine = stackLine - 1;
		if (bundleLine < 1) return frame;

		const region = findRegion(sorted, bundleLine);
		if (!region) return frame;

		const sourceLine = bundleLine - region.codeStartLine + 1;
		if (sourceLine < 1) return frame;

		const location = formatStackLocation(region, sourceLine, column);
		return frame.replace(
			/\((?:eval at [^(]+ \([^)]+\), )?(?:<anonymous>|about:srcdoc):\d+:\d+\)\s*$/,
			`(${location})`,
		);
	});
}

function findRegion(
	sorted: StackCodeRegion[],
	bundleLine: number,
): StackCodeRegion | undefined {
	let found: StackCodeRegion | undefined;
	for (const region of sorted) {
		if (region.codeStartLine <= bundleLine) {
			found = region;
		} else {
			break;
		}
	}
	return found;
}
