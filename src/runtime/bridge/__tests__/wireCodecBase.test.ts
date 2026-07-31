import { describe, expect, it } from "vitest";
import { encodeWireValueBase, isWireRefObject } from "../wireCodecBase";

describe("isWireRefObject", () => {
	it("accepts only plain { __ref: number }", () => {
		expect(isWireRefObject({ __ref: 1 })).toBe(true);
		expect(isWireRefObject({ __ref: "1" })).toBe(false);
		expect(isWireRefObject([{ __ref: 1 }])).toBe(false);
		expect(isWireRefObject(null)).toBe(false);
	});
});

describe("encodeWireValueBase", () => {
	const encodeRef = (value: object) => ({ __ref: 1, tag: value });

	it("encodes primitives, arrays, and dates", () => {
		expect(
			encodeWireValueBase(null, {
				encodeRef,
				unsupportedMessage: "nope",
			}),
		).toBeNull();
		expect(
			encodeWireValueBase([1, "a"], {
				encodeRef,
				unsupportedMessage: "nope",
			}),
		).toEqual([1, "a"]);
		expect(
			encodeWireValueBase(new Date("2020-01-01T00:00:00.000Z"), {
				encodeRef,
				unsupportedMessage: "nope",
			}),
		).toBe("2020-01-01T00:00:00.000Z");
	});

	it("uses encodeSpecialObject before encodeRef", () => {
		const encoded = encodeWireValueBase<{ special: boolean } | ReturnType<typeof encodeRef>>(
			new ArrayBuffer(2),
			{
				encodeRef,
				unsupportedMessage: "nope",
				encodeSpecialObject: () => ({ special: true }),
			},
		);
		expect(encoded).toEqual({ special: true });
	});

	it("rejects bigint", () => {
		expect(() =>
			encodeWireValueBase(1n, {
				encodeRef,
				unsupportedMessage: "unsupported",
			}),
		).toThrow("unsupported");
	});
});
