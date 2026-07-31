import { resolvePropertyPath } from "./resolvePath";

export interface DispatchProxyCallOptions {
	root: unknown;
	path: string[];
	args: unknown[];
	construct: boolean;
	/** When true, thenables from the API are returned as Promises (Node). */
	awaitPromises?: boolean;
	formatConstructError: (pathLabel: string) => string;
	formatCallError: (pathLabel: string) => string;
}

function awaitPromiseIfNeeded(value: unknown): unknown {
	if (
		value != null &&
		(typeof value === "object" || typeof value === "function") &&
		typeof (value as { then?: unknown }).then === "function"
	) {
		return Promise.resolve(value as Promise<unknown>);
	}
	return value;
}

/**
 * Resolve a property path on `root` and apply / construct / read as requested.
 * Returns a thenable only when `awaitPromises` is set and the API returned one.
 */
export function dispatchProxyCall(options: DispatchProxyCallOptions): unknown {
	const {
		root,
		path,
		args,
		construct,
		formatConstructError,
		formatCallError,
	} = options;
	const pathLabel = path.join(".");
	const owner =
		path.length > 0 ? resolvePropertyPath(root, path.slice(0, -1)) : root;
	const resolved = path.length > 0 ? resolvePropertyPath(root, path) : root;

	let value: unknown;

	if (construct) {
		if (typeof resolved !== "function") {
			throw new Error(formatConstructError(pathLabel));
		}
		value = new (resolved as new (...a: unknown[]) => unknown)(...args);
	} else if (typeof resolved === "function") {
		value = (resolved as (...a: unknown[]) => unknown).apply(owner, args);
	} else if (args.length === 0) {
		value = resolved;
	} else {
		throw new Error(formatCallError(pathLabel));
	}

	return options.awaitPromises ? awaitPromiseIfNeeded(value) : value;
}
