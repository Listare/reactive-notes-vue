# Imports

## `@custom-script/`

```vue-interactive
<template>
  <div class="import-demo-box">
    <button type="button" class="import-demo-btn" @click="count++">Import demo: {{ count }}</button>
  </div>
</template>

<script setup lang="ts">
import useCounter from '@custom-script/counter-util.ts'
import '@custom-script/theme.css'

const { count } = useCounter(0)
</script>
```

## Markdown `?block=`

```vue-interactive
<template>
  <div class="import-demo-box">
    <p class="import-add-result">add(2, 3) = {{ add(2, 3) }}</p>
    <ul class="import-labels">
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
