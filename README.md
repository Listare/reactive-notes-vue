# Reactive Notes Vue

在 Obsidian 笔记中用 `vue-interactive` 代码块编写 **Vue 3 + TypeScript + `<script setup>`** 单文件组件（SFC），在阅读模式下实时渲染。

## 要求

- Obsidian 1.4.0+
- 桌面端（`isDesktopOnly: true`，因打包体积含 Vue 与 compiler-sfc）

## 开发

```bash
pnpm install
pnpm run dev      # 监听编译 → main.js，并同步到 test-vault
pnpm test         # 单元测试
pnpm run build    # 生产构建，并同步到 test-vault
```

将 `main.js`、`manifest.json`、`styles.css` 复制到：

`<Vault>/.obsidian/plugins/reactive-notes-vue/`

### 测试库（test-vault）

仓库内附带 Obsidian 测试库 `test-vault/`，内含多篇用于手测的笔记（计数器、scoped 样式、错误用例等）。**`pnpm run dev` / `pnpm run build` 完成后会自动把插件复制到** `test-vault/.obsidian/plugins/reactive-notes-vue/`。

1. 执行 `pnpm run dev`
2. Obsidian → **打开其他库** → 选择本仓库下的 `test-vault`
3. 启用社区插件 **Reactive Notes Vue**（库内已预配置）
4. 阅读模式下打开 [[00 - 索引]]，逐篇检查

也可单独同步：`pnpm run sync-vault`（需已存在 `main.js`）。

## 用法

````markdown
```vue-interactive
<template>
  <button @click="count++">Count: {{ count }}</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<style scoped>
button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
}
</style>
```
````

- 必须包含 `<template>` 与 `<script setup>`；若未写 `lang`，会自动补上 `lang="ts"`。
- MVP 仅支持 `import ... from 'vue'`，不支持其他外部包。

## 架构

| 目录 | 职责 |
|------|------|
| `src/compiler/` | SFC 规范化、compiler-sfc 编译、模块拼接 |
| `src/runtime/` | 沙盒 iframe 内执行模块并挂载 Vue |
| `src/processor/` | `registerMarkdownCodeBlockProcessor` |
| `src/ui/` | 错误展示（纯 DOM） |

参考实现（React 版）见 [ReactiveNotes](https://github.com/Prodigist/ReactiveNotes)，本仓库刻意保持精简。
