import { describe, expect, it } from "vitest";
import {
	normalizePiniaVaultPersist,
	DEFAULT_PERSIST_DEBOUNCE_MS,
} from "../persistTypes";

describe("normalizePiniaVaultPersist", () => {
	it("accepts string paths", () => {
		expect(normalizePiniaVaultPersist("./a.json")).toEqual({
			pathSpecifier: "./a.json",
			debounceMs: DEFAULT_PERSIST_DEBOUNCE_MS,
		});
	});

	it("accepts object form", () => {
		expect(
			normalizePiniaVaultPersist({ path: "@/x.json", debounceMs: 10 }),
		).toEqual({ pathSpecifier: "@/x.json", debounceMs: 10 });
	});

	it("rejects empty", () => {
		expect(normalizePiniaVaultPersist("")).toBeNull();
		expect(normalizePiniaVaultPersist(false)).toBeNull();
		expect(normalizePiniaVaultPersist({ path: "" })).toBeNull();
	});
});
