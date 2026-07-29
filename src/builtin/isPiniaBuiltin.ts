/** Virtual module specifier for the shared Pinia API (`import … from 'pinia'`). */
export const PINIA_BUILTIN_SPECIFIERS = ["pinia"] as const;

export type PiniaBuiltinSpecifier = (typeof PINIA_BUILTIN_SPECIFIERS)[number];

export function isPiniaBuiltinSpecifier(
	spec: string,
): spec is PiniaBuiltinSpecifier {
	return (PINIA_BUILTIN_SPECIFIERS as readonly string[]).includes(spec);
}
