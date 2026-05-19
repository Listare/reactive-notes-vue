import { describe, expect, it } from "vitest";
import { parseFenceInfo } from "../extractNamedCodeBlock";

describe("parseFenceInfo", () => {
	it("parses name", () => {
		expect(parseFenceInfo("vue-interactive {name=Chip}")).toEqual({
			lang: "vue-interactive",
			name: "Chip",
		});
	});

	it("parses hide=true", () => {
		expect(parseFenceInfo("vue-interactive {hide=true}")).toEqual({
			lang: "vue-interactive",
			hide: true,
		});
	});

	it("parses combined name and hide", () => {
		expect(parseFenceInfo("vue-interactive {name=Chip, hide=true}")).toEqual({
			lang: "vue-interactive",
			name: "Chip",
			hide: true,
		});
	});

	it("ignores hide=false", () => {
		expect(parseFenceInfo("vue-interactive {hide=false}")).toEqual({
			lang: "vue-interactive",
		});
	});
});
