# Pinia shared

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">Block A</p>
    <p class="value">count = <strong class="pinia-count-a">{{ store.count }}</strong></p>
    <button type="button" class="btn pinia-inc-a" @click="store.inc()">+1</button>
  </div>
</template>

<script setup lang="ts">
import { defineStore } from 'pinia'

const useDemoCounter = defineStore('pinia-e2e-counter', {
  state: () => ({ count: 0 }),
  actions: {
    inc() {
      this.count += 1
    },
  },
})

const store = useDemoCounter()
</script>

<style scoped>
.pinia-card {
  padding: 0.75rem 1rem;
  border: 1px solid var(--background-modifier-border, #ccc);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}
.btn {
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
}
</style>
```

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">Block B (synced)</p>
    <p class="value">count = <strong class="pinia-count-b">{{ count }}</strong></p>
  </div>
</template>

<script setup lang="ts">
import { defineStore, storeToRefs } from 'pinia'

const useDemoCounter = defineStore('pinia-e2e-counter', {
  state: () => ({ count: 0 }),
  actions: {
    inc() {
      this.count += 1
    },
  },
})

const store = useDemoCounter()
const { count } = storeToRefs(store)
</script>

<style scoped>
.pinia-card {
  padding: 0.75rem 1rem;
  border: 1px dashed var(--background-modifier-border, #ccc);
  border-radius: 8px;
}
</style>
```
