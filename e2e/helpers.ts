import { browser, expect } from "@wdio/globals";

/** Apply settings used by imports / MathJax / Pinia in the e2e vault. */
export async function applyE2ePluginSettings(): Promise<void> {
	await browser.executeObsidian(async ({ plugins }) => {
		const plugin = plugins.reactiveNotesVue;
		plugin.settings.customScriptPath = "scripts";
		plugin.settings.mathJaxPreamblePath = "mathjax-preamble.sty";
		await plugin.saveSettings();
	});
}

/** @deprecated Use applyE2ePluginSettings */
export const applyExamplePluginSettings = applyE2ePluginSettings;

export async function switchToParentFrame(): Promise<void> {
	await browser.switchFrame(null);
}

/**
 * Switch the active markdown leaf between reading (`preview`) and editor
 * (`source`). When `sourceMode` is true, use classic source mode (not Live Preview).
 *
 * Returns the view state after the switch so callers can assert the mode stuck.
 */
export async function switchActiveMarkdownMode(
	mode: "source" | "preview",
	sourceMode = true,
): Promise<{ mode: string; source: boolean | undefined }> {
	await switchToParentFrame();
	const state = await browser.executeObsidian(
		async ({ app, obsidian }, nextMode, useSource) => {
			const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
			if (!view) {
				throw new Error("active MarkdownView missing");
			}
			const leaf = app.workspace.getMostRecentLeaf();
			if (!leaf) {
				throw new Error("active workspace leaf missing");
			}
			const viewState = leaf.getViewState();
			const prev = (viewState.state ?? {}) as Record<string, unknown>;
			await leaf.setViewState({
				...viewState,
				state: {
					...prev,
					mode: nextMode,
					...(nextMode === "source" ? { source: useSource } : {}),
				},
			});
			// Focus editor so CM6 decorations attach to the visible source view.
			if (nextMode === "source") {
				view.editor?.focus();
			}
			const after = view.getState() as { mode?: string; source?: boolean };
			return {
				mode: String(after.mode ?? ""),
				source: after.source,
			};
		},
		mode,
		sourceMode,
	);

	if (mode === "source") {
		await browser.waitUntil(
			async () => {
				return browser.execute((wantSource) => {
					const sourceView = document.querySelector(
						".markdown-source-view.mod-cm6",
					);
					if (!(sourceView instanceof HTMLElement)) return false;
					const isLive = sourceView.classList.contains("is-live-preview");
					const hasContent = Boolean(
						sourceView.querySelector(".cm-content"),
					);
					return hasContent && isLive !== wantSource;
				}, sourceMode);
			},
			{
				timeout: 15_000,
				timeoutMsg: `expected markdown ${sourceMode ? "source" : "live-preview"} view DOM`,
			},
		);
	} else {
		await browser.$(".markdown-preview-view").waitForExist({ timeout: 15_000 });
	}

	return state;
}

/** Read active MarkdownView mode (`preview` / `source` + live-preview flag). */
export async function readActiveMarkdownMode(): Promise<{
	mode: string;
	source: boolean | undefined;
	domIsLivePreview: boolean;
	domHasSourceView: boolean;
	domHasPreviewView: boolean;
}> {
	await switchToParentFrame();
	return browser.executeObsidian(async ({ app, obsidian }) => {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		const state = (view?.getState() ?? {}) as {
			mode?: string;
			source?: boolean;
		};
		const sourceView = document.querySelector(
			".markdown-source-view.mod-cm6",
		);
		return {
			mode: String(state.mode ?? ""),
			source: state.source,
			domIsLivePreview:
				sourceView instanceof HTMLElement &&
				sourceView.classList.contains("is-live-preview"),
			domHasSourceView: sourceView != null,
			domHasPreviewView:
				document.querySelector(".markdown-preview-view") != null,
		};
	});
}

export interface VueInteractiveEditorHighlightSnapshot {
	templateTag: boolean;
	scriptHighlight: boolean;
	stringHighlight: boolean;
	cmTagCount: number;
	cmKeywordCount: number;
	cmStringCount: number;
	hasVueInteractiveFence: boolean;
	/** True when inspecting classic source mode (not Live Preview). */
	isClassicSourceMode: boolean;
}

