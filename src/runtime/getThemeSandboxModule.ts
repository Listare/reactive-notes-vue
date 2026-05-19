import type { VueInteractiveTheme } from "../theme/getTheme";

/** Sandbox `@vue-interactive/theme` module shape. */
export type GetThemeSandboxModule = {
	getTheme: () => VueInteractiveTheme;
	default?: () => VueInteractiveTheme;
};

export function createGetThemeSandboxModule(
	getTheme: () => VueInteractiveTheme,
): GetThemeSandboxModule {
	return { getTheme, default: getTheme };
}
