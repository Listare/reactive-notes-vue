# 19 — Node 扩展模块（fs / http）

**前置**：在 **设置 → Reactive Notes Vue** 开启「允许扩展 Node 内置模块」，然后重开或刷新本笔记。未开启时编译会报错。

注意：经桥接后 **所有 Node 调用都是异步的**，返回值与参数都需 `await`（例如 `const req = await http.get(...)`）。不要对代理结果使用同步的 `String(proxy)`。

预期：

1. 用 `node:fs/promises` 读出 `fixtures/node-read-sample.txt` 内容  
2. 用 `node:http` 请求 `http://example.com`，显示状态码与响应正文前若干字符（需联网）

```vue-interactive
<template>
  <div class="node-ext-demo">
    <section>
      <h3>node:fs/promises</h3>
      <p v-if="fsError" class="err">{{ fsError }}</p>
      <pre v-else class="out">{{ fsText }}</pre>
    </section>
    <section>
      <h3>node:http</h3>
      <p v-if="httpError" class="err">{{ httpError }}</p>
      <template v-else>
        <p>状态码：<code>{{ httpStatus }}</code></p>
        <pre class="out">{{ httpBody }}</pre>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import app from '@obsidian'
import { readFile } from 'node:fs/promises'
import http from 'node:http'
import { once } from 'node:events'
import { text } from 'node:stream/consumers'

const fsText = ref('读取中…')
const fsError = ref('')
const httpStatus = ref('…')
const httpBody = ref('请求中…')
const httpError = ref('')

onMounted(async () => {
  try {
    // Prefer method RPC (returns a real string after await), not String(proxy).
    const filePath = await app.vault.adapter.getFullPath(
      'fixtures/node-read-sample.txt',
    )
    const content = await readFile(filePath, 'utf8')
    fsText.value = typeof content === 'string' ? content : String(content)
  } catch (e) {
    fsError.value = e instanceof Error ? e.message : String(e)
    fsText.value = ''
  }

  try {
    // http.get is async over the bridge — must await before passing to once().
    const req = await http.get('http://example.com')
    const [res] = await once(req, 'response')
    httpStatus.value = String(await res.statusCode)
    const body = await text(res)
    const bodyText = typeof body === 'string' ? body : String(body)
    httpBody.value =
      bodyText.slice(0, 280) + (bodyText.length > 280 ? '…' : '')
  } catch (e) {
    httpError.value = e instanceof Error ? e.message : String(e)
    httpBody.value = ''
  }
})
</script>

<style scoped>
.node-ext-demo {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--background-modifier-border, #ccc);
  border-radius: 8px;
  background: var(--background-secondary, #f5f5f5);
}
.node-ext-demo h3 {
  margin: 0 0 0.4rem;
  font-size: 0.95rem;
}
.out {
  margin: 0;
  padding: 0.5rem 0.65rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.85em;
  background: var(--background-primary, #fff);
  border-radius: 6px;
}
.err {
  margin: 0;
  color: var(--text-error, #c00);
}
</style>
```
