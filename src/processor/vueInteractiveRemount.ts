import {
	MarkdownPostProcessorContext,
	MarkdownView,
	TFile,
} from "obsidian";
import type ReactiveNotesVuePlugin from "../main";
import { listVisibleVueInteractiveBlocks } from "../markdown/vueInteractiveFence";
import { VueBlockChild } from "../runtime/VueBlockChild";
import {
	DATA_VUE_BLOCK_INDEX,
	DATA_VUE_MOUNTED,
	DATA_VUE_SOURCE_PATH,
	vueSandboxNeedsRemount,
} from "../runtime/vueBlockRemountMetadata";
import {
	getVueBlock,
	registerVueBlock,
	registerVueBlockInsertRemount,
} from "../runtime/vueBlockRegistry";

const pluginManagedChildren = new WeakSet<VueBlockChild>();
const intersectionObserved = new WeakSet<HTMLElement>();
const scrollListenerAttached = new WeakSet<HTMLElement>();
const remountInFlight = new WeakSet<HTMLElement>();

const BLOCK_SELECTOR = ".block-language-vue-interactive";

function debounce(fn: () => void, ms: number): () => void {
	let timer: ReturnType<typeof setTimeout> | null = null;
	return () => {
		if (timer != null) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = null;
			fn();
		}, ms);
	};
}

function blockIndexInPreview(el: HTMLElement, root: ParentNode): number {
	return Array.from(root.querySelectorAll(BLOCK_SELECTOR)).indexOf(el);
}

function resolveCodeBlockContainer(code: HTMLElement): HTMLElement {
	const block = code.closest(BLOCK_SELECTOR);
	if (block instanceof HTMLElement) return block;
	const pre = code.closest("pre");
	if (pre?.parentElement instanceof HTMLElement) return pre.parentElement;
	return code.parentElement ?? code;
}

export async function resolveVueBlockSource(
	el: HTMLElement,
	plugin: ReactiveNotesVuePlugin,
	fallbackSourcePath?: string,
	root?: ParentNode,
): Promise<{ sourcePath: string; source: string } | null> {
	const sourcePath =
		el.getAttr(DATA_VUE_SOURCE_PATH) ?? fallbackSourcePath ?? "";
	if (!sourcePath) return null;

	const file = plugin.app.vault.getAbstractFileByPath(sourcePath);
	if (!(file instanceof TFile)) return null;

	const markdown = await plugin.app.vault.read(file);
	const indexAttr = el.getAttr(DATA_VUE_BLOCK_INDEX);
	if (indexAttr != null) {
		const idx = Number.parseInt(indexAttr, 10);
		if (!Number.isNaN(idx)) {
			const blocks = listVisibleVueInteractiveBlocks(markdown);
			const block = blocks[idx];
			if (block) return { sourcePath, source: block.content };
		}
	}

	if (root) {
		const idx = blockIndexInPreview(el, root);
		if (idx >= 0) {
			const blocks = listVisibleVueInteractiveBlocks(markdown);
			const block = blocks[idx];
			if (block) return { sourcePath, source: block.content };
		}
	}

	const code = el.querySelector("code.language-vue-interactive");
	if (code instanceof HTMLElement) {
		const text = code.getText().replace(/\n$/, "");
		if (text.trim()) return { sourcePath, source: text };
	}

	return null;
}

export function registerVueBlockIntersectionRemount(
	containerEl: HTMLElement,
): void {
	if (intersectionObserved.has(containerEl)) return;
	intersectionObserved.add(containerEl);

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const block = getVueBlock(containerEl);
				if (!block || block.hasLiveSandbox()) continue;
				if (!vueSandboxNeedsRemount(containerEl)) continue;
				void block.remountIfNeeded();
			}
		},
		{ rootMargin: "200px 0px", threshold: 0 },
	);
	observer.observe(containerEl);
}

export async function ensureVueBlockMounted(
	el: HTMLElement,
	plugin: ReactiveNotesVuePlugin,
	options?: {
		ctx?: MarkdownPostProcessorContext;
		knownSource?: string;
		sourcePath?: string;
		root?: ParentNode;
	},
): Promise<void> {
	const { ctx, knownSource, sourcePath, root } = options ?? {};
	if (!el.isConnected) return;

	const existing = getVueBlock(el);
	if (
		!existing &&
		el.matches(BLOCK_SELECTOR) &&
		el.getAttr(DATA_VUE_MOUNTED) !== "1"
	) {
		return;
	}
	if (existing?.hasLiveSandbox()) return;
	if (!vueSandboxNeedsRemount(el)) return;
	if (remountInFlight.has(el)) return;

	remountInFlight.add(el);
	try {
		let child = existing;
		if (!child) {
			const resolved =
				knownSource != null && (sourcePath ?? ctx?.sourcePath)
					? {
							sourcePath: sourcePath ?? ctx!.sourcePath,
							source: knownSource,
						}
					: await resolveVueBlockSource(
							el,
							plugin,
							sourcePath ?? ctx?.sourcePath,
							root,
						);
			if (!resolved) return;

			child = new VueBlockChild(
				el,
				plugin,
				resolved.sourcePath,
				resolved.source,
			);
			registerVueBlock(el, child);
			registerVueBlockInsertRemount(el);
			registerVueBlockIntersectionRemount(el);
			if (ctx) {
				ctx.addChild(child);
			} else if (!pluginManagedChildren.has(child)) {
				plugin.addChild(child);
				pluginManagedChildren.add(child);
			}
		}

		if (vueSandboxNeedsRemount(el)) {
			await child.remountIfNeeded();
		}
	} finally {
		remountInFlight.delete(el);
	}
}

