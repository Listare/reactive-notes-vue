/** Measures the rendered block height of a Vue mount root inside the sandbox iframe. */
export function measureMountHeight(mount: HTMLElement): number {
	let height = Math.max(mount.scrollHeight, mount.offsetHeight);

	const mountRect = mount.getBoundingClientRect();
	if (mountRect.height > 0) {
		height = Math.max(height, mountRect.height);
	}

	const mountStyle = getComputedStyle(mount);
	const mountMarginBottom = parseFloat(mountStyle.marginBottom) || 0;
	height = Math.max(height, mount.offsetHeight + mountMarginBottom);

	const mountTop = mountRect.height > 0 ? mountRect.top : 0;
	for (const node of Array.from(mount.querySelectorAll("*"))) {
		if (!(node instanceof HTMLElement)) continue;
		const el = node;
		const style = getComputedStyle(el);
		if (style.display === "none" || style.visibility === "hidden") {
			continue;
		}
		height = Math.max(height, el.offsetTop + el.offsetHeight);

		const rect = el.getBoundingClientRect();
		if (rect.width > 0 || rect.height > 0) {
			height = Math.max(height, rect.bottom - mountTop);
		}
	}

	const body = mount.ownerDocument.body;
	if (body.firstElementChild === mount && body.lastElementChild === mount) {
		height = Math.max(
			height,
			body.scrollHeight,
			body.offsetHeight,
			mount.offsetTop + mount.offsetHeight,
		);
	}

	return Math.ceil(height);
}
