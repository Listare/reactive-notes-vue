import {
	SANDBOX_STATIC_CSS,
	SANDBOX_TAILWIND_BROWSER_SCRIPT,
	SANDBOX_TAILWIND_CONFIG_CSS,
} from "@sandbox-tailwind-assets";

export interface SandboxTailwindAssets {
	browserScript: string;
	configCss: string;
	staticCss: string;
}

/** Tailwind browser runtime + config/static CSS, inlined at build time (no runtime fetch). */
export function getSandboxTailwindAssets(): SandboxTailwindAssets {
	return {
		browserScript: SANDBOX_TAILWIND_BROWSER_SCRIPT ?? "",
		configCss: SANDBOX_TAILWIND_CONFIG_CSS ?? "",
		staticCss: SANDBOX_STATIC_CSS ?? "",
	};
}
