import { encodeWireValueBase, isWireRefObject } from "../bridge/wireCodecBase";
import type { ObsidianWireValue } from "./bridgeProtocol";

export function isWireRef(
	value: ObsidianWireValue,
): value is { __ref: number } {
	return isWireRefObject(value);
}

export function encodeWireValue(
	value: unknown,
	encodeRef: (value: object) => ObsidianWireValue,
): ObsidianWireValue {
	return encodeWireValueBase<ObsidianWireValue>(value, {
		encodeRef,
		unsupportedMessage: "Obsidian API 返回值无法传入沙盒。",
		encodeSpecialObject(obj) {
			if (obj instanceof ArrayBuffer) {
				throw new Error("Obsidian API 返回值无法传入沙盒。");
			}
			return undefined;
		},
	});
}

export function encodeWireArgs(
	args: unknown[],
	encodeRef: (value: object) => ObsidianWireValue,
): ObsidianWireValue[] {
	return args.map((arg) => encodeWireValue(arg, encodeRef));
}
