/** Virtual module specifiers for theme helpers (`import … from '@vue-interactive/theme'`). */
export const GET_THEME_BUILTIN_SPECIFIERS = [
	"@vue-interactive/theme",
	"vue-interactive/theme",
] as const;

export type GetThemeBuiltinSpecifier =
	(typeof GET_THEME_BUILTIN_SPECIFIERS)[number];

export function isGetThemeBuiltinSpecifier(
	spec: string,
): spec is GetThemeBuiltinSpecifier {
	return (GET_THEME_BUILTIN_SPECIFIERS as readonly string[]).includes(spec);
}
