# Scroll remount

Tall blocks used by e2e to exercise reading-view virtualization unload / remount.
Spacers between blocks are injected by the e2e helper at runtime.

```vue-interactive
<template>
  <div class="scroll-block scroll-block-a" data-block="a">
    <p class="scroll-label">Block A</p>
    <button class="scroll-btn-a" type="button" @click="n++">A: {{ n }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const n = ref(0)
</script>

<style scoped>
.scroll-block {
  box-sizing: border-box;
  height: 640px;
  padding: 1rem;
  border: 2px solid var(--background-modifier-border, #888);
  border-radius: 8px;
  background: var(--background-secondary, #f3f3f3);
}
.scroll-label {
  margin: 0 0 0.75rem;
  font-weight: 600;
}
</style>
```

## Spacer AB

```vue-interactive
<template>
  <div class="scroll-block scroll-block-b" data-block="b">
    <p class="scroll-label">Block B</p>
    <button class="scroll-btn-b" type="button" @click="n++">B: {{ n }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const n = ref(0)
</script>

<style scoped>
.scroll-block {
  box-sizing: border-box;
  height: 640px;
  padding: 1rem;
  border: 2px solid var(--background-modifier-border, #888);
  border-radius: 8px;
  background: var(--background-secondary, #f3f3f3);
}
.scroll-label {
  margin: 0 0 0.75rem;
  font-weight: 600;
}
</style>
```

## Spacer BC

```vue-interactive
<template>
  <div class="scroll-block scroll-block-c" data-block="c">
    <p class="scroll-label">Block C</p>
    <button class="scroll-btn-c" type="button" @click="n++">C: {{ n }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const n = ref(0)
</script>

<style scoped>
.scroll-block {
  box-sizing: border-box;
  height: 640px;
  padding: 1rem;
  border: 2px solid var(--background-modifier-border, #888);
  border-radius: 8px;
  background: var(--background-secondary, #f3f3f3);
}
.scroll-label {
  margin: 0 0 0.75rem;
  font-weight: 600;
}
</style>
```
