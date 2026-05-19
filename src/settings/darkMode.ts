export type DarkModePreference = "light" | "dark" | "follow-obsidian";

export const DARK_MODE_OPTIONS: {
	value: DarkModePreference;
	label: string;
}[] = [
	{ value: "follow-obsidian", label: "跟随 Obsidian" },
	{ value: "light", label: "亮色" },
	{ value: "dark", label: "暗色" },
];

export function normalizeDarkModePreference(
	value: unknown,
): DarkModePreference {
	if (value === "light" || value === "dark" || value === "follow-obsidian") {
		return value;
	}
	return "follow-obsidian";
}
