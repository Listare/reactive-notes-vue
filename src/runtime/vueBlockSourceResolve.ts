import {
	listVisibleVueInteractiveBlocks,
	type VueInteractiveBlockInfo,
} from "../markdown/vueInteractiveFence";

/** Resolve latest block source from vault markdown for refresh. */
export function resolveVisibleBlockSource(
	lastSource: string,
	visibleBlockIndex: number,
	visibleBlocks: VueInteractiveBlockInfo[],
): string | null {
	if (
		visibleBlockIndex >= 0 &&
		visibleBlockIndex < visibleBlocks.length
	) {
		return visibleBlocks[visibleBlockIndex]!.content;
	}
	const normalized = lastSource.trim();
	const byContent = visibleBlocks.find(
		(b) => b.content.trim() === normalized,
	);
	return byContent?.content ?? null;
}

/** Index of a visible vue-interactive block matching `source`, or `-1`. */
export function findVisibleBlockIndex(
	source: string,
	markdown: string,
): number {
	const normalized = source.trim();
	let visibleIdx = 0;
	for (const block of listVisibleVueInteractiveBlocks(markdown)) {
		if (block.content.trim() === normalized) {
			return visibleIdx;
		}
		visibleIdx++;
	}
	return -1;
}

/** Sandbox init/render timeouts trigger a temporary remount backoff. */
export function shouldBackoffOnSandboxTimeout(message: string): boolean {
	return (
		message.includes("沙盒初始化超时") ||
		message.includes("沙盒渲染超时")
	);
}

export const SANDBOX_TIMEOUT_BACKOFF_MS = 60_000;

/** Drop stale async render work when a newer epoch has started. */
export function isRenderEpochStale(
	epoch: number,
	currentEpoch: number,
): boolean {
	return epoch !== currentEpoch;
}
