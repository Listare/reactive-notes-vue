import { markContainerSandboxLive } from "./vueBlockLiveSession";

export const DATA_VUE_MOUNTED = "data-vue-interactive-mounted";
export const DATA_VUE_SOURCE_PATH = "data-vue-source-path";
export const DATA_VUE_BLOCK_INDEX = "data-vue-interactive-index";

/** Persists remount metadata on the code-block container (survives `empty()`). */
export function persistVueBlockRemountMetadata(
	el: HTMLElement,
	sourcePath: string,
	visibleBlockIndex: number,
): void {
	el.setAttr(DATA_VUE_SOURCE_PATH, sourcePath);
	if (visibleBlockIndex >= 0) {
		el.setAttr(DATA_VUE_BLOCK_INDEX, String(visibleBlockIndex));
	} else {
		el.removeAttribute(DATA_VUE_BLOCK_INDEX);
	}
	el.setAttr(DATA_VUE_MOUNTED, "1");
}

export { clearContainerSandboxLive as clearVueSandboxAlive } from "./vueBlockLiveSession";
export { markContainerSandboxLive as markVueSandboxAlive } from "./vueBlockLiveSession";

function isVueBlockLoading(el: HTMLElement): boolean {
	return el.querySelector(".vue-interactive-placeholder[aria-busy]") != null;
}

export function isSandboxMountEmpty(iframe: HTMLIFrameElement): boolean {
	try {
		const doc = iframe.contentDocument;
		if (!doc) return true;
		const mount = doc.getElementById("vue-interactive-mount");
		return !mount || mount.childElementCount === 0;
	} catch {
		return true;
	}
}

/**
 * Remount only when there is no live Vue output in the sandbox mount root.
 * Mount content is authoritative (with allow-same-origin); avoids remounting a
 * still-running iframe after the in-memory live flag was cleared.
 */
export function vueSandboxNeedsRemount(containerEl: HTMLElement): boolean {
	if (isVueBlockLoading(containerEl)) return false;

	const iframe = containerEl.querySelector("iframe.vue-interactive-sandbox");
	if (!(iframe instanceof HTMLIFrameElement)) {
		return (
			containerEl.getAttr(DATA_VUE_MOUNTED) === "1" ||
			containerEl.hasClass("vue-interactive-root") ||
			containerEl.hasClass("block-language-vue-interactive")
		);
	}

	if (!isSandboxMountEmpty(iframe)) {
		markContainerSandboxLive(containerEl);
		return false;
	}

	return true;
}
