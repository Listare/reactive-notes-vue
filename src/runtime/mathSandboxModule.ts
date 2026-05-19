import { Latex } from "../math/Latex";
import type { Component } from "vue";

/** Sandbox `@vue-interactive/math` module shape. */
export type MathSandboxModule = {
	Latex: Component;
	default?: Component;
};

export function createMathSandboxModule(): MathSandboxModule {
	return { Latex, default: Latex };
}
