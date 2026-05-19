import { SANDBOX_TAILWIND_CSS } from "@sandbox-tailwind-css";

/** Tailwind build for the sandbox iframe, inlined at build time (no runtime fetch). */
export function getSandboxTailwindCss(): string {
	return SANDBOX_TAILWIND_CSS ?? "";
}