export function remountStaleVueInteractiveIn(
	root: ParentNode,
	plugin: ReactiveNotesVuePlugin,
	ctx?: MarkdownPostProcessorContext,
	sourcePath?: string,
): void {
	const tasks: Promise<void>[] = [];
	const opts = { ctx, sourcePath, root };
	const scheduled = new Set<HTMLElement>();

	const schedule = (node: HTMLElement): void => {
		if (scheduled.has(node)) return;
		if (getVueBlock(node)?.hasLiveSandbox()) return;
		if (
			!getVueBlock(node) &&
			node.matches(BLOCK_SELECTOR) &&
			node.getAttr(DATA_VUE_MOUNTED) !== "1"
		) {
			return;
		}
		if (!vueSandboxNeedsRemount(node)) return;
		scheduled.add(node);
		tasks.push(ensureVueBlockMounted(node, plugin, opts));
	};

	for (const node of Array.from(root.querySelectorAll(BLOCK_SELECTOR))) {
		if (!(node instanceof HTMLElement)) continue;
		schedule(node);
	}

	for (const node of Array.from(
		root.querySelectorAll(".vue-interactive-root"),
	)) {
		if (!(node instanceof HTMLElement)) continue;
		schedule(node);
	}

	for (const node of Array.from(
		root.querySelectorAll(`[${DATA_VUE_MOUNTED}]`),
	)) {
		if (!(node instanceof HTMLElement)) continue;
		if (node.matches(BLOCK_SELECTOR)) continue;
		schedule(node);
	}

	for (const code of Array.from(
		root.querySelectorAll("code.language-vue-interactive"),
	)) {
		if (!(code instanceof HTMLElement)) continue;
		const container = resolveCodeBlockContainer(code);
		if (!vueSandboxNeedsRemount(container)) continue;
		if (getVueBlock(container)) continue;
		if (
			container.matches(BLOCK_SELECTOR) &&
			container.getAttr(DATA_VUE_MOUNTED) !== "1"
		) {
			continue;
		}
		const source = code.getText().replace(/\n$/, "");
		if (!source.trim()) continue;
		if (scheduled.has(container)) continue;
		scheduled.add(container);
		tasks.push(
			ensureVueBlockMounted(container, plugin, {
				...opts,
				knownSource: source,
			}),
		);
	}

	if (tasks.length === 0) return;
	void Promise.all(tasks).catch((e) => {
		const err = e instanceof Error ? e : new Error(String(e));
		console.error("remount vue-interactive blocks", err);
	});
}

function forEachMarkdownPreview(
	plugin: ReactiveNotesVuePlugin,
	fn: (root: HTMLElement, sourcePath: string) => void,
): void {
	plugin.app.workspace.iterateAllLeaves((leaf) => {
		const { view } = leaf;
		if (!(view instanceof MarkdownView) || !view.file) return;
		if (view.getMode() === "source") return;
		const root = view.previewMode?.containerEl ?? view.contentEl;
		fn(root, view.file.path);
	});
}

function attachPreviewScrollListeners(
	plugin: ReactiveNotesVuePlugin,
	scheduleRemount: () => void,
): void {
	forEachMarkdownPreview(plugin, (root) => {
		const scrollers = [
			root,
			root.querySelector(".markdown-preview-view"),
			root.querySelector(".markdown-preview-sizer"),
		];
		for (const el of scrollers) {
			if (!(el instanceof HTMLElement)) continue;
			if (scrollListenerAttached.has(el)) continue;
			scrollListenerAttached.add(el);
			plugin.registerDomEvent(el, "scroll", scheduleRemount, {
				passive: true,
			});
		}
	});
}

export function registerVueInteractiveReadingRemount(
	plugin: ReactiveNotesVuePlugin,
): void {
	const scheduleRemount = debounce(() => {
		forEachMarkdownPreview(plugin, (root, sourcePath) => {
			remountStaleVueInteractiveIn(root, plugin, undefined, sourcePath);
		});
	}, 80);

	plugin.registerEvent(
		plugin.app.workspace.on("active-leaf-change", () => {
			scheduleRemount();
			attachPreviewScrollListeners(plugin, scheduleRemount);
		}),
	);

	plugin.registerMarkdownPostProcessor(
		(sectionEl, ctx) => {
			queueMicrotask(() => {
				remountStaleVueInteractiveIn(
					sectionEl,
					plugin,
					ctx,
					ctx.sourcePath,
				);
			});
		},
		100,
	);

	queueMicrotask(() => {
		attachPreviewScrollListeners(plugin, scheduleRemount);
	});
}
