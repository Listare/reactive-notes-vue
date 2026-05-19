/** Obsidian theme CSS variables to mirror inside the sandbox iframe. */
const THEME_VAR_NAMES = [
	"--text-normal",
	"--text-muted",
	"--text-on-accent",
	"--background-primary",
	"--background-secondary",
	"--background-modifier-border",
	"--interactive-accent",
	"--interactive-accent-hover",
	"--font-text",
	"--font-monospace",
] as const;

export function buildThemeVariablesCss(doc: Document = document): string {
	const root = doc.documentElement;
	const vars = THEME_VAR_NAMES.map((name) => {
		const value = getComputedStyle(root).getPropertyValue(name).trim();
		if (!value) return null;
		return `  ${name}: ${value};`;
	}).filter(Boolean);
	if (vars.length === 0) return "";
	return `:root {\n${vars.join("\n")}\n}`;
}
