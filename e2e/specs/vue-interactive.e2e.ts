import { browser, expect } from "@wdio/globals";
import { describe, it, before } from "mocha";
import { obsidianPage } from "wdio-obsidian-service";
import {
	applyE2ePluginSettings,
	clickInSandbox,
	expectCompileError,
	expectErrorPanel,
	expectRuntimeError,
	switchToParentFrame,
	switchToSandboxFrame,
} from "../helpers";

describe("vue-interactive e2e", function () {
	before(async function () {
		await applyE2ePluginSettings();
	});

	describe("features", function () {
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

		it("mounts custom-script import demo", async function () {
			await obsidianPage.openFile("imports.md");
			await switchToSandboxFrame(0);
			const btn = browser.$("button.import-demo-btn");
			await btn.waitForExist({ timeout: 20_000 });
			expect(await btn.getText()).toContain("Import demo");
			await btn.click();
			await expect(btn).toHaveText("Import demo: 1");
			await switchToParentFrame();
		});

		it("imports named markdown code blocks", async function () {
			await obsidianPage.openFile("imports.md");
			await switchToSandboxFrame(1);
			const result = browser.$(".import-add-result");
			await result.waitForExist({ timeout: 20_000 });
			await expect(result).toHaveText("add(2, 3) = 5");
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

		it("keeps scoped styles isolated across blocks", async function () {
			await obsidianPage.openFile("scoped-styles.md");
			await switchToSandboxFrame(0);
			const a = browser.$("button.chip-a");
			await a.waitForExist({ timeout: 20_000 });
			expect(await a.getText()).toContain("purple");
			await switchToParentFrame();
			await switchToSandboxFrame(1);
			const b = browser.$("button.chip-b");
			await b.waitForExist({ timeout: 20_000 });
			expect(await b.getText()).toContain("green");
			await switchToParentFrame();
		});

		it("renders theme getTheme panel", async function () {
			await obsidianPage.openFile("theme-tailwind.md");
			await switchToSandboxFrame(0);
			const label = browser.$("p");
			await label.waitForExist({ timeout: 20_000 });
			const text = await browser.$("body").getText();
			expect(text).toContain("getTheme()");
			await switchToParentFrame();
		});

		it("renders MathJax SVG", async function () {
			await obsidianPage.openFile("mathjax.md");
			await switchToSandboxFrame(0);
			await browser.waitUntil(
				async () => {
					const svgs = await browser.$$("svg");
					return svgs.length > 0;
				},
				{ timeout: 30_000, timeoutMsg: "expected MathJax SVG" },
			);
			await switchToParentFrame();
		});

		it("shares Pinia state across blocks", async function () {
			await obsidianPage.openFile("pinia.md");
			await switchToSandboxFrame(0);
			const inc = browser.$("button.pinia-inc-a");
			await inc.waitForExist({ timeout: 20_000 });
			await expect(browser.$(".pinia-count-a")).toHaveText("0");
			await inc.click();
			await expect(browser.$(".pinia-count-a")).toHaveText("1");
			await switchToParentFrame();
			await switchToSandboxFrame(1);
			await expect(browser.$(".pinia-count-b")).toHaveText("1");
			await switchToParentFrame();
		});
	});

	describe("errors", function () {
		it("shows compile error for unsupported import", async function () {
			await obsidianPage.openFile("errors/unsupported-import.md");
			await expectCompileError(/不支持的导入|lodash-es/i);
		});

		it("shows compile error for missing template", async function () {
			await obsidianPage.openFile("errors/missing-template.md");
			await expectCompileError(/缺少\s*<template>|template/i);
		});

		it("shows compile error for illegal script syntax", async function () {
			await obsidianPage.openFile("errors/syntax.md");
			await expectCompileError();
		});

		it("shows compile error for imported broken syntax", async function () {
			await obsidianPage.openFile("errors/import-syntax.md");
			await expectCompileError(/broken-syntax/i);
		});

		it("shows error for sync setup throw", async function () {
			await obsidianPage.openFile("errors/setup-throw.md");
			await expectErrorPanel("setup 同步测试错误");
		});

		it("shows runtime error after onMounted throw", async function () {
			await obsidianPage.openFile("errors/onMounted-throw.md");
			await expectRuntimeError("onMounted test error");
		});

		it("shows runtime error after click throw", async function () {
			await obsidianPage.openFile("errors/click-throw.md");
			await clickInSandbox("button.boom-btn");
			await expectRuntimeError("点击按钮测试错误");
		});

		it("shows error for async setup throw", async function () {
			await obsidianPage.openFile("errors/async-setup-throw.md");
			await expectErrorPanel(/异步 setup/);
		});

		it("shows error for imported component setup throw", async function () {
			await obsidianPage.openFile("errors/imported-setup-throw.md");
			await expectErrorPanel("导入组件 setup 测试错误");
		});
	});
});
