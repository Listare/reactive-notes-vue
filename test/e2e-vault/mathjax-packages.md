# MathJax packages (Obsidian-aligned)

Exercises `\require`, physics, and mhchem like Obsidian's MathJax `input/tex` defaults.

```vue-interactive
<template>
  <div class="flex flex-col gap-3 p-4 text-base">
    <p>
      require+cancel:
      <span class="mjx-require-cancel"><Latex :latex="cancelLatex" /></span>
    </p>
    <p>
      physics:
      <span class="mjx-require-physics"><Latex :latex="physicsLatex" /></span>
    </p>
    <p>
      mhchem:
      <span class="mjx-mhchem"><Latex :latex="chemLatex" /></span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Latex } from '@vue-interactive/math'

const cancelLatex = ref(String.raw`\require{cancel}\cancel{x}`)
const physicsLatex = ref(String.raw`\require{physics}\ket{\psi}`)
const chemLatex = ref(String.raw`\ce{H2O}`)
</script>
```
