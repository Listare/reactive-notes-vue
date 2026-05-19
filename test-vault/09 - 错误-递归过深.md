# 09 — 错误：递归过深

预期：**不**渲染组件；显示红色错误面板，堆栈中含栈溢出信息（如 `Maximum call stack`），Obsidian 不崩溃。

```ts {name=recursiveRun}
function run(): number {
  return 1 + run()
}
export default run()
```

```vue-interactive
<template>
  <p>若看到这段文字，说明错误处理失败。</p>
</template>

<script setup lang="ts">
import run from './09 - 错误-递归过深.md?block=recursiveRun'
const n = run()
void n
</script>
```
