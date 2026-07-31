import { describe, expect, it } from "vitest";
import { SandboxAbortedError, isSandboxAbortedError } from "../sandboxAbort";

describe("sandbox abort", () => {
	it("detects SandboxAbortedError", () => {
		expect(isSandboxAbortedError(new SandboxAbortedError())).toBe(true);
		expect(isSandboxAbortedError(new Error("沙盒渲染超时。"))).toBe(false);
	});

	it("unmount reject path uses SandboxAbortedError name", () => {
		const err = new SandboxAbortedError();
		expect(err.name).toBe("SandboxAbortedError");
		expect(err.message).toBe("sandbox aborted");
	});
});

/**
 * Mirrors SandboxFrame postRender cancel semantics: unmount must settle an
 * in-flight render with SandboxAbortedError instead of leaving it until timeout.
 */
describe("in-flight render cancel contract", () => {
	it("rejects the pending render when cancel is invoked", async () => {
		let cancel: (() => void) | null = null;
		const pending = new Promise<void>((_resolve, reject) => {
			let settled = false;
			const timeout = setTimeout(() => {
				if (settled) return;
				settled = true;
				cancel = null;
				reject(new Error("沙盒渲染超时。"));
			}, 30_000);
			cancel = () => {
				if (settled) return;
				settled = true;
				clearTimeout(timeout);
				cancel = null;
				reject(new SandboxAbortedError());
			};
		});

		queueMicrotask(() => cancel?.());

		await expect(pending).rejects.toBeInstanceOf(SandboxAbortedError);
	});
});
