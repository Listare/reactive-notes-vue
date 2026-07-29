import {
	SHARED_RUNTIME_KEY,
	type SharedVueRuntime,
	type WindowWithSharedRuntime,
} from "./sharedRuntimeTypes";

/**
 * Resolves the host-installed Vue + Pinia runtime.
 * Sandbox iframes read `window.parent`; tests/host use the same window.
 */
export function resolveSharedRuntime(): SharedVueRuntime {
	try {
		if (typeof window !== "undefined" && window.parent && window.parent !== window) {
			const fromParent = (window.parent as WindowWithSharedRuntime)[
				SHARED_RUNTIME_KEY
			];
			if (fromParent) return fromParent;
		}
	} catch {
		// Cross-origin parent access is denied; fall through.
	}

	if (typeof window !== "undefined") {
		const local = (window as WindowWithSharedRuntime)[SHARED_RUNTIME_KEY];
		if (local) return local;
	}

	throw new Error(
		"共享 Vue/Pinia 运行时未初始化。请确认插件已加载（installSharedVueRuntimeOnWindow）。",
	);
}
