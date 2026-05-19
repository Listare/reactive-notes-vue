/** `hashScopeId` → `data-v-v-xxxxxxxx` (matches vue/compiler-sfc + compileStyle). */
export function scopeDataAttribute(scopeId: string): string {
	return `data-v-${scopeId}`;
}

/**
 * Vue SFC scoped CSS targets `.class[data-v-…]` on each node, but our template
 * compile path does not add those attributes. Rewrite to container scope on the
 * mount root: `[data-v-…] .class { … }`.
 */
export function rewriteScopedCssForMountRoot(
	css: string,
	scopeId: string,
): string {
	const attr = scopeDataAttribute(scopeId);
	const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return css.replace(
		new RegExp(`([^{}@,]+?)\\[${escaped}\\]`, "g"),
		(_match, selectors: string) => `[${attr}] ${selectors.trim()}`,
	);
}
