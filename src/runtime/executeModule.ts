import * as Vue from "vue";
import type { Component } from "vue";

export function executeModule(moduleCode: string): Component {
	// User SFC is compiled at runtime; Function is required for MVP module execution.
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	const fn = new Function("__vue__", moduleCode) as (
		vue: typeof Vue,
	) => Component;
	const result = fn(Vue);
	if (result == null || typeof result !== "object") {
		throw new Error("模块未导出有效的 Vue 组件。");
	}
	return result;
}
