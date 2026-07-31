# Runtime: onMounted throw

```vue-interactive {name=onMounted}
<template>
  <p class="runtime-ok">Mounted (runtime error panel should appear below)</p>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  throw new Error('onMounted test error')
})
</script>
```
