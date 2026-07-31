import {
	attachBridgePortListener,
	createPendingCallTable,
	createRpcProxyFactory,
	decodeClientWireValue,
	readRefId,
} from "../bridge/proxyClientCore";
import { isWireRefObject } from "../bridge/wireCodecBase";
import type {
	ObsidianBridgeInbound,
	ObsidianBridgeOutbound,
	ObsidianProxyTarget,
	ObsidianWireValue,
} from "./bridgeProtocol";
import { encodeWireArgs } from "./wireCodec";

/** Sandbox `@obsidian` module shape (`default` = App proxy). */
export interface ObsidianSandboxModule {
	default: unknown;
	[key: string]: unknown;
}

const REF_ID = Symbol("obsidianProxyRef");

type ObsidianProxyContext = {
	target: ObsidianProxyTarget;
	refId?: number;
};

function isBridgeOutbound(data: unknown): data is ObsidianBridgeOutbound {
	return (
		typeof data === "object" &&
		data !== null &&
		"kind" in data &&
		((data as ObsidianBridgeOutbound).kind === "obsidian-bridge-result" ||
			(data as ObsidianBridgeOutbound).kind === "obsidian-bridge-error")
	);
}

/**
 * Builds the `@obsidian` module for sandbox scripts (`default` = App, named = obsidian exports).
 */
export function createObsidianSandboxModule(
	port: MessagePort,
): ObsidianSandboxModule {
	const pending = createPendingCallTable();

	const send = (message: ObsidianBridgeInbound): void => {
		port.postMessage(message);
	};

	const encodeRef = (obj: object): ObsidianWireValue => {
		const refId = readRefId(obj, REF_ID);
		if (refId == null) {
			throw new Error("无法将沙盒对象传回 Obsidian API。");
		}
		return { __ref: refId };
	};

	const invoke = (
		ctx: ObsidianProxyContext,
		path: string[],
		args: unknown[],
		construct: boolean,
	): Promise<unknown> => {
		const id = pending.allocate();
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			send({
				kind: "obsidian-bridge-call",
				callId: id,
				target: ctx.target,
				refId: ctx.refId,
				path,
				args: encodeWireArgs(args, encodeRef),
				construct,
			});
		});
	};

	const proxies = createRpcProxyFactory<ObsidianProxyContext>({
		refIdSymbol: REF_ID,
		getRefId: (ctx) => ctx.refId,
		invoke,
		shouldExposeThen: (ctx, path) =>
			!(ctx.target === "ref" && path.length === 0),
	});

	const createRefProxy = (refId: number): unknown =>
		proxies.createProxy({ target: "ref", refId }, []);

	function decodeValue(value: ObsidianWireValue): unknown {
		return decodeClientWireValue(value, {
			isRef: isWireRefObject,
			createRefProxy,
		});
	}

	attachBridgePortListener(port, pending, {
		isOutbound: isBridgeOutbound,
		getCallId: (data) => data.callId,
		isError: (data) => data.kind === "obsidian-bridge-error",
		getErrorMessage: (data) =>
			data.kind === "obsidian-bridge-error" ? data.message : "",
		getResultValue: (data) =>
			data.kind === "obsidian-bridge-result" ? data.value : null,
		decodeValue: (value) => decodeValue(value as ObsidianWireValue),
	});

	return new Proxy(
		{
			default: proxies.createProxy({ target: "app" }, []),
		} as ObsidianSandboxModule,
		{
			get(target, prop) {
				if (prop === "default") {
					return target.default;
				}
				if (typeof prop === "symbol") {
					return Reflect.get(target, prop) as unknown;
				}
				return proxies.createProxy(
					{ target: "export" },
					[String(prop)],
				);
			},
		},
	);
}
