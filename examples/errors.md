# Errors

## Compile: unsupported import

```vue-interactive
<template>
  <p>If you see this, error handling failed.</p>
</template>

<script setup lang="ts">
import { ref } from 'lodash-es'

const x = ref(0)
</script>
```

## Compile: missing template

```vue-interactive
<script setup lang="ts">
import { ref } from 'vue'
const msg = ref('hello')
</script>
```

## Runtime: onMounted throw

Component mounts first; a **runtime error** panel appears below.

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

## Runtime: click throw

```vue-interactive {name=onClick}
<template>
  <button class="runtime-boom-btn" type="button" @click="boom">
    Trigger runtime error
  </button>
</template>

<script setup lang="ts">
function boom() {
  throw new Error('click test error')
}
</script>

<style scoped>
.runtime-boom-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
}
</style>
```
