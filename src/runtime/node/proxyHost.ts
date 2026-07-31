import {
	isNodeBuiltinAllowed,
	nodeBuiltinDeniedMessage,
} from "../../builtin/isNodeBuiltin";
import { dispatchProxyCall } from "../bridge/dispatchInvocation";
import { handleBridgeCallAsync } from "../bridge/proxyHostCore";
import { createRefRegistry } from "../bridge/refRegistry";
import type {
	NodeBridgeInbound,
	NodeBridgeOutbound,
	NodeProxyTarget,
	NodeWireValue,
} from "./bridgeProtocol";
import {
	decodeWireUint8Array,
	encodeWireValue,
	isWireUint8Array,
} from "./wireCodec";

type NodeRequireFn = (id: string) => unknown;

function resolveNodeRequire(): NodeRequireFn {
	const g = globalThis as unknown as {
		require?: NodeRequireFn;
	};
	if (typeof g.require === "function") {
		return g.require;
	}
	throw new Error("当前环境无法加载 Node 内置模块（需要桌面端 Obsidian）。");
}

function isRealNodeBuiltin(id: string): boolean {
	try {
		const req = resolveNodeRequire();
		const Module = req("module") as {
			isBuiltin?: (name: string) => boolean;
		};
		if (typeof Module.isBuiltin === "function") {
			return (
				Module.isBuiltin(id) || Module.isBuiltin(`node:${id}`)
			);
		}
	} catch {
		/* fall through — try require below */
	}
	return true;
}

/**
 * Handles Node builtin calls from the sandbox iframe on behalf of user scripts.
 */
export class NodeProxyHost {
	private readonly modules = new Map<string, unknown>();
	private readonly refs = createRefRegistry({
		staleRefMessage: "Node 对象引用已失效。",
		decodeLeaf: (value) => {
			if (isWireUint8Array(value as NodeWireValue)) {
				return decodeWireUint8Array(
					(value as { __nodeUint8Array: string }).__nodeUint8Array,
				);
			}
			return undefined;
		},
	});
	private enableExtended: boolean;

	constructor(enableExtended = false) {
		this.enableExtended = enableExtended;
	}

	setAllowExtended(enableExtended: boolean): void {
		this.enableExtended = enableExtended;
	}

	dispose(): void {
		this.refs.clear();
		this.modules.clear();
	}

	async handleMessage(
		data: NodeBridgeInbound,
	): Promise<NodeBridgeOutbound | null> {
		if (data.kind === "node-bridge-release") {
			this.refs.releaseRef(data.ref);
			return null;
		}

		return handleBridgeCallAsync({
			callId: data.callId,
			run: () =>
				this.dispatch(
					data.target,
					data.moduleId,
					data.refId,
					data.path,
					data.args,
					data.construct,
				),
			encodeValue: (value) =>
				encodeWireValue(value, (obj) => this.refs.storeRef(obj)),
			buildResult: (callId, value) => ({
				kind: "node-bridge-result",
				callId,
				value: value as NodeWireValue,
			}),
			buildError: (callId, message) => ({
				kind: "node-bridge-error",
				callId,
				message,
			}),
		});
	}

	private loadModule(moduleId: string): unknown {
		if (!isNodeBuiltinAllowed(moduleId, this.enableExtended)) {
			throw new Error(nodeBuiltinDeniedMessage(moduleId));
		}
		if (!isRealNodeBuiltin(moduleId)) {
			throw new Error(`不是 Node 内置模块: "node:${moduleId}"`);
		}
		const cached = this.modules.get(moduleId);
		if (cached !== undefined) {
			return cached;
		}
		const req = resolveNodeRequire();
		const mod = req(`node:${moduleId}`);
		this.modules.set(moduleId, mod);
		return mod;
	}

	private rootFor(
		target: NodeProxyTarget,
		moduleId: string | undefined,
		refId?: number,
	): unknown {
		if (target === "ref") {
			if (refId == null) {
				throw new Error("缺少 Node 对象引用 id。");
			}
			return this.refs.resolveRef(refId);
		}
		if (!moduleId) {
			throw new Error("缺少 Node 模块 id。");
		}
		return this.loadModule(moduleId);
	}

	private dispatch(
		target: NodeProxyTarget,
		moduleId: string | undefined,
		refId: number | undefined,
		path: string[],
		args: NodeWireValue[],
		construct: boolean,
	): unknown {
		return dispatchProxyCall({
			root: this.rootFor(target, moduleId, refId),
			path,
			args: this.refs.decodeArgs(args),
			construct,
			awaitPromises: true,
			formatConstructError: (pathLabel) =>
				`无法构造 Node API：node:${moduleId ?? "?"}/${pathLabel}`,
			formatCallError: (pathLabel) =>
				`无法调用 Node API：node:${moduleId ?? "?"}/${pathLabel}`,
		});
	}
}
