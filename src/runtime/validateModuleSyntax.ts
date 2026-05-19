import { transform } from "sucrase";
import { buildModuleLoadBody } from "./moduleLoadBody";
import {
	formatStackLocation,
	type StackCodeRegion,
	resolveModuleLoadLocation,
} from "./stackTrace";

type SucraseLocatedError = Error & {
	loc?: { line: number; column: number };
};

/**
 * Parses emitted bundle JS before sandbox `new Function`.
 * Sucrase reports line/column in the same body string V8 compiles (including `"use strict"`).
 */
export function validateModuleSyntax(
	moduleCode: string,
	stackRegions: StackCodeRegion[],
): void {
	if (!stackRegions.length) return;

	const body = buildModuleLoadBody(moduleCode);
	try {
		transform(body, { transforms: [] });
	} catch (e) {
		throw formatLocatedSyntaxError(e, stackRegions);
	}
}

function formatLocatedSyntaxError(
	error: unknown,
	stackRegions: StackCodeRegion[],
): SyntaxError {
	const base =
		error instanceof Error ? error : new Error(String(error));
	const located = locateSucraseError(base, stackRegions);
	if (!located) {
		return base instanceof SyntaxError
			? base
			: new SyntaxError(base.message);
	}

	const where = formatStackLocation(
		located.region,
		located.line,
		located.column,
	);
	const err = new SyntaxError(`${base.message}\n位置: ${where}`);
	err.stack = err.stack ?? base.stack;
	return err;
}

function locateSucraseError(
	error: Error,
	stackRegions: StackCodeRegion[],
): ReturnType<typeof resolveModuleLoadLocation> {
	const withLoc = error as SucraseLocatedError;
	if (withLoc.loc) {
		return resolveModuleLoadLocation(
			stackRegions,
			withLoc.loc.line,
			withLoc.loc.column,
		);
	}

	const match = /\((\d+):(\d+)\)\s*$/.exec(error.message);
	if (match) {
		return resolveModuleLoadLocation(
			stackRegions,
			Number(match[1]),
			Number(match[2]),
		);
	}

	return undefined;
}
