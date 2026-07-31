export interface PendingCall {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
}

export interface PendingCallTable {
	allocate(): number;
	set(id: number, entry: PendingCall): void;
	take(id: number): PendingCall | undefined;
	reject(id: number, error: Error): void;
}

export function createPendingCallTable(): PendingCallTable {
	let callId = 0;
	const pending = new Map<number, PendingCall>();
	return {
		allocate(): number {
			return ++callId;
		},
		set(id: number, entry: PendingCall): void {
			pending.set(id, entry);
		},
		take(id: number): PendingCall | undefined {
			const entry = pending.get(id);
			if (entry) pending.delete(id);
			return entry;
		},
		reject(id: number, error: Error): void {
			const entry = pending.get(id);
			if (!entry) return;
			pending.delete(id);
			entry.reject(error);
		},
	};
}

export interface BridgeOutboundHandlers<TOutbound> {
	isOutbound: (data: unknown) => data is TOutbound;
	getCallId: (data: TOutbound) => number;
	isError: (data: TOutbound) => boolean;
	getErrorMessage: (data: TOutbound) => string;
	getResultValue: (data: TOutbound) => unknown;
	decodeValue: (value: unknown) => unknown;
}

/** Listen for bridge-result / bridge-error on a MessagePort. */
export function attachBridgePortListener<TOutbound>(
	port: MessagePort,
	pending: PendingCallTable,
	handlers: BridgeOutboundHandlers<TOutbound>,
): void {
	port.addEventListener("message", (event: MessageEvent) => {
		const data: unknown = event.data;
		if (!handlers.isOutbound(data)) return;
		const entry = pending.take(handlers.getCallId(data));
		if (!entry) return;
		if (handlers.isError(data)) {
			entry.reject(new Error(handlers.getErrorMessage(data)));
			return;
		}
		entry.resolve(handlers.decodeValue(handlers.getResultValue(data)));
	});
}

export function readRefId(
	value: unknown,
	refIdSymbol: symbol,
): number | undefined {
	if (typeof value !== "function" && typeof value !== "object") {
		return undefined;
	}
	if (value == null) return undefined;
	const id = (value as Record<symbol, unknown>)[refIdSymbol];
	return typeof id === "number" ? id : undefined;
}

export interface RpcProxyFactoryOptions<TContext> {
	refIdSymbol: symbol;
	getRefId: (ctx: TContext) => number | undefined;
	invoke: (
		ctx: TContext,
		path: string[],
		args: unknown[],
		construct: boolean,
	) => Promise<unknown>;
	/** When false, `proxy.then` is undefined (avoid infinite await RPC). */
	shouldExposeThen: (ctx: TContext, path: string[]) => boolean;
	/**
	 * Optional special property handling. Return a value to short-circuit,
	 * or `undefined` to fall through to normal path extension.
	 */
	onGet?: (
		ctx: TContext,
		path: string[],
		prop: string | symbol,
		self: unknown,
	) => unknown;
}

export interface RpcProxyFactory<TContext> {
	createProxy(ctx: TContext, path: string[]): unknown;
}

export function createRpcProxyFactory<TContext>(
	options: RpcProxyFactoryOptions<TContext>,
): RpcProxyFactory<TContext> {
	const createProxy = (ctx: TContext, path: string[]): unknown => {
		const callable = function () {
			/* proxy target */
		} as unknown as {
			(): unknown;
			new (...args: unknown[]): unknown;
		};

		const proxy = new Proxy(callable, {
			get(_t, prop) {
				if (prop === options.refIdSymbol) {
					return options.getRefId(ctx);
				}
				const special = options.onGet?.(ctx, path, prop, proxy);
				if (special !== undefined) {
					return special;
				}
				if (prop === "then") {
					if (!options.shouldExposeThen(ctx, path)) {
						return undefined;
					}
					return (
						resolve: (value: unknown) => void,
						reject: (reason?: unknown) => void,
					) => {
						options.invoke(ctx, path, [], false).then(resolve, reject);
					};
				}
				if (typeof prop === "symbol") return undefined;
				return createProxy(ctx, [...path, String(prop)]);
			},
			apply(_t, _thisArg, args) {
				return options.invoke(ctx, path, args, false);
			},
			construct(_t, args) {
				return options.invoke(ctx, path, args, true);
			},
		});

		return proxy;
	};

	return { createProxy };
}

/** Decode a wire tree into sandbox values (refs → proxies, arrays/objects recurse). */
export function decodeClientWireValue(
	value: unknown,
	options: {
		isRef: (v: unknown) => v is { __ref: number };
		createRefProxy: (refId: number) => unknown;
		/** Return decoded leaf, or `undefined` to continue normal decoding. */
		decodeLeaf?: (v: unknown) => unknown;
	},
): unknown {
	if (options.isRef(value)) {
		return options.createRefProxy(value.__ref);
	}
	const leaf = options.decodeLeaf?.(value);
	if (leaf !== undefined) {
		return leaf;
	}
	if (Array.isArray(value)) {
		return value.map((item) => decodeClientWireValue(item, options));
	}
	if (value === null || typeof value !== "object") {
		return value;
	}
	const out: Record<string, unknown> = {};
	for (const [key, child] of Object.entries(value)) {
		out[key] = decodeClientWireValue(child, options);
	}
	return out;
}
