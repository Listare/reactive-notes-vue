import {
	isNodeBuiltinAllowed,
	nodeBuiltinDeniedMessage,
} from "../../builtin/isNodeBuiltin";
import type {
	NodeBridgeInbound,
	NodeBridgeOutbound,
	NodeProxyTarget,
	NodeWireValue,
} from "./bridgeProtocol";
import { encodeWireValue, isWireRef, isWireUint8Array, decodeWireUint8Array } from "./wireCodec";

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
	private readonly refs = new Map<number, object>();
	private nextRef = 1;
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
			this.refs.delete(data.ref);
			return null;
		}

		try {
			const value = await this.dispatch(
				data.target,
				data.moduleId,
				data.refId,
				data.path,
				data.args,
				data.construct,
			);
			return {
				kind: "node-bridge-result",
				callId: data.callId,
				value: encodeWireValue(value, (obj) => this.storeRef(obj)),
			};
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return {
				kind: "node-bridge-error",
				callId: data.callId,
				message,
			};
		}
	}

	private storeRef(value: object): NodeWireValue {
		const id = this.nextRef++;
		this.refs.set(id, value);
		return { __ref: id };
	}

	private decodeArg(value: NodeWireValue): unknown {
		if (isWireRef(value)) {
			const obj = this.refs.get(value.__ref);
			if (!obj) {
				throw new Error("Node 对象引用已失效。");
			}
			return obj;
		}
		if (isWireUint8Array(value)) {
			return decodeWireUint8Array(value.__nodeUint8Array);
		}
		if (Array.isArray(value)) {
			return value.map((item) => this.decodeArg(item));
		}
		if (value === null || typeof value !== "object") {
			return value;
		}
		const out: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			out[key] = this.decodeArg(child);
		}
		return out;
	}

	private decodeArgs(args: NodeWireValue[]): unknown[] {
		return args.map((arg) => this.decodeArg(arg));
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
			const obj = this.refs.get(refId);
			if (!obj) {
				throw new Error("Node 对象引用已失效。");
			}
			return obj;
		}
		if (!moduleId) {
			throw new Error("缺少 Node 模块 id。");
		}
		return this.loadModule(moduleId);
	}

	private async dispatch(
		target: NodeProxyTarget,
		moduleId: string | undefined,
		refId: number | undefined,
		path: string[],
		args: NodeWireValue[],
		construct: boolean,
	): Promise<unknown> {
		const root = this.rootFor(target, moduleId, refId);
		const callArgs = this.decodeArgs(args);
		const owner =
			path.length > 0 ? resolvePath(root, path.slice(0, -1)) : root;
		const resolved =
			path.length > 0 ? resolvePath(root, path) : root;

		let value: unknown;

		if (construct) {
			if (typeof resolved !== "function") {
				throw new Error(
					`无法构造 Node API：node:${moduleId ?? "?"}/${path.join(".")}`,
				);
			}
			value = new (resolved as new (...a: unknown[]) => unknown)(
				...callArgs,
			);
		} else if (typeof resolved === "function") {
			value = (resolved as (...a: unknown[]) => unknown).apply(
				owner,
				callArgs,
			);
		} else if (callArgs.length === 0) {
			value = resolved;
		} else {
			throw new Error(
				`无法调用 Node API：node:${moduleId ?? "?"}/${path.join(".")}`,
			);
		}

		return awaitPromiseIfNeeded(value);
	}
}

function awaitPromiseIfNeeded(value: unknown): unknown {
	if (
		value != null &&
		(typeof value === "object" || typeof value === "function") &&
		typeof (value as { then?: unknown }).then === "function"
	) {
		return Promise.resolve(value as Promise<unknown>);
	}
	return value;
}
