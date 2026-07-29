import { SourceMapConsumer, type RawSourceMap } from "source-map-js";
import { countLines } from "../runtime/stackTrace";

/**
 * Builds a 1-based sparse map: generatedLine → originalLine.
 * Only lines with source-map entries are filled.
 */
export function lineMapFromSourceMap(
	rawMap: RawSourceMap,
	generatedLineCount: number,
): number[] {
	const consumer = new SourceMapConsumer(rawMap);
	const map: number[] = [];
	for (let line = 1; line <= generatedLineCount; line++) {
		const original = originalLineForGenerated(consumer, line);
		if (original != null) map[line] = original;
	}
	return map;
}

function originalLineForGenerated(
	consumer: SourceMapConsumer,
	line: number,
): number | undefined {
	for (const column of [0, 1, 2, 4, 8, 16, 32, 64]) {
		const pos = consumer.originalPositionFor({ line, column });
		if (pos.line != null && pos.line > 0) return pos.line;
	}
	return undefined;
}

/** Shifts a 1-based line map down by `prepended` emitted lines. */
export function shiftLineMapDown(
	map: number[] | undefined,
	prepended: number,
): number[] | undefined {
	if (!map || prepended === 0) return map;
	const next: number[] = [];
	for (let i = 1; i < map.length; i++) {
		const original = map[i];
		if (original != null) next[i + prepended] = original;
	}
	return next;
}

/**
 * Places a script line map after `preambleLineCount` lines in the assembled module.
 */
export function placeLineMapAfterPreamble(
	scriptLineMap: number[],
	preambleLineCount: number,
	totalEmittedLines: number,
): number[] {
	const next: number[] = [];
	for (let scriptLine = 1; scriptLine < scriptLineMap.length; scriptLine++) {
		const original = scriptLineMap[scriptLine];
		if (original == null) continue;
		const emitted = preambleLineCount + scriptLine;
		if (emitted >= 1 && emitted <= totalEmittedLines) {
			next[emitted] = original;
		}
	}
	return next;
}

export function countCodeLines(code: string): number {
	return countLines(code);
}
