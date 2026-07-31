# Reactive Notes Vue — examples

Demo vault for browsing features locally and for WDIO e2e tests.

## Open locally

1. `pnpm run dev` or `pnpm run build` (syncs the plugin into this vault).
2. Obsidian → **Open folder as vault** → select `examples/`.
3. Enable **Reactive Notes Vue** (preconfigured). Set custom script path to `scripts` and MathJax preamble to `mathjax-preamble.sty` when trying imports / MathJax / Pinia script stores.

## Notes

| Note | Covers |
|------|--------|
| [[counter]] | Basic click / `ref` |
| [[scoped-styles]] | `<style scoped>` |
| [[imports]] | `@custom-script/` and `?block=` |
| [[obsidian-api]] | `@obsidian` |
| [[theme-tailwind]] | Theme + Tailwind `dark:` |
| [[mathjax]] | `@vue-interactive/math` |
| [[pinia]] | Shared store + persist |
| [[errors]] | Compile and runtime errors |

Automated checks: `pnpm run test:e2e`.
