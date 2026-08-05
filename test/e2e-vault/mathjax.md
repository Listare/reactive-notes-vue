# MathJax

Uses the vault MathJax preamble (`mathjax-preamble.sty`) macro `\RR`.

```vue-interactive
<template>
  <div class="flex flex-col gap-4 p-4">
    <p class="text-base">
      Preamble macro:
      <span class="preamble-macro"><Latex :latex="macroLatex" /></span>
    </p>
    <p class="text-base">
      Euler:
      <Latex :latex="inlineLatex" />
    </p>
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
