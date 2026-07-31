import { describe, expect, it } from "vitest";
import {
	DEFAULT_DISK_CACHE_PATH,
	normalizeDiskCachePath,
} from "../normalizeDiskCachePath";

describe("normalizeDiskCachePath", () => {
	it("returns default for empty input", () => {
		expect(normalizeDiskCachePath("")).toBe(DEFAULT_DISK_CACHE_PATH);
		expect(normalizeDiskCachePath("   ")).toBe(DEFAULT_DISK_CACHE_PATH);
	});

	it("trims trailing slashes and normalizes", () => {
		expect(normalizeDiskCachePath(" .cache/ ")).toBe(".cache");
		expect(normalizeDiskCachePath("foo\\bar")).toBe("foo/bar");
	});
});
