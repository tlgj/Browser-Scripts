# Browser-Scripts

一个收集浏览器用户脚本与相关辅助脚本的仓库，当前主要包含多个 Tampermonkey / 油猴脚本，以及一个用于 `image-helper.user.js` 的回归测试脚本。

## 脚本列表

### 1. Image Helper

- 文件：`image-helper.user.js`
- 名称：Image Helper / 图片助手
- 当前版本：`1.10.18`
- 用途：提取页面图片并按站点规则清洗到高清图，支持查看、筛选与保存。

主要功能：

- 提取当前页面中的图片资源
- 按站点规则清洗图片 URL，尽量还原高清图
- 支持幻灯片浏览与独立查看器
- 支持单张保存、快速保存、全部保存
- 支持脚本黑名单
- 支持多品牌、多站点图片链接规则处理

### 2. Custom Link Opener

- 文件：`Custom-Link-Opener.user.js`
- 名称：网页链接打开方式自定义-增强版
- 当前版本：`1.1.1`
- 用途：按站点自定义网页链接的打开方式，例如后台静默打开、前台跳转，并支持配置导入导出。

主要功能：

- 自定义不同站点的链接打开行为
- 支持子域名优先匹配
- 支持缓存优化
- 尊重 Ctrl / Shift / 中键等修饰键行为
- 支持配置导入与导出

### 3. Pornhub Tool

- 文件：`Pornhub-Tool.user.js`
- 名称：Pornhub Tool V2.4.1
- 当前版本：`2.4.1`
- 用途：为特定站点页面提供列表整理与内容筛选辅助。

主要功能：

- 已浏览条目弱化显示
- 较短条目过滤
- 关键词过滤
- 指定用户过滤

## 辅助脚本

### image-helper.regression.js

- 文件：`image-helper.regression.js`
- 类型：Node.js 回归测试脚本
- 用途：抽取 `image-helper.user.js` 中的 URL 规则逻辑，执行回归测试，避免后续修改破坏既有清洗规则。

## 安装方式

### 用户脚本

1. 安装浏览器用户脚本扩展，例如 Tampermonkey 或 Violentmonkey。
2. 打开需要安装的 `.user.js` 文件。
3. 在脚本管理器中完成安装。

仓库内当前可直接安装的用户脚本：

- `image-helper.user.js`
- `Custom-Link-Opener.user.js`
- `Pornhub-Tool.user.js`

这些脚本也都在文件头提供了 `@downloadURL` 与 `@updateURL`，可用于安装和更新。

### 回归测试脚本

`image-helper.regression.js` 需要在 Node.js 环境中运行，用于本地验证 `image-helper.user.js` 的规则逻辑。

## 仓库说明

- 本仓库目前以浏览器用户脚本为主
- README 保持简要总览，具体交互与实现细节请直接查看对应脚本源码
- 若仅想安装脚本，优先阅读各 `.user.js` 文件头部元信息
