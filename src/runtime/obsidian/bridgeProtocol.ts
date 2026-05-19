/** Serialized argument/result crossing the sandbox iframe boundary. */
export type ObsidianWireValue =
	| null
	| boolean
	| number
	| string
	| { __ref: number }
	| ObsidianWireValue[]
	| { [key: string]: ObsidianWireValue };

export type ObsidianProxyTarget = "app" | "export" | "ref";

export interface ObsidianBridgeRequest {
	kind: "obsidian-bridge-call";
	callId: number;
	target: ObsidianProxyTarget;
	/** Set when `target` is `ref`. */
	refId?: number;
	path: string[];
	args: ObsidianWireValue[];
	construct: boolean;
}

export interface ObsidianBridgeRelease {
	kind: "obsidian-bridge-release";
	ref: number;
}

export type ObsidianBridgeInbound =
	| ObsidianBridgeRequest
	| ObsidianBridgeRelease;

export interface ObsidianBridgeResult {
	kind: "obsidian-bridge-result";
	callId: number;
	value: ObsidianWireValue;
}

export interface ObsidianBridgeError {
	kind: "obsidian-bridge-error";
	callId: number;
	message: string;
}

export type ObsidianBridgeOutbound =
	| ObsidianBridgeResult
	| ObsidianBridgeError;
