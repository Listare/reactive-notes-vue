/** Stable short id for scoped CSS (data-v-xxxx). */
export function hashScopeId(source: string): string {
	let hash = 0;
	for (let i = 0; i < source.length; i++) {
		hash = (hash << 5) - hash + source.charCodeAt(i);
		hash |= 0;
	}
	return `v-${(hash >>> 0).toString(16).padStart(8, "0").slice(0, 8)}`;
}
