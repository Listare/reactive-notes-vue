import { describe, expect, it } from "vitest";
import { resolvePropertyPath } from "../resolvePath";

describe("resolvePropertyPath", () => {
	it("walks nested keys", () => {
		const root = { a: { b: { c: 1 } } };
		expect(resolvePropertyPath(root, ["a", "b", "c"])).toBe(1);
		expect(resolvePropertyPath(root, ["a", "b"])).toEqual({ c: 1 });
	});

	it("returns undefined on nullish intermediate", () => {
		expect(resolvePropertyPath({ a: null }, ["a", "b"])).toBeUndefined();
		expect(resolvePropertyPath(undefined, ["a"])).toBeUndefined();
	});

	it("returns root for empty path", () => {
		const root = { x: 1 };
		expect(resolvePropertyPath(root, [])).toBe(root);
	});
});