/** Inspect CM6 decorations inside vue-interactive SFC lines (source mode). */
export async function readVueInteractiveEditorHighlight(): Promise<VueInteractiveEditorHighlightSnapshot | null> {
	await switchToParentFrame();
	return browser.execute(() => {
		const sourceView = document.querySelector(
			".markdown-source-view.mod-cm6",
		);
		if (!(sourceView instanceof HTMLElement)) {
			return null;
		}
		const isLivePreview = sourceView.classList.contains("is-live-preview");
		const content =
			sourceView.querySelector(".cm-editor .cm-content") ??
			sourceView.querySelector(".cm-content");
		if (!(content instanceof HTMLElement)) {
			return null;
		}
		const fullText = content.textContent ?? "";
		const lines = Array.from(content.querySelectorAll(".cm-line"));
		let templateTag = false;
		let scriptHighlight = false;
		let stringHighlight = false;
		for (const line of lines) {
			const text = line.textContent ?? "";
			if (/<\/?template\b/.test(text) && line.querySelector(".cm-tag")) {
				templateTag = true;
			}
			if (
				(/<\/?script\b/.test(text) ||
					/\bsetup\b/.test(text) ||
					/\bimport\b/.test(text) ||
					/\bconst\b/.test(text) ||
					/\bref\b/.test(text)) &&
				line.querySelector(".cm-tag, .cm-keyword, .cm-variable")
			) {
				scriptHighlight = true;
			}
			if (
				(/['"`]/.test(text) || /Count:/.test(text)) &&
				line.querySelector(".cm-string")
			) {
				stringHighlight = true;
			}
		}
		return {
			templateTag,
			scriptHighlight,
			stringHighlight,
			cmTagCount: content.querySelectorAll(".cm-tag").length,
			cmKeywordCount: content.querySelectorAll(".cm-keyword").length,
			cmStringCount: content.querySelectorAll(".cm-string").length,
			hasVueInteractiveFence: fullText.includes("vue-interactive"),
			isClassicSourceMode: !isLivePreview,
		};
	});
}

/** Wait until Prism-based vue-interactive editor decorations are visible. */
export async function waitForVueInteractiveEditorHighlight(
	timeout = 20_000,
): Promise<VueInteractiveEditorHighlightSnapshot> {
	let last: VueInteractiveEditorHighlightSnapshot | null = null;
	let lastMode: Awaited<ReturnType<typeof readActiveMarkdownMode>> | null =
		null;
	await browser.waitUntil(
		async () => {
			lastMode = await readActiveMarkdownMode();
			if (lastMode.mode !== "source" || lastMode.source !== true) {
				return false;
			}
			if (lastMode.domIsLivePreview) return false;
			last = await readVueInteractiveEditorHighlight();
			if (!last?.hasVueInteractiveFence) return false;
			if (!last.isClassicSourceMode) return false;
			return (
				last.templateTag &&
				last.scriptHighlight &&
				(last.cmTagCount > 0 || last.cmKeywordCount > 0)
			);
		},
		{
			timeout,
			timeoutMsg: `expected vue-interactive editor highlight in classic source mode; mode=${JSON.stringify(lastMode)} last=${JSON.stringify(last)}`,
		},
	);
	if (!last) {
		throw new Error("vue-interactive editor highlight snapshot missing");
	}
	return last;
}

/**
 * Dismiss Obsidian hover previews / popovers that can intercept clicks into
 * sandbox iframes (e.g. after opening a note while the cursor rests on a link).
 */
export async function dismissObsidianOverlays(): Promise<void> {
	await switchToParentFrame();
	await browser.keys("Escape");
	// Real pointer move off the note content (synthetic events do not clear hover previews).
	await browser
		.action("pointer", { parameters: { pointerType: "mouse" } })
		.move({ x: 4, y: 4, origin: "viewport" })
		.perform();
	await browser.execute(() => {
		for (const el of document.querySelectorAll(
			".popover, .hover-popover, .suggestion-container",
		)) {
			el.remove();
		}
	});
}

/** Wait for sandbox, dismiss host overlays, then enter the iframe. */
export async function switchToSandboxFrame(index = 0): Promise<void> {
	await dismissObsidianOverlays();
	await browser.waitUntil(
		async () => {
			const frames = await browser.$$("iframe.vue-interactive-sandbox");
			return frames.length > index;
		},
		{
			timeout: 20_000,
			timeoutMsg: `expected sandbox iframe at index ${index}`,
		},
	);
	await dismissObsidianOverlays();
	const frames = await browser.$$("iframe.vue-interactive-sandbox");
	const frame = frames[index];
	if (!frame) {
		throw new Error(`sandbox iframe missing at index ${index}`);
	}
	await browser.switchFrame(frame);
}

/**
 * Click a selector inside a sandbox iframe from the parent document.
 * Uses contentDocument.click() so Obsidian hover popovers cannot intercept.
 */
export async function clickInSandbox(
	selector: string,
	index = 0,
): Promise<void> {
	await dismissObsidianOverlays();
	await browser.waitUntil(
		async () => {
			return browser.execute(
				(sel, i) => {
					const iframe = document.querySelectorAll(
						"iframe.vue-interactive-sandbox",
					)[i];
					if (!(iframe instanceof HTMLIFrameElement)) {
						return false;
					}
					return Boolean(iframe.contentDocument?.querySelector(sel));
				},
				selector,
				index,
			);
		},
		{
			timeout: 20_000,
			timeoutMsg: `expected ${selector} in sandbox ${index}`,
		},
	);
	await dismissObsidianOverlays();
	await browser.execute(
		(sel, i) => {
			const iframe = document.querySelectorAll(
				"iframe.vue-interactive-sandbox",
			)[i];
			if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentDocument) {
				throw new Error(`sandbox iframe ${i} missing`);
			}
			const el = iframe.contentDocument.querySelector(sel);
			if (!el || typeof el.click !== "function") {
				throw new Error(`${sel} missing in sandbox ${i}`);
			}
			el.click();
		},
		selector,
		index,
	);
}

/** Assert a compile/load error panel is shown (outside the sandbox). */
export async function expectCompileError(
	messagePart?: string | RegExp,
): Promise<void> {
	const error = browser.$(".vue-interactive-error");
	await error.waitForExist({ timeout: 20_000 });
	await expect(error).toBeExisting();
	if (messagePart != null) {
		const text = await browser.$(".vue-interactive-error-message").getText();
		if (typeof messagePart === "string") {
			expect(text).toContain(messagePart);
		} else {
			expect(text).toMatch(messagePart);
		}
	}
}

/** Assert a runtime error panel under a mounted block. */
export async function expectRuntimeError(
	messagePart?: string | RegExp,
): Promise<void> {
	const host = browser.$(".vue-interactive-runtime-error-host");
	await host.waitForExist({ timeout: 20_000 });
	const title = host.$(".vue-interactive-error-title");
	await title.waitForExist({ timeout: 10_000 });
	const titleText = await title.getText();
	expect(titleText).toContain("运行时");
	if (messagePart != null) {
		const text = await host.$(".vue-interactive-error-message").getText();
		if (typeof messagePart === "string") {
			expect(text).toContain(messagePart);
		} else {
			expect(text).toMatch(messagePart);
		}
	}
}

/**
 * Setup/mount failures may surface as either a top-level error panel or a
 * runtime-error host depending on when they throw.
 */
export async function expectErrorPanel(
	messagePart?: string | RegExp,
): Promise<void> {
	await browser.waitUntil(
		async () => {
			const compile = await browser.$(".vue-interactive-error").isExisting();
			const runtime = await browser
				.$(".vue-interactive-runtime-error-host .vue-interactive-error")
				.isExisting();
			return compile || runtime;
		},
		{
			timeout: 20_000,
			timeoutMsg: "expected compile or runtime error panel",
		},
	);
	if (messagePart == null) {
		return;
	}
	await browser.waitUntil(
		async () => {
			const messages = await browser.$$(".vue-interactive-error-message");
			const texts: string[] = [];
			for (const el of messages) {
				texts.push(await el.getText());
			}
			const joined = texts.join("\n");
			if (typeof messagePart === "string") {
				return joined.includes(messagePart);
			}
			return messagePart.test(joined);
		},
		{
			timeout: 10_000,
			timeoutMsg: `expected error message matching ${String(messagePart)}`,
		},
	);
}

export interface VueBlockLayoutSnapshot {
	index: number;
	hostHeight: number;
	iframeHeight: number;
	lastHeightAttr: number | null;
	hostMinHeight: number | null;
	hasIframe: boolean;
	hasPlaceholder: boolean;
}

/** Reading-view scroll container for the active markdown preview. */
export async function getMarkdownPreviewScroller(): Promise<WebdriverIO.Element> {
	await switchToParentFrame();
	const scroller = browser.$(".markdown-preview-view");
	await scroller.waitForExist({ timeout: 15_000 });
	return scroller;
}

export async function scrollMarkdownPreview(
	position: "top" | "bottom" | number,
): Promise<void> {
	await switchToParentFrame();
	await browser.execute((pos) => {
		const el = document.querySelector(".markdown-preview-view");
		if (!(el instanceof HTMLElement)) {
			throw new Error("markdown preview scroller missing");
		}
		if (pos === "top") {
			el.scrollTop = 0;
		} else if (pos === "bottom") {
			el.scrollTop = el.scrollHeight;
		} else {
			el.scrollTop = pos;
		}
		el.dispatchEvent(new Event("scroll", { bubbles: true }));
	}, position);
}

export async function waitForSandboxCount(
	count: number,
	timeout = 30_000,
): Promise<void> {
	await switchToParentFrame();
	await browser.waitUntil(
		async () => {
			const frames = await browser.$$("iframe.vue-interactive-sandbox");
			return frames.length >= count;
		},
		{
			timeout,
			timeoutMsg: `expected at least ${count} sandbox iframes`,
		},
	);
}

/**
 * Insert tall spacers between mounted blocks so reading-view virtualization
 * can unload off-screen sandboxes (HTML spacers in markdown may be stripped).
 */
export async function ensureScrollSpacersBetweenBlocks(
	heightPx = 1100,
): Promise<void> {
	await switchToParentFrame();
	await browser.execute((h) => {
		const roots = Array.from(
			document.querySelectorAll(".vue-interactive-root"),
		);
		for (let i = 0; i < roots.length - 1; i++) {
			const root = roots[i];
			if (!(root instanceof HTMLElement)) continue;
			const next = root.nextElementSibling;
			if (
				next instanceof HTMLElement &&
				next.dataset.e2eScrollSpacer === "1"
			) {
				next.style.height = `${h}px`;
				continue;
			}
			const spacer = document.createElement("div");
			spacer.dataset.e2eScrollSpacer = "1";
			spacer.style.height = `${h}px`;
			spacer.setAttribute("aria-hidden", "true");
			root.insertAdjacentElement("afterend", spacer);
		}
		const last = roots[roots.length - 1];
		if (last instanceof HTMLElement) {
			const existing = last.parentElement?.querySelector(
				'[data-e2e-scroll-spacer="footer"]',
			);
			if (existing instanceof HTMLElement) {
				existing.style.height = `${h}px`;
			} else {
				const footer = document.createElement("div");
				footer.dataset.e2eScrollSpacer = "footer";
				footer.style.height = `${h}px`;
				footer.setAttribute("aria-hidden", "true");
				last.insertAdjacentElement("afterend", footer);
			}
		}
	}, heightPx);
}

/** Layout metrics for each `.vue-interactive-root` in document order. */
export async function snapshotVueBlockLayouts(): Promise<VueBlockLayoutSnapshot[]> {
	await switchToParentFrame();
	return browser.execute(() => {
		const roots = Array.from(
			document.querySelectorAll(".vue-interactive-root"),
		);
		return roots.map((root, index) => {
			const host =
				root.querySelector(".vue-interactive-sandbox-host") ?? root;
			const iframe = root.querySelector(
				"iframe.vue-interactive-sandbox",
			) as HTMLIFrameElement | null;
			const lastRaw = root.getAttribute("data-vue-last-height");
			const minRaw =
				host instanceof HTMLElement ? host.style.minHeight : null;
			const parse = (raw: string | null): number | null => {
				if (raw == null || raw === "") return null;
				const n = Number.parseFloat(raw);
				if (!Number.isFinite(n) || n <= 0) return null;
				return Math.ceil(n);
			};
			return {
				index,
				hostHeight:
					host instanceof HTMLElement ? host.getBoundingClientRect().height : 0,
				iframeHeight: iframe
					? Number.parseFloat(iframe.style.height) ||
						iframe.getBoundingClientRect().height
					: 0,
				lastHeightAttr: parse(lastRaw),
				hostMinHeight: parse(minRaw),
				hasIframe: iframe != null,
				hasPlaceholder:
					root.querySelector(".vue-interactive-placeholder") != null,
			};
		});
	});
}

const E2E_HOST_HEIGHT_WATCH_KEY = "__e2eVueHostHeightWatch";
/** Cap ResizeObserver samples so CDP serialization cannot freeze the runner. */
const E2E_HOST_HEIGHT_WATCH_MAX_SAMPLES = 256;

export interface HostHeightResizeSample {
	t: number;
	height: number;
}

export interface HostHeightResizeWatchResult {
	baseline: number;
	samples: HostHeightResizeSample[];
	minHeight: number;
	maxHeight: number;
	/** Largest |height - baseline| across ResizeObserver samples. */
	maxAbsDeltaFromBaseline: number;
}

function summarizeHostHeightSamples(
	baseline: number,
	samples: HostHeightResizeSample[],
): HostHeightResizeWatchResult {
	if (samples.length === 0) {
		return {
			baseline,
			samples,
			minHeight: 0,
			maxHeight: 0,
			maxAbsDeltaFromBaseline: baseline,
		};
	}
	let minHeight = Number.POSITIVE_INFINITY;
	let maxHeight = 0;
	let maxAbsDeltaFromBaseline = 0;
	for (const sample of samples) {
		minHeight = Math.min(minHeight, sample.height);
		maxHeight = Math.max(maxHeight, sample.height);
		maxAbsDeltaFromBaseline = Math.max(
			maxAbsDeltaFromBaseline,
			Math.abs(sample.height - baseline),
		);
	}
	return {
		baseline,
		samples,
		minHeight,
		maxHeight,
		maxAbsDeltaFromBaseline,
	};
}

/** Install ResizeObserver (+ light rebind poll) for a vue-interactive host. */
export async function startVueBlockHostHeightWatch(
	blockIndex: number,
	baseline: number,
): Promise<void> {
	await switchToParentFrame();
	await browser.execute(
		(idx, base, key, maxSamples) => {
			const w = window;
			const prev = w[key];
			if (prev) {
				if (prev.ro) prev.ro.disconnect();
				if (prev.mo) prev.mo.disconnect();
				if (prev.rebindTimer) clearInterval(prev.rebindTimer);
			}

			const state = {
				blockIndex: idx,
				baseline: base,
				scrollBackAt: null,
				samples: [],
				lastHeight: -1,
				ro: null,
				rebindTimer: null,
				observed: null,
			};

			const resolveHost = () => {
				const roots = document.querySelectorAll(".vue-interactive-root");
				const root = roots[idx];
				if (!(root instanceof HTMLElement)) return null;
				const host =
					root.querySelector(".vue-interactive-sandbox-host") || root;
				return host instanceof HTMLElement ? host : null;
			};

			const record = (host) => {
				const height = host.getBoundingClientRect().height;
				if (!(height > 0)) return;
				// Ignore sub-pixel noise; avoid unbounded sample growth.
				if (Math.abs(height - state.lastHeight) < 1) return;
				state.lastHeight = height;
				if (state.samples.length >= maxSamples) {
					state.samples.shift();
				}
				state.samples.push({ t: performance.now(), height: height });
			};

			const bind = () => {
				const host = resolveHost();
				if (!host) {
					state.observed = null;
					if (state.ro) {
						state.ro.disconnect();
						state.ro = null;
					}
					return;
				}
				if (host === state.observed) {
					record(host);
					return;
				}
				if (state.ro) state.ro.disconnect();
				state.observed = host;
				state.ro = new ResizeObserver(() => {
					record(host);
				});
				state.ro.observe(host);
				record(host);
			};

			// Poll instead of MutationObserver(subtree): preview virtualization
			// mutates constantly and was freezing the Obsidian UI / WDIO bridge.
			state.rebindTimer = setInterval(bind, 100);
			bind();
			w[key] = state;
		},
		blockIndex,
		baseline,
		E2E_HOST_HEIGHT_WATCH_KEY,
		E2E_HOST_HEIGHT_WATCH_MAX_SAMPLES,
	);
}

/** Mark the moment scroll-back begins; later samples are remount-sensitive. */
export async function markVueBlockHostHeightScrollBack(): Promise<void> {
	await switchToParentFrame();
	await browser.execute((key) => {
		const state = window[key];
		if (!state) {
			throw new Error("host height ResizeObserver watch is not running");
		}
		state.scrollBackAt = performance.now();
		state.observed = null;
		state.lastHeight = -1;
		const roots = document.querySelectorAll(".vue-interactive-root");
		const root = roots[state.blockIndex];
		if (!(root instanceof HTMLElement)) return;
		const host =
			root.querySelector(".vue-interactive-sandbox-host") || root;
		if (!(host instanceof HTMLElement)) return;
		if (state.ro) state.ro.disconnect();
		state.observed = host;
		state.ro = new ResizeObserver(() => {
			const height = host.getBoundingClientRect().height;
			if (!(height > 0)) return;
			if (Math.abs(height - state.lastHeight) < 1) return;
			state.lastHeight = height;
			if (state.samples.length >= 256) state.samples.shift();
			state.samples.push({ t: performance.now(), height: height });
		});
		state.ro.observe(host);
		const height = host.getBoundingClientRect().height;
		if (height > 0) {
			state.lastHeight = height;
			state.samples.push({ t: performance.now(), height: height });
		}
	}, E2E_HOST_HEIGHT_WATCH_KEY);
}

/**
 * Stop the watch and return ResizeObserver samples after scroll-back
 * (falls back to all samples if scroll-back was never marked).
 */
export async function stopVueBlockHostHeightWatch(): Promise<HostHeightResizeWatchResult> {
	await switchToParentFrame();
	const raw = await browser.execute((key) => {
		const state = window[key];
		if (!state) {
			throw new Error("host height ResizeObserver watch is not running");
		}
		if (state.ro) state.ro.disconnect();
		if (state.mo) state.mo.disconnect();
		if (state.rebindTimer) clearInterval(state.rebindTimer);
		const scrollBackAt = state.scrollBackAt;
		const samples =
			scrollBackAt == null
				? state.samples.slice()
				: state.samples.filter((s) => s.t >= scrollBackAt);
		delete window[key];
		return {
			baseline: state.baseline,
			samples: samples,
		};
	}, E2E_HOST_HEIGHT_WATCH_KEY);

	return summarizeHostHeightSamples(raw.baseline, raw.samples);
}

/**
 * Scroll the first block out of view, wait for unload to settle, then scroll
 * back while a ResizeObserver records host height (no polling).
 */
export async function sampleHostHeightDuringScrollRemount(options: {
	blockIndex?: number;
	/** Expected sandbox iframes after scroll-back remount. */
	sandboxCount?: number;
	/** Spacer height injected between / after blocks. */
	spacerHeightPx?: number;
	/** Extra settle time after sandboxes remount while ResizeObserver is still on. */
	sampleMs?: number;
	/** Time to stay scrolled away so virtualization can finish unload. */
	awayMs?: number;
}): Promise<{
	before: VueBlockLayoutSnapshot;
	/** ResizeObserver samples from scroll-back through remount settle. */
	resizeWatch: HostHeightResizeWatchResult;
	after: VueBlockLayoutSnapshot[];
	sawUnloadShell: boolean;
}> {
	const blockIndex = options.blockIndex ?? 0;
	const sandboxCount = options.sandboxCount ?? 3;
	const spacerHeightPx = options.spacerHeightPx ?? 1100;
	const sampleMs = options.sampleMs ?? 2_000;
	const awayMs = options.awayMs ?? 1_500;

	await waitForSandboxCount(Math.max(blockIndex + 1, sandboxCount));
	await browser.pause(500);
	await ensureScrollSpacersBetweenBlocks(spacerHeightPx);
	const beforeAll = await snapshotVueBlockLayouts();
	const before = beforeAll[blockIndex];
	if (!before || before.hostHeight < 100) {
		throw new Error(
			`block ${blockIndex} not ready before scroll (height=${before?.hostHeight ?? 0})`,
		);
	}

	await startVueBlockHostHeightWatch(blockIndex, before.hostHeight);

	await scrollMarkdownPreview("bottom");

	let sawUnloadShell = false;
	try {
		await browser.waitUntil(
			async () => {
				const snaps = await snapshotVueBlockLayouts();
				const first = snaps[0];
				// Unload may remove the root, leave a placeholder, or drop the iframe.
				if (!first) {
					sawUnloadShell = true;
					return true;
				}
				if (first.hasPlaceholder || !first.hasIframe) {
					sawUnloadShell = true;
					return true;
				}
				// Fallback: first root scrolled far above the viewport.
				return browser.execute(() => {
					const root = document.querySelector(".vue-interactive-root");
					if (!(root instanceof HTMLElement)) return true;
					return root.getBoundingClientRect().bottom < -40;
				});
			},
			{
				timeout: 8_000,
				timeoutMsg: "expected first vue-interactive block to unload or leave view",
			},
		);
	} catch {
		// Some Obsidian builds keep off-screen sections mounted; still exercise scroll-back.
		sawUnloadShell = false;
	}

	// Let MarkdownRenderChild.onunload + shell restore finish before scrolling back.
	await browser.pause(awayMs);

	await markVueBlockHostHeightScrollBack();
	await scrollMarkdownPreview("top");
	await waitForSandboxCount(sandboxCount, 45_000);

	// Wait until the target block is a live mount with real layout — not an
	// empty host mid-remount (height 0) or a loading shell.
	await browser.waitUntil(
		async () => {
			const snaps = await snapshotVueBlockLayouts();
			const block = snaps[blockIndex];
			return (
				!!block &&
				block.hasIframe &&
				!block.hasPlaceholder &&
				block.hostHeight > 100
			);
		},
		{
			timeout: 45_000,
			timeoutMsg: `expected block ${blockIndex} live host height > 100 after scroll-back`,
		},
	);
	await browser.pause(sampleMs);

	const resizeWatch = await stopVueBlockHostHeightWatch();

	// Re-check live layout when capturing `after` so we do not race an empty().
	let after: VueBlockLayoutSnapshot[] = [];
	await browser.waitUntil(
		async () => {
			after = await snapshotVueBlockLayouts();
			const block = after[blockIndex];
			return (
				!!block &&
				block.hasIframe &&
				!block.hasPlaceholder &&
				block.hostHeight > 100
			);
		},
		{
			timeout: 15_000,
			timeoutMsg: `expected block ${blockIndex} live after snapshot`,
		},
	);

	return {
		before,
		resizeWatch,
		after,
		sawUnloadShell,
	};
}

/** Read text content of a selector inside sandbox iframe `index`. */
export async function readSandboxText(
	selector: string,
	index = 0,
): Promise<string | null> {
	await switchToParentFrame();
	return browser.execute(
		(sel, i) => {
			const iframe = document.querySelectorAll(
				"iframe.vue-interactive-sandbox",
			)[i];
			if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentDocument) {
				return null;
			}
			const el = iframe.contentDocument.querySelector(sel);
			return el?.textContent ?? null;
		},
		selector,
		index,
	);
}

