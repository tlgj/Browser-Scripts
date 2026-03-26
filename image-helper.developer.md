# image-helper.developer.md

> 适用对象：维护 `image-helper.user.js` 的开发者。
>
> 本文档面向规则设计、站点接入、回归测试与版本维护，重点解释“为什么这样分型”和“新增站点时应该如何判断”，不重复用户向功能介绍。

## 1. 文档目的

`image-helper.user.js` 已不是单纯的零散字符串替换集合，而是一个围绕 **host 识别 → 规则分组 → 规则链执行** 组织起来的图片 URL 清洗系统。

开发者文档的目标有 4 个：

1. 说明规则系统的整体架构
2. 说明新增站点时如何判断 URL 属于哪一种模型
3. 说明何时应复用已有 helper，何时应新增专用规则
4. 说明回归测试、文档同步与 SemVer 版本维护要求

如果只看 `image-helper.user.js.md`，可以知道“支持哪些站点”和“规则大致做了什么”；但要安全维护代码，还需要理解规则背后的分类边界。

---

## 2. 核心架构总览

主脚本的图片清洗逻辑可概括为以下流程：

1. 对候选 URL 做基础解析：`safeUrlParse`
2. 根据 `URL.hostname` 走 `EXACT_HOST_MAP`
3. 若精确 host 未命中，再走 `PARTIAL_MATCH_RULES`
4. 得到 `hostType`
5. 用 `HOST_RULE_MAP` 把 `hostType` 映射到规则链
6. 按顺序串行执行规则链中的每条规则
7. 输出 `cleanUrl(...)` / `cleanImage(...)` 的结果

这套结构的关键点是：

- **hostType 是中间抽象层**，不要把 host 与最终规则执行写死在多处分支中
- **规则链是串行的**，顺序本身就是行为定义的一部分
- **helper 优先服务“模型复用”**，而不是为了单个站点堆很多一次性函数

---

## 3. 关键模块职责

### 3.1 `safeUrlParse`

作用：

- 安全解析 URL
- 避免无效 URL 直接抛异常打断清洗流程

维护原则：

- 任何需要读取 `hostname`、`pathname`、`searchParams` 的专用规则，优先先调用它
- 规则失败时应尽量回退为原始 URL，而不是抛错中断整条清洗链

### 3.2 `REUSABLE_RULES`

作用：

- 放“可跨多个站点安全复用”的轻量规则
- 通常是无副作用、纯替换、边界清晰的规则

典型场景：

- 去 query：`REMOVE_ALL_QUERY`
- 去版本 query：`REMOVE_VERSION_QUERY`
- 去通用尺寸后缀：`REMOVE_SIZE_SUFFIX`
- 转 png：`TO_PNG`

适合放进 `REUSABLE_RULES` 的前提：

- 不依赖某个特定 host 的私有语义
- 规则行为足够稳定，不会因为换站点就误伤
- 不需要复杂路径判断或多段解析

### 3.3 `BRAND_RULES`

作用：

- 存放站点 / 平台 / CDN 专用规则
- 通常带有 host 校验、路径结构判断、条件式回退

适用场景：

- Scene7
- Cloudinary upload transform stripping
- 包装 CDN 回源
- Shopify / Magento / OpenCart 等平台路径重写
- 某品牌只在特定路径结构下才允许清洗

判断经验：

如果规则回答的是“**某个 host 的 URL 应该如何解释**”，通常应写进 `BRAND_RULES`；
如果规则回答的是“**一个通用字符串模式应该如何处理**”，通常更适合放进 `REUSABLE_RULES`。

### 3.4 `EXACT_HOST_MAP`

作用：

- 将精确 hostname 映射为 `hostType`

维护原则：

- 当某站点能通过明确 host 唯一识别时，优先放这里
- `hostType` 命名应描述规则语义或站点族，不要写成临时性名称
- 不要把“一个 host = 一堆直接执行代码”散落在流程里，应该统一经由 `hostType`

### 3.5 `PARTIAL_MATCH_RULES`

作用：

- 处理仅靠 host 不足以识别、必须看 URL 片段才能命中的规则

适用场景：

- 同一 host 下存在多类资源，但只有某类路径才适用规则
- Shopify 文件路径等跨站复用片段

维护原则：

- 只有在精确 host 无法表达需求时再使用
- 片段匹配必须尽量具体，避免误命中过宽

### 3.6 `HOST_RULE_MAP`

作用：

- 将 `hostType` 映射到规则链

维护原则：

