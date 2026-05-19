import * as Vue from "vue";
import type { Component } from "vue";

export function executeModule(moduleCode: string): Component {
	// Runs inside sandbox iframe only; strict mode + single __vue__ param limits globals.
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	const fn = new Function(
		"__vue__",
		`"use strict";\n${moduleCode}`,
	) as (vue: typeof Vue) => Component;
	const result = fn(Vue);
	if (result == null || typeof result !== "object") {
		throw new Error("模块未导出有效的 Vue 组件。");
	}
	return result;
}
