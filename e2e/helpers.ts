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
	const messages = await browser.$$(".vue-interactive-error-message");
	const texts: string[] = [];
	for (const el of messages) {
		texts.push(await el.getText());
	}
	const joined = texts.join("\n");
	if (typeof messagePart === "string") {
		expect(joined).toContain(messagePart);
	} else {
		expect(joined).toMatch(messagePart);
	}
}
