import { describe, expect, it } from "vitest";
import {
	DATA_VUE_MOUNTED,
	vueSandboxNeedsRemount,
} from "../vueBlockRemountMetadata";

function asObsidianEl(el: HTMLElement): HTMLElement {
	const patched = el as HTMLElement & {
		getAttr: (key: string) => string | null;
		hasClass: (cls: string) => boolean;
	};
	patched.getAttr = (key) => el.getAttribute(key);
	patched.hasClass = (cls) => el.classList.contains(cls);
	return patched;
}

describe("vueSandboxNeedsRemount", () => {
	it("remounts unload shells that still show a loading placeholder", () => {
		const el = asObsidianEl(document.createElement("div"));
		el.className = "vue-interactive-root";
		el.setAttribute(DATA_VUE_MOUNTED, "1");
		const host = document.createElement("div");
		host.className = "vue-interactive-sandbox-host";
		const placeholder = document.createElement("div");
		placeholder.className = "vue-interactive-placeholder";
		placeholder.setAttribute("aria-busy", "true");
		host.appendChild(placeholder);
		el.appendChild(host);

		expect(vueSandboxNeedsRemount(el)).toBe(true);
	});

	it("does not remount when a live iframe mount has content", () => {
		const el = asObsidianEl(document.createElement("div"));
		el.className = "vue-interactive-root";
		el.setAttribute(DATA_VUE_MOUNTED, "1");
		const iframe = document.createElement("iframe");
		iframe.className = "vue-interactive-sandbox";
		el.appendChild(iframe);
		document.body.appendChild(el);

		const doc = iframe.contentDocument;
		expect(doc).toBeTruthy();
		if (!doc) return;
		const mount = doc.createElement("div");
		mount.id = "vue-interactive-mount";
		mount.appendChild(doc.createElement("span"));
		doc.body.appendChild(mount);

		expect(vueSandboxNeedsRemount(el)).toBe(false);
		el.remove();
	});
});
