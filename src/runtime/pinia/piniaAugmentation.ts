import type { PiniaVaultPersistOption } from "./persistTypes";

declare module "pinia" {
	// Type params must match Pinia's DefineStoreOptionsBase arity for merging.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by Pinia
	export interface DefineStoreOptionsBase<S, Store> {
		/**
		 * Persist `$state` to a vault JSON file.
		 * Path uses the same rules as imports (`./`、`@/`、`@custom-script/`),
		 * resolved relative to the module that calls `defineStore`.
		 */
		persist?: PiniaVaultPersistOption;
	}
}