/** Wait until a sandbox element’s textContent equals `text`. */
export async function waitForSandboxText(
	selector: string,
	text: string,
	index = 0,
	timeout = 45_000,
): Promise<void> {
	let last: string | null = null;
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		last = await readSandboxText(selector, index);
		if (last === text) return;
		await browser.pause(200);
	}
	throw new Error(
		`expected sandbox ${index} ${selector} text "${text}" (last=${JSON.stringify(last)})`,
	);
}

/**
 * Simulate reading-view virtualization unload: drop the iframe, keep
 * `data-vue-last-height` + host minHeight so remount can reserve space.
 * Returns the reserved height in CSS pixels.
 */
export async function forceVueBlockUnloadShell(
	blockIndex = 0,
): Promise<number> {
	await switchToParentFrame();
	return browser.execute((idx) => {
		const roots = document.querySelectorAll(".vue-interactive-root");
		const root = roots[idx];
		if (!(root instanceof HTMLElement)) {
			throw new Error(`vue-interactive root ${idx} missing`);
		}
		const host =
			root.querySelector(".vue-interactive-sandbox-host") ?? root;
		if (!(host instanceof HTMLElement)) {
			throw new Error("sandbox host missing");
		}
		const iframe = root.querySelector("iframe.vue-interactive-sandbox");
		let height = host.getBoundingClientRect().height;
		if (
			(!(height > 0) || !Number.isFinite(height)) &&
			iframe instanceof HTMLElement
		) {
			height = iframe.getBoundingClientRect().height;
		}
		const h = Math.ceil(height);
		if (!(h > 0)) {
			throw new Error(`cannot reserve unload height (got ${height})`);
		}
		root.setAttribute("data-vue-last-height", String(h));
		host.style.minHeight = `${h}px`;
		iframe?.remove();
		host.replaceChildren();
		return h;
	}, blockIndex);
}

