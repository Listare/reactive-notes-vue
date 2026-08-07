import { browser, expect } from "@wdio/globals";
import { describe, it, before } from "mocha";
import { obsidianPage } from "wdio-obsidian-service";
import {
	applyE2ePluginSettings,
	clickInSandbox,
	expectCompileError,
	expectErrorPanel,
	expectRuntimeError,
	snapshotVueBlockLayouts,
	switchToParentFrame,
	switchToSandboxFrame,
	waitForVueBlockHostHeight,
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

		it("generates arbitrary Tailwind utilities at runtime", async function () {
			await obsidianPage.openFile("theme-tailwind.md");
			await switchToSandboxFrame(2);
			const el = browser.$("[data-testid='tw-arbitrary']");
			await el.waitForExist({ timeout: 20_000 });
			await browser.waitUntil(
				async () => {
					const bg = await el.getCSSProperty("background-color");
					const value = String(bg.value ?? "").toLowerCase();
					return (
						value.includes("17, 34, 51") ||
						value.includes("#112233") ||
						value.includes("112233")
					);
				},
				{
					timeout: 20_000,
					timeoutMsg: "expected runtime Tailwind bg-[#112233]",
				},
			);
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

		it("applies MathJax preamble macros from settings", async function () {
			// Ensure settings are applied (prior tests may have mutated them).
			await applyE2ePluginSettings();
			await obsidianPage.openFile("mathjax.md");
			await switchToSandboxFrame(0);
			const host = browser.$(".preamble-macro");
			await host.waitForExist({ timeout: 30_000 });
			await browser.waitUntil(
				async () => {
					const html = await host.getHTML(false);
					// \RR → \mathbb{R} (U+211D) when mathjax-preamble.sty is loaded.
					return /TEX-D-211D|ℝ/.test(html);
				},
				{
					timeout: 30_000,
					timeoutMsg:
						"expected preamble macro \\RR to render as blackboard-bold R (set mathJaxPreamblePath)",
				},
			);
			await switchToParentFrame();
		});

		it("shows error when MathJax preamble path is missing", async function () {
			await browser.executeObsidian(async ({ plugins }) => {
				const plugin = plugins.reactiveNotesVue;
				plugin.settings.mathJaxPreamblePath = "missing-preamble.sty";
				await plugin.saveSettings();
			});
			try {
				await obsidianPage.openFile("counter.md");
				await obsidianPage.openFile("mathjax.md");
				await browser.executeObsidianCommand(
					"reactive-notes-vue:refresh-vue-interactive-blocks",
				);
				await expectCompileError(/MathJax 前置文件不存在|missing-preamble/i);
			} finally {
				await applyE2ePluginSettings();
			}
		});

		it("supports Obsidian-aligned MathJax packages (require / physics / mhchem)", async function () {
			await obsidianPage.openFile("mathjax-packages.md");
			await switchToSandboxFrame(0);

			for (const sel of [
				".mjx-require-cancel",
				".mjx-require-physics",
				".mjx-mhchem",
			]) {
				const host = browser.$(sel);
				await host.waitForExist({ timeout: 30_000 });
				await browser.waitUntil(
					async () => {
						const html = await host.getHTML(false);
						return (
							html.includes("<svg") &&
							!/data-mjx-error|Undefined control sequence/i.test(html)
						);
					},
					{
						timeout: 30_000,
						timeoutMsg: `expected ${sel} to render MathJax SVG without error`,
					},
				);
			}

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

		it("teleports overlay to sandbox body, not Obsidian host", async function () {
			await obsidianPage.openFile("teleport.md");
			await switchToParentFrame();
			await browser
				.$("iframe.vue-interactive-sandbox")
				.waitForExist({ timeout: 20_000 });
			const closed = (await snapshotVueBlockLayouts())[0];
			if (!closed || !(closed.hostHeight > 0)) {
				throw new Error("teleport block host height missing when closed");
			}

			await switchToSandboxFrame(0);
			const openBtn = browser.$("button.teleport-open-btn");
			await openBtn.waitForExist({ timeout: 20_000 });
			expect(await browser.$(".teleport-overlay").isExisting()).toBe(false);
			await openBtn.click();

			const location = await browser.execute(() => {
				const panel = document.querySelector(".teleport-overlay");
				const mount = document.getElementById("vue-interactive-mount");
				return {
					exists: panel != null,
					text: panel?.textContent ?? "",
					inMount: mount?.contains(panel) ?? false,
					parentIsBody: panel?.parentElement === document.body,
				};
			});
			expect(location.exists).toBe(true);
			expect(location.text).toContain("Teleported panel");
			expect(location.inMount).toBe(false);
			expect(location.parentIsBody).toBe(true);

			await switchToParentFrame();
			const hostHasOverlay = await browser.execute(() => {
				return document.querySelector(".teleport-overlay") != null;
			});
			expect(hostHasOverlay).toBe(false);

			await waitForVueBlockHostHeight(0, closed.hostHeight + 20);

			await clickInSandbox("button.teleport-dismiss-btn");
			await browser.waitUntil(
				async () => {
					return browser.execute(() => {
						const iframe = document.querySelector(
							"iframe.vue-interactive-sandbox",
						);
						if (
							!(iframe instanceof HTMLIFrameElement) ||
							!iframe.contentDocument
						) {
							return false;
						}
						return (
							iframe.contentDocument.querySelector(
								".teleport-overlay",
							) == null
						);
					});
				},
				{
					timeout: 10_000,
					timeoutMsg: "expected teleported overlay to dismiss",
				},
			);
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
