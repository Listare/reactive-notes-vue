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
- 围栏可选属性（写在语言标识后）：`{name=名称}` 供 `?block=` 导入；`{hide=true}` 时阅读模式不渲染（仅作模块导出）。可组合，例如 ` ```vue-interactive {name=Chip, hide=true}`。
- 支持从库内文件或 HTTPS URL 导入（见下方）；`vue`、Obsidian API（`@obsidian`）与主题（`@vue-interactive/theme`）由插件内置，其余 npm 包可通过 ESM CDN URL 引入。

### Obsidian API（`@obsidian`）

在 `<script setup>` 中可像原生插件一样使用 Obsidian API，接口与 `obsidian` 包一致：

```ts
import app from "@obsidian";
import { Notice } from "@obsidian";

new Notice(`当前文件：${app.workspace.getActiveFile()?.path ?? "无"}`);
```

- `import app from '@obsidian'`：`default` 为当前库的 `App` 实例（`app.vault`、`app.workspace` 等）。
- `import { Notice, Modal, … } from '@obsidian'`：与 `import { … } from 'obsidian'` 相同。
- 亦支持 `import * as Obs from '@obsidian'`（`Obs.default` 为 `app`）。

### 文件导入

| 前缀 | 含义 |
|------|------|
| `./路径` | 相对于**当前笔记**所在目录 |
| `@/路径` | 相对于**库根目录** |
| `@custom-script/路径` | 相对于插件设置中的「自定义脚本路径」 |
| `https://…` / `http://…` | 从 ESM CDN 等远程 URL 动态导入（如 [esm.sh](https://esm.sh)） |

可导入类型：

- **`.js` / `.ts`**：作为模块（`export default`）
- **`.css`**：注入为全局样式
- **`.vue`**：按 SFC 编译
- **`.md`**：无 `?block=` 时作为文本 `{ default: string }`；`路径?block=名称` 引用文中 ` ```lang {name=名称}` 代码块
- **其他资源**（图片、字体等）：`{ default: 资源 URL }`

非 JS 类语言的命名代码块（如 `yaml`、`json`）作为数据对象导入；`json` 会解析为对象。

在 **设置 → Reactive Notes Vue** 配置自定义脚本路径（库内文件夹，如 `scripts`）。**仅当**代码中使用了 `@custom-script/` 导入时才会校验该路径；未使用时可不配置。路径无效或未配置却使用 `@custom-script/` 时会显示错误。

### 从 CDN 导入 ESM

在 `<script setup>` 中可直接写完整 URL（需联网）：

```ts
import { debounce } from "https://esm.sh/lodash-es@4.17.21/debounce";
```

URL 中的查询参数会原样保留（例如 `https://esm.sh/vue?target=esnext`）。CDN 模块在沙盒 iframe 内通过原生 `import()` 加载。

### Tailwind CSS

`vue-interactive` 沙盒内已内置 [Tailwind CSS v4](https://tailwindcss.com/)，可在 `<template>` 中直接使用工具类（如 `flex`、`p-4`、`dark:bg-slate-800`）。`dark:` 依赖容器上的 `.dark` 类（与 [ReactiveNotes](https://github.com/Prodigist/ReactiveNotes) 相同）。

构建时会扫描 `src/` 与 `test-vault/` 中的类名，并对常用工具类做 safelist；笔记里若使用未收录的类名，可能需在 `src/styles/sandbox.css` 中补充 `@source inline(...)` 后重新 `pnpm run build`。

### 主题：`getTheme()` 与暗色模式

在 `<script setup>` 中从内置模块导入并调用 **`getTheme()`**：

```ts
import { getTheme } from "@vue-interactive/theme";

const theme = computed(() => getTheme());
```

返回 `'dark' | 'light'`（与 ReactiveNotes 一致，基于沙盒内同步后的主题状态）。在 `computed` 或模板中使用会在主题切换时自动更新。

在 **设置 → Reactive Notes Vue → 暗色模式** 可选择：

- **跟随 Obsidian**（默认）：与 Obsidian 外观同步
- **亮色** / **暗色**：强制固定

手测用例见 test-vault 中的 [[12 - 主题与 Tailwind]]。

## 架构

| 目录 | 职责 |
|------|------|
| `src/compiler/` | SFC 规范化、compiler-sfc 编译、模块拼接 |
| `src/runtime/` | 沙盒 iframe 内执行模块并挂载 Vue |
| `src/processor/` | `registerMarkdownCodeBlockProcessor` |
| `src/ui/` | 错误展示（纯 DOM） |

参考实现（React 版）见 [ReactiveNotes](https://github.com/Prodigist/ReactiveNotes)，本仓库刻意保持精简。
