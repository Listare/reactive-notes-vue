import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						"eslint.config.js",
						"eslint.config.mts",
						"manifest.json",
						"vitest.config.ts",
					],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"sandbox-runner.js",
		"sandbox-tailwind.css",
		"scripts/**",
		"test-vault/**",
	]),
	{
		files: ["**/*.mjs", "vitest.config.ts"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		files: ["src/test/**/*.ts", "src/**/*.test.ts"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		rules: {
			"obsidianmd/no-forbidden-elements": "off",
			"obsidianmd/hardcoded-config-path": "off",
			"@typescript-eslint/no-non-null-asserted-optional-chain": "off",
		},
	},
	{
		files: ["src/vault/vaultFileAccess.ts"],
		rules: {
			"obsidianmd/hardcoded-config-path": "off",
		},
	},
	{
		files: [
			"src/runtime/sandboxFrame.ts",
			"src/runtime/sandboxRunner.ts",
			"src/math/Latex.ts",
		],
		rules: {
			"obsidianmd/no-static-styles-assignment": "off",
			"obsidianmd/no-forbidden-elements": "off",
			"@microsoft/sdl/no-inner-html": "off",
			"obsidianmd/ui/sentence-case": "off",
		},
	},
	{
		files: ["src/ui/ReactiveNotesVueSettingTab.ts"],
		rules: {
			"obsidianmd/settings-tab/no-problematic-settings-headings": "off",
			"obsidianmd/ui/sentence-case": "off",
		},
	},
);
