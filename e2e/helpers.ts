import { browser } from "@wdio/globals";

/** Apply demo settings used by imports / MathJax / Pinia script examples. */
export async function applyExamplePluginSettings(): Promise<void> {
	await browser.executeObsidian(async ({ plugins }) => {
		const plugin = plugins.reactiveNotesVue;
		plugin.settings.customScriptPath = "scripts";
		plugin.settings.mathJaxPreamblePath = "mathjax-preamble.sty";
		await plugin.saveSettings();
	});
}

/** Wait for at least one sandbox iframe, then switch into it. */
export async function switchToSandboxFrame(index = 0): Promise<void> {
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
	const frames = await browser.$$("iframe.vue-interactive-sandbox");
	const frame = frames[index];
	if (!frame) {
		throw new Error(`sandbox iframe missing at index ${index}`);
	}
	await browser.switchFrame(frame);
}

export async function switchToParentFrame(): Promise<void> {
	await browser.switchFrame(null);
}
