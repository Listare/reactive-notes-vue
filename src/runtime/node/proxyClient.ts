import type {
	NodeBridgeInbound,
	NodeBridgeOutbound,
	NodeProxyTarget,
	NodeWireValue,
} from "./bridgeProtocol";
import {
	decodeWireUint8Array,
	encodeWireArgs,
	isWireRef,
	isWireUint8Array,
} from "./wireCodec";

/** Sandbox `__node__` map: `__node__["path"]` → module proxy (`.default` = self). */
export type NodeSandboxModules = Record<string, unknown>;

const REF_ID = Symbol("nodeProxyRef");

type PendingCall = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
};

function isBridgeOutbound(data: unknown): data is NodeBridgeOutbound {
	return (
		typeof data === "object" &&
		data !== null &&
		"kind" in data &&
		((data as NodeBridgeOutbound).kind === "node-bridge-result" ||
			(data as NodeBridgeOutbound).kind === "node-bridge-error")
	);
}

function readRefId(value: unknown): number | undefined {
	if (typeof value !== "function" && typeof value !== "object") {
		return undefined;
	}
	if (value == null) return undefined;
	const id = (value as Record<symbol, unknown>)[REF_ID];
	return typeof id === "number" ? id : undefined;
}

/**
 * Builds the `__node__` map for sandbox scripts (`import … from 'node:path'`).
 */
export function createNodeSandboxModules(
	port: MessagePort,
): NodeSandboxModules {
	let callId = 0;
	const pending = new Map<number, PendingCall>();
	const moduleCache = new Map<string, unknown>();

	const send = (message: NodeBridgeInbound): void => {
		port.postMessage(message);
	};

	port.addEventListener("message", (event: MessageEvent) => {
		const data: unknown = event.data;
		if (!isBridgeOutbound(data)) return;
		const entry = pending.get(data.callId);
		if (!entry) return;
		pending.delete(data.callId);
		if (data.kind === "node-bridge-error") {
			entry.reject(new Error(data.message));
			return;
		}
		entry.resolve(decodeValue(data.value));
	});

	const encodeRef = (obj: object): NodeWireValue => {
		const refId = readRefId(obj);
		if (refId == null) {
			if (typeof (obj as { then?: unknown }).then === "function") {
				throw new Error(
					"不能将 Promise 传给 Node API，请先 await 再传入（所有 Node 调用经桥接后都是异步的）。",
				);
			}
			throw new Error("无法将沙盒对象传回 Node API。");
		}
		return { __ref: refId };
	};

	const call = (
		target: NodeProxyTarget,
		moduleId: string | undefined,
		refId: number | undefined,
		path: string[],
		args: unknown[],
		construct: boolean,
	): Promise<unknown> => {
		const id = ++callId;
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			try {
				send({
					kind: "node-bridge-call",
					callId: id,
					target,
					moduleId,
					refId,
					path,
					args: encodeWireArgs(args, encodeRef),
					construct,
				});
			} catch (e) {
				pending.delete(id);
				reject(e instanceof Error ? e : new Error(String(e)));
			}
		});
	};

	const createRefProxy = (refId: number): unknown =>
		createProxy("ref", undefined, refId, []);

	const createProxy = (
		target: NodeProxyTarget,
		moduleId: string | undefined,
		refId: number | undefined,
		path: string[],
	): unknown => {
		const callable = function () {
			/* proxy target */
		} as unknown as {
			(): unknown;
			new (...args: unknown[]): unknown;
		};

		const proxy = new Proxy(callable, {
			get(_t, prop) {
				if (prop === REF_ID) return refId;
				if (prop === "default" && path.length === 0 && target === "module") {
					return proxy;
				}
				// Root module proxies must not be thenable — `await path` would
				// otherwise re-enter RPC forever. Property/method chains still use `then`.
				if (prop === "then") {
					const canAutoInvoke =
						target !== "module" || path.length > 0;
					if (!canAutoInvoke) return undefined;
					if (target === "ref" && path.length === 0) return undefined;
					return (
						resolve: (value: unknown) => void,
						reject: (reason?: unknown) => void,
					) => {
						call(target, moduleId, refId, path, [], false).then(
							resolve,
							reject,
						);
					};
				}
				if (typeof prop === "symbol") return undefined;
				return createProxy(target, moduleId, refId, [
					...path,
					String(prop),
				]);
			},
			apply(_t, _thisArg, args) {
				return call(target, moduleId, refId, path, args, false);
			},
			construct(_t, args) {
				return call(target, moduleId, refId, path, args, true);
			},
		});

		return proxy;
	};

	function decodeValue(value: NodeWireValue): unknown {
		if (isWireRef(value)) {
			return createRefProxy(value.__ref);
		}
		if (isWireUint8Array(value)) {
			return decodeWireUint8Array(value.__nodeUint8Array);
		}
		if (Array.isArray(value)) {
			return value.map((item) => decodeValue(item));
		}
		if (value === null || typeof value !== "object") {
			return value;
		}
		const out: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			out[key] = decodeValue(child);
		}
		return out;
	}

	function getModule(moduleId: string): unknown {
		const cached = moduleCache.get(moduleId);
		if (cached !== undefined) return cached;
		const mod = createProxy("module", moduleId, undefined, []);
		moduleCache.set(moduleId, mod);
		return mod;
	}

	return new Proxy(Object.create(null) as NodeSandboxModules, {
		get(_t, prop) {
			if (typeof prop === "symbol") {
				return undefined;
			}
			return getModule(String(prop));
		},
		has(_t, prop) {
			return typeof prop === "string";
		},
	});
}
