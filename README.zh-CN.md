<p align="center">
  <img src="ink-node-editor/assets/icon.png" width="100" alt="Inkblots 标志">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ja.md">日本語</a> · <strong>简体中文</strong> · <a href="README.pt-BR.md">Português (Brasil)</a>
</p>

# Inkblots

Inkblots 是一款用于编写 [Ink](https://www.inklestudios.com/ink/) 互动小说脚本的可视化桌面编辑器。它将 knot 和 stitch 显示为卡片，将 divert 显示为连接线，将选项显示为结构化行，同时始终以普通的 `.ink` 文本作为唯一可信来源。

> Inkblots 是独立项目，与 Inkle 没有从属关系。

[下载最新 Windows 版本](https://github.com/leoedson1/inkblots/releases/latest)

## 前言

我想先把话说得非常清楚：**这个项目基本上就是彻头彻尾凭感觉 vibe coding 出来的**，因为我只是想赶快弄一个这样的工具来辅助自己写剧情，而且**我对 JavaScript 真是一窍不通**。目前 Inkblots 已经足够满足我个人的需求，但我希望继续完善各项功能，让更多人都能愉快地使用它，所以**非常欢迎你的反馈**。

#### 不太欢迎的反馈

- 你的标志太难看了（我知道，这是我花几分钟做的，以后也许会改好一点）。
- 某个节点里有个“+”图标没有对齐（我已经看到了，它快把我逼疯了）。
- 我不喜欢你自以为幽默的样子（很多人都不喜欢。聪明人早就收手了）。

撇开这些不谈，目前的 Inkblots 对还在学习 Ink 的我已经足够好用，所以它也可能适合你。随着我对这门语言越来越熟悉，我或许会继续改善节点与脚本语言逻辑的结合方式，让操作更加直观，同时保持逻辑一致。也正因为如此，我很希望听听你的实际使用体验；这也许能加快改进过程。

## 主要功能

- 在无限画布上排列 knot 和 stitch，并通过可拖动的连接线组织流程。
- 直接在节点上编辑故事正文和选项文本，或使用带 Ink 语法高亮的检查器。
- 在上下文中显示嵌套选项、gather、分支响应、条件和变量效果。
- 使用自动适配的区域、便笺、搜索和小地图整理大型故事。
- 在检查器中管理全局变量、常量和列表。
- 使用 `inkjs` 编译并试玩故事，包括从所选 knot 以全新状态进行测试。
- 通过标签页打开多个 `.ink` 文件，并从磁盘重新打开最近使用的文件。
- 界面支持英语、日语、简体中文和巴西葡萄牙语。（如果日语或中文翻译看起来不对，请告诉我该怎么修改。至于巴西葡萄牙语，相信我，**我心里有数**。）

## Ink 兼容性

Inkblots 读写普通的 `.ink` 文件。画布位置和组织信息保存在可删除的 Ink 注释中，因此故事仍与 Inky、inklecate、Unity 集成及其他 Ink 运行时兼容。

```ink
// --- Inkblots layout (safe to delete) ---
// @layout {"forest":[410,80],"cottage":[740,260]}
```

删除 Inkblots 元数据只会重置可视化布局，不会删除故事内容。

## 安装

从[最新版本](https://github.com/leoedson1/inkblots/releases/latest)下载 Windows 安装程序。

项目也配置了 macOS 和 Linux 打包，但此仓库目前只发布经过测试的 Windows 构建版本。

## 从源代码运行

Inkblots 需要当前版本的 Node.js。

```powershell
cd ink-node-editor
npm install
npm start
```

使用以下命令创建对应平台的安装程序：

```powershell
npm run dist
```

## 开发

Electron 应用位于 [`ink-node-editor`](ink-node-editor)。常用检查命令包括：

```powershell
cd ink-node-editor
npm test
npm run test:design
npm run test:choices
npm run test:canvas
npm run test:languages
```

更多信息请参阅[编辑器与架构详细文档](ink-node-editor/README.md)和[版本历史](CHANGELOG.md)。

## 项目状态

Inkblots 正在持续开发。请备份重要故事，并将原始 `.ink` 文件纳入版本控制，尤其是在尝试新版本时。
