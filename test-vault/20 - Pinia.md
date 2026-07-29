# 20 — Pinia（全局共享 + 持久化）

预期：

1. **共享**：下方两个块共用同一个 store；点左侧 `+1`，右侧数字同步变化。
2. **持久化**：`persist: '@/state/pinia-demo.json'`。改动后约 300ms 写回；切换笔记再回来（或重载插件）应恢复上次计数。
3. **相对路径**：第三块把 store 定义在 `@custom-script/`，`persist: './pinia-script-counter.json'` 应写到 `scripts/pinia-script-counter.json`。
4. **清除状态**：命令面板运行 **清除所有交互状态** 后，会销毁内存中的 store 并重新挂载，**从 JSON 重新加载**（文件本身不会被删除）。

**前置**：自定义脚本路径设为 `scripts`（与 [[06 - 导入示例]] 相同）。可在库内打开 `state/pinia-demo.json` 核对内容。

## 无持久化

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">块 A（写入）</p>
    <p class="value">count = <strong>{{ store.count }}</strong></p>
    <button type="button" class="btn" @click="store.inc()">+1</button>
    <button type="button" class="btn secondary" @click="store.reset()">重置</button>
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
    reset() {
      this.count = 0
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
.label {
  margin: 0 0 0.35rem;
  font-size: 0.85em;
  opacity: 0.8;
}
.value {
  margin: 0 0 0.6rem;
}
.btn {
  margin-right: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
  background: var(--interactive-accent, #7c3aed);
  color: var(--text-on-accent, #fff);
}
.btn.secondary {
  background: var(--background-primary, #fff);
  color: var(--text-normal, #111);
}
.btn:hover {
  filter: brightness(1.05);
}
</style>
```

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">块 B（只读同步）</p>
    <p class="value">同一 store：<strong>{{ count }}</strong></p>
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
    reset() {
      this.count = 0
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
  background: var(--background-primary, #fff);
}
.label {
  margin: 0 0 0.35rem;
  font-size: 0.85em;
  opacity: 0.8;
}
.value {
  margin: 0;
}
</style>
```

## 同笔记两块共享 + 库根持久化

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">块 A（写入）</p>
    <p class="value">count = <strong>{{ store.count }}</strong></p>
    <button type="button" class="btn" @click="store.inc()">+1</button>
    <button type="button" class="btn secondary" @click="store.reset()">重置</button>
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
    reset() {
      this.count = 0
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
  background: var(--background-secondary, #f5f5f5);
  margin-bottom: 0.75rem;
}
.label {
  margin: 0 0 0.35rem;
  font-size: 0.85em;
  opacity: 0.8;
}
.value {
  margin: 0 0 0.6rem;
}
.btn {
  margin-right: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--background-modifier-border, #ccc);
  cursor: pointer;
  background: var(--interactive-accent, #7c3aed);
  color: var(--text-on-accent, #fff);
}
.btn.secondary {
  background: var(--background-primary, #fff);
  color: var(--text-normal, #111);
}
.btn:hover {
  filter: brightness(1.05);
}
</style>
```

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">块 B（只读同步）</p>
    <p class="value">同一 store：<strong>{{ count }}</strong></p>
  </div>
</template>

<script setup lang="ts">
import { defineStore, storeToRefs } from 'pinia'

const useDemoCounter = defineStore('pinia-demo-counter', {
  state: () => ({ count: 0 }),
  actions: {
    inc() {
      this.count += 1
    },
    reset() {
      this.count = 0
    },
  },
  persist: '@/state/pinia-demo.json',
})

const store = useDemoCounter()
const { count } = storeToRefs(store)
</script>

<style scoped>
.pinia-card {
  padding: 0.75rem 1rem;
  border: 1px dashed var(--background-modifier-border, #ccc);
  border-radius: 8px;
  background: var(--background-primary, #fff);
}
.label {
  margin: 0 0 0.35rem;
  font-size: 0.85em;
  opacity: 0.8;
}
.value {
  margin: 0;
}
</style>
```

## 脚本模块定义 store（相对 `scripts/` 持久化）

```vue-interactive
<template>
  <div class="pinia-card">
    <p class="label">来自 @custom-script/pinia-demo-store.ts</p>
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
.label {
  margin: 0 0 0.35rem;
  font-size: 0.85em;
  opacity: 0.8;
}
.value {
  margin: 0 0 0.6rem;
}
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
