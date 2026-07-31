/**
 * How far a non-inset `box-shadow` extends past the border-box bottom edge.
 * Lengths must be `px` (Tailwind / compiled CSS); other units are ignored.
 */
export function boxShadowBottomOverflow(boxShadow: string): number {
	if (!boxShadow || boxShadow === "none") return 0;

	const withoutColors = boxShadow
		.replace(/rgba?\([^)]*\)/gi, "")
		.replace(/hsla?\([^)]*\)/gi, "")
		.replace(/hwb\([^)]*\)/gi, "")
		.replace(/#[0-9a-f]{3,8}\b/gi, "");

	let maxBottom = 0;
	for (const part of withoutColors.split(",")) {
		if (/\binset\b/i.test(part)) continue;
		// Computed styles use px; authored shadows often use unitless 0.
		const nums: number[] = [];
		for (const m of part.matchAll(/(-?\d*\.?\d+)(px)?/g)) {
			const raw = m[1];
			if (raw == null) continue;
			if (m[2] !== "px" && Number(raw) !== 0) continue;
			nums.push(parseFloat(raw));
		}
		// offset-x, offset-y, [blur, [spread]]
		if (nums.length < 2) continue;
		const offsetY = nums[1] ?? 0;
		const blur = nums[2] ?? 0;
		const spread = nums[3] ?? 0;
		maxBottom = Math.max(maxBottom, offsetY + blur + spread);
	}
	return Math.max(0, maxBottom);
}

function bottomExtentBeyondBorderBox(style: CSSStyleDeclaration): number {
	const marginBottom = parseFloat(style.marginBottom) || 0;
	const shadowBottom = boxShadowBottomOverflow(style.boxShadow);
	return Math.max(0, marginBottom, shadowBottom);
}

/**
 * Measures the rendered block height of a Vue mount root inside the sandbox iframe.
 *
 * Prefer calling this after the host collapses the iframe to 0 height (see
 * `vue-sandbox-prepare-measure`); otherwise document scrollHeight can stick to
 * the previous viewport and block shrink-to-fit.
 */
export function measureMountHeight(mount: HTMLElement): number {
	const view = mount.ownerDocument.defaultView;
	const computedStyle = (el: Element): CSSStyleDeclaration =>
		view?.getComputedStyle(el) ?? getComputedStyle(el);

	let height = Math.max(mount.scrollHeight, mount.offsetHeight);

	const mountRect = mount.getBoundingClientRect();
	if (mountRect.height > 0) {
		height = Math.max(height, mountRect.height);
	}

	const mountStyle = computedStyle(mount);
	const mountBeyond = bottomExtentBeyondBorderBox(mountStyle);
	height = Math.max(
		height,
		mount.offsetHeight + mountBeyond,
		(mountRect.height > 0 ? mountRect.height : mount.offsetHeight) +
			mountBeyond,
	);

	const mountTop = mountRect.height > 0 ? mountRect.top : 0;
	for (const node of Array.from(mount.querySelectorAll("*"))) {
		if (!(node instanceof HTMLElement)) continue;
		const el = node;
		const style = computedStyle(el);
		if (style.display === "none" || style.visibility === "hidden") {
			continue;
		}

		const beyond = bottomExtentBeyondBorderBox(style);
		height = Math.max(height, el.offsetTop + el.offsetHeight + beyond);

		const rect = el.getBoundingClientRect();
		if (rect.width > 0 || rect.height > 0) {
			height = Math.max(height, rect.bottom - mountTop + beyond);
		}
	}

	const doc = mount.ownerDocument;
	const body = doc.body;
	const root = doc.documentElement;
	height = Math.max(
		height,
		body.scrollHeight,
		body.offsetHeight,
		root.scrollHeight,
		root.offsetHeight,
		mount.offsetTop + mount.offsetHeight + mountBeyond,
	);

	// Ceil covers subpixel borders; +1 avoids DPR rounding clipping the last px.
	return Math.ceil(height) + 1;
}
