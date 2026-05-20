import type { App } from "obsidian";
import * as Obsidian from "obsidian";
import type {
	ObsidianBridgeInbound,
	ObsidianBridgeOutbound,
	ObsidianProxyTarget,
	ObsidianWireValue,
} from "./bridgeProtocol";
import { encodeWireValue, isWireRef } from "./wireCodec";

function resolvePath(root: unknown, path: string[]): unknown {
	let cur: unknown = root;
	for (const key of path) {
		if (cur == null) {
			return undefined;
		}
		cur = (cur as Record<string, unknown>)[key];
	}
	return cur;
}

/**
 * Handles Obsidian API calls from the sandbox iframe on behalf of user scripts.
 */
export class ObsidianProxyHost {
	private readonly exportsRoot: Record<string, unknown>;
	private readonly refs = new Map<number, object>();
	private nextRef = 1;

	constructor(private readonly app: App) {
		this.exportsRoot = { ...Obsidian };
	}

	dispose(): void {
		this.refs.clear();
	}

	handleMessage(data: ObsidianBridgeInbound): ObsidianBridgeOutbound | null {
		if (data.kind === "obsidian-bridge-release") {
			this.refs.delete(data.ref);
			return null;
		}

		try {
			const value = this.dispatch(
				data.target,
				data.refId,
				data.path,
				data.args,
				data.construct,
			);
			return {
				kind: "obsidian-bridge-result",
				callId: data.callId,
				value: encodeWireValue(value, (obj) => this.storeRef(obj)),
			};
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return {
				kind: "obsidian-bridge-error",
				callId: data.callId,
				message,
			};
		}
	}

	private storeRef(value: object): ObsidianWireValue {
		const id = this.nextRef++;
		this.refs.set(id, value);
		return { __ref: id };
	}

	private decodeArg(value: ObsidianWireValue): unknown {
		if (isWireRef(value)) {
			const obj = this.refs.get(value.__ref);
			if (!obj) {
				throw new Error("Obsidian 对象引用已失效。");
			}
			return obj;
		}
		if (value === null || typeof value !== "object" || Array.isArray(value)) {
			return value;
		}
		const out: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			out[key] = this.decodeArg(child);
		}
		return out;
	}

	private decodeArgs(args: ObsidianWireValue[]): unknown[] {
		return args.map((arg) => this.decodeArg(arg));
	}

	private rootFor(target: ObsidianProxyTarget, refId?: number): unknown {
		if (target === "ref") {
			if (refId == null) {
				throw new Error("缺少 Obsidian 对象引用 id。");
			}
			const obj = this.refs.get(refId);
			if (!obj) {
				throw new Error("Obsidian 对象引用已失效。");
			}
			return obj;
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
		const root = this.rootFor(target, refId);
		const callArgs = this.decodeArgs(args);
		const owner =
			path.length > 0 ? resolvePath(root, path.slice(0, -1)) : root;
		const resolved =
			path.length > 0 ? resolvePath(root, path) : root;

		if (construct) {
			if (typeof resolved !== "function") {
				throw new Error(
					`无法构造 Obsidian API：${target}/${path.join(".")}`,
				);
			}
			return new (resolved as new (...a: unknown[]) => unknown)(...callArgs);
		}

		if (typeof resolved === "function") {
			return (resolved as (...a: unknown[]) => unknown).apply(
				owner,
				callArgs,
			);
		}

		if (callArgs.length === 0) {
			return resolved;
		}

		throw new Error(
			`无法调用 Obsidian API：${target}/${path.join(".")}`,
		);
	}
}
