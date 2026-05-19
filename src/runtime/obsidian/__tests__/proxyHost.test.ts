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
});
