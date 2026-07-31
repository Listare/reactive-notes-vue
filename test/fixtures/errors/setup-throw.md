# 错误 — setup 同步抛错

预期：**不**正常渲染业务 UI（或显示错误面板）；`setup` 内同步 `throw` 被捕获，Obsidian 不崩溃。

```vue-interactive
<template>
  <p class="setup-ok">若看到这段文字且无错误面板，说明 setup 错误未被捕获。</p>
</template>

<script setup lang="ts">
throw new Error('setup 同步测试错误')
</script>
```
