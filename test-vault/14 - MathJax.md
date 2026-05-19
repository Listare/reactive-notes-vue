# MathJax 与 LaTeX 组件

预期：行内与块级公式随 `latex` 绑定更新；修改输入框内容后公式重新渲染。

```vue-interactive
<template>
  <div class="flex flex-col gap-4 p-4">
    <label class="flex flex-col gap-1 text-sm">
      行内公式
      <input
        v-model="inlineLatex"
        class="rounded border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-2 py-1"
      />
    </label>
    <p class="text-base">
      欧拉恒等式：
      <Latex :latex="inlineLatex" />
    </p>

    <label class="flex flex-col gap-1 text-sm">
      块级公式
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
