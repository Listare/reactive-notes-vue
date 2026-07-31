/** Trailing-edge debounce; only the last call within `ms` runs. */
export function debounce(fn: () => void, ms: number): () => void {
	let timer: ReturnType<typeof setTimeout> | null = null;
	return () => {
		if (timer != null) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = null;
			fn();
		}, ms);
	};
}
