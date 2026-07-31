import { describe, expect, it } from "vitest";
import { dispatchProxyCall } from "../dispatchInvocation";

describe("dispatchProxyCall", () => {
	const root = {
		greet(name: string) {
			return `hi ${name}`;
		},
		nested: {
			value: 42,
			async asyncValue() {
				return 7;
			},
		},
		Box: class Box {
			constructor(public n: number) {}
		},
	};

	it("reads properties and applies methods", () => {
		expect(
			dispatchProxyCall({
				root,
				path: ["nested", "value"],
				args: [],
				construct: false,
				formatConstructError: () => "c",
				formatCallError: () => "e",
			}),
		).toBe(42);

		expect(
			dispatchProxyCall({
				root,
				path: ["greet"],
				args: ["Ada"],
				construct: false,
				formatConstructError: () => "c",
				formatCallError: () => "e",
			}),
		).toBe("hi Ada");
	});

	it("constructs with new", () => {
		const box = dispatchProxyCall({
			root,
			path: ["Box"],
			args: [3],
			construct: true,
			formatConstructError: () => "c",
			formatCallError: () => "e",
		}) as { n: number };
		expect(box.n).toBe(3);
	});

	it("awaits thenables when requested", async () => {
		const value = dispatchProxyCall({
			root,
			path: ["nested", "asyncValue"],
			args: [],
			construct: false,
			awaitPromises: true,
			formatConstructError: () => "c",
			formatCallError: () => "e",
		});
		await expect(value).resolves.toBe(7);
	});
});
