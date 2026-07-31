import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "../debounce";

describe("debounce", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs only the trailing call", () => {
		const fn = vi.fn();
		const d = debounce(fn, 50);
		d();
		d();
		d();
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(50);
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
