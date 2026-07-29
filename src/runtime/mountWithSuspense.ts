import type { App, Component } from "vue";
import { resolveSharedRuntime } from "./resolveSharedRuntime";

export interface MountWithSuspenseOptions {
	/** Called for errors after Suspense has already resolved (e.g. onMounted). */
	onRuntimeError?: (err: unknown, info: string) => void;
}

export interface MountWithSuspenseResult {
	app: App;
	/** Settles when Suspense finishes; rejects if setup fails before resolve. */
	whenReady: Promise<void>;
}

/**
 * Mount a component under `<Suspense>` so `<script setup>` top-level `await`
 * (async setup) can render. Sync setup resolves during `mount()`.
 * Installs the shared Pinia instance so every interactive block shares stores.
 */
export function mountWithSuspense(
	component: Component,
	container: Element,
	options: MountWithSuspenseOptions = {},
): MountWithSuspenseResult {
	const { Vue, pinia } = resolveSharedRuntime();
	const { createApp, h, Suspense } = Vue;

	let settleReady!: () => void;
	let rejectReady!: (err: unknown) => void;
	let settled = false;

	const whenReady = new Promise<void>((resolve, reject) => {
		settleReady = resolve;
		rejectReady = reject;
	});
	// Caller may only use `app`; avoid unhandled rejection if setup fails early.
	void whenReady.catch(() => undefined);

	const markReady = (): void => {
		if (settled) return;
		settled = true;
		settleReady();
	};

	const failReady = (err: unknown): void => {
		if (settled) return;
		settled = true;
		rejectReady(err);
	};

	const app = createApp({
		name: "VueInteractiveSuspenseRoot",
		setup() {
			return () =>
				h(
					Suspense,
					{ onResolve: markReady },
					{ default: () => h(component) },
				);
		},
	});

	app.use(pinia);

	app.config.errorHandler = (err, _instance, info) => {
		if (!settled) {
			failReady(err);
			return;
		}
		options.onRuntimeError?.(err, info);
	};

	app.mount(container);
	return { app, whenReady };
}
