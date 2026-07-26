# 17 — 异步 setup（顶层 await）

预期：`<script setup>` 内顶层 `await` 结束后仍能渲染（编译为 async setup，运行时由 Suspense 承接）。

对比：[[11 - Obsidian API]] 把 `await` 放在 `onMounted` 里，setup 仍是同步的。

```vue-interactive
<template>
  <div class="async-setup-demo">
    <p class="status">状态：<strong>{{ status }}</strong></p>
    <p class="payload">数据：<code>{{ payload }}</code></p>
    <button type="button" class="reload-btn" @click="bump">
      已就绪，点击 {{ clicks }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const status = await delay(400).then(() => '异步 setup 已完成')
const payload = await Promise.resolve(`loaded@${Date.now()}`)
const clicks = ref(0)

function bump() {
  clicks.value++
}
</script>

<style scoped>
.async-setup-demo {
  padding: 0.75rem 1rem;
  border: 1px solid var(--background-modifier-border, #ccc);
  border-radius: 8px;
  background: var(--background-secondary, #f5f5f5);
}
.status,
.payload {
  margin: 0 0 0.5rem;
}
.payload code {
  word-break: break-all;
}
.reload-btn {
  margin-top: 0.25rem;
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
  background: var(--interactive-accent, #7c3aed);
  color: var(--text-on-accent, #fff);
}
.reload-btn:hover {
  filter: brightness(1.05);
}
</style>
```
