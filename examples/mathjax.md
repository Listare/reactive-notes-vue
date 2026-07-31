# MathJax

Inline and display formulas update with the bound `latex` strings.

```vue-interactive
<template>
  <div class="flex flex-col gap-4 p-4">
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

const inlineLatex = ref('e^{i\\pi} + 1 = 0')
const blockLatex = ref(String.raw`\int_{-\infty}^{\infty} e^{-x^2}\, dx = \sqrt{\pi}`)
</script>
```
