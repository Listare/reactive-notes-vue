/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	boxShadowBottomOverflow,
	measureMountHeight,
} from "../measureMountHeight";

function stubLayout(
	el: HTMLElement,
	layout: {
		offsetHeight?: number;
		scrollHeight?: number;
		offsetTop?: number;
		rect?: DOMRect;
	},
): void {
	if (layout.offsetHeight != null) {
		Object.defineProperty(el, "offsetHeight", {
			configurable: true,
			get: () => layout.offsetHeight,
		});
	}
	if (layout.scrollHeight != null) {
		Object.defineProperty(el, "scrollHeight", {
			configurable: true,
			get: () => layout.scrollHeight,
		});
	}
	if (layout.offsetTop != null) {
		Object.defineProperty(el, "offsetTop", {
			configurable: true,
			get: () => layout.offsetTop,
		});
	}
	if (layout.rect) {
		el.getBoundingClientRect = () => layout.rect!;
	}
}

describe("boxShadowBottomOverflow", () => {
	it("returns 0 for none or empty", () => {
		expect(boxShadowBottomOverflow("none")).toBe(0);
		expect(boxShadowBottomOverflow("")).toBe(0);
	});

	it("uses offset-y + blur + spread for outward shadows", () => {
		expect(
			boxShadowBottomOverflow("0 1px 3px rgba(15, 23, 42, 0.08)"),
		).toBe(4);
		expect(
			boxShadowBottomOverflow(
				"0 1px 3px rgba(15,23,42,0.08), 0 4px 12px rgba(15,23,42,0.04)",
			),
		).toBe(16);
		expect(boxShadowBottomOverflow("0 4px 24px rgba(0,0,0,0.35)")).toBe(28);
	});

	it("parses computed-style color-first shadows", () => {
		expect(
			boxShadowBottomOverflow(
				"rgba(15, 23, 42, 0.12) 0px 1px 3px 0px, rgba(37, 99, 235, 0.22) 0px 6px 16px 0px",
			),
		).toBe(22);
	});

	it("ignores inset shadows", () => {
		expect(boxShadowBottomOverflow("inset 0 2px 4px #000")).toBe(0);
	});
});

describe("measureMountHeight", () => {
	beforeEach(() => {
		document.body.replaceChildren();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("uses the mount box height for simple block content", () => {
		const mount = document.createElement("div");
		stubLayout(mount, { offsetHeight: 120, scrollHeight: 120 });
		document.body.appendChild(mount);

		expect(measureMountHeight(mount)).toBe(121);
	});

	it("includes descendant boxes that extend below the mount offset height", () => {
		const mount = document.createElement("div");
		stubLayout(mount, {
			offsetHeight: 40,
			scrollHeight: 40,
			rect: new DOMRect(0, 0, 200, 40),
		});
		const child = document.createElement("div");
		stubLayout(child, {
			offsetTop: 20,
			offsetHeight: 80,
			rect: new DOMRect(0, 20, 40, 80),
		});
		mount.appendChild(child);
		document.body.appendChild(mount);

		expect(measureMountHeight(mount)).toBeGreaterThanOrEqual(101);
	});

	it("includes body tail space after the host iframe has been collapsed", () => {
		const mount = document.createElement("div");
		stubLayout(mount, { offsetHeight: 200, scrollHeight: 200 });
		document.body.appendChild(mount);
		Object.defineProperty(document.body, "scrollHeight", {
			configurable: true,
			get: () => 224,
		});
		Object.defineProperty(document.body, "offsetHeight", {
			configurable: true,
			get: () => 224,
		});

		expect(measureMountHeight(mount)).toBe(225);
	});

	it("includes child margin-bottom below the border box", () => {
		const mount = document.createElement("div");
		stubLayout(mount, {
			offsetHeight: 40,
			scrollHeight: 40,
			rect: new DOMRect(0, 0, 200, 40),
		});
		const child = document.createElement("div");
		stubLayout(child, {
			offsetTop: 0,
			offsetHeight: 40,
			rect: new DOMRect(0, 0, 200, 40),
		});
		mount.appendChild(child);
		document.body.appendChild(mount);

		vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
			if (el === child) {
				return {
					display: "block",
					visibility: "visible",
					marginBottom: "12px",
					boxShadow: "none",
				} as CSSStyleDeclaration;
			}
			return {
				display: "block",
				visibility: "visible",
				marginBottom: "0px",
				boxShadow: "none",
			} as CSSStyleDeclaration;
		});

		expect(measureMountHeight(mount)).toBeGreaterThanOrEqual(53);
	});

	it("includes child box-shadow bottom overflow", () => {
		const mount = document.createElement("div");
		stubLayout(mount, {
			offsetHeight: 40,
			scrollHeight: 40,
			rect: new DOMRect(0, 0, 200, 40),
		});
		const child = document.createElement("div");
		stubLayout(child, {
			offsetTop: 0,
			offsetHeight: 40,
			rect: new DOMRect(0, 0, 200, 40),
		});
		mount.appendChild(child);
		document.body.appendChild(mount);

		vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
			if (el === child) {
				return {
					display: "block",
					visibility: "visible",
					marginBottom: "0px",
					boxShadow:
						"0 1px 3px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)",
				} as CSSStyleDeclaration;
			}
			return {
				display: "block",
				visibility: "visible",
				marginBottom: "0px",
				boxShadow: "none",
			} as CSSStyleDeclaration;
		});

		// border-box 40 + shadow extent 16 + safety 1
		expect(measureMountHeight(mount)).toBeGreaterThanOrEqual(57);
	});
});
