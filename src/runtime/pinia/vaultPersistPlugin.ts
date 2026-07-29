import type { Pinia, PiniaPluginContext, StateTree, StoreGeneric } from "pinia";
import { resolveVaultPath } from "../../resolver/resolveVaultPath";
import {
	isVaultFileNotFoundError,
	readVaultText,
	writeVaultText,
} from "../../vault/vaultFileAccess";
import { getPiniaPersistHost } from "./persistHost";
import {
	normalizePiniaVaultPersist,
	PERSIST_FROM_PATH_KEY,
} from "./persistTypes";

function toJsonState(state: StateTree): string {
	return `${JSON.stringify(state, null, 2)}\n`;
}

let persistWritesPaused = false;
const pendingCancelers = new Set<() => void>();
const pendingHydrates = new Set<Promise<void>>();

/** Stop scheduling vault writes (e.g. while clearing in-memory stores). */
export function pausePiniaVaultPersistWrites(): void {
	persistWritesPaused = true;
	for (const cancel of [...pendingCancelers]) {
		cancel();
	}
}

export function resumePiniaVaultPersistWrites(): void {
	persistWritesPaused = false;
}

/** Wait until in-flight persist hydrations finish (after remount / clear). */
export async function waitForPendingPiniaHydrates(): Promise<void> {
	const pending = [...pendingHydrates];
	if (pending.length === 0) return;
	await Promise.all(pending);
}

/**
 * Hydrates / persists store `$state` to a vault JSON file when `persist` is set
 * on `defineStore` options.
 */
export function vaultPersistPlugin({
	store,
	options,
}: PiniaPluginContext): void {
	const persist = normalizePiniaVaultPersist(
		(options as unknown as Record<string, unknown>).persist,
	);
	if (!persist) return;

	const host = getPiniaPersistHost();
	if (!host) {
		console.error(
			`[reactive-notes-vue] store "${store.$id}" 启用了 persist，但持久化宿主未配置。`,
		);
		return;
	}

	const fromPathRaw = (options as unknown as Record<string, unknown>)[
		PERSIST_FROM_PATH_KEY
	];
	const fromPath = typeof fromPathRaw === "string" ? fromPathRaw : "";

	let resolvedPath: string;
	try {
		resolvedPath = resolveVaultPath(persist.pathSpecifier, {
			fromPath,
			customScriptPath: host.getCustomScriptPath(),
		});
	} catch (e) {
		const err = e instanceof Error ? e : new Error(String(e));
		console.error(
			`[reactive-notes-vue] store "${store.$id}" persist 路径无效: ${err.message}`,
		);
		return;
	}

	if (!resolvedPath.toLowerCase().endsWith(".json")) {
		console.error(
			`[reactive-notes-vue] store "${store.$id}" persist 路径必须是 .json 文件: ${resolvedPath}`,
		);
		return;
	}

	let ready = false;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let writeChain: Promise<void> = Promise.resolve();

	const cancelPending = (): void => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	};
	pendingCancelers.add(cancelPending);

	const scheduleWrite = (): void => {
		if (!ready || persistWritesPaused) return;
		cancelPending();
		timer = setTimeout(() => {
			timer = null;
			if (persistWritesPaused) return;
			const payload = toJsonState(store.$state);
			writeChain = writeChain
				.then(() => writeVaultText(host.app, resolvedPath, payload))
				.catch((e) => {
					const err = e instanceof Error ? e : new Error(String(e));
					console.error(
						`[reactive-notes-vue] store "${store.$id}" 写入 ${resolvedPath} 失败: ${err.message}`,
					);
				});
		}, persist.debounceMs);
	};

	const hydrate = (async () => {
		try {
			const text = await readVaultText(host.app, resolvedPath);
			const data: unknown = JSON.parse(text);
			if (
				data !== null &&
				typeof data === "object" &&
				!Array.isArray(data)
			) {
				store.$patch(data as StateTree);
			}
		} catch (e) {
			if (!isVaultFileNotFoundError(e)) {
				const err = e instanceof Error ? e : new Error(String(e));
				console.error(
					`[reactive-notes-vue] store "${store.$id}" 读取 ${resolvedPath} 失败: ${err.message}`,
				);
			}
		} finally {
			ready = true;
		}
	})();
	pendingHydrates.add(hydrate);
	void hydrate.finally(() => {
		pendingHydrates.delete(hydrate);
	});

	store.$subscribe(() => {
		scheduleWrite();
	});
}

/** Disposes every store on the shared Pinia instance (does not touch vault JSON). */
export function disposeAllPiniaStores(pinia: Pinia): number {
	const stores = [...pinia._s.values()] as StoreGeneric[];
	for (const store of stores) {
		store.$dispose();
	}
	// Drop any leftover root state entries after dispose.
	for (const id of Object.keys(pinia.state.value)) {
		delete pinia.state.value[id];
	}
	pinia._s.clear();
	return stores.length;
}
