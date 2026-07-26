import { describe, expect, it } from "vitest";
import { createObsidianSandboxModule } from "../proxyClient";
import type { ObsidianBridgeInbound, ObsidianBridgeOutbound } from "../bridgeProtocol";

function createMockPort(
	handler: (msg: ObsidianBridgeInbound) => ObsidianBridgeOutbound,
): MessagePort {
	const listeners: Array<(event: MessageEvent) => void> = [];
	return {
		postMessage(data: ObsidianBridgeInbound) {
			const reply = handler(data);
			queueMicrotask(() => {
				for (const listener of listeners) {
					listener({ data: reply } as MessageEvent);
				}
			});
		},
		addEventListener(_type: string, listener: (event: MessageEvent) => void) {
			listeners.push(listener);
		},
		removeEventListener() {},
		start() {},
		close() {},
	} as unknown as MessagePort;
}

describe("createObsidianSandboxModule", () => {
	it("does not treat root ref proxies as thenables", async () => {
		let refCounter = 0;
		const port = createMockPort((msg) => {
			if (msg.kind !== "obsidian-bridge-call") {
				throw new Error("unexpected message");
			}
			if (
				msg.target === "app" &&
				msg.path.join(".") === "workspace.getActiveFile"
			) {
				refCounter += 1;
				return {
					kind: "obsidian-bridge-result",
					callId: msg.callId,
					value: { __ref: refCounter },
				};
			}
			if (
				msg.target === "ref" &&
				msg.refId === 1 &&
				msg.path.join(".") === "path"
			) {
				return {
					kind: "obsidian-bridge-result",
					callId: msg.callId,
					value: "notes/demo.md",
				};
			}
			throw new Error(`unexpected call: ${msg.target}/${msg.path.join(".")}`);
		});

		const obsidian = createObsidianSandboxModule(port);
		const app = obsidian.default as {
			workspace: { getActiveFile: () => Promise<unknown> };
		};

		const file = await app.workspace.getActiveFile();
		expect(file).toBeTruthy();
		expect(refCounter).toBe(1);

		const path = await (file as { path: Promise<string> }).path;
		expect(path).toBe("notes/demo.md");
	});

	it("decodes array refs so files can be passed back to Obsidian APIs", async () => {
		const filesByRef = new Map<number, { path: string }>([
			[1, { path: "a.md" }],
			[2, { path: "b.md" }],
		]);
		const port = createMockPort((msg) => {
			if (msg.kind !== "obsidian-bridge-call") {
				throw new Error("unexpected message");
			}
			if (
				msg.target === "app" &&
				msg.path.join(".") === "vault.getMarkdownFiles"
			) {
				return {
					kind: "obsidian-bridge-result",
					callId: msg.callId,
					value: [{ __ref: 1 }, { __ref: 2 }],
				};
			}
			if (
				msg.target === "app" &&
				msg.path.join(".") === "metadataCache.getFileCache"
			) {
				const arg = msg.args[0];
				expect(arg).toEqual({ __ref: 1 });
				return {
					kind: "obsidian-bridge-result",
					callId: msg.callId,
					value: { frontmatter: { filename: "a" } },
				};
			}
			if (
				msg.target === "ref" &&
				msg.path.join(".") === "path" &&
				msg.refId != null
			) {
				const file = filesByRef.get(msg.refId);
				return {
					kind: "obsidian-bridge-result",
					callId: msg.callId,
					value: file?.path ?? null,
				};
			}
			throw new Error(`unexpected call: ${msg.target}/${msg.path.join(".")}`);
		});

		const obsidian = createObsidianSandboxModule(port);
		const app = obsidian.default as {
			vault: { getMarkdownFiles: () => Promise<unknown[]> };
			metadataCache: {
				getFileCache: (file: unknown) => Promise<unknown>;
			};
		};

		const files = await app.vault.getMarkdownFiles();
		expect(files).toHaveLength(2);
		expect(await (files[0] as { path: Promise<string> }).path).toBe("a.md");

		const cache = await app.metadataCache.getFileCache(files[0]);
		expect(cache).toEqual({ frontmatter: { filename: "a" } });
	});
});
