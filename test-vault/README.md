# Reactive Notes Vue — 测试库

本目录是一个可直接用 Obsidian 打开的 vault，用于手动验证 `vue-interactive` 代码块。

## 打开方式

1. 在项目根目录执行 `pnpm run dev` 或 `pnpm run build`（会自动把插件同步到本 vault）。
2. Obsidian：**打开其他库** → 选择本仓库下的 `test-vault` 文件夹。
3. **设置 → 社区插件**：确认已启用 **Reactive Notes Vue**（首次打开若提示“受限模式”，需关闭受限模式）。
4. 在阅读模式下依次打开各篇笔记，检查组件渲染与错误展示。

## 笔记列表

| 笔记 | 验证点 |
|------|--------|
| [[00 - 索引]] | 导航与说明 |
| [[01 - 计数器]] | 基础交互、`ref`、点击更新 |
| [[02 - 作用域样式]] | `<style scoped>` 仅作用于本块 |
| [[03 - 列表与计算属性]] | `computed`、`v-for` |
| [[04 - 错误-非法导入]] | 应显示错误 UI（不支持的外部 import） |
| [[05 - 错误-缺少模板]] | 应显示错误 UI（SFC 校验） |
| [[06 - 导入示例]] | `@custom-script/` 导入 TS/CSS |
| [[07 - 导入Markdown代码块]] | `?block=` 命名代码块 |
| [[08 - 自引用]] | 本笔记块互引、循环依赖 |
| [[09 - 错误-递归过深]] | 栈溢出错误面板 |
| [[10 - CDN导入]] | `https://` ESM CDN（esm.sh，需联网） |
| [[11 - Obsidian API]] | 内置 `@obsidian`（`app.vault`、`Notice`） |

## 插件文件

构建产物会复制到 `.obsidian/plugins/reactive-notes-vue/`（已加入 `.gitignore`，勿手动编辑）。
