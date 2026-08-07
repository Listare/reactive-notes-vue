import type { Component } from "vue";
import type { SharedVueRuntime } from "./sharedRuntimeTypes";

type VueNamespace = SharedVueRuntime["Vue"];

export type TeleportTarget = string | Element | null | undefined;

interface TeleportVNodeProps {
	to?: TeleportTarget;
	disabled?: boolean;
	defer?: boolean;
	[key: string]: unknown;
}

interface TeleportVNode {
	props: TeleportVNodeProps | null;
}

interface VueTeleportBuiltin {
	name?: string;
	__isTeleport: true;
	process: (...args: unknown[]) => unknown;
	remove: (...args: unknown[]) => unknown;
	move: (...args: unknown[]) => unknown;
	hydrate: (...args: unknown[]) => unknown;
}

function isElementTarget(to: unknown): to is Element {
	return (
		typeof to === "object" &&
		to !== null &&
		"nodeType" in to &&
		(to as Node).nodeType === 1
	);
}

/**
 * Resolve string `to` against the current realm's `document` (sandbox iframe).
 * Mutates a shallow copy of vnode props so the shared host Vue Teleport never
 * runs `querySelector` on the Obsidian parent document.
 */
export function resolveSandboxTeleportProps(
	props: TeleportVNodeProps | null,
): TeleportVNodeProps | null {
	if (props == null) return props;
	const to = props.to;
	if (typeof to !== "string") {
		if (to != null && !isElementTarget(to) && typeof to === "object") {
			return { ...props, disabled: true, to: document.body };
		}
		return props;
	}
	const el = document.querySelector(to);
	if (el == null) {
		return { ...props, to: document.body, disabled: true };
	}
	return { ...props, to: el };
}

/**
 * Returns a Teleport-shaped builtin that keeps `__isTeleport: true` so
 * compiler-sfc `createBlock(Teleport, props, [children])` patches correctly
 * (including `v-if` inside Teleport). Only remaps string `to` selectors.
 */
export function createSandboxTeleport(vue: VueNamespace): Component {
	const Real = vue.Teleport as unknown as VueTeleportBuiltin;
	const SandboxTeleport: VueTeleportBuiltin = {
		name: "SandboxTeleport",
		__isTeleport: true,
		process(n1: unknown, n2: unknown, ...rest: unknown[]) {
			const vnode = n2 as TeleportVNode;
			if (vnode?.props) {
				vnode.props = resolveSandboxTeleportProps(vnode.props);
			}
			return Real.process(n1, n2, ...rest);
		},
		remove(...args: unknown[]) {
			return Real.remove(...args);
		},
		move(...args: unknown[]) {
			return Real.move(...args);
		},
		hydrate(...args: unknown[]) {
			return Real.hydrate(...args);
		},
	};
	return SandboxTeleport as unknown as Component;
}

/**
 * Returns a Vue namespace whose `Teleport` is iframe-aware, without mutating
 * the shared host runtime object.
 */
export function withSandboxTeleport(vue: VueNamespace): VueNamespace {
	const Teleport = createSandboxTeleport(vue);
	return new Proxy(vue, {
		get(target, prop, receiver): unknown {
			if (prop === "Teleport") {
				return Teleport;
			}
			return Reflect.get(target, prop, receiver) as unknown;
		},
	});
}
