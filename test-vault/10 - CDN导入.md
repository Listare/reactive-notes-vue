# 10 — CDN / URL 导入

预期：从 [esm.sh](https://esm.sh) 等 HTTPS URL 动态加载 ESM，在阅读模式下正常渲染。

**前置**：需要联网；若加载失败，应显示红色错误面板（而非 Obsidian 崩溃）。

本页同时覆盖：

- 默认导入：`dayjs`
- 命名导入（CDN 仅 default 时自动回退）：`lodash-es/debounce`
- 带查询参数的 CDN URL：`?target=esnext`（`uuid`）

```vue-interactive
<template>
  <div class="cdn-demo">
    <p class="cdn-demo__time">dayjs: {{ now }}</p>
    <p class="cdn-demo__id">uuid: {{ id }}</p>
    <label class="cdn-demo__search">
      防抖搜索（lodash-es）：
      <input v-model="query" type="search" placeholder="输入关键字…" />
    </label>
    <p class="cdn-demo__log">最近触发: {{ lastLog || '（尚未触发）' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import dayjs from 'https://esm.sh/dayjs@1.11.13'
import { debounce } from 'https://esm.sh/lodash-es@4.17.21/debounce'
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.1?target=esnext'

const now = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))
const id = ref(uuidv4())
const query = ref('')
const lastLog = ref('')

const logQuery = debounce((value: string) => {
  lastLog.value = value ? `${dayjs().format('HH:mm:ss')} → “${value}”` : ''
}, 400)

watch(query, (value) => {
  logQuery(value)
})
</script>

<style scoped>
.cdn-demo {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  background: var(--background-secondary);
}
.cdn-demo__time,
.cdn-demo__id {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.cdn-demo__search {
  display: grid;
  gap: 0.35rem;
  font-size: 0.9em;
}
.cdn-demo__search input {
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
  color: var(--text-normal);
}
.cdn-demo__log {
  margin: 0;
  font-size: 0.85em;
  color: var(--text-muted);
}
</style>
```
