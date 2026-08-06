# Teleport

`<Teleport to="body">` stays inside the sandbox iframe (not the Obsidian host document).

```vue-interactive
<template>
  <div class="teleport-demo">
    <button type="button" class="teleport-open-btn" @click="open = true">
      Open overlay
    </button>
  </div>
  <Teleport to="body">
    <div v-if="open" class="teleport-overlay" role="dialog">
      <p class="teleport-overlay-title">Teleported panel</p>
      <button type="button" class="teleport-dismiss-btn" @click="open = false">
        Dismiss
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>

<style scoped>
.teleport-demo {
  padding: 0.5rem 0;
}
.teleport-open-btn,
.teleport-dismiss-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
  background: var(--interactive-accent, #7c3aed);
  color: var(--text-on-accent, #fff);
}
.teleport-overlay {
  margin-top: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--background-modifier-border, #ccc);
  background: var(--background-secondary, #f5f5f5);
}
.teleport-overlay-title {
  margin: 0 0 0.75rem;
  font-weight: 600;
}
</style>
```
