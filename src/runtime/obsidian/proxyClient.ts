import type {
	ObsidianBridgeInbound,
	ObsidianBridgeOutbound,
	ObsidianProxyTarget,
	ObsidianWireValue,
} from "./bridgeProtocol";
import { encodeWireArgs, isWireRef } from "./wireCodec";

/** Sandbox `@obsidian` module shape (`default` = App proxy). */
export interface ObsidianSandboxModule {
	default: unknown;
	[key: string]: unknown;
}

const REF_ID = Symbol("obsidianProxyRef");

type PendingCall = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
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

function readRefId(value: unknown): number | undefined {
	if (typeof value !== "function" && typeof value !== "object") {
		return undefined;
	}
	if (value == null) return undefined;
	const id = (value as Record<symbol, unknown>)[REF_ID];
	return typeof id === "number" ? id : undefined;
}

/**
 * Builds the `@obsidian` module for sandbox scripts (`default` = App, named = obsidian exports).
 */
export function createObsidianSandboxModule(
	port: MessagePort,
): ObsidianSandboxModule {
	let callId = 0;
	const pending = new Map<number, PendingCall>();

	const send = (message: ObsidianBridgeInbound): void => {
		port.postMessage(message);
	};

	port.addEventListener("message", (event: MessageEvent) => {
		const data: unknown = event.data;
		if (!isBridgeOutbound(data)) return;
		const entry = pending.get(data.callId);
		if (!entry) return;
		pending.delete(data.callId);
		if (data.kind === "obsidian-bridge-error") {
			entry.reject(new Error(data.message));
			return;
		}
		entry.resolve(decodeValue(data.value));
	});

	const encodeRef = (obj: object): ObsidianWireValue => {
		const refId = readRefId(obj);
		if (refId == null) {
			throw new Error("无法将沙盒对象传回 Obsidian API。");
		}
		return { __ref: refId };
	};

	const call = (
		target: ObsidianProxyTarget,
		refId: number | undefined,
		path: string[],
		args: unknown[],
		construct: boolean,
	): Promise<unknown> => {
		const id = ++callId;
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			send({
				kind: "obsidian-bridge-call",
				callId: id,
				target,
				refId,
				path,
				args: encodeWireArgs(args, encodeRef),
				construct,
			});
		});
	};

	const createRefProxy = (refId: number): unknown =>
		createProxy("ref", refId, []);

	const createProxy = (
		target: ObsidianProxyTarget,
		refId: number | undefined,
		path: string[],
	): unknown => {
		const callable = function () {
			/* proxy target */
		} as unknown as {
			(): unknown;
			new (...args: unknown[]): unknown;
		};

		return new Proxy(callable, {
			get(_t, prop) {
				if (prop === REF_ID) return refId;
				// Root ref proxies must not be thenable — `await getActiveFile()` would
				// otherwise re-enter RPC forever. Property/method chains still use `then`.
				if (prop === "then") {
					const canAutoInvoke = target !== "ref" || path.length > 0;
					if (!canAutoInvoke) return undefined;
					return (
						resolve: (value: unknown) => void,
						reject: (reason?: unknown) => void,
					) => {
						call(target, refId, path, [], false).then(resolve, reject);
					};
				}
				if (typeof prop === "symbol") return undefined;
				return createProxy(target, refId, [...path, String(prop)]);
			},
			apply(_t, _thisArg, args) {
				return call(target, refId, path, args, false);
			},
			construct(_t, args) {
				return call(target, refId, path, args, true);
			},
		});
	};

	function decodeValue(value: ObsidianWireValue): unknown {
		if (isWireRef(value)) {
			return createRefProxy(value.__ref);
		}
		if (value === null || typeof value !== "object" || Array.isArray(value)) {
			return value;
		}
		const out: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			out[key] = decodeValue(child);
		}
		return out;
	}

	return new Proxy(
		{ default: createProxy("app", undefined, []) } as ObsidianSandboxModule,
		{
			get(target, prop) {
				if (prop === "default") {
					return target.default;
				}
				if (typeof prop === "symbol") {
					return Reflect.get(target, prop) as unknown;
				}
				return createProxy("export", undefined, [String(prop)]);
			},
		},
	);
}
