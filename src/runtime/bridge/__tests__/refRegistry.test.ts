import { describe, expect, it } from "vitest";
import { createRefRegistry } from "../refRegistry";

describe("createRefRegistry", () => {
	it("stores and resolves refs", () => {
		const refs = createRefRegistry({ staleRefMessage: "stale" });
		const obj = { x: 1 };
		const wire = refs.storeRef(obj);
		expect(wire).toEqual({ __ref: 1 });
		expect(refs.resolveRef(1)).toBe(obj);
	});

	it("decodes nested args with refs and leaves", () => {
		const refs = createRefRegistry({
			staleRefMessage: "stale",
			decodeLeaf: (value) => {
				if (
					typeof value === "object" &&
					value !== null &&
					"__bin" in value
				) {
					return "decoded-bin";
				}
				return undefined;
			},
		});
		const obj = { name: "file" };
		refs.storeRef(obj);
		expect(
			refs.decodeArgs([
				{ __ref: 1 },
				[{ __bin: true }],
				{ nested: { __ref: 1 } },
			]),
		).toEqual([obj, ["decoded-bin"], { nested: obj }]);
	});

	it("throws on stale ref", () => {
		const refs = createRefRegistry({ staleRefMessage: "stale" });
		expect(() => refs.resolveRef(99)).toThrow("stale");
	});
});
