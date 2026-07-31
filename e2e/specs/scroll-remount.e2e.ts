import { browser, expect } from "@wdio/globals";
import { describe, it, before } from "mocha";
import { obsidianPage } from "wdio-obsidian-service";
import {
	applyE2ePluginSettings,
	clickInSandbox,
	ensureScrollSpacersBetweenBlocks,
	sampleHostHeightDuringScrollRemount,
	scrollMarkdownPreview,
	snapshotVueBlockLayouts,
	switchToParentFrame,
	switchToSandboxFrame,
	waitForSandboxCount,
} from "../helpers";

describe("vue-interactive scroll remount", function () {
	before(async function () {
		await applyE2ePluginSettings();
	});

	it("preserves host height when scrolling blocks out and back", async function () {
		this.timeout(120_000);
		await obsidianPage.openFile("scroll-remount.md");
		await waitForSandboxCount(3, 40_000);
		await ensureScrollSpacersBetweenBlocks(1100);

		const initial = await snapshotVueBlockLayouts();
		expect(initial.length).toBeGreaterThanOrEqual(3);
		for (const block of initial.slice(0, 3)) {
			expect(block.hasIframe).toBe(true);
			expect(block.hostHeight).toBeGreaterThan(400);
		}

		const result = await sampleHostHeightDuringScrollRemount({
			blockIndex: 0,
			sampleMs: 5_000,
			awayMs: 1_500,
		});

		// Reserved height should stay near the pre-scroll size (not collapse to ~5rem/0).
		const floor = Math.max(200, result.before.hostHeight * 0.5);
		expect(result.minHostHeightAfterScrollBack).toBeGreaterThanOrEqual(floor);

		expect(result.after.length).toBeGreaterThanOrEqual(1);
		const remounted = result.after[0];
		expect(remounted).toBeTruthy();
		if (!remounted) return;
		expect(remounted.hasIframe).toBe(true);
		expect(remounted.hostHeight).toBeGreaterThan(400);
		expect(
			Math.abs(remounted.hostHeight - result.before.hostHeight),
		).toBeLessThan(120);

		// All three blocks should remount after scrolling back to the top.
		await scrollMarkdownPreview("top");
		await waitForSandboxCount(3, 40_000);
		await switchToSandboxFrame(0);
		await expect(browser.$(".scroll-block-a")).toBeExisting();
		await switchToParentFrame();
		await clickInSandbox("button.scroll-btn-a", 0);
		await switchToSandboxFrame(0);
		await expect(browser.$("button.scroll-btn-a")).toHaveText("A: 1");
		await switchToParentFrame();
	});

	it("remounts multiple blocks after a full-page scroll cycle", async function () {
		this.timeout(120_000);
		await obsidianPage.openFile("scroll-remount.md");
		await waitForSandboxCount(3, 40_000);
		await ensureScrollSpacersBetweenBlocks(1100);

		await scrollMarkdownPreview("bottom");
		await browser.pause(1_500);
		await scrollMarkdownPreview("top");
		await waitForSandboxCount(3, 45_000);

		const layouts = await snapshotVueBlockLayouts();
		expect(layouts.length).toBeGreaterThanOrEqual(3);
		for (const block of layouts.slice(0, 3)) {
			expect(block.hasIframe).toBe(true);
			expect(block.hostHeight).toBeGreaterThan(400);
			expect(block.hasPlaceholder).toBe(false);
		}

		await switchToSandboxFrame(1);
		await expect(browser.$(".scroll-block-b")).toBeExisting();
		await switchToParentFrame();
		await switchToSandboxFrame(2);
		await expect(browser.$(".scroll-block-c")).toBeExisting();
		await switchToParentFrame();
	});

	it("survives repeated scroll-away / scroll-back cycles", async function () {
		this.timeout(180_000);
		await obsidianPage.openFile("scroll-remount.md");
		await waitForSandboxCount(3, 40_000);
		await ensureScrollSpacersBetweenBlocks(1100);

		for (let i = 0; i < 5; i++) {
			await scrollMarkdownPreview("bottom");
			await browser.pause(1_200);
			await scrollMarkdownPreview("top");
			await waitForSandboxCount(3, 45_000);
			await browser.pause(400);
		}

		const layouts = await snapshotVueBlockLayouts();
		expect(layouts.length).toBeGreaterThanOrEqual(3);
		for (const block of layouts.slice(0, 3)) {
			expect(block.hasIframe).toBe(true);
			expect(block.hasPlaceholder).toBe(false);
			expect(block.hostHeight).toBeGreaterThan(400);
		}

		const errors = await browser.$$(".vue-interactive-error-message");
		for (const el of errors) {
			const text = await el.getText();
			expect(text).not.toMatch(/沙盒(初始化|渲染)超时/);
		}

		await clickInSandbox("button.scroll-btn-a", 0);
		await switchToSandboxFrame(0);
		await expect(browser.$("button.scroll-btn-a")).toHaveText("A: 1");
		await switchToParentFrame();
	});
});
