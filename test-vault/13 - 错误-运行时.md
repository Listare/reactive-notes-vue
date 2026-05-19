# 13 — 错误：运行时

预期：**先**渲染出组件（文案或按钮可见），**组件下方**出现「运行时错误」面板（非整块替换）；Obsidian 不崩溃。

与 [[09 - 错误-递归过深]] 不同：09 在首次执行模块时失败，不渲染组件；本篇在挂载成功后才抛错。

## onMounted 抛错

```vue-interactive {name=onMounted}
<template>
  <p class="runtime-ok">组件已挂载（下方应出现运行时错误）</p>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  throw new Error('onMounted 测试错误')
})
</script>
```

## 点击抛错

```vue-interactive {name=onClick}
<template>
  <button class="runtime-boom-btn" type="button" @click="boom">
    点击触发运行时错误
  </button>
</template>

<script setup lang="ts">
function boom() {
  throw new Error('点击测试错误')
}
</script>

<style scoped>
.runtime-boom-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
}
</style>
```
