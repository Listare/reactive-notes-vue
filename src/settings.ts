export interface ReactiveNotesVueSettings {
	enabled: boolean;
	/** Vault-relative folder for `@custom-script/` imports. */
	customScriptPath: string;
}

export const DEFAULT_SETTINGS: ReactiveNotesVueSettings = {
	enabled: true,
	customScriptPath: "",
};
