# 06 — 文件导入

预期：从 `@custom-script/` 导入 TS 与 CSS，计数器可点击递增。

**前置**：在 **设置 → Reactive Notes Vue** 中将「自定义脚本路径」设为 `scripts`（与库内 `scripts/` 文件夹一致）。

```vue-interactive
<template>
  <div class="import-demo-box">
    <button type="button" @click="count++">Import demo: {{ count }}</button>
  </div>
</template>

<script setup lang="ts">
import useCounter from '@custom-script/counter-util.ts'
import '@custom-script/theme.css'

const { count } = useCounter(0)
</script>
```
