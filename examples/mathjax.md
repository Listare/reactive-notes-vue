# MathJax

Inline / display formulas, plus macros from the vault preamble (`mathjax-preamble.sty`).

Set **Settings → Reactive Notes Vue → MathJax 前置文件** to `mathjax-preamble.sty` so `\RR` resolves to `\mathbb{R}`.

```vue-interactive
<template>
  <div class="flex flex-col gap-4 p-4">
    <label class="flex flex-col gap-1 text-sm">
      Preamble macro (\RR)
      <input
        v-model="macroLatex"
        class="rounded border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-2 py-1 font-mono text-sm"
      />
    </label>
    <p class="text-base">
      Reals:
      <span class="preamble-macro"><Latex :latex="macroLatex" /></span>
    </p>

    <label class="flex flex-col gap-1 text-sm">
      Inline
      <input
        v-model="inlineLatex"
        class="rounded border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-2 py-1"
      />
    </label>
    <p class="text-base">
      Euler:
      <Latex :latex="inlineLatex" />
    </p>

    <label class="flex flex-col gap-1 text-sm">
      Display
      <textarea
        v-model="blockLatex"
        rows="3"
        class="rounded border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-2 py-1 font-mono text-sm"
      />
    </label>
    <Latex :latex="blockLatex" display />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Latex } from '@vue-interactive/math'

const macroLatex = ref(String.raw`\RR`)
const inlineLatex = ref('e^{i\\pi} + 1 = 0')
const blockLatex = ref(String.raw`\int_{-\infty}^{\infty} e^{-x^2}\, dx = \sqrt{\pi}`)
</script>
```
