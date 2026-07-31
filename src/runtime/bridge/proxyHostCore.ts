export interface HandleBridgeCallOptions<TResult, TError> {
	callId: number;
	run: () => unknown;
	encodeValue: (value: unknown) => unknown;
	buildResult: (callId: number, value: unknown) => TResult;
	buildError: (callId: number, message: string) => TError;
}

/** Sync host call handler (Obsidian): try/catch → result | error. */
export function handleBridgeCallSync<TResult, TError>(
	options: HandleBridgeCallOptions<TResult, TError>,
): TResult | TError {
	try {
		const value = options.run();
		return options.buildResult(
			options.callId,
			options.encodeValue(value),
		);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return options.buildError(options.callId, message);
	}
}

/** Async host call handler (Node): awaits thenables from `run`. */
export async function handleBridgeCallAsync<TResult, TError>(
	options: HandleBridgeCallOptions<TResult, TError>,
): Promise<TResult | TError> {
	try {
		const value = await options.run();
		return options.buildResult(
			options.callId,
			options.encodeValue(value),
		);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return options.buildError(options.callId, message);
	}
}
