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

/**
 * Scroll the first block out of view, wait for unload to settle, then scroll
 * back while sampling host heights.
 */
export async function sampleHostHeightDuringScrollRemount(options: {
	blockIndex?: number;
	sampleMs?: number;
	sampleIntervalMs?: number;
	/** Time to stay scrolled away so virtualization can finish unload. */
	awayMs?: number;
}): Promise<{
	before: VueBlockLayoutSnapshot;
	minHostHeightAfterScrollBack: number;
	after: VueBlockLayoutSnapshot[];
	sawUnloadShell: boolean;
}> {
	const blockIndex = options.blockIndex ?? 0;
	const sampleMs = options.sampleMs ?? 5_000;
	const sampleIntervalMs = options.sampleIntervalMs ?? 50;
	const awayMs = options.awayMs ?? 1_500;

	await waitForSandboxCount(blockIndex + 1);
	await browser.pause(500);
	await ensureScrollSpacersBetweenBlocks(1100);
	const beforeAll = await snapshotVueBlockLayouts();
	const before = beforeAll[blockIndex];
	if (!before || before.hostHeight < 100) {
		throw new Error(
			`block ${blockIndex} not ready before scroll (height=${before?.hostHeight ?? 0})`,
		);
	}

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

	await scrollMarkdownPreview("top");

	let minHostHeightAfterScrollBack = Number.POSITIVE_INFINITY;
	const deadline = Date.now() + sampleMs;
	while (Date.now() < deadline) {
		const height = await browser.execute((idx) => {
			const roots = document.querySelectorAll(".vue-interactive-root");
			const root = roots[idx];
			if (!(root instanceof HTMLElement)) return 0;
			const host =
				root.querySelector(".vue-interactive-sandbox-host") ?? root;
			if (!(host instanceof HTMLElement)) return 0;
			return host.getBoundingClientRect().height;
		}, blockIndex);
		if (height > 0) {
			minHostHeightAfterScrollBack = Math.min(
				minHostHeightAfterScrollBack,
				height,
			);
		}
		await browser.pause(sampleIntervalMs);
	}
	if (!Number.isFinite(minHostHeightAfterScrollBack)) {
		minHostHeightAfterScrollBack = 0;
	}

	await waitForSandboxCount(3, 45_000);
	await browser.pause(300);
	const after = await snapshotVueBlockLayouts();

	return {
		before,
		minHostHeightAfterScrollBack,
		after,
		sawUnloadShell,
	};
}