/** Fire preview scroll so the plugin’s remount scanner picks up stale blocks. */
export async function triggerVueBlockRemountScan(): Promise<void> {
	await switchToParentFrame();
	await browser.execute(() => {
		const el = document.querySelector(".markdown-preview-view");
		if (!(el instanceof HTMLElement)) {
			throw new Error("markdown preview scroller missing");
		}
		el.dispatchEvent(new Event("scroll", { bubbles: true }));
	});
	// Reading remount is debounced (~80ms).
	await browser.pause(150);
	await browser.execute(() => {
		const el = document.querySelector(".markdown-preview-view");
		if (el instanceof HTMLElement) {
			el.dispatchEvent(new Event("scroll", { bubbles: true }));
		}
	});
}

/** Wait until a vue-interactive host reaches at least `minHeightPx`. */
export async function waitForVueBlockHostHeight(
	blockIndex: number,
	minHeightPx: number,
	timeout = 15_000,
): Promise<VueBlockLayoutSnapshot> {
	let last: VueBlockLayoutSnapshot | undefined;
	await browser.waitUntil(
		async () => {
			const snaps = await snapshotVueBlockLayouts();
			last = snaps[blockIndex];
			return !!last && last.hostHeight >= minHeightPx;
		},
		{
			timeout,
			timeoutMsg: `expected block ${blockIndex} host height >= ${minHeightPx} (last=${last?.hostHeight ?? 0})`,
		},
	);
	if (!last) {
		throw new Error(`block ${blockIndex} missing after height wait`);
	}
	return last;
}

