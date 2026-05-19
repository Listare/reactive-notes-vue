import type { CompiledStyle } from "../compiler/compileSfc";

export interface BundledModuleRecord {
	/** Stable id: vault path, optionally `?block=name`. */
	canonicalId: string;
	vaultPath: string;
	/** Executable body (imports not yet rewritten). */
	code: string;
	styles: CompiledStyle[];
}

import type { StackCodeRegion } from "../runtime/stackTrace";

export interface BundleResult {
	moduleCode: string;
	styles: CompiledStyle[];
	stackRegions: StackCodeRegion[];
}

export interface ModuleLoadRequest {
	specifier: string;
	fromVaultPath: string;
}

export interface LoadedModuleSource {
	canonicalId: string;
	vaultPath: string;
	code: string;
	styles: CompiledStyle[];
	/** Further imports found in this module's code. */
	dependencies: string[];
}

export interface ModuleLoader {
	loadModule(request: ModuleLoadRequest): Promise<LoadedModuleSource>;
	fileExists(path: string): Promise<boolean>;
}
