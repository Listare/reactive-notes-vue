# 错误 — 点击按钮后抛错

预期：**先**渲染出按钮；点击后**组件下方**出现「运行时错误」面板（非整块替换）；Obsidian 不崩溃。

与 setup 同步抛错不同：本篇挂载成功，仅在用户交互时抛错。

```vue-interactive
<template>
  <div class="click-error-demo">
    <p>组件已挂载。点击下方按钮应触发运行时错误面板。</p>
    <button class="boom-btn" type="button" @click="boom">
      点击触发运行时错误
    </button>
  </div>
</template>

<script setup lang="ts">
function boom() {
  throw new Error('点击按钮测试错误')
}
</script>

<style scoped>
.click-error-demo {
  padding: 0.75rem 1rem;
  border: 1px solid var(--background-modifier-border, #ccc);
  border-radius: 8px;
}
.boom-btn {
  margin-top: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
}
</style>
```
