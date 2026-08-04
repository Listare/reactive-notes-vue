/** Survives `empty()` on descendants; kept on the code-block container. */
export const DATA_VUE_LAST_HEIGHT = "data-vue-last-height";

/** Parses a positive CSS pixel height from a data attribute or style value. */
export function parsePositiveCssPx(raw: string | null | undefined): number | null {
	if (raw == null || raw === "") return null;
	const n = Number.parseFloat(raw);
	if (!Number.isFinite(n) || n <= 0) return null;
	return Math.ceil(n);
}

export function readPersistedBlockHeight(el: HTMLElement): number | null {
	return parsePositiveCssPx(el.getAttribute(DATA_VUE_LAST_HEIGHT));
}

export function persistBlockHeight(el: HTMLElement, heightPx: number): void {
	const h = Math.ceil(heightPx);
	if (!Number.isFinite(h) || h <= 0) return;
	el.setAttribute(DATA_VUE_LAST_HEIGHT, String(h));
}

export function clearPersistedBlockHeight(el: HTMLElement): void {
	el.removeAttribute(DATA_VUE_LAST_HEIGHT);
}

/** Reserves vertical space while the iframe is collapsed or replaced by a skeleton. */
export function applyHostMinHeight(host: HTMLElement, heightPx: number): void {
	const h = Math.ceil(heightPx);
	if (!Number.isFinite(h) || h <= 0) return;
	host.style.minHeight = `${h}px`;
}

export function clearHostMinHeight(host: HTMLElement): void {
	host.style.minHeight = "";
}

/**
 * Applies the measured iframe height and drops the host reserve in one turn.
 * Callers must not clear minHeight before this — `rendered` resolves before the
 * first resize, and clearing early collapses the block to ~1px.
 */
export function commitMeasuredIframeHeight(
	host: HTMLElement,
	iframe: HTMLElement,
	heightPx: number,
): void {
	const h = Math.ceil(heightPx);
	if (!Number.isFinite(h) || h <= 0) return;
	iframe.style.height = `${h}px`;
	clearHostMinHeight(host);
}

/**
 * Best-effort layout height before tearing down an iframe / collapsing for measure.
 */
export function resolveLayoutHeightPx(options: {
	persistedPx?: number | null;
	iframeStyleHeight?: string | null;
	iframeOffsetHeight?: number;
	hostMinHeight?: string | null;
	fallbackPx?: number;
}): number {
	const candidates = [
		options.persistedPx ?? null,
		parsePositiveCssPx(options.iframeStyleHeight),
		options.iframeOffsetHeight != null && options.iframeOffsetHeight > 0
			? Math.ceil(options.iframeOffsetHeight)
			: null,
		parsePositiveCssPx(options.hostMinHeight),
		options.fallbackPx != null && options.fallbackPx > 0
			? Math.ceil(options.fallbackPx)
			: null,
	];
	let max = 0;
	for (const c of candidates) {
		if (c != null && c > max) max = c;
	}
	return max;
}
