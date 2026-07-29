import type * as VueNS from "vue";
import type * as PiniaNS from "pinia";
import type { Pinia } from "pinia";

/** Window key for the host-side shared Vue + Pinia runtime. */
export const SHARED_RUNTIME_KEY = "__RN_VUE_SHARED__";

/**
 * Single Vue + Pinia realm shared by the host and every sandbox iframe
 * (`allow-same-origin` → same object references via `window.parent`).
 */
export interface SharedVueRuntime {
	Vue: typeof VueNS;
	/** Pinia module namespace (`defineStore`, `storeToRefs`, …). */
	Pinia: typeof PiniaNS;
	/** One Pinia instance installed on every interactive Vue app. */
	pinia: Pinia;
}

export type WindowWithSharedRuntime = Window & {
	[SHARED_RUNTIME_KEY]?: SharedVueRuntime;
};
