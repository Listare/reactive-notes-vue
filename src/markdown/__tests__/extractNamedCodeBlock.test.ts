import { describe, expect, it } from "vitest";
import {
	extractNamedCodeBlock,
	listNamedCodeBlocks,
} from "../extractNamedCodeBlock";

const SAMPLE = `# Title

\`\`\`js {name=helper}
export const value = 1
\`\`\`

\`\`\`yaml {name=config}
key: value
\`\`\`
`;

describe("extractNamedCodeBlock", () => {
	it("extracts by name", () => {
		const block = extractNamedCodeBlock(SAMPLE, "helper");
		expect(block?.lang).toBe("js");
		expect(block?.content).toContain("export const value");
	});

	it("returns null for missing block", () => {
		expect(extractNamedCodeBlock(SAMPLE, "missing")).toBeNull();
	});

	it("lists all named blocks", () => {
		const names = listNamedCodeBlocks(SAMPLE).map((b) => b.name);
		expect(names).toEqual(["helper", "config"]);
	});
});
