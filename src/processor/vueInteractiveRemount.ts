import {
	MarkdownPostProcessorContext,
	TFile,
} from "obsidian";
import type ReactiveNotesVuePlugin from "../main";
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
import { debounce } from "../utils/debounce";
import {
	attachPreviewScrollListeners,
	forEachMarkdownPreview,
} from "./vueInteractivePreviewListeners";
import {
	blockIndexInPreview,
	pickVueBlockSourceFromMarkdown,
	resolveCodeBlockContainer,
	shouldRemountFromCodeSource,
	shouldScheduleVueBlockRemount,
	shouldSkipUnregisteredBlock,
	VUE_BLOCK_SELECTOR,
} from "./vueBlockRemountPlan";

const pluginManagedChildren = new WeakSet<VueBlockChild>();
const intersectionObserved = new WeakSet<HTMLElement>();
const remountInFlight = new WeakSet<HTMLElement>();

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
	const fromMarkdown = pickVueBlockSourceFromMarkdown(markdown, {
		indexAttr: el.getAttr(DATA_VUE_BLOCK_INDEX),
		previewIndex: root ? blockIndexInPreview(el, root) : undefined,
	});
	if (fromMarkdown != null) {
		return { sourcePath, source: fromMarkdown };
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
		shouldSkipUnregisteredBlock({
			hasVueBlock: !!existing,
			isBlockLanguage: el.matches(VUE_BLOCK_SELECTOR),
			mountedAttr: el.getAttr(DATA_VUE_MOUNTED),
		})
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
		const block = getVueBlock(node);
		if (
			!shouldScheduleVueBlockRemount({
				hasLiveSandbox: !!block?.hasLiveSandbox(),
				hasVueBlock: !!block,
				isBlockLanguage: node.matches(VUE_BLOCK_SELECTOR),
				mountedAttr: node.getAttr(DATA_VUE_MOUNTED),
				needsRemount: vueSandboxNeedsRemount(node),
			})
		) {
			return;
		}
		scheduled.add(node);
		tasks.push(ensureVueBlockMounted(node, plugin, opts));
	};

	for (const node of Array.from(root.querySelectorAll(VUE_BLOCK_SELECTOR))) {
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
		if (node.matches(VUE_BLOCK_SELECTOR)) continue;
		schedule(node);
	}

	for (const code of Array.from(
		root.querySelectorAll("code.language-vue-interactive"),
	)) {
		if (!(code instanceof HTMLElement)) continue;
		const container = resolveCodeBlockContainer(code);
		const source = code.getText().replace(/\n$/, "");
		if (
			!shouldRemountFromCodeSource({
				containerNeedsRemount: vueSandboxNeedsRemount(container),
				hasVueBlock: !!getVueBlock(container),
				isBlockLanguage: container.matches(VUE_BLOCK_SELECTOR),
				mountedAttr: container.getAttr(DATA_VUE_MOUNTED),
				source,
				alreadyScheduled: scheduled.has(container),
			})
		) {
			continue;
		}
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
