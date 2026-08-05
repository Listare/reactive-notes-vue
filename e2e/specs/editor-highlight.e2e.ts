import { browser, expect } from "@wdio/globals";
import { describe, it, before } from "mocha";
import { obsidianPage } from "wdio-obsidian-service";
import {
	applyE2ePluginSettings,
	readActiveMarkdownMode,
	switchActiveMarkdownMode,
	switchToParentFrame,
	switchToSandboxFrame,
	waitForVueInteractiveEditorHighlight,
} from "../helpers";

describe("vue-interactive editor highlight e2e", function () {
	before(async function () {
		await applyE2ePluginSettings();
	});

	it("applies vue-like CM decorations in source mode", async function () {
		await obsidianPage.openFile("editor-highlight.md");
		try {
			const switched = await switchActiveMarkdownMode("source", true);
			expect(switched.mode).toBe("source");
			expect(switched.source).toBe(true);

			const mode = await readActiveMarkdownMode();
			expect(mode.mode).toBe("source");
			expect(mode.source).toBe(true);
			expect(mode.domHasSourceView).toBe(true);
			expect(mode.domIsLivePreview).toBe(false);

			const snap = await waitForVueInteractiveEditorHighlight();
			expect(snap.isClassicSourceMode).toBe(true);
			expect(snap.hasVueInteractiveFence).toBe(true);
			expect(snap.templateTag).toBe(true);
			expect(snap.scriptHighlight).toBe(true);
			expect(snap.cmTagCount + snap.cmKeywordCount).toBeGreaterThan(0);
		} finally {
			// Vault default is reading view; restore so later specs see sandboxes.
			await switchActiveMarkdownMode("preview");
		}
	});

	it("still mounts the sandbox in reading mode", async function () {
		await obsidianPage.openFile("editor-highlight.md");
		await switchActiveMarkdownMode("preview");
		const mode = await readActiveMarkdownMode();
		expect(mode.mode).toBe("preview");

		await switchToSandboxFrame(0);
		const btn = browser.$("button.hl-btn");
		await btn.waitForExist({ timeout: 20_000 });
		await expect(btn).toHaveText("Count: 0");
		await switchToParentFrame();
	});
});
