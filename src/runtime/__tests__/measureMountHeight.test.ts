/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { measureMountHeight } from "../measureMountHeight";

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

describe("measureMountHeight", () => {
	beforeEach(() => {
		document.body.replaceChildren();
	});

	it("uses the mount box height for simple block content", () => {
		const mount = document.createElement("div");
		stubLayout(mount, { offsetHeight: 120, scrollHeight: 120 });
		document.body.appendChild(mount);

		expect(measureMountHeight(mount)).toBe(120);
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

		expect(measureMountHeight(mount)).toBeGreaterThanOrEqual(100);
	});

	it("includes body tail space when the mount is the only body child", () => {
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

		expect(measureMountHeight(mount)).toBe(224);
	});
});
