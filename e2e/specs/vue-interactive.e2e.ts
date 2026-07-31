import { browser, expect } from "@wdio/globals";
import { describe, it, before } from "mocha";
import { obsidianPage } from "wdio-obsidian-service";
import {
	applyExamplePluginSettings,
	switchToParentFrame,
	switchToSandboxFrame,
} from "../helpers";

describe("vue-interactive e2e", function () {
	before(async function () {
		await applyExamplePluginSettings();
	});

	it("counter increments inside sandbox", async function () {
		await obsidianPage.openFile("counter.md");
		await switchToSandboxFrame(0);
		const btn = browser.$("button.counter-btn");
		await expect(btn).toBeExisting();
		await expect(btn).toHaveText("Count: 0");
		await btn.click();
		await expect(btn).toHaveText("Count: 1");
		await switchToParentFrame();
	});

	it("shows compile error panel for unsupported import", async function () {
		await obsidianPage.openFile("errors.md");
		const error = browser.$(".vue-interactive-error");
		await error.waitForExist({ timeout: 20_000 });
		await expect(error).toBeExisting();
	});

	it("shows runtime error panel after mount", async function () {
		await obsidianPage.openFile("errors.md");
		const runtimeTitle = browser.$(
			".vue-interactive-runtime-error-host .vue-interactive-error-title",
		);
		await runtimeTitle.waitForExist({ timeout: 20_000 });
		const text = await runtimeTitle.getText();
		expect(text).toContain("运行时");
	});

	it("mounts custom-script import demo", async function () {
		await obsidianPage.openFile("imports.md");
		await switchToSandboxFrame(0);
		const btn = browser.$("button.import-demo-btn");
		await btn.waitForExist({ timeout: 20_000 });
		const label = await btn.getText();
		expect(label).toContain("Import demo");
		await btn.click();
		await expect(btn).toHaveText("Import demo: 1");
		await switchToParentFrame();
	});

	it("renders Obsidian API vault name", async function () {
		await obsidianPage.openFile("obsidian-api.md");
		await switchToSandboxFrame(0);
		const vaultLine = browser.$(".vault-line strong");
		await vaultLine.waitForExist({ timeout: 20_000 });
		await browser.waitUntil(
			async () => {
				const text = await vaultLine.getText();
				return text.length > 0 && text !== "…";
			},
			{ timeout: 15_000, timeoutMsg: "vault name not loaded" },
		);
		await switchToParentFrame();
	});

	it("runs refresh command", async function () {
		await obsidianPage.openFile("counter.md");
		await switchToSandboxFrame(0);
		await browser.$("button.counter-btn").waitForExist({ timeout: 20_000 });
		await switchToParentFrame();
		await browser.executeObsidianCommand(
			"reactive-notes-vue:refresh-vue-interactive-blocks",
		);
		await switchToSandboxFrame(0);
		await expect(browser.$("button.counter-btn")).toBeExisting();
		await switchToParentFrame();
	});
});
