import { describe, expect, it } from "vitest";
import {
	encodeWireValue,
	encodeWireArgs,
	isWireUint8Array,
	decodeWireUint8Array,
} from "../wireCodec";

describe("node wireCodec", () => {
	it("inlines Uint8Array as base64", () => {
		const bytes = new Uint8Array([104, 105]);
		const encoded = encodeWireValue(bytes, () => {
			throw new Error("should not ref");
		});
		expect(isWireUint8Array(encoded)).toBe(true);
		if (isWireUint8Array(encoded)) {
			expect(decodeWireUint8Array(encoded.__nodeUint8Array)).toEqual(
				bytes,
			);
		}
	});

	it("inlines Node Buffer-like objects", () => {
		const buf = Buffer.from("hello");
		const encoded = encodeWireValue(buf, () => {
			throw new Error("should not ref");
		});
		expect(isWireUint8Array(encoded)).toBe(true);
		if (isWireUint8Array(encoded)) {
			expect(
				Buffer.from(
					decodeWireUint8Array(encoded.__nodeUint8Array),
				).toString("utf8"),
			).toBe("hello");
		}
	});

	it("rejects Promise args with a clear error", () => {
		expect(() =>
			encodeWireArgs([Promise.resolve(1)], () => ({ __ref: 1 })),
		).toThrow(/请先 await/);
	});
});
