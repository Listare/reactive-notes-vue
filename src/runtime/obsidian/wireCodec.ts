import type { ObsidianWireValue } from "./bridgeProtocol";

const REF_KEY = "__ref";

export function isWireRef(
	value: ObsidianWireValue,
): value is { __ref: number } {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		REF_KEY in value &&
		typeof (value as { __ref: number }).__ref === "number"
	);
}

export function encodeWireValue(
	value: unknown,
	encodeRef: (value: object) => ObsidianWireValue,
): ObsidianWireValue {
	if (value === null || value === undefined) {
		return null;
	}
	const t = typeof value;
	if (t === "boolean" || t === "number" || t === "string") {
		return value as boolean | number | string;
	}
	if (t === "bigint" || t === "symbol" || t === "function") {
		throw new Error("Obsidian API 返回值无法传入沙盒。");
	}
	if (Array.isArray(value)) {
		return value.map((item) => encodeWireValue(item, encodeRef));
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === "object") {
		if (value instanceof ArrayBuffer) {
			throw new Error("Obsidian API 返回值无法传入沙盒。");
		}
		return encodeRef(value);
	}
	throw new Error("Obsidian API 返回值无法传入沙盒。");
}

export function encodeWireArgs(
	args: unknown[],
	encodeRef: (value: object) => ObsidianWireValue,
): ObsidianWireValue[] {
	return args.map((arg) => encodeWireValue(arg, encodeRef));
}
