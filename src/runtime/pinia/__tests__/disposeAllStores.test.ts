import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { defineStore } from "pinia";
import {
	disposeAllPiniaStores,
	resumePiniaVaultPersistWrites,
} from "../vaultPersistPlugin";
import { getSharedVueRuntime } from "../../sharedRuntime";
import {
	configurePiniaPersistHost,
	resetPiniaPersistHost,
} from "../persistHost";

describe("disposeAllPiniaStores", () => {
	beforeEach(() => {
		resetPiniaPersistHost();
		configurePiniaPersistHost({
			app: {
				vault: {
					getAbstractFileByPath: () => null,
					adapter: {
						exists: async () => false,
						read: async () => "",
						write: async () => undefined,
						mkdir: async () => undefined,
					},
					create: async () => ({}),
					createFolder: async () => undefined,
					modify: async () => undefined,
					read: async () => "",
				},
			} as never,
			getCustomScriptPath: () => "",
		});
		resumePiniaVaultPersistWrites();
	});

	afterEach(() => {
		const { pinia } = getSharedVueRuntime();
		disposeAllPiniaStores(pinia);
		resetPiniaPersistHost();
		resumePiniaVaultPersistWrites();
	});

	it("removes all stores from the shared pinia", () => {
		const { pinia } = getSharedVueRuntime();
		const useA = defineStore(`clear-a-${Math.random()}`, {
			state: () => ({ n: 1 }),
		});
		const useB = defineStore(`clear-b-${Math.random()}`, {
			state: () => ({ n: 2 }),
		});
		useA(pinia);
		useB(pinia);
		expect(pinia._s.size).toBeGreaterThanOrEqual(2);

		const disposed = disposeAllPiniaStores(pinia);
		expect(disposed).toBeGreaterThanOrEqual(2);
		expect(pinia._s.size).toBe(0);
		expect(Object.keys(pinia.state.value)).toEqual([]);
	});
});
