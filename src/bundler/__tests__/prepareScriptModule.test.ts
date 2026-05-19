import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prepareScriptModule, toTranspilePath } from "../prepareScriptModule";

const SNIPPETS = readFileSync(
	join(process.cwd(), "test-vault/shared/snippets.md"),
	"utf8",
);

describe("prepareScriptModule", () => {
	it("maps markdown block paths to safe .ts filenames", () => {
		expect(toTranspilePath("shared/snippets.md?block=addFn")).toBe(
			"shared/snippets/__block__-addFn.ts",
		);
	});

	it("strips TypeScript from markdown code blocks", () => {
		const block = SNIPPETS.match(/```ts \{name=addFn\}\n([\s\S]*?)```/)?.[1] ?? "";
		const code = prepareScriptModule(
			block,
			"shared/snippets.md?block=addFn",
		);
		expect(code).not.toMatch(/:\s*number/);
		expect(code).toMatch(/return/);
	});
});