/** Wait until host height is within `tolerancePx` of `targetPx`. */
export async function waitForVueBlockHostHeightNear(
	blockIndex: number,
	targetPx: number,
	tolerancePx = 120,
	timeout = 20_000,
): Promise<VueBlockLayoutSnapshot> {
	let last: VueBlockLayoutSnapshot | undefined;
	let lastCount = 0;
	await browser.waitUntil(
		async () => {
			const snaps = await snapshotVueBlockLayouts();
			lastCount = snaps.length;
			last = snaps[blockIndex];
			return (
				!!last &&
				last.hasIframe &&
				!last.hasPlaceholder &&
				last.hostHeight > 0 &&
				Math.abs(last.hostHeight - targetPx) <= tolerancePx
			);
		},
		{
			timeout,
			timeoutMsg: `expected block ${blockIndex} host height near ${targetPx}±${tolerancePx} (blocks=${lastCount}, last=${
				last
					? `h=${last.hostHeight}, iframe=${last.hasIframe}, ph=${last.hasPlaceholder}, min=${last.hostMinHeight}, attr=${last.lastHeightAttr}`
					: "missing"
			})`,
		},
	);
	if (!last) {
		throw new Error(`block ${blockIndex} missing after near-height wait`);
	}
	return last;
}

/** Wait until host height falls to at most `maxHeightPx` (e.g. after state reset). */
export async function waitForVueBlockHostHeightAtMost(
	blockIndex: number,
	maxHeightPx: number,
	timeout = 20_000,
): Promise<VueBlockLayoutSnapshot> {
	let last: VueBlockLayoutSnapshot | undefined;
	await browser.waitUntil(
		async () => {
			const snaps = await snapshotVueBlockLayouts();
			last = snaps[blockIndex];
			return (
				!!last &&
				last.hasIframe &&
				!last.hasPlaceholder &&
				last.hostHeight > 0 &&
				last.hostHeight <= maxHeightPx
			);
		},
		{
			timeout,
			timeoutMsg: `expected block ${blockIndex} host height <= ${maxHeightPx} (last=${last?.hostHeight ?? 0})`,
		},
	);
	if (!last) {
		throw new Error(`block ${blockIndex} missing after max-height wait`);
	}
	return last;
}

/**
 * Split ResizeObserver samples into the reserved/expanded hold prefix and the
 * post-reset settled suffix (first sample at/below the midpoint).
 */
export function splitExpandRemountHeightPhases(options: {
	initialHeight: number;
	expandedHeight: number;
	samples: HostHeightResizeSample[];
}): {
	holdSamples: HostHeightResizeSample[];
	settledSamples: HostHeightResizeSample[];
	hold: HostHeightResizeWatchResult;
	settled: HostHeightResizeWatchResult;
} {
	const mid = (options.initialHeight + options.expandedHeight) / 2;
	const samples = options.samples;
	let firstSettle = -1;
	for (let i = 0; i < samples.length; i++) {
		const sample = samples[i];
		if (sample && sample.height <= mid) {
			firstSettle = i;
			break;
		}
	}
	const holdSamples =
		firstSettle < 0 ? samples.slice() : samples.slice(0, firstSettle);
	const settledSamples = firstSettle < 0 ? [] : samples.slice(firstSettle);
	return {
		holdSamples,
		settledSamples,
		hold: summarizeHostHeightSamples(options.expandedHeight, holdSamples),
		settled: summarizeHostHeightSamples(options.initialHeight, settledSamples),
	};
}
