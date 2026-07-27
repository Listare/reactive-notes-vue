import type { NodeWireValue } from "./bridgeProtocol";

const REF_KEY = "__ref";
const U8_KEY = "__nodeUint8Array";

export function isWireRef(
	value: NodeWireValue,
): value is { __ref: number } {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		REF_KEY in value &&
		typeof (value as { __ref: number }).__ref === "number"
	);
}

export function isWireUint8Array(
	value: NodeWireValue,
): value is { __nodeUint8Array: string } {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		U8_KEY in value &&
		typeof (value as { __nodeUint8Array: string }).__nodeUint8Array ===
			"string"
	);
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(
			...bytes.subarray(i, Math.min(i + chunk, bytes.length)),
		);
	}
	return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		out[i] = binary.charCodeAt(i);
	}
	return out;
}

function isBinaryBytes(value: object): value is Uint8Array | ArrayBufferView {
	if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
		return true;
	}
	const ctorName = (value as { constructor?: { name?: string } }).constructor
		?.name;
	return ctorName === "Buffer";
}

function toUint8Array(value: object): Uint8Array {
	if (value instanceof Uint8Array) return value;
	if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
		return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
	}
	return Uint8Array.from(value as ArrayLike<number>);
}

/**
 * Encode a value crossing the Node bridge. Buffers/Uint8Arrays are inlined as
 * base64 so the sandbox can use them as real byte arrays (not opaque refs).
 */
export function encodeWireValue(
	value: unknown,
	encodeRef: (value: object) => NodeWireValue,
): NodeWireValue {
	if (value === null || value === undefined) {
		return null;
	}
	const t = typeof value;
	if (t === "boolean" || t === "number" || t === "string") {
		return value as boolean | number | string;
	}
	if (t === "bigint" || t === "symbol") {
		throw new Error("Node API 返回值无法传入沙盒。");
	}
	if (t === "function") {
		return encodeRef(value as object);
	}
	if (Array.isArray(value)) {
		return value.map((item) => encodeWireValue(item, encodeRef));
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === "object") {
		if (value instanceof ArrayBuffer) {
			return {
				__nodeUint8Array: bytesToBase64(new Uint8Array(value)),
			};
		}
		if (isBinaryBytes(value)) {
			return { __nodeUint8Array: bytesToBase64(toUint8Array(value)) };
		}
		return encodeRef(value);
	}
	throw new Error("Node API 返回值无法传入沙盒。");
}

export function encodeWireArgs(
	args: unknown[],
	encodeRef: (value: object) => NodeWireValue,
): NodeWireValue[] {
	return args.map((arg) => {
		if (typeof arg === "object" && arg !== null && isThenable(arg)) {
			throw new Error(
				"不能将 Promise 传给 Node API，请先 await 再传入（所有 Node 调用经桥接后都是异步的）。",
			);
		}
		return encodeWireValue(arg, encodeRef);
	});
}

export function decodeWireUint8Array(base64: string): Uint8Array {
	return base64ToBytes(base64);
}

function isThenable(value: object): boolean {
	return typeof (value as { then?: unknown }).then === "function";
}
