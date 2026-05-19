# 12 — 主题与 Tailwind

手测 **暗色模式**（设置 → Reactive Notes Vue）与 **`getTheme()`** / Tailwind `dark:`。

## 预期

| 模式 | Tailwind 卡片 | `getTheme()` 标签 |
|------|---------------|-------------------|
| 跟随 Obsidian | 随外观切换 | `dark` / `light` 与 Obsidian 一致 |
| 强制亮色 | 始终浅灰白底 | 始终 `light` |
| 强制暗色 | 始终 `dark:bg-slate-800` | 始终 `dark` |

切换 **设置 → 外观** 后约 1 秒内更新（无需重开笔记）。修改插件暗色设置后立即更新。

---

## 主题检测卡片

使用与 [ReactiveNotes](https://github.com/Prodigist/ReactiveNotes) 相同的 `getTheme()`（`document.body.hasClass('theme-dark')`）。样式为显式 Tailwind 颜色，不依赖 Obsidian CSS 变量。

```vue-interactive
<template>
  <div
    class="max-w-md rounded-lg border p-4 shadow-sm transition-colors"
    :class="panelClass"
  >
    <p class="text-sm font-semibold" :class="labelClass">getTheme()</p>
    <p class="mt-1 text-lg font-mono">{{ theme }}</p>
    <p class="mt-2 text-xs opacity-80">
      在 script 中调用 <code>getTheme()</code>，返回 <code>'dark'</code> 或
      <code>'light'</code>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

---

## Tailwind `dark:` 变体

```vue-interactive
<template>
  <div
    class="max-w-md rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-4"
  >
    <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Tailwind dark:</p>
    <p class="mt-1 text-slate-900 dark:text-slate-100">
      使用 <span class="font-mono">dark:bg-slate-800</span> 等类名
    </p>
    <button
      type="button"
      class="mt-3 rounded-md bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-500 dark:bg-violet-500"
      @click="n++"
    >
      点击 {{ n }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const n = ref(0)
</script>
```

---

## 操作步骤

1. 阅读模式打开本页，确认两块初始外观与当前 Obsidian 主题一致。
2. **设置 → 外观** 切换亮/暗（插件选「跟随 Obsidian」）。
3. 插件设置分别试 **亮色**、**暗色**，确认两块固定不变随 Obsidian。
4. 命令面板：**刷新 vue-interactive 块**。
