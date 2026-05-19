/** Skeleton shown while a vue-interactive block compiles and mounts. */
export function renderLoadingPlaceholder(host: HTMLElement): HTMLElement {
	const el = host.createDiv({ cls: "vue-interactive-placeholder" });
	el.setAttr("aria-busy", "true");
	el.setAttr("role", "status");
	el.setAttr("aria-label", "正在加载 Vue 组件");

	const inner = el.createDiv({ cls: "vue-interactive-placeholder-inner" });
	inner.createDiv({
		cls: "vue-interactive-placeholder-line vue-interactive-placeholder-line--wide",
	});
	inner.createDiv({
		cls: "vue-interactive-placeholder-line vue-interactive-placeholder-line--medium",
	});
	inner.createDiv({
		cls: "vue-interactive-placeholder-line vue-interactive-placeholder-line--short",
	});

	return el;
}
