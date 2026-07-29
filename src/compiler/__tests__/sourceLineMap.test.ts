import { describe, expect, it } from "vitest";
import { compileSfc } from "../compileSfc";
import {
	placeLineMapAfterPreamble,
	shiftLineMapDown,
} from "../sourceLineMap";

describe("sourceLineMap helpers", () => {
	it("shifts maps when prepending prelude lines", () => {
		const map: number[] = [];
		map[5] = 10;
		const shifted = shiftLineMapDown(map, 1)!;
		expect(shifted[5]).toBeUndefined();
		expect(shifted[6]).toBe(10);
	});

	it("places script map after template preamble", () => {
		const scriptMap: number[] = [];
		scriptMap[8] = 6;
		const placed = placeLineMapAfterPreamble(scriptMap, 6, 20);
		expect(placed[14]).toBe(6);
	});
});

describe("compileSfc originalLineByEmitted", () => {
	it("maps the throw line back to the SFC script line", () => {
		const sfc = `<template>
  <p>x</p>
</template>

<script setup lang="ts">
throw new Error('line-map')
</script>`;
		const compiled = compileSfc(sfc);
		const throwEmitted =
			compiled.moduleCode
				.split("\n")
				.findIndex((l) => l.includes("line-map")) + 1;
		expect(throwEmitted).toBeGreaterThan(0);
		expect(compiled.originalLineByEmitted[throwEmitted]).toBe(6);
	});
});
