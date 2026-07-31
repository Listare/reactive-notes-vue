# Scoped styles

Upper button is purple; lower is green. Styles do not leak between blocks.

```vue-interactive
<template>
  <button class="chip chip-a" type="button">Block A — purple</button>
</template>

<script setup lang="ts">
</script>

<style scoped>
.chip {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 2px solid transparent;
  font-weight: 600;
}
.chip-a {
  background: #ede9fe;
  color: #5b21b6;
  border-color: #7c3aed;
}
</style>
```

```vue-interactive
<template>
  <button class="chip chip-b" type="button">Block B — green</button>
</template>

<script setup lang="ts">
</script>

<style scoped>
.chip {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 2px solid transparent;
  font-weight: 600;
}
.chip-b {
  background: #dcfce7;
  color: #166534;
  border-color: #22c55e;
}
</style>
```
