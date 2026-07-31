import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, "src/test/stubs/obsidian.ts"),
		},
	},
	test: {
		include: ["src/**/*.test.ts"],
		environment: "jsdom",
		setupFiles: ["src/test/setupSharedRuntime.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			reportsDirectory: "./coverage",
			// Gate pure/shared layers (not Obsidian/DOM host adapters).
			include: [
				"src/compiler/**/*.ts",
				"src/runtime/bridge/**/*.ts",
				"src/processor/vueBlockRemountPlan.ts",
				"src/runtime/sandboxRunnerPlan.ts",
				"src/runtime/sandboxHostMessage.ts",
				"src/runtime/prepareMeasureContract.ts",
				"src/runtime/vueBlockSourceResolve.ts",
				"src/vault/vaultModuleKind.ts",
			],
			exclude: [
				"src/**/__tests__/**",
				"src/**/*.test.ts",
				"src/**/*Placeholder.ts",
				// Vault/App orchestration — covered by fixtures/manual, not unit gate.
				"src/compiler/compileSfcWithImports.ts",
			],
			all: true,
			thresholds: {
				lines: 85,
				functions: 85,
				branches: 80,
				statements: 85,
			},
		},
	},
});