- 顺序敏感：先域名转换、再路径清洗、再格式补强时，顺序不能随意调整
- 能复用已有 rule object 时优先复用
- 新增 `hostType` 后必须同步维护此处，否则 host 命中后不会真正执行规则

---

## 4. URL 模型分类：新增站点时先分型，再写规则

维护 `image-helper.user.js` 时，最重要的不是“先写代码”，而是先判断 URL 属于哪种模型。

### 4.1 模型 A：原始媒体路径 + 展示层 query

特征：

- `pathname` 本身已经是原图或原始媒体路径
- query 只是前端展示层参数，例如宽高、裁剪、质量、背景色、格式提示
- 去掉 query 后仍然是有效资源路径

典型例子：

- `catalog.hkstore.com`

示例：

```text
https://catalog.hkstore.com/media/catalog/product/1/2/129l49205800_1.jpg?optimize=medium&bg-color=243,243,243&fit=bounds&height=840&width=670&canvas=670:840
```

正确处理：

- 使用保守去 query 策略
- 当前对应：`hkstore-catalog` → `[REUSABLE_RULES.REMOVE_ALL_QUERY]`

错误做法：

- 把它误判为“包装 CDN 回源”
- 为它写 decode pathname 逻辑
- 把 query 当成必须保留的业务参数却没有证据支撑

### 4.2 模型 B：percent-encoded 原图 URL 位于 pathname

特征：

- `pathname` 看起来不是原图路径
- 去掉开头 `/` 后做 `decodeURIComponent(...)`
- decode 后可提取出完整 `https://...` 原图 URL

典型例子：

- `image-cdn.hypb.st`
- `sneaker-freaker.b-cdn.net`

示例：

```text
https://image-cdn.hypb.st/https%3A%2F%2Fs3.store.hypebeast.com%2Fmedia%2Fimage%2F54%2Fdd%2Flongtee-1-1-662c4.jpg?fit=max&w=720&q=90
```

正确处理：

- 使用 `extractEncodedOriginFromPath(pathname)`
- 该 helper 应先 decode，再提取开头的 `https://...`

当前映射：

- `hypebeast-cdn` → `BRAND_RULES.HYPEBEAST_CDN_ORIGINAL`
- `sneaker-freaker-bcdn` → `BRAND_RULES.SNEAKER_FREAKER_BCDN_ORIGINAL`

错误做法：

- 只去 query
- 直接把 pathname 当成本地路径去拼接
- 把这种模型和明文嵌入 URL 的模型混为一谈

### 4.3 模型 C：明文原图 URL 位于包装 pathname 后段

特征：

- `pathname` 中直接出现明文 `https://...`
- 前半段通常是动态图片代理 / 包装 CDN 的签名、filters、尺寸或格式处理描述
- 不需要 decode 才能看到真实原图 URL

典型例子：

- `dynamic.zacdn.com`

示例：

```text
https://dynamic.zacdn.com/xznq8HOrSO46bWG6KMoxUd6QEQA=/filters:quality(70):format(webp)/https://static-hk.zacdn.com/p/under-armour-9200-2150437-1.jpg
```

正确处理：

- 使用 `extractPlainOriginFromWrappedPath(pathname)`
- 直接从 pathname 中提取明文 `https://...`

当前映射：

- `zalora-dynamic-cdn` → `BRAND_RULES.ZALORA_DYNAMIC_ORIGINAL`

错误做法：

- 误用 `extractEncodedOriginFromPath`
- 误判为普通 query-only 站点，只做 `REMOVE_ALL_QUERY`
- 把包装前缀当成真实资源路径的一部分

### 4.4 模型 D：Cloudinary / upload transform stripping

特征：

- URL 中存在 `/upload/` 或类似 Cloudinary 上传路径
- 真实资源路径前面带着一串 transform segment
- 这些 transform segment 可以连续出现
- 去掉 transform 后，资源路径才是应回源的原图路径

典型例子：

- `images.complex.com`
- `images.puma.com`

正确处理：

- 使用 `stripCloudinaryUploadTransforms`
- 或通过 `createCloudinaryUploadStripRule` 构建规则

关键约束：

- 某些站点必须要求 asset path 以特定前缀开头，才能安全剥离 transform
- 例如 Puma 当前要求真实资源路径必须以 `global/` 开头
- Complex 当前要求资源路径必须以 `sanity-new/` 开头

错误做法：

- 看到 `/upload/` 就无差别剥离
- 不做 asset path 前缀保护，导致误清洗非目标资源

