import { isWireRefObject } from "./wireCodecBase";

export interface RefRegistryOptions {
	staleRefMessage: string;
	/** Decode a non-ref leaf (e.g. Node Uint8Array). Return `undefined` to continue. */
	decodeLeaf?: (value: unknown) => unknown;
}

export interface RefRegistry {
	storeRef(value: object): { __ref: number };
	resolveRef(refId: number): object;
	releaseRef(refId: number): void;
	decodeArg(value: unknown): unknown;
	decodeArgs(args: unknown[]): unknown[];
	clear(): void;
}

/** Host-side object refs crossing the sandbox bridge. */
export function createRefRegistry(options: RefRegistryOptions): RefRegistry {
	const refs = new Map<number, object>();
	let nextRef = 1;

	const resolveRef = (refId: number): object => {
		const obj = refs.get(refId);
		if (!obj) {
			throw new Error(options.staleRefMessage);
		}
		return obj;
	};

	const decodeArg = (value: unknown): unknown => {
		if (isWireRefObject(value)) {
			return resolveRef(value.__ref);
		}
		const leaf = options.decodeLeaf?.(value);
		if (leaf !== undefined) {
			return leaf;
		}
		if (Array.isArray(value)) {
			return value.map((item) => decodeArg(item));
		}
		if (value === null || typeof value !== "object") {
			return value;
		}
		const out: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			out[key] = decodeArg(child);
		}
		return out;
	};

	return {
		storeRef(value: object): { __ref: number } {
			const id = nextRef++;
			refs.set(id, value);
			return { __ref: id };
		},
		resolveRef,
		releaseRef(refId: number): void {
			refs.delete(refId);
		},
		decodeArg,
		decodeArgs(args: unknown[]): unknown[] {
			return args.map((arg) => decodeArg(arg));
		},
		clear(): void {
			refs.clear();
		},
	};
}
