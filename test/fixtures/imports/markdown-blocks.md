# 07 — Markdown 代码块导入

预期：从同目录 `shared/snippets.md` 导入命名代码块；`add` 为函数，`labels` 为 JSON 数组。

```vue-interactive
<template>
  <div class="import-demo-box">
    <p>add(2, 3) = {{ add(2, 3) }}</p>
    <ul>
      <li v-for="item in labels" :key="item">{{ item }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import addFn from '../shared/snippets.md?block=addFn'
import labelsData from '../shared/snippets.md?block=labels'

const add = addFn
const labels = labelsData as string[]
</script>
```

```vue-interactive
<template>
  <div class="import-demo-box">
	<p>下面应该显示文本：</p>
    <p>{{ snippetsText }}</p>
  </div>
</template>

<script setup lang="ts">
import snippetsText from '../shared/snippets.md'
</script>
```
