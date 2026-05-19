export interface ErrorLocation {
	line?: number;
	column?: number;
}

export function renderError(
	container: HTMLElement,
	message: string,
	options?: { stack?: string; loc?: ErrorLocation },
): void {
	container.empty();
	container.addClass("vue-interactive-error");

	container.createEl("p", {
		cls: "vue-interactive-error-title",
		text: "Vue 组件错误",
	});

	if (options?.loc?.line != null) {
		container.createEl("p", {
			cls: "vue-interactive-error-loc",
			text: `位置: 第 ${options.loc.line} 行${options.loc.column != null ? `，第 ${options.loc.column} 列` : ""}`,
		});
	}

	container.createEl("pre", {
		cls: "vue-interactive-error-message",
		text: message,
	});

	if (options?.stack) {
		const details = container.createEl("details", {
			cls: "vue-interactive-error-details",
		});
		details.createEl("summary", { text: "堆栈" });
		details.createEl("pre", {
			cls: "vue-interactive-error-stack",
			text: options.stack,
		});
	}
}