### 4.5 模型 E：站点专用路径 / query 协议重写

这类模型不是“提取被包装的原图 URL”，而是：

- 按站点私有规则改 query
- 改路径 token
- 去 Scene7 缩放参数
- 折叠中间 transform 路径

典型例子：

- Nike
- GOAT
- Under Armour Scene7
- Footlocker Scene7
- MLB Korea

这类规则通常应保留在 `BRAND_RULES` 中，避免错误抽象成过度通用 helper。

---

## 5. helper 选择原则

### 5.1 什么时候应该新增 helper

适合新增 helper 的场景：

- 已出现至少两个站点共享同一种 URL 模型
- helper 的输入输出边界清晰
- 能显著降低重复逻辑
- 能把“模型差异”提炼出来，而不是把站点名硬编码进去

例如：

- `extractEncodedOriginFromPath`
- `extractPlainOriginFromWrappedPath`
- `stripCloudinaryUploadTransforms`

### 5.2 什么时候不该新增 helper

不适合新增 helper 的场景：

- 其实只是简单去 query
- 只有单站点一次性特殊路径重写
- 抽出来后名字会很抽象，但复用价值不高
- 抽象后反而掩盖真实业务边界

例如 `catalog.hkstore.com` 的处理就不需要复杂 helper，直接复用 `REMOVE_ALL_QUERY` 才是最小正确改动。

---

## 6. 新增站点接入 checklist

新增站点时，建议按以下顺序判断：

1. 先拿到真实样例 URL，不要凭站点名称猜规则
2. 确认原图是否已经在 `pathname`
3. 确认 query 是否只是展示参数
4. 检查 `pathname` decode 后是否出现完整 `https://...`
5. 检查 `pathname` 是否本来就包含明文 `https://...`
6. 检查是否属于 Cloudinary / Scene7 / Shopify / Magento / OpenCart 等已知模型
7. 先查是否已有 helper 或现成 rule 可复用
8. 决定是新增 `hostType`，还是复用既有 `hostType`
9. 更新 `EXACT_HOST_MAP` 或 `PARTIAL_MATCH_RULES`
10. 更新 `HOST_RULE_MAP`
11. 补 regression case
12. 判断是否属于用户可观察行为变化，按 SemVer 更新版本
13. 若主脚本行为有变化，同步 `image-helper.user.js.md`
14. 执行回归与语法检查

---

## 7. 高风险误分类案例

### 7.1 `catalog.hkstore.com` 与 `dynamic.zacdn.com` 不能混用策略

这两个 URL 看上去都“带参数”，但本质不同：

- `catalog.hkstore.com`：原始媒体路径 + 展示层 query
- `dynamic.zacdn.com`：包装 CDN pathname 中嵌入明文原图 URL

结论：

- 前者适合保守去 query
- 后者必须提取 pathname 后段的明文原图 URL

若把后者误改成 `REMOVE_ALL_QUERY`，会直接丢失原图还原能力。

### 7.2 `image-cdn.hypb.st` / `sneaker-freaker.b-cdn.net` 与 `dynamic.zacdn.com` 也不是同一 helper

它们的共同点是“原图 URL 在 pathname 中”，但区别非常关键：

- Hypebeast / Sneaker Freaker：需要 decode 才能得到原图 URL
- Zalora Dynamic：原图 URL 本来就是明文嵌在 pathname 后段

结论：

- 前者使用 `extractEncodedOriginFromPath`
- 后者使用 `extractPlainOriginFromWrappedPath`

不要为了“统一”而把这两类硬压成一个 helper，除非新抽象能明确表达两阶段差异且不会降低可读性。

### 7.3 Cloudinary stripping 必须保留资源前缀保护

对 `Complex` 与 `Puma` 来说，Cloudinary transform stripping 不是“看见 transform 就删”。

必须额外验证真实资源路径前缀：

- Complex：`sanity-new/`
- Puma：`global/`

否则容易把并非原图资源的路径也错误折叠。

---

## 8. 回归测试维护要求

回归脚本：`image-helper.regression.js`

当前测试方式：

- 从 `image-helper.user.js` 中截取规则相关代码块
- 在 Node `vm` 上下文运行
- 暴露 `cleanUrl` 等必要对象
- 逐条验证 `hostType` 与清洗后的 URL 是否匹配预期

### 8.1 每次新增站点时至少要补什么

至少补一个正例，验证：

- `hostType` 命中正确
- `clean` 结果正确

### 8.2 高风险规则建议补什么

