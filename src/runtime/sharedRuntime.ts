import * as Vue from "vue";
import * as PiniaNS from "pinia";
import { createPinia } from "pinia";
import "./pinia/piniaAugmentation";
import { vaultPersistPlugin } from "./pinia/vaultPersistPlugin";
import {
	SHARED_RUNTIME_KEY,
	type SharedVueRuntime,
	type WindowWithSharedRuntime,
} from "./sharedRuntimeTypes";

let singleton: SharedVueRuntime | null = null;

/** Host/test singleton: one Vue copy and one Pinia for all interactive blocks. */
export function getSharedVueRuntime(): SharedVueRuntime {
	if (!singleton) {
		const pinia = createPinia();
		pinia.use(vaultPersistPlugin);
		singleton = {
			Vue,
			Pinia: PiniaNS,
			pinia,
		};
	}
	return singleton;
}

/** Expose the shared runtime on a window (plugin host) for sandbox iframes. */
export function installSharedVueRuntimeOnWindow(
	target: Window = window,
): SharedVueRuntime {
	const runtime = getSharedVueRuntime();
	(target as WindowWithSharedRuntime)[SHARED_RUNTIME_KEY] = runtime;
	return runtime;
}
