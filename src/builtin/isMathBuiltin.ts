/** Virtual module specifiers for MathJax (`import … from '@vue-interactive/math'`). */
export const MATH_BUILTIN_SPECIFIERS = [
	"@vue-interactive/math",
	"vue-interactive/math",
] as const;

export type MathBuiltinSpecifier = (typeof MATH_BUILTIN_SPECIFIERS)[number];

export function isMathBuiltinSpecifier(
	spec: string,
): spec is MathBuiltinSpecifier {
	return (MATH_BUILTIN_SPECIFIERS as readonly string[]).includes(spec);
}
