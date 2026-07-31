# 11 — Obsidian API（`@obsidian`）

预期：显示库名称、当前笔记路径；点击按钮弹出 Obsidian 通知。

```vue-interactive
<template>
  <div class="obsidian-api-demo">
    <p class="vault-line">库：<strong>{{ vaultName }}</strong></p>
    <p class="path-line">当前笔记：<code>{{ notePath }}</code></p>
    <button type="button" class="notice-btn" @click="showNotice">
      显示 Notice
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import app from '@obsidian'
import { Notice } from '@obsidian'

const vaultName = ref('…')
const notePath = ref('…')

onMounted(async () => {
  vaultName.value = String(await app.vault.getName())
  const file = await app.workspace.getActiveFile()
  notePath.value = file ? String(await file.path) : '（无活动文件）'
})

async function showNotice() {
  new Notice(`来自 vue-interactive：${notePath.value}`)
}
</script>

<style scoped>
.obsidian-api-demo {
  padding: 0.75rem 1rem;
  border: 1px solid var(--background-modifier-border, #ccc);
  border-radius: 8px;
  background: var(--background-secondary, #f5f5f5);
}
.vault-line {
  margin: 0 0 0.5rem;
}
.path-line {
  margin: 0 0 0.75rem;
  font-size: 0.9em;
}
.path-line code {
  word-break: break-all;
}
.notice-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
  background: var(--interactive-accent, #7c3aed);
  color: var(--text-on-accent, #fff);
}
.notice-btn:hover {
  filter: brightness(1.05);
}
</style>
```
