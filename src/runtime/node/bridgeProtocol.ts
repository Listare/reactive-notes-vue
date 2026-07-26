/** Serialized argument/result crossing the sandbox iframe boundary for Node builtins. */
export type NodeWireValue =
	| null
	| boolean
	| number
	| string
	| { __ref: number }
	| { __nodeUint8Array: string }
	| NodeWireValue[]
	| { [key: string]: NodeWireValue };

/** `module` = builtin exports root; `ref` = previously returned object. */
export type NodeProxyTarget = "module" | "ref";

export interface NodeBridgeRequest {
	kind: "node-bridge-call";
	callId: number;
	target: NodeProxyTarget;
	/** Builtin id after `node:` (e.g. `path`, `fs/promises`). Required for `module`. */
	moduleId?: string;
	/** Set when `target` is `ref`. */
	refId?: number;
	path: string[];
	args: NodeWireValue[];
	construct: boolean;
}

export interface NodeBridgeRelease {
	kind: "node-bridge-release";
	ref: number;
}

export type NodeBridgeInbound = NodeBridgeRequest | NodeBridgeRelease;

export interface NodeBridgeResult {
	kind: "node-bridge-result";
	callId: number;
	value: NodeWireValue;
}

export interface NodeBridgeError {
	kind: "node-bridge-error";
	callId: number;
	message: string;
}

export type NodeBridgeOutbound = NodeBridgeResult | NodeBridgeError;
