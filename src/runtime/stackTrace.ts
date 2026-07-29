/** Maps a line in emitted `moduleCode` to a vault file / named block. */
export interface StackCodeRegion {
	vaultPath: string;
	/** Named markdown fence block; `null` → display as `<anonymous>`. */
	blockName: string | null;
	/** 1-based line in `moduleCode` where this region's executable code begins. */
	codeStartLine: number;
}

/**
 * How a reported line number relates to `moduleCode`.
 * - `moduleBody`: line 1 is `"use strict"` from `buildModuleLoadBody` (Sucrase pre-check).
 * - `v8Anonymous`: V8/`new Function` stack (`<anonymous>` / `about:srcdoc`), which
 *   prefixes a 2-line `function anonymous(...\n) {` header before the body.
 */
export type StackLineCoordinate = "moduleBody" | "v8Anonymous";

/** V8 `new Function` wraps the body as `function anonymous(...\n) {\n<body>}`. */
export const NEW_FUNCTION_HEADER_LINES = 2;
/** Prepended by `buildModuleLoadBody`. */
export const MODULE_LOAD_STRICT_LINES = 1;

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

export interface ModuleLoadSourceLocation {
	vaultPath: string;
	blockName: string | null;
	line: number;
	column: number;
}

function linesBeforeModuleCode(coordinate: StackLineCoordinate): number {
	if (coordinate === "v8Anonymous") {
		return NEW_FUNCTION_HEADER_LINES + MODULE_LOAD_STRICT_LINES;
	}
	return MODULE_LOAD_STRICT_LINES;
}

/**
 * Maps a reported 1-based line to vault source within `moduleCode`.
 */
export function resolveModuleLoadLocation(
	regions: StackCodeRegion[],
	reportedLine: number,
	column: number,
	coordinate: StackLineCoordinate = "v8Anonymous",
):
	| (ModuleLoadSourceLocation & { region: StackCodeRegion })
	| undefined {
	const bundleLine = reportedLine - linesBeforeModuleCode(coordinate);
	if (bundleLine < 1 || regions.length === 0) return undefined;

	const sorted = [...regions].sort(
		(a, b) => a.codeStartLine - b.codeStartLine,
	);
	const region = findRegion(sorted, bundleLine);
	if (!region) return undefined;

	const sourceLine = bundleLine - region.codeStartLine + 1;
	if (sourceLine < 1) return undefined;

	return {
		region,
		vaultPath: region.vaultPath,
		blockName: region.blockName,
		line: sourceLine,
		column,
	};
}

/**
 * Extracts line/column from a dynamic-function SyntaxError when the engine provides one.
 */
export function parseEvalBodyPosition(
	error: Error,
): { line: number; column: number } | undefined {
	const extended = error as SyntaxError & {
		lineNumber?: number;
		columnNumber?: number;
	};
	if (extended.lineNumber != null && extended.lineNumber > 0) {
		return {
			line: extended.lineNumber,
			column: extended.columnNumber ?? 1,
		};
	}

	const stack = error.stack ?? "";
	const stackLoc = stack.match(/(?:<anonymous>|about:srcdoc):(\d+):(\d+)/);
	if (stackLoc) {
		return {
			line: Number(stackLoc[1]),
			column: Number(stackLoc[2]),
		};
	}

	const msg = error.message;
	const atLine = msg.match(
		/\(\s*at line (\d+)(?:\s*,?\s*column (\d+))?\s*\)/i,
	);
	if (atLine) {
		return {
			line: Number(atLine[1]),
			column: atLine[2] ? Number(atLine[2]) : 1,
		};
	}

	const lineCol = msg.match(/line (\d+)[^\d]*column (\d+)/i);
	if (lineCol) {
		return {
			line: Number(lineCol[1]),
			column: Number(lineCol[2]),
		};
	}

	return undefined;
}

/** Enriches `new Function` SyntaxError with vault path / block when position is known. */
export function enhanceModuleLoadError(
	error: unknown,
	stackRegions?: StackCodeRegion[],
): Error {
	const base = error instanceof Error ? error : new Error(String(error));
	if (!(base instanceof SyntaxError) || !stackRegions?.length) {
		return base;
	}

	const pos = parseEvalBodyPosition(base);
	if (!pos) return base;

	const located = resolveModuleLoadLocation(
		stackRegions,
		pos.line,
		pos.column,
		"v8Anonymous",
	);
	if (!located) return base;

	const where = formatStackLocation(
		located.region,
		located.line,
		located.column,
	);
	const err = new SyntaxError(`${base.message}\n位置: ${where}`);
	err.stack = undefined;
	return err;
}

/**
 * Rewrites V8 `new Function` stack locations (`<anonymous>`, `about:srcdoc`, nested eval)
 * into `vaultPath:block:line:column`, then drops plugin / Vue / host frames.
 */
export function rewriteRuntimeStack(
	stack: string | undefined,
	regions: StackCodeRegion[],
): string | undefined {
	if (!stack || regions.length === 0) return stack;

	const rewritten = stack.replace(/^(\s*at\s.+)$/gm, (frame) => {
		const locMatch = frame.match(
			/(?:<anonymous>|about:srcdoc):(\d+):(\d+)\)?\s*$/,
		);
		if (!locMatch) return frame;

		const stackLine = Number(locMatch[1]);
		const column = Number(locMatch[2]);
		const located = resolveModuleLoadLocation(
			regions,
			stackLine,
			column,
			"v8Anonymous",
		);
		if (!located) return frame;

		const location = formatStackLocation(
			located.region,
			located.line,
			located.column,
		);
		return frame.replace(
			/\((?:eval at .+,\s*)?(?:<anonymous>|about:srcdoc):\d+:\d+\)\s*$/,
			`(${location})`,
		);
	});

	const filtered = filterUserStackFrames(rewritten, regions);
	if (!/^\s*at\s+/m.test(filtered)) return undefined;
	return filtered;
}

/**
 * Keeps the error header and frames that point at vault user code; drops Vue / plugin internals.
 */
export function filterUserStackFrames(
	stack: string,
	regions: StackCodeRegion[],
): string {
	const vaultMarkers = [
		...new Set(regions.map((r) => r.vaultPath).filter(Boolean)),
	];
	const lines = stack.split("\n");
	const kept: string[] = [];

	for (const line of lines) {
		if (!/^\s*at\s+/.test(line)) {
			kept.push(line);
			continue;
		}
		if (isInternalStackFrame(line)) continue;
		if (vaultMarkers.some((path) => line.includes(path))) {
			kept.push(line);
		}
	}

	return kept.join("\n").trimEnd();
}

function isInternalStackFrame(frame: string): boolean {
	return (
		/plugin:reactive-notes-vue/.test(frame) ||
		/node_modules/.test(frame) ||
		/[/\\]@vue[/\\]/.test(frame) ||
		/vue\.runtime/.test(frame) ||
		/runtime-core|runtime-dom/.test(frame) ||
		/callWith(?:Async)?ErrorHandling/.test(frame) ||
		/setupStatefulComponent|setupComponent|mountComponent|processComponent/.test(
			frame,
		) ||
		/\binvoker\b/.test(frame) ||
		/jsdom/.test(frame) ||
		/sandboxRunner|executeModule|mountWithSuspense/.test(frame) ||
		// Unmapped engine frames only (rewritten vault frames use `path:<anonymous>:L:C`).
		/\((?:eval at .+,\s*)?(?:<anonymous>|about:srcdoc):\d+:\d+\)\s*$/.test(
			frame,
		)
	);
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
