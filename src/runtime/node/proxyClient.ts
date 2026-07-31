import {
	attachBridgePortListener,
	createPendingCallTable,
	createRpcProxyFactory,
	decodeClientWireValue,
	readRefId,
} from "../bridge/proxyClientCore";
import { isWireRefObject } from "../bridge/wireCodecBase";
import type {
	NodeBridgeInbound,
	NodeBridgeOutbound,
	NodeProxyTarget,
	NodeWireValue,
} from "./bridgeProtocol";
import {
	decodeWireUint8Array,
	encodeWireArgs,
	isWireUint8Array,
} from "./wireCodec";

/** Sandbox `__node__` map: `__node__["path"]` → module proxy (`.default` = self). */
export type NodeSandboxModules = Record<string, unknown>;

const REF_ID = Symbol("nodeProxyRef");

type NodeProxyContext = {
	target: NodeProxyTarget;
	moduleId?: string;
	refId?: number;
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

/**
 * Builds the `__node__` map for sandbox scripts (`import … from 'node:path'`).
 */
export function createNodeSandboxModules(
	port: MessagePort,
): NodeSandboxModules {
	const pending = createPendingCallTable();
	const moduleCache = new Map<string, unknown>();

	const send = (message: NodeBridgeInbound): void => {
		port.postMessage(message);
	};

	const encodeRef = (obj: object): NodeWireValue => {
		const refId = readRefId(obj, REF_ID);
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

	const invoke = (
		ctx: NodeProxyContext,
		path: string[],
		args: unknown[],
		construct: boolean,
	): Promise<unknown> => {
		const id = pending.allocate();
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			try {
				send({
					kind: "node-bridge-call",
					callId: id,
					target: ctx.target,
					moduleId: ctx.moduleId,
					refId: ctx.refId,
					path,
					args: encodeWireArgs(args, encodeRef),
					construct,
				});
			} catch (e) {
				pending.reject(
					id,
					e instanceof Error ? e : new Error(String(e)),
				);
			}
		});
	};

	const proxies = createRpcProxyFactory<NodeProxyContext>({
		refIdSymbol: REF_ID,
		getRefId: (ctx) => ctx.refId,
		invoke,
		shouldExposeThen: (ctx, path) => {
			if (ctx.target === "module" && path.length === 0) return false;
			if (ctx.target === "ref" && path.length === 0) return false;
			return true;
		},
		onGet: (ctx, path, prop, self) => {
			if (prop === "default" && path.length === 0 && ctx.target === "module") {
				return self;
			}
			return undefined;
		},
	});

	const createRefProxy = (refId: number): unknown =>
		proxies.createProxy({ target: "ref", refId }, []);

	function decodeValue(value: NodeWireValue): unknown {
		return decodeClientWireValue(value, {
			isRef: isWireRefObject,
			createRefProxy,
			decodeLeaf: (v) => {
				if (isWireUint8Array(v as NodeWireValue)) {
					return decodeWireUint8Array(
						(v as { __nodeUint8Array: string }).__nodeUint8Array,
					);
				}
				return undefined;
			},
		});
	}

	attachBridgePortListener(port, pending, {
		isOutbound: isBridgeOutbound,
		getCallId: (data) => data.callId,
		isError: (data) => data.kind === "node-bridge-error",
		getErrorMessage: (data) =>
			data.kind === "node-bridge-error" ? data.message : "",
		getResultValue: (data) =>
			data.kind === "node-bridge-result" ? data.value : null,
		decodeValue: (value) => decodeValue(value as NodeWireValue),
	});

	function getModule(moduleId: string): unknown {
		const cached = moduleCache.get(moduleId);
		if (cached !== undefined) return cached;
		const mod = proxies.createProxy(
			{ target: "module", moduleId },
			[],
		);
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
