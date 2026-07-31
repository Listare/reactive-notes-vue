# Reactive Notes Vue

在 Obsidian 笔记中用 `vue-interactive` 代码块编写 **Vue 3 + TypeScript + `<script setup>`** 单文件组件（SFC），在阅读模式下实时渲染。

## 要求

- Obsidian 1.4.0+
- 桌面端（`isDesktopOnly: true`，因打包体积含 Vue 与 compiler-sfc）

## 开发

```bash
pnpm install
pnpm run dev      # 监听编译 → main.js，并同步到 examples
pnpm test         # 单元测试
pnpm run test:e2e # WDIO + Obsidian 端到端
pnpm run test:coverage  # 单元测试 + coverage 阈值（≥85% lines，compiler/bridge/纯决策层）
pnpm run build    # 生产构建，并同步到 examples
```

将 `main.js`、`manifest.json`、`styles.css` 复制到：

`<Vault>/.obsidian/plugins/reactive-notes-vue/`

### 演示库（examples）与 E2E

仓库内附带 Obsidian 演示库 `examples/`（计数器、导入、错误面板等）。**`pnpm run dev` / `pnpm run build` 完成后会自动把插件复制到** `examples/` 与 `test/e2e-vault/` 的插件目录。

自动化回归用 WDIO（[wdio-obsidian-service](https://github.com/jesse-r-s-hines/wdio-obsidian-service)），vault 为 `test/e2e-vault/`：

```bash
pnpm run build
pnpm run test:e2e
```

首次本地跑 e2e 会下载 Obsidian / chromedriver 到 `.obsidian-cache/`。若直连失败，可临时走代理，例如：

```bash
# PowerShell
$env:HTTP_PROXY="http://127.0.0.1:7890"
$env:HTTPS_PROXY="http://127.0.0.1:7890"
pnpm exec obsidian-launcher download desktop -v latest -i latest -c .obsidian-cache
pnpm run test:e2e
```

本地浏览演示：

1. 执行 `pnpm run dev`
2. Obsidian → **打开其他库** → 选择本仓库下的 `examples`
3. 启用社区插件 **Reactive Notes Vue**（库内已预配置）
4. 按需设置自定义脚本路径 `scripts`、MathJax 前置 `mathjax-preamble.sty`

也可单独同步：`pnpm run sync-examples`（需已存在 `main.js`）。

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
- 支持从库内文件或 HTTPS URL 导入（见下方）；`vue`、Obsidian API（`@obsidian`）、主题（`@vue-interactive/theme`）、MathJax（`@vue-interactive/math`）与 Node 内置模块（仅 `node:` 前缀）由插件内置，其余 npm 包可通过 ESM CDN URL 引入。

### Pinia（全局共享）

插件在宿主维护**一份** Vue 与 **一个** Pinia 实例；所有 `vue-interactive` 块挂载时都会 `app.use` 该实例，因此笔记中任意可交互组件共享同一套 store。

```ts
import { defineStore, storeToRefs } from "pinia";

const useCounter = defineStore("counter", {
  state: () => ({ count: 0 }),
  actions: {
    inc() {
      this.count++;
    },
  },
  // 持久化到库内 JSON（路径规则与 import 相同）
  persist: "./counter.json",
  // 或：persist: { path: "@/state/counter.json", debounceMs: 500 }
});

const store = useCounter();
const { count } = storeToRefs(store);
```

- 请使用内置 `pinia`，不要从 CDN 再引入一份（避免双 Vue / 双 Pinia）。
- `defineStore` 的 id 在全局唯一；不同代码块用同一 id 即读写同一 store。
- **`persist`**：把 `$state` 读写到仓库中的 `.json` 文件。路径支持 `./` / `../`（相对**定义该 store 的模块**所在文件）、`@/`（库根）、`@custom-script/`（设置中的脚本目录）。文件不存在时首次写入会自动创建；状态变更默认防抖 300ms 后写回。

### Obsidian API（`@obsidian`）

在 `<script setup>` 中可像原生插件一样使用 Obsidian API，接口与 `obsidian` 包一致。用户代码跑在沙盒 iframe 内，对 `app` / 返回对象的访问经 MessageChannel 代理到主窗口，因此**取值与调用是异步的**（返回 `Promise`）；**链式点属性本身是同步的**（只拼路径，得到新的 Proxy）。

```ts
import app from "@obsidian";
import { Notice } from "@obsidian";

const file = await app.workspace.getActiveFile();
const path = file ? await file.path : "无";
new Notice(`当前文件：${path}`);
```

| 写法 | 同步？ | 说明 |
|------|--------|------|
| `app.vault` / `cache.frontmatter` | 同步 | 只拼路径，拿到新的 Proxy |
| `app.vault.getMarkdownFiles()` | 异步 | `()` 触发跨窗口调用，返回 `Promise` |
| `await file.path` / `await cache.frontmatter` | 异步 | 属性 Proxy 可 `await`，才会真正取值 |
| `getActiveFile()` 等返回的对象本身 | 同步拿到 Proxy | 根引用不是 thenable，避免 `await file` 死循环；读字段仍需 `await` |

从 API 拿到的对象（如 `TFile`）可以再传回其他 Obsidian 方法（如 `getFileCache(file)`）；不要把沙盒里自造的普通对象当作 Obsidian 实例传入。

- `import app from '@obsidian'`：`default` 为当前库的 `App` 实例（`app.vault`、`app.workspace` 等）。
- `import { Notice, Modal, … } from '@obsidian'`：与 `import { … } from 'obsidian'` 相同。
- 亦支持 `import * as Obs from '@obsidian'`（`Obs.default` 为 `app`）。

### Node 内置模块（`node:`）

桌面端可通过 **`node:` 前缀**导入 Node 内置模块（不支持裸名 `path` / `fs`）。与 `@obsidian` 相同，经 MessageChannel 代理到宿主，**方法调用与取值均为异步**。

```ts
import { join } from "node:path";
import http from "node:http";

const p = await join("notes", "demo.md");

// 所有调用都返回 Promise，传入其它 Node API 前必须 await
const req = await http.get("http://example.com");
```

| 默认可用（安全子集） | 需在设置中开启「允许扩展 Node 内置模块」 |
|----------------------|------------------------------------------|
| `node:path`、`node:url`、`node:querystring`、`node:buffer`、`node:util`、`node:events`、`node:assert`、`node:string_decoder`、`node:timers`、`node:timers/promises`、`node:constants`、`node:punycode` 等 | `node:fs`、`node:fs/promises`、`node:os`、`node:crypto`、`node:child_process` 等其余 builtin |

- 仅认 `node:`：`import { join } from 'node:path'`。
- 同步风格的 Node API（如 `fs.readFileSync`）在沙盒中仍会变成异步 RPC；优先使用 `node:fs/promises`。
- 不要对代理对象使用同步的 `String(proxy)`（`toString` 也是异步 RPC）；请 `await` 方法/属性拿到原始值。
- 扩展模块会访问本机能力，请仅信任自己的笔记脚本。

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

在 **设置 → Reactive Notes Vue** 配置自定义脚本路径（库内文件夹，如 `scripts`；也可指向 `.obsidian/plugins/<插件-id>/scripts` 等与插件同目录的脚本）。**仅当**代码中使用了 `@custom-script/` 导入时才会校验该路径；未使用时可不配置。路径无效或未配置却使用 `@custom-script/` 时会显示错误。

笔记中请写 `import X from '@custom-script/DistributionPanel.vue'`，不要写完整磁盘路径；`@custom-script/` 会拼在设置里的脚本根路径后面。

### 从 CDN 导入 ESM

在 `<script setup>` 中可直接写完整 URL（需联网）：

```ts
import { debounce } from "https://esm.sh/lodash-es@4.17.21/debounce";
```

URL 中的查询参数会原样保留（例如 `https://esm.sh/vue?target=esnext`）。CDN 模块在沙盒 iframe 内通过原生 `import()` 加载。

### Tailwind CSS

`vue-interactive` 沙盒内已内置 [Tailwind CSS v4](https://tailwindcss.com/)，可在 `<template>` 中直接使用工具类（如 `flex`、`p-4`、`dark:bg-slate-800`）。`dark:` 依赖容器上的 `.dark` 类（与 [ReactiveNotes](https://github.com/Prodigist/ReactiveNotes) 相同）。

构建时会扫描 `src/`、`examples/`、`test/fixtures/` 与 `test/e2e-vault/` 中的类名，并对常用工具类做 safelist；笔记里若使用未收录的类名，可能需在 `src/styles/sandbox.css` 中补充 `@source inline(...)` 后重新 `pnpm run build`。

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

演示见 examples 中的 [[theme-tailwind]]。

### MathJax：`Latex` 组件

从内置模块导入 **`Latex`**，绑定 `latex` 字符串即可渲染（MathJax 3，沙盒内打包，无需联网）：

```ts
import { Latex } from "@vue-interactive/math";
```

```vue
<template>
  <p>行内：<Latex :latex="formula" /></p>
  <Latex :latex="integral" display />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Latex } from "@vue-interactive/math";

const formula = ref(String.raw`e^{i\pi} + 1 = 0`);
const integral = ref(String.raw`\int_0^1 x^2\, dx`);
</script>
```

- `latex`：TeX/LaTeX 源字符串（不含 `$` 定界符）
- `display`：为 `true` 时按块级公式居中显示

在 **设置 → Reactive Notes Vue → MathJax 前置文件** 可指定库内 TeX 文件（如 `preamble.sty`），渲染前会执行其中的 `\newcommand` 等定义；修改该文件后已打开的 vue-interactive 块会自动刷新。

演示见 examples 中的 [[mathjax]]。

## 已知问题

- **滚动后状态丢失**：阅读模式下，将 `vue-interactive` 块滚出视口再滚回时，组件会重新挂载，**响应式状态（如 `ref` 计数）会重置**。这是 Obsidian 阅读视图虚拟化与当前沙盒生命周期下的预期行为，**短期内不计划修复**。若需要持久状态，请自行写入 `localStorage`、插件数据或库内文件。

## 架构

| 目录 | 职责 |
|------|------|
| `src/compiler/` | SFC 规范化、compiler-sfc 编译、模块拼接 |
| `src/runtime/` | 沙盒 iframe 内执行模块并挂载 Vue |
| `src/processor/` | `registerMarkdownCodeBlockProcessor` |
| `src/ui/` | 错误展示（纯 DOM） |

参考实现（React 版）见 [ReactiveNotes](https://github.com/Prodigist/ReactiveNotes)，本仓库刻意保持精简。
