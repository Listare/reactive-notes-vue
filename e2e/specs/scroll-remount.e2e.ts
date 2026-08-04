import { browser, expect } from "@wdio/globals";
import { describe, it, before } from "mocha";
import { obsidianPage } from "wdio-obsidian-service";
import {
	applyE2ePluginSettings,
	clickInSandbox,
	ensureScrollSpacersBetweenBlocks,
	forceVueBlockUnloadShell,
	markVueBlockHostHeightScrollBack,
	sampleHostHeightDuringScrollRemount,
	scrollMarkdownPreview,
	snapshotVueBlockLayouts,
	splitExpandRemountHeightPhases,
	startVueBlockHostHeightWatch,
	stopVueBlockHostHeightWatch,
	switchToParentFrame,
	switchToSandboxFrame,
	triggerVueBlockRemountScan,
	waitForSandboxCount,
	waitForSandboxText,
	waitForVueBlockHostHeight,
	waitForVueBlockHostHeightNear,
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
			sandboxCount: 3,
			sampleMs: 2_000,
			awayMs: 1_500,
		});

		const { resizeWatch } = result;
		expect(resizeWatch.samples.length).toBeGreaterThan(0);

		// ResizeObserver must not see a collapse toward ~5rem/0 after scroll-back.
		const floor = Math.max(200, result.before.hostHeight * 0.5);
		expect(resizeWatch.minHeight).toBeGreaterThanOrEqual(floor);
		expect(resizeWatch.maxAbsDeltaFromBaseline).toBeLessThan(120);

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

	it("keeps expanded height while remounting then shrinks after state reset", async function () {
		this.timeout(120_000);
		await obsidianPage.openFile("scroll-remount-expand.md");
		await waitForSandboxCount(3, 40_000);
		await ensureScrollSpacersBetweenBlocks(1100);

		const initialSnap = await waitForVueBlockHostHeight(0, 350);
		const initialHeight = initialSnap.hostHeight;
		expect(initialHeight).toBeGreaterThan(350);
		expect(initialHeight).toBeLessThan(550);

		await waitForSandboxText(".expand-status", "short", 0);

		await clickInSandbox("button.expand-height-btn", 0);
		const expandedSnap = await waitForVueBlockHostHeight(
			0,
			initialHeight + 400,
		);
		const expandedHeight = expandedSnap.hostHeight;
		expect(expandedHeight).toBeGreaterThan(initialHeight + 400);
		await waitForSandboxText(".expand-status", "tall", 0);

		// Reading-view virtualization often keeps the first block alive; force an
		// unload shell so we can assert reserved height + state reset on remount.
		await startVueBlockHostHeightWatch(0, expandedHeight);
		const reserved = await forceVueBlockUnloadShell(0);
		expect(reserved).toBeGreaterThan(expandedHeight - 40);

		const unloaded = await snapshotVueBlockLayouts();
		expect(unloaded[0]?.hasIframe).toBe(false);
		expect(unloaded[0]?.hostHeight ?? 0).toBeGreaterThan(expandedHeight - 40);

		await markVueBlockHostHeightScrollBack();
		await triggerVueBlockRemountScan();
		await waitForSandboxCount(3, 45_000);
		await waitForSandboxText(".expand-status", "short", 0, 45_000);
		await browser.pause(1_000);

		const resizeWatch = await stopVueBlockHostHeightWatch();
		expect(resizeWatch.samples.length).toBeGreaterThan(0);

		const mid = (initialHeight + expandedHeight) / 2;
		const phases = splitExpandRemountHeightPhases({
			initialHeight,
			expandedHeight,
			samples: resizeWatch.samples,
		});

		// While reloading, host should stay near the pre-reset (expanded) height.
		expect(phases.holdSamples.length).toBeGreaterThan(0);
		expect(phases.hold.minHeight).toBeGreaterThanOrEqual(expandedHeight * 0.85);
		expect(phases.hold.maxAbsDeltaFromBaseline).toBeLessThan(150);

		const remounted = await waitForVueBlockHostHeightNear(
			0,
			initialHeight,
			150,
			20_000,
		);
		expect(remounted.hostHeight).toBeLessThanOrEqual(mid);
		expect(remounted.hostHeight).toBeLessThan(expandedHeight - 300);
		await waitForSandboxText("button.expand-height-btn", "grow", 0);
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
