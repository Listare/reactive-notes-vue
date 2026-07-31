import type { App } from "obsidian";
import * as Obsidian from "obsidian";
import { dispatchProxyCall } from "../bridge/dispatchInvocation";
import { handleBridgeCallSync } from "../bridge/proxyHostCore";
import { createRefRegistry } from "../bridge/refRegistry";
import type {
	ObsidianBridgeInbound,
	ObsidianBridgeOutbound,
	ObsidianProxyTarget,
	ObsidianWireValue,
} from "./bridgeProtocol";
import { encodeWireValue } from "./wireCodec";

/**
 * Handles Obsidian API calls from the sandbox iframe on behalf of user scripts.
 */
export class ObsidianProxyHost {
	private readonly exportsRoot: Record<string, unknown>;
	private readonly refs = createRefRegistry({
		staleRefMessage: "Obsidian 对象引用已失效。",
	});

	constructor(private readonly app: App) {
		this.exportsRoot = { ...Obsidian };
	}

	dispose(): void {
		this.refs.clear();
	}

	handleMessage(data: ObsidianBridgeInbound): ObsidianBridgeOutbound | null {
		if (data.kind === "obsidian-bridge-release") {
			this.refs.releaseRef(data.ref);
			return null;
		}

		return handleBridgeCallSync({
			callId: data.callId,
			run: () =>
				this.dispatch(
					data.target,
					data.refId,
					data.path,
					data.args,
					data.construct,
				),
			encodeValue: (value) =>
				encodeWireValue(value, (obj) => this.refs.storeRef(obj)),
			buildResult: (callId, value) => ({
				kind: "obsidian-bridge-result",
				callId,
				value: value as ObsidianWireValue,
			}),
			buildError: (callId, message) => ({
				kind: "obsidian-bridge-error",
				callId,
				message,
			}),
		});
	}

	private rootFor(target: ObsidianProxyTarget, refId?: number): unknown {
		if (target === "ref") {
			if (refId == null) {
				throw new Error("缺少 Obsidian 对象引用 id。");
			}
			return this.refs.resolveRef(refId);
		}
		return target === "app" ? this.app : this.exportsRoot;
	}

	private dispatch(
		target: ObsidianProxyTarget,
		refId: number | undefined,
		path: string[],
		args: ObsidianWireValue[],
		construct: boolean,
	): unknown {
		return dispatchProxyCall({
			root: this.rootFor(target, refId),
			path,
			args: this.refs.decodeArgs(args),
			construct,
			formatConstructError: (pathLabel) =>
				`无法构造 Obsidian API：${target}/${pathLabel}`,
			formatCallError: (pathLabel) =>
				`无法调用 Obsidian API：${target}/${pathLabel}`,
		});
	}
}
