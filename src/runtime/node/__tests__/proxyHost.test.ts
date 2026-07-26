import { createRequire } from "node:module";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { NodeProxyHost } from "../proxyHost";
import type { NodeBridgeInbound } from "../bridgeProtocol";

const nodeRequire = createRequire(import.meta.url);

beforeAll(() => {
	vi.stubGlobal("require", nodeRequire);
});

describe("NodeProxyHost", () => {
	it("allows safe modules and returns path.join result", async () => {
		const host = new NodeProxyHost(false);
		const result = await host.handleMessage({
			kind: "node-bridge-call",
			callId: 1,
			target: "module",
			moduleId: "path",
			path: ["join"],
			args: ["a", "b"],
			construct: false,
		});
		expect(result).toEqual({
			kind: "node-bridge-result",
			callId: 1,
			value: expect.stringMatching(/a[/\\]b/),
		});
	});

	it("rejects extended modules when disabled", async () => {
		const host = new NodeProxyHost(false);
		const result = await host.handleMessage({
			kind: "node-bridge-call",
			callId: 2,
			target: "module",
			moduleId: "fs",
			path: [],
			args: [],
			construct: false,
		});
		expect(result).toEqual({
			kind: "node-bridge-error",
			callId: 2,
			message: expect.stringContaining("允许扩展 Node 内置模块"),
		});
	});

	it("allows extended modules when enabled", async () => {
		const host = new NodeProxyHost(false);
		host.setAllowExtended(true);
		const result = await host.handleMessage({
			kind: "node-bridge-call",
			callId: 3,
			target: "module",
			moduleId: "fs",
			path: [],
			args: [],
			construct: false,
		} satisfies NodeBridgeInbound);
		expect(result?.kind).toBe("node-bridge-result");
		if (result?.kind === "node-bridge-result") {
			expect(result.value).toEqual({ __ref: expect.any(Number) });
		}
	});

	it("awaits promise results from fs/promises", async () => {
		const host = new NodeProxyHost(true);
		const { writeFileSync, unlinkSync } = await import("node:fs");
		const { join } = await import("node:path");
		const { tmpdir } = await import("node:os");
		const file = join(tmpdir(), `rnv-node-bridge-${Date.now()}.txt`);
		writeFileSync(file, "hello-bridge", "utf8");
		try {
			const result = await host.handleMessage({
				kind: "node-bridge-call",
				callId: 4,
				target: "module",
				moduleId: "fs/promises",
				path: ["readFile"],
				args: [file, "utf8"],
				construct: false,
			});
			expect(result).toEqual({
				kind: "node-bridge-result",
				callId: 4,
				value: "hello-bridge",
			});
		} finally {
			unlinkSync(file);
		}
	});

	it("releases refs", async () => {
		const host = new NodeProxyHost(true);
		const load = await host.handleMessage({
			kind: "node-bridge-call",
			callId: 1,
			target: "module",
			moduleId: "fs",
			path: [],
			args: [],
			construct: false,
		});
		expect(load?.kind).toBe("node-bridge-result");
		if (load?.kind !== "node-bridge-result") return;
		const ref = (load.value as { __ref: number }).__ref;
		expect(
			await host.handleMessage({ kind: "node-bridge-release", ref }),
		).toBeNull();
	});
});
