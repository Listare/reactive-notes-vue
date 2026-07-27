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
		expect(result?.kind).toBe("node-bridge-result");
		if (result?.kind === "node-bridge-result") {
			expect(result.callId).toBe(1);
			expect(result.value).toMatch(/a[/\\]b/);
		}
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
		expect(result?.kind).toBe("node-bridge-error");
		if (result?.kind === "node-bridge-error") {
			expect(result.callId).toBe(2);
			expect(result.message).toContain("允许扩展 Node 内置模块");
		}
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
			expect(result.value).toEqual(
				expect.objectContaining({ __ref: expect.any(Number) as number }),
			);
		}
	});

	it("awaits promise results from fs/promises", async () => {
		const host = new NodeProxyHost(true);
		const fs = await import("node:fs");
		const path = await import("node:path");
		const os = await import("node:os");
		const file = path.join(os.tmpdir(), `rnv-node-bridge-${Date.now()}.txt`);
		fs.writeFileSync(file, "hello-bridge", "utf8");
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
			fs.unlinkSync(file);
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
