# 02 — 作用域样式

预期：上方按钮为紫色系，下方为绿色系；两块样式互不影响。

```vue-interactive
<template>
  <button class="chip chip-a" type="button">块 A — 紫色</button>
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
  <button class="chip chip-b" type="button">块 B — 绿色</button>
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
