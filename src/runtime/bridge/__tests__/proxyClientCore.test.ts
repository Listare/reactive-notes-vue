import { describe, expect, it } from "vitest";
import { createRpcProxyFactory, readRefId } from "../proxyClientCore";

describe("createRpcProxyFactory", () => {
	it("parameterizes then-trap rules for node vs obsidian", async () => {
		const calls: string[] = [];
		const REF = Symbol("ref");

		const nodeLike = createRpcProxyFactory<{
			target: "module" | "ref";
			refId?: number;
		}>({
			refIdSymbol: REF,
			getRefId: (ctx) => ctx.refId,
			invoke: async (ctx, path) => {
				calls.push(`${ctx.target}:${path.join(".")}`);
				return "ok";
			},
			shouldExposeThen: (ctx, path) => {
				if (ctx.target === "module" && path.length === 0) return false;
				if (ctx.target === "ref" && path.length === 0) return false;
				return true;
			},
		});

		const mod = nodeLike.createProxy({ target: "module" }, []) as {
			then?: unknown;
			join: { then?: unknown };
		};
		expect(mod.then).toBeUndefined();
		expect(typeof mod.join.then).toBe("function");
		await (mod.join as PromiseLike<string>);
		expect(calls).toContain("module:join");

		const ref = nodeLike.createProxy({ target: "ref", refId: 1 }, []) as {
			then?: unknown;
		};
		expect(ref.then).toBeUndefined();
		expect(readRefId(ref, REF)).toBe(1);

		const obsidianLike = createRpcProxyFactory<{
			target: "app" | "ref";
			refId?: number;
		}>({
			refIdSymbol: REF,
			getRefId: (ctx) => ctx.refId,
			invoke: async () => "x",
			shouldExposeThen: (ctx, path) =>
				!(ctx.target === "ref" && path.length === 0),
		});
		const app = obsidianLike.createProxy({ target: "app" }, []) as {
			then?: unknown;
		};
		expect(typeof app.then).toBe("function");
	});
});
