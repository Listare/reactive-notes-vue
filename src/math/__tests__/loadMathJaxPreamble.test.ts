import { describe, expect, it, vi } from "vitest";
import {
	loadMathJaxPreamble,
	MathJaxPreambleError,
} from "../loadMathJaxPreamble";

function mockApp(options: {
	abstract?: unknown;
	adapterExists?: boolean;
	fileRead?: string;
	adapterRead?: string;
}) {
	return {
		vault: {
			getAbstractFileByPath: vi.fn(() => options.abstract ?? null),
			read: vi.fn(async () => options.fileRead ?? "from-tfile"),
			adapter: {
				exists: vi.fn(async () => options.adapterExists ?? false),
				read: vi.fn(async () => options.adapterRead ?? ""),
			},
		},
	} as never;
}

describe("loadMathJaxPreamble", () => {
	it("returns empty string when path is blank", async () => {
		const app = mockApp({});
		await expect(loadMathJaxPreamble(app, "  ")).resolves.toBe("");
		await expect(loadMathJaxPreamble(app, "")).resolves.toBe("");
	});

	it("reads and trims vault preamble content", async () => {
		const app = mockApp({
			abstract: { path: "mathjax-preamble.sty", extension: "sty" },
			fileRead: String.raw`  \newcommand{\RR}{\mathbb{R}}  `,
		});
		await expect(
			loadMathJaxPreamble(app, "  mathjax-preamble.sty  "),
		).resolves.toBe(String.raw`\newcommand{\RR}{\mathbb{R}}`);
	});

	it("throws MathJaxPreambleError when file is missing", async () => {
		const app = mockApp({ adapterExists: false });
		await expect(
			loadMathJaxPreamble(app, "missing.sty"),
		).rejects.toBeInstanceOf(MathJaxPreambleError);
	});
});
