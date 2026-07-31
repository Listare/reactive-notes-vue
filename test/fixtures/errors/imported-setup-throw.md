# 错误 — 导入组件 setup 报错

预期：父块导入 `BrokenSetup.vue` 后，子组件 `setup` 抛错被捕获并显示错误面板；Obsidian 不崩溃。

```vue-interactive
<template>
  <div class="parent-wrap">
    <p>父组件模板。下方子组件 setup 应报错：</p>
    <BrokenSetup />
  </div>
</template>

<script setup lang="ts">
import BrokenSetup from './BrokenSetup.vue'
</script>

<style scoped>
.parent-wrap {
  padding: 0.75rem 1rem;
  border: 1px dashed var(--background-modifier-border, #ccc);
  border-radius: 8px;
}
</style>
```
