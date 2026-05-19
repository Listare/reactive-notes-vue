/** Prepended as line 1 of the `new Function` body in `executeModule`. */
export const MODULE_LOAD_STRICT_PREFIX = '"use strict";\n';

export function buildModuleLoadBody(moduleCode: string): string {
	return `${MODULE_LOAD_STRICT_PREFIX}${moduleCode}`;
}
