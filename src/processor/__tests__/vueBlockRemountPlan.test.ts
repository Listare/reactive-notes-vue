import { describe, expect, it } from "vitest";
import {
	blockIndexInPreview,
	pickVueBlockSourceFromMarkdown,
	resolveCodeBlockContainer,
	shouldRemountFromCodeSource,
	shouldScheduleVueBlockRemount,
	shouldSkipUnregisteredBlock,
	VUE_BLOCK_SELECTOR,
} from "../vueBlockRemountPlan";

describe("shouldScheduleVueBlockRemount", () => {
	it("skips live sandboxes and never-mounted block shells", () => {
		expect(
			shouldScheduleVueBlockRemount({
				hasLiveSandbox: true,
				hasVueBlock: true,
				isBlockLanguage: true,
				mountedAttr: "1",
				needsRemount: true,
			}),
		).toBe(false);

		expect(
			shouldSkipUnregisteredBlock({
				hasVueBlock: false,
				isBlockLanguage: true,
				mountedAttr: null,
			}),
		).toBe(true);

		expect(
			shouldScheduleVueBlockRemount({
				hasLiveSandbox: false,
				hasVueBlock: true,
				isBlockLanguage: true,
				mountedAttr: "1",
				needsRemount: true,
			}),
		).toBe(true);
	});
});

describe("shouldRemountFromCodeSource", () => {
	it("requires remount need, empty registry, and non-empty source", () => {
		expect(
			shouldRemountFromCodeSource({
				containerNeedsRemount: true,
				hasVueBlock: false,
				isBlockLanguage: false,
				mountedAttr: "1",
				source: "<template></template>",
				alreadyScheduled: false,
			}),
		).toBe(true);

		expect(
			shouldRemountFromCodeSource({
				containerNeedsRemount: true,
				hasVueBlock: false,
				isBlockLanguage: true,
				mountedAttr: null,
				source: "<template></template>",
				alreadyScheduled: false,
			}),
		).toBe(false);
	});
});

describe("pickVueBlockSourceFromMarkdown", () => {
	const md = `
\`\`\`vue-interactive
alpha
\`\`\`

\`\`\`vue-interactive
beta
\`\`\`
`;

	it("prefers stored index, then preview index", () => {
		expect(
			pickVueBlockSourceFromMarkdown(md, { indexAttr: "1" }),
		).toBe("beta");
		expect(
			pickVueBlockSourceFromMarkdown(md, { previewIndex: 0 }),
		).toBe("alpha");
		expect(pickVueBlockSourceFromMarkdown(md, { indexAttr: "9" })).toBeNull();
	});
});

describe("DOM helpers", () => {
	it("finds block index and code container", () => {
		const root = document.createElement("div");
		const a = document.createElement("div");
		a.className = "block-language-vue-interactive";
		const b = document.createElement("div");
		b.className = "block-language-vue-interactive";
		const pre = document.createElement("pre");
		const code = document.createElement("code");
		code.className = "language-vue-interactive";
		pre.appendChild(code);
		b.appendChild(pre);
		root.appendChild(a);
		root.appendChild(b);
		expect(blockIndexInPreview(b, root, VUE_BLOCK_SELECTOR)).toBe(1);
		expect(blockIndexInPreview(a, root)).toBe(0);
		expect(resolveCodeBlockContainer(code)).toBe(b);
	});
});
