export interface WireRef {
	__ref: number;
}

const REF_KEY = "__ref";

export function isWireRefObject(value: unknown): value is WireRef {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		REF_KEY in value &&
		typeof (value as WireRef).__ref === "number"
	);
}

export interface EncodeWireValueOptions<TWire> {
	encodeRef: (value: object) => TWire;
	unsupportedMessage: string;
	/**
	 * Optional handling for non-plain objects (e.g. binary).
	 * Return a wire value to short-circuit, or `undefined` to fall through to `encodeRef`.
	 */
	encodeSpecialObject?: (value: object) => TWire | undefined;
}

/**
 * Shared encoder for host→sandbox bridge values (primitives, arrays, Date, refs).
 */
export function encodeWireValueBase<TWire>(
	value: unknown,
	options: EncodeWireValueOptions<TWire>,
): TWire {
	if (value === null || value === undefined) {
		return null as TWire;
	}
	const t = typeof value;
	if (t === "boolean" || t === "number" || t === "string") {
		return value as TWire;
	}
	if (t === "bigint" || t === "symbol") {
		throw new Error(options.unsupportedMessage);
	}
	if (t === "function") {
		return options.encodeRef(value as object);
	}
	if (Array.isArray(value)) {
		return value.map((item) =>
			encodeWireValueBase(item, options),
		) as TWire;
	}
	if (value instanceof Date) {
		return value.toISOString() as TWire;
	}
	if (typeof value === "object") {
		const special = options.encodeSpecialObject?.(value);
		if (special !== undefined) {
			return special;
		}
		return options.encodeRef(value);
	}
	throw new Error(options.unsupportedMessage);
}
