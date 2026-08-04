# Scroll remount expand

Block A can grow taller. Remount should keep the expanded host height while
reloading, then shrink after state resets. Blocks B/C provide scroll distance
(same virtualization pattern as `scroll-remount.md`).

```vue-interactive
<template>
  <div
    class="expand-block"
    :class="{ 'expand-block--tall': expanded }"
    data-block="expand"
  >
    <p class="expand-label">Expand remount</p>
    <button class="expand-height-btn" type="button" @click="expanded = true">
      {{ expanded ? "expanded" : "grow" }}
    </button>
    <p class="expand-status">{{ expanded ? "tall" : "short" }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
const expanded = ref(false);
</script>

<style scoped>
.expand-block {
  box-sizing: border-box;
  height: 420px;
  padding: 1rem;
  border: 2px solid var(--background-modifier-border, #888);
  border-radius: 8px;
  background: var(--background-secondary, #f3f3f3);
}
.expand-block--tall {
  height: 960px;
}
.expand-label {
  margin: 0 0 0.75rem;
  font-weight: 600;
}
.expand-status {
  margin: 0.75rem 0 0;
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
import { ref } from "vue";
const n = ref(0);
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
import { ref } from "vue";
const n = ref(0);
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
