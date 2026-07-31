import type { CompiledStyle } from "../compiler/compileSfc";

export interface BundledModuleRecord {
	/** Stable id: vault path, optionally `?block=name`. */
	canonicalId: string;
	vaultPath: string;
	/** Executable body (imports not yet rewritten). */
	code: string;
	styles: CompiledStyle[];
	/** Sparse 1-based map from region code line → original source line. */
	originalLineByEmitted?: number[];
}

import type { StackCodeRegion } from "../runtime/stackTrace";

export interface BundleResult {
	moduleCode: string;
	styles: CompiledStyle[];
	stackRegions: StackCodeRegion[];
	/** Normalized vault paths of all bundled local imports (transitive). */
	vaultDependencies: string[];
	/** Absolute http(s) CDN / remote ESM URLs referenced by the bundle. */
	urlDependencies: string[];
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
	originalLineByEmitted?: number[];
}

export interface ModuleLoader {
	loadModule(request: ModuleLoadRequest): Promise<LoadedModuleSource>;
	fileExists(path: string): Promise<boolean>;
}
