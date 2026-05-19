# 08 — 自引用

预期：从**本笔记**导入 `ts` 命名块、另一块 `vue-interactive` 命名块；`modA` / `modB` 可互相导入（循环依赖），主块渲染正常。

```ts {name=double}
export default function double(n: number) {
  return n * 2
}
```

命名块 `Chip` 带 `{hide=true}`，仅作导入，不会在阅读模式中单独渲染。

```vue-interactive {name=Chip, hide=true}
<template>
  <span class="chip">chip: {{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ value: number }>()
const label = computed(() => `×2 = ${props.value * 2}`)
</script>

<style scoped>
.chip {
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  background: var(--background-modifier-border);
}
</style>
```

```ts {name=modA}
import getB from './08 - 自引用.md?block=modB'
export default function getA(skip = true): string {
  return 'A' + (skip ? '' : getB(false))
}
```

```ts {name=modB}
import getA from './08 - 自引用.md?block=modA'
export default function getB(skip = true): string {
  return 'B' + (skip ? '' : getA(false))
}
```

```vue-interactive
<template>
  <motion.div class="self-ref-demo">
    <Chip :value="n" />
    <p>double(3) = {{ doubled }}</p>
    <p>循环: {{ cyclicA }} / {{ cyclicB }}</p>
  </motion.div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import double from './08 - 自引用.md?block=double'
import Chip from './08 - 自引用.md?block=Chip'
import getA from './08 - 自引用.md?block=modA'
import getB from './08 - 自引用.md?block=modB'

const n = ref(3)
const doubled = computed(() => double(n.value))
const cyclicA = getA()
const cyclicB = getB()
</script>

<style scoped>
.self-ref-demo {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
```
