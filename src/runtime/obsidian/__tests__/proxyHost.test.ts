import { describe, expect, it } from "vitest";
import { ObsidianProxyHost } from "../proxyHost";

describe("ObsidianProxyHost", () => {
	it("calls vault methods with correct this binding", () => {
		const app = {
			vault: {
				getName() {
					return "test-vault";
				},
			},
			workspace: {
				getActiveFile() {
					return { path: "notes/demo.md" };
				},
			},
		};

		const host = new ObsidianProxyHost(app as never);

		const nameResult = host.handleMessage({
			kind: "obsidian-bridge-call",
			callId: 1,
			target: "app",
			path: ["vault", "getName"],
			args: [],
			construct: false,
		});
		expect(nameResult).toEqual({
			kind: "obsidian-bridge-result",
			callId: 1,
			value: "test-vault",
		});

		const fileResult = host.handleMessage({
			kind: "obsidian-bridge-call",
			callId: 2,
			target: "app",
			path: ["workspace", "getActiveFile"],
			args: [],
			construct: false,
		});
		expect(fileResult?.kind).toBe("obsidian-bridge-result");
		if (fileResult?.kind !== "obsidian-bridge-result") return;

		const ref = fileResult.value;
		expect(ref).toEqual({ __ref: 1 });

		const pathResult = host.handleMessage({
			kind: "obsidian-bridge-call",
			callId: 3,
			target: "ref",
			refId: 1,
			path: ["path"],
			args: [],
			construct: false,
		});
		expect(pathResult).toEqual({
			kind: "obsidian-bridge-result",
			callId: 3,
			value: "notes/demo.md",
		});
	});

	it("returns array of refs and accepts a ref arg on a later call", () => {
		const fileA = { path: "a.md" };
		const fileB = { path: "b.md" };
		const seenArgs: unknown[] = [];
		const app = {
			vault: {
				getMarkdownFiles() {
					return [fileA, fileB];
				},
			},
			metadataCache: {
				getFileCache(file: unknown) {
					seenArgs.push(file);
					return file === fileA ? { frontmatter: { filename: "a" } } : null;
				},
			},
		};

		const host = new ObsidianProxyHost(app as never);

		const listResult = host.handleMessage({
			kind: "obsidian-bridge-call",
			callId: 1,
			target: "app",
			path: ["vault", "getMarkdownFiles"],
			args: [],
			construct: false,
		});
		expect(listResult).toEqual({
			kind: "obsidian-bridge-result",
			callId: 1,
			value: [{ __ref: 1 }, { __ref: 2 }],
		});

		const cacheResult = host.handleMessage({
			kind: "obsidian-bridge-call",
			callId: 2,
			target: "app",
			path: ["metadataCache", "getFileCache"],
			args: [{ __ref: 1 }],
			construct: false,
		});
		expect(seenArgs[0]).toBe(fileA);
		expect(cacheResult).toEqual({
			kind: "obsidian-bridge-result",
			callId: 2,
			value: { __ref: 3 },
		});
	});

	it("decodes refs nested inside array arguments", () => {
		const fileA = { path: "a.md" };
		const seenArgs: unknown[] = [];
		const host = new ObsidianProxyHost({
			vault: {
				getMarkdownFiles() {
					return [fileA];
				},
			},
			workspace: {
				openFiles(files: unknown[]) {
					seenArgs.push(files);
					return files.length;
				},
			},
		} as never);

		host.handleMessage({
			kind: "obsidian-bridge-call",
			callId: 1,
			target: "app",
			path: ["vault", "getMarkdownFiles"],
			args: [],
			construct: false,
		});

		const result = host.handleMessage({
			kind: "obsidian-bridge-call",
			callId: 2,
			target: "app",
			path: ["workspace", "openFiles"],
			args: [[{ __ref: 1 }]],
			construct: false,
		});
		expect(seenArgs[0]).toEqual([fileA]);
		expect(result).toEqual({
			kind: "obsidian-bridge-result",
			callId: 2,
			value: 1,
		});
	});
});
