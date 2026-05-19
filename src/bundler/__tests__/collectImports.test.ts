import { describe, expect, it } from "vitest";
import { collectImportsFromCode } from "../collectImports";

describe("collectImportsFromCode", () => {
	it("ignores type-only imports", () => {
		const specs = collectImportsFromCode(`
import type { Distribution } from './distributions.ts'
import DistributionChart from './DistributionChart.vue'
`);
		expect(specs).toEqual(["./DistributionChart.vue"]);
	});
});
