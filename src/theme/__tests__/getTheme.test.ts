import { describe, expect, it } from "vitest";
import { getObsidianTheme, resolveEffectiveTheme } from "../getTheme";

function bodyWithTheme(dark: boolean): Document {
	const doc = document.implementation.createHTMLDocument("");
	if (dark) {
		doc.body.classList.add("theme-dark");
		doc.body.classList.remove("theme-light");
	} else {
		doc.body.classList.add("theme-light");
		doc.body.classList.remove("theme-dark");
	}
	return doc;
}

describe("getObsidianTheme", () => {
	it("reads theme-dark on body", () => {
		expect(getObsidianTheme(bodyWithTheme(true))).toBe("dark");
		expect(getObsidianTheme(bodyWithTheme(false))).toBe("light");
	});
});

describe("resolveEffectiveTheme", () => {
	it("respects plugin override", () => {
		expect(resolveEffectiveTheme("dark", bodyWithTheme(false))).toBe("dark");
		expect(resolveEffectiveTheme("light", bodyWithTheme(true))).toBe("light");
	});

	it("follows obsidian when auto", () => {
		expect(resolveEffectiveTheme("follow-obsidian", bodyWithTheme(true))).toBe(
			"dark",
		);
	});
});
