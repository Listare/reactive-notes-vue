# 18 — Node 内置模块（`node:`）

预期：显示用 `node:path` 拼接的路径。扩展模块（如 `node:fs`）需在 **设置 → Reactive Notes Vue → 允许扩展 Node 内置模块** 中开启。

```vue-interactive
<template>
  <div class="node-demo">
    <p>拼接路径：<code>{{ joined }}</code></p>
    <p class="hint">默认仅安全子集；开启扩展设置后才可使用 node:fs 等。</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { join } from 'node:path'

const joined = ref('…')

onMounted(async () => {
  joined.value = String(await join('notes', 'demo.md'))
})
</script>

<style scoped>
.node-demo {
  padding: 0.75rem 1rem;
  border: 1px solid var(--background-modifier-border, #ccc);
  border-radius: 8px;
  background: var(--background-secondary, #f5f5f5);
}
.node-demo code {
  word-break: break-all;
}
.hint {
  margin: 0.5rem 0 0;
  font-size: 0.85em;
  opacity: 0.8;
}
</style>
```
