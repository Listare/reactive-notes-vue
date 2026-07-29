# 错误 — 异步 setup 抛错

预期：`<script setup>` 顶层 `await` 之后抛错（或 `Promise.reject`）时显示错误面板；Obsidian 不崩溃。

对比：[[17 - 异步setup]] 为成功路径；本篇验证失败路径。

## await 后 throw

```vue-interactive {name=awaitThenThrow}
<template>
  <p>若看到这段文字，说明异步 setup 错误未被捕获。</p>
</template>

<script setup lang="ts">
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

await delay(200)
throw new Error('异步 setup：await 后 throw')
</script>
```

## Promise.reject

```vue-interactive {name=promiseReject}
<template>
  <p>若看到这段文字，说明 Promise.reject 未被捕获。</p>
</template>

<script setup lang="ts">
await Promise.reject(new Error('异步 setup：Promise.reject'))
</script>
```
