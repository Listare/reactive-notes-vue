# Pinia

Shared store across blocks; `persist` writes vault JSON. Set custom script path to `scripts`.

## Shared (no persist)

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">Block A</p>
    <p class="value">count = <strong>{{ store.count }}</strong></p>
    <button type="button" class="btn" @click="store.inc()">+1</button>
  </div>
</template>

<script setup lang="ts">
import { defineStore } from 'pinia'

const useDemoCounter = defineStore('pinia-demo-counter-no-persist', {
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
  background: var(--background-secondary, #f5f5f5);
  margin-bottom: 0.75rem;
}
.label { margin: 0 0 0.35rem; font-size: 0.85em; opacity: 0.8; }
.value { margin: 0 0 0.6rem; }
.btn {
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
  background: var(--interactive-accent, #7c3aed);
  color: var(--text-on-accent, #fff);
}
</style>
```

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">Block B (synced)</p>
    <p class="value">count = <strong>{{ count }}</strong></p>
  </div>
</template>

<script setup lang="ts">
import { defineStore, storeToRefs } from 'pinia'

const useDemoCounter = defineStore('pinia-demo-counter-no-persist', {
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
.label { margin: 0 0 0.35rem; font-size: 0.85em; opacity: 0.8; }
.value { margin: 0; }
</style>
```

## Persist to vault

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">persist → state/pinia-demo.json</p>
    <p class="value">count = <strong>{{ store.count }}</strong></p>
    <button type="button" class="btn" @click="store.inc()">+1</button>
  </div>
</template>

<script setup lang="ts">
import { defineStore } from 'pinia'

const useDemoCounter = defineStore('pinia-demo-counter', {
  state: () => ({ count: 0 }),
  actions: {
    inc() {
      this.count += 1
    },
  },
  persist: '@/state/pinia-demo.json',
})

const store = useDemoCounter()
</script>

<style scoped>
.pinia-card {
  padding: 0.75rem 1rem;
  border: 1px solid var(--background-modifier-border, #ccc);
  border-radius: 8px;
  margin-top: 0.5rem;
}
.label { margin: 0 0 0.35rem; font-size: 0.85em; opacity: 0.8; }
.value { margin: 0 0 0.6rem; }
.btn {
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
  background: var(--interactive-accent, #7c3aed);
  color: var(--text-on-accent, #fff);
}
</style>
```

## Store from `@custom-script/`

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">@custom-script/pinia-demo-store.ts</p>
    <p class="value">scriptCount = <strong>{{ store.count }}</strong></p>
    <button type="button" class="btn" @click="store.inc()">+1</button>
  </div>
</template>

<script setup lang="ts">
import { useScriptCounter } from '@custom-script/pinia-demo-store.ts'

const store = useScriptCounter()
</script>

<style scoped>
.pinia-card {
  padding: 0.75rem 1rem;
  border: 1px solid var(--background-modifier-border, #ccc);
  border-radius: 8px;
  margin-top: 0.5rem;
}
.label { margin: 0 0 0.35rem; font-size: 0.85em; opacity: 0.8; }
.value { margin: 0 0 0.6rem; }
.btn {
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
  background: var(--interactive-accent, #7c3aed);
  color: var(--text-on-accent, #fff);
}
</style>
```
