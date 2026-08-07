# Theme and Tailwind

Dark mode follows **Settings → Reactive Notes Vue** and Obsidian appearance.

## `getTheme()`

```vue-interactive
<template>
  <div
    class="max-w-md rounded-lg border p-4 shadow-sm transition-colors"
    :class="panelClass"
  >
    <p class="text-sm font-semibold" :class="labelClass">getTheme()</p>
    <p class="mt-1 text-lg font-mono">{{ theme }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getTheme } from '@vue-interactive/theme'

const theme = computed(() => getTheme())

const panelClass = computed(() =>
  theme.value === 'dark'
    ? 'border-slate-600 bg-slate-800 text-slate-100'
    : 'border-slate-200 bg-white text-slate-900',
)

const labelClass = computed(() =>
  theme.value === 'dark' ? 'text-slate-400' : 'text-slate-500',
)
</script>
```

## Tailwind `dark:`

```vue-interactive
<template>
  <div
    class="max-w-md rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-4"
  >
    <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Tailwind dark:</p>
    <p class="mt-1 text-slate-900 dark:text-slate-100">
      Use <span class="font-mono">dark:bg-slate-800</span>
    </p>
    <button
      type="button"
      class="mt-3 rounded-md bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-500 dark:bg-violet-500"
      @click="n++"
    >
      Click {{ n }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const n = ref(0)
</script>
```

## Arbitrary values (runtime Tailwind)

```vue-interactive
<template>
  <div
    data-testid="tw-arbitrary"
    class="rounded-md bg-[#112233] px-3 py-2 text-sm text-[#eeddcc]"
  >
    arbitrary bg-[#112233]
  </div>
</template>
```
