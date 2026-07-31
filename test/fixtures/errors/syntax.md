# 错误 — 本块语法错误

预期：**不**渲染组件；显示编译错误面板（解析 / 编译失败），Obsidian 不崩溃。

```vue-interactive
<template>
  <p>若看到这段文字，说明语法错误未被捕获。</p>
</template>

<script setup lang="ts">
// 故意保留非法语法
const broken = {{{
</script>
```
