import { describe, expect, it } from "vitest";
import {
	findVisibleBlockIndex,
	isRenderEpochStale,
	resolveVisibleBlockSource,
	shouldBackoffOnSandboxTimeout,
} from "../vueBlockSourceResolve";

describe("resolveVisibleBlockSource", () => {
	const blocks = [
		{ content: "one", hide: false },
		{ content: "two", hide: false },
	];

	it("uses stored index when valid", () => {
		expect(resolveVisibleBlockSource("stale", 1, blocks)).toBe("two");
	});

	it("falls back to content match", () => {
		expect(resolveVisibleBlockSource("one", -1, blocks)).toBe("one");
		expect(resolveVisibleBlockSource("missing", -1, blocks)).toBeNull();
	});
});

describe("findVisibleBlockIndex", () => {
	const md = `
\`\`\`vue-interactive
first
\`\`\`

\`\`\`vue-interactive
second
\`\`\`
`;

	it("returns matching visible index", () => {
		expect(findVisibleBlockIndex("second", md)).toBe(1);
		expect(findVisibleBlockIndex("nope", md)).toBe(-1);
	});
});

describe("sandbox timeout / epoch helpers", () => {
	it("detects timeout messages and stale epochs", () => {
		expect(shouldBackoffOnSandboxTimeout("沙盒初始化超时。")).toBe(true);
		expect(shouldBackoffOnSandboxTimeout("compile failed")).toBe(false);
		expect(isRenderEpochStale(1, 2)).toBe(true);
		expect(isRenderEpochStale(3, 3)).toBe(false);
	});
});