对高风险模型，建议额外补“防误伤” case，例如：

- 非目标路径时不误清洗
- decode 失败时安全回退原 URL
- 非目标资源前缀时不剥离 transform

### 8.3 为什么回归脚本重要

这个项目的风险不在于“代码能否运行”，而在于：

- 改一个 helper，可能悄悄影响多个站点
- 改一个规则链顺序，可能让已有 hostType 出现行为回退
- 把不同 URL 模型混用后，往往不会报语法错，但会 silently 产生错误结果

因此：

- 语法检查解决“脚本能否解析”
- 回归测试解决“规则是否仍按原设计工作”

---

## 9. SemVer 版本维护规则

主脚本版本位于：

```javascript
// @version x.y.z
```

### 9.1 应提升 patch 的情况

以下属于用户可观察行为变化，应按 SemVer 提升 patch：

- 新增站点支持
- 新增某类图片 URL 的原图还原能力
- 修复已有站点的错误清洗行为
- 调整规则导致输出链接变化，且用户能够感知到效果差异

例如：

- `1.10.12`：新增 `image-cdn.hypb.st`
- `1.10.13`：新增 `sneaker-freaker.b-cdn.net`
- `1.10.14`：新增 `catalog.hkstore.com`
- `1.10.15`：新增 `dynamic.zacdn.com`

### 9.2 不应提升版本的情况

以下通常不需要调整主脚本版本：

- 仅修改开发者文档或用户文档
- 仅补回归测试
- 仅修正文档中的展示名
- 仅改注释、说明或 notebook 记录
- 不影响 `image-helper.user.js` 对外行为的开发辅助改动

### 9.3 文档同步原则

若主脚本行为发生变化并触发版本提升，则应同步：

- `image-helper.user.js` 中的 `@version`
- `image-helper.user.js.md` 中的 version badge
- `image-helper.user.js.md` 中的版本表格
- 与新增站点相关的 host / rule / 支持站点说明

如果只是新增开发者文档或补回归测试：

- 不要求修改主脚本版本号
- 也不应为了文档变动而机械升版本

---

## 10. 建议的开发工作流

建议每次做规则类修改时都遵循以下流程：

1. 先搜索并定位已有实现
2. 读取相关 helper、host map、rule map 的完整边界
3. 判断 URL 模型，不要上来就写替换规则
4. 优先复用已有 helper 或 reusable rule
5. 必要时新增专用 `hostType` 与 `BRAND_RULES`
6. 若修改了主脚本行为，按 SemVer 升 patch
7. 同步 `image-helper.user.js.md`
8. 同步 `image-helper.regression.js`
9. 执行：

```powershell
node .\image-helper.regression.js
node --check .\image-helper.user.js
```

10. 如有必要，再看 IDE diagnostics

---

## 11. 当前应牢记的维护约束

### 11.1 分类边界

- `catalog.hkstore.com`：query-only 模型
- `image-cdn.hypb.st` / `sneaker-freaker.b-cdn.net`：pathname 中 percent-encoded 原图 URL
- `dynamic.zacdn.com`：pathname 后段明文原图 URL

### 11.2 最小正确改动优先

如果一个站点只需要保守去 query，就不要为了“统一架构”强行加复杂 helper。

### 11.3 不要把“通用化”当成目标本身

好的抽象应该让模型更清楚；
坏的抽象会把不同模型揉平，增加误判风险。

### 11.4 规则链顺序是行为定义的一部分

例如某些站点必须：

- 先换域名
- 再清路径
- 再转格式

调整顺序前必须分析影响范围并补回归。

---

## 12. 与其他文档的分工

- `image-helper.user.js.md`
  - 面向用户与维护者的混合说明
  - 负责功能概览、支持站点速览、规则摘要、维护模板

- `image-helper.developer.md`
  - 面向开发者
  - 负责规则模型、设计边界、接入流程、SemVer 与回归策略

- `image-helper.regression.js`
  - 面向验证
  - 负责把关键规则转换成可执行回归断言

三者分工应保持清晰，不要让同一类内容在多个文件中无限复制。

---

## 13. 结语

维护这个脚本时，最重要的不是“写出一个能工作的替换规则”，而是：

- 正确识别 URL 模型
- 在正确抽象层落点
- 给未来迭代留下可验证、可维护的边界

如果后续继续扩展站点，优先做的不是堆更多规则，而是持续保证：

- 分类清晰
- helper 边界稳定
- regression case 完整
- 版本与文档同步准确
