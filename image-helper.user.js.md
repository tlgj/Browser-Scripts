# 🖼️ Image Helper / 图片助手

> **脚本文件**：[`image-helper.user.js`](./image-helper.user.js)

![version](https://img.shields.io/badge/version-1.17.6-blue?style=flat-square)
![match](https://img.shields.io/badge/match-*://*/*-green?style=flat-square)
![run](https://img.shields.io/badge/run-document--idle-yellow?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-orange?style=flat-square)

---

## 📋 概述

`image-helper.user.js`（展示名：**Image Helper / 图片助手**）是一个强大的浏览器用户脚本，专为扫描和提取当前页面中的图片资源而设计。

### ✨ 核心特性

- 🎯 **智能清洗**：自动将缩略图、带参数图片转换为高清原图
- 🌐 **广泛支持**：覆盖主流球鞋、运动品牌、电商平台及图片 CDN
- 🖼️ **幻灯片浏览**：全屏 overlay 方式流畅浏览所有提取图片，并可一键打开当前链接或原始链接
- 💾 **批量保存**：支持单张/快速/全部保存；自动生成或自定义保存子文件夹（路径会做安全清洗）
- 📏 **文件大小探测**：可选探测 Content-Length，在幻灯片状态栏展示
- ⚙️ **高度可配**：黑名单（导入/导出）、过滤条件、主图加载模式、增强发现等持久化设置

| 属性         | 值                      |
| :----------- | :---------------------- |
| **名称**     | Image Helper / 图片助手 |
| **版本**     | `1.17.6`                |
| **运行时机** | `document-idle`         |
| **匹配范围** | `*://*/*`               |
| **作者**     | tlgj                    |
| **许可证**   | MIT                     |

---

## 📑 目录

<details open>
<summary><strong>点击展开/收起目录</strong></summary>

- [🌐 支持站点速览](#-支持站点速览)
- [⚡ 核心功能](#-核心功能)
- [🔧 规则系统设计](#-规则系统设计)
- [📊 当前支持的网站与规则](#-当前支持的网站与规则)
- [🔍 基于 URL 片段的补充支持](#-基于-url-片段的补充支持partial_match_rules)
- [🔄 图片清洗流程](#-图片清洗流程)
- [➕ 新增站点与维护模板](#-新增站点与维护模板)
- [📝 文档维护原则](#-文档维护原则)
- [⚠️ 当前已知注意事项](#-当前已知注意事项)

</details>

---

## 🌐 支持站点速览

> 💡 **提示**：本节提供品牌/平台层面的快速索引，详细 host 映射与规则链请查看后文[规则明细表](#-当前支持的网站与规则)。

### 👟 球鞋交易与垂直零售

| 平台            | 说明         |
| :-------------- | :----------- |
| Goat            | 球鞋交易平台 |
| FlightClub      | 球鞋寄售平台 |
| StockX          | 球鞋交易平台 |
| Foot Locker     | 运动零售     |
| Finish Line     | 运动零售     |
| Sneaker News    | 球鞋媒体     |
| Sneaker Freaker | 球鞋媒体     |
| Novelship       | 球鞋交易平台 |
| Stadium Goods   | 球鞋寄售平台 |
| Snipes          | 球鞋零售     |

### 🏃 运动品牌官方 / 区域站

| 品牌               | 覆盖区域                    |
| :----------------- | :-------------------------- |
| **Adidas**         | 全球                        |
| **Asics**          | 全球 / 香港 / 台湾          |
| **Brooks**         | 全球                        |
| **Converse**       | 中国                        |
| **Decathlon**      | 全球 / 中国 / 香港          |
| **Hoka**           | 全球 / 中国                 |
| **Li-Ning**        | 中国                        |
| **Mizuno**         | 美国                        |
| **New Balance**    | 全球 / 中国                 |
| **On**             | 全球 / 中国                 |
| **Puma**           | 全球 / 中国 / 香港 / 台湾   |
| **Salomon**        | 全球                        |
| **Saucony**        | 全球                        |
| **Skechers**       | 美国 / 香港 / 新加坡 / 台湾 |
| **The North Face** | 全球 / 中国 / 台湾          |
| **Under Armour**   | 全球                        |
| **Vans**           | 全球 / 台湾                 |
| **Nike**           | 中国 / 全球 / 中东          |
| **安踏集团**       | 中国                        |
| **Bombas**         | 全球                        |
| **MLB**            | 韩国 / 香港                 |

### 🛒 综合运动零售 / 户外 / 通用电商

| 平台          | 说明       |
| :------------ | :--------- |
| Amazon        | 综合电商   |
| eBay          | 拍卖电商   |
| END. Clothing | 潮流零售   |
| Farfetch      | 奢侈品电商 |
| Complex       | 媒体内容   |
| Zalora        | 东南亚电商 |
| Noon          | 中东电商   |
| 京东图片 CDN  | 360buyimg  |

### 🎨 时尚 / 平台 / 通用图片 CDN

| 平台          | 说明           |
| :------------ | :------------- |
| Shein         | 快时尚         |
| Poizon (得物) | 潮流社区       |
| 识货          | 导购平台       |
| AliCDN        | 阿里系图片 CDN |
| Sanity        | Headless CMS   |

### 🔗 URL 片段补充支持

> 不依赖精确 host，通过 URL 路径片段识别

- **Decathlon 全球** — Shopify 文件路径
- **Reebok 全球** — Shopify 文件路径
- **KicksCrew 全球** — Shopify 文件路径
- **T4S Czechia** — `t4s.cz` 域名

---

## ⚡ 核心功能

### 1️⃣ 页面图片提取与清洗

- 扫描页面中的图片候选资源
- 支持从常见图片 URL、`srcset`、`application/ld+json` 等来源中提取候选图
- 对已识别站点应用专用清洗规则，将缩略图、带尺寸参数图、带渲染 query 的图片尽量转换成更高清版本
- 默认提取流程已纳入 JSON-LD 图片扫描；更重的 `application/json` / `#__NEXT_DATA__` / `data-*` 深挖仍保持在增强模式
- 未命中规则时，保留原始链接

### 2️⃣ 幻灯片浏览

- 以全屏 overlay 方式浏览已提取图片
- 支持上一张 / 下一张切换
- 显示当前图片计数、命中的规则类型（hostType）、保存目录、文件名、清洗后链接与原始链接
- 支持对当前链接与原始链接分别一键打开
- 支持滚轮切换、键盘切换与 Esc 关闭

### 3️⃣ 图片查看器

- 点击主图可进入独立查看器
- 适合对当前图片做更聚焦的预览

### 4️⃣ 链接操作

- 可分别对以下链接执行一键打开与复制：
  - 当前链接（已清洗）
  - 原始链接
- 优先使用 `navigator.clipboard.writeText`（安全上下文）
- 不可用时回退到 `GM_setClipboard`

### 5️⃣ 保存能力

- 支持：
  - 保存当前图片
  - 快速保存当前图片
  - 全部保存
  - 停止批量保存
- 默认根据「保存根目录 + 页面标题 + 时间戳」生成子文件夹名
- 可在幻灯片状态栏点击文件夹胶囊，自定义保存路径；输入会按路径段清洗非法字符
- 对文件名进行安全清洗，减少 Windows/macOS/Linux 上保存失败风险
- 若运行环境不支持带目录的下载名，会自动降级为平铺文件名
- 下载失败时具备重试；文件夹路径不被支持时会回退平铺

### 6️⃣ 黑名单与设置

- 支持站点黑名单，命中后禁止打开幻灯片与扫描图片
- 黑名单为**精确域名**匹配；输入 `*.example.com` 会被规范化为 `example.com`（不支持通配符）
- 支持黑名单导入 / 导出（JSON 配置格式版本字段为 `1.2`，**不是**脚本版本号）
- 支持保存根目录、按钮位置、过滤条件、增强图片发现、文件大小探测等配置持久化
- 支持主图加载模式：
  - `clean`：直接加载清洗后的高清链接
  - `raw`：直接加载原始链接
  - `raw-then-clean`：先原始预览，再切换到清洗后高清（默认）
- 主图加载使用 `tmToken` 防竞态，避免快速切图时旧请求覆盖新图
- 可选探测文件大小（HEAD → Range GET，结果缓存，失败不打断浏览）

---

## 🔧 规则系统设计

规则系统按分层组织，便于扩展与复用：

```
helpers（正则/路径提取/Cloudinary 变换剥离）
    ↓
REUSABLE_RULES（通用规则，如去 query、转 PNG、去尺寸后缀）
    ↓
BRAND_RULES（站点/品牌专用规则）
    ↓
RULE_CHAINS（可复用规则链，如 SHOPIFY_ORIGINAL_CLEAN）
    ↓
HOST_RULE_MAP（hostType → 规则链）
    ↓
detectHostTypeByUrlObj + cleanUrl（识别 hostType 并依次 apply）
```

### hostType 识别顺序

`detectHostTypeByUrlObj(u, fullUrlStr)` 的判定顺序：

1. **特殊动态 host**（不进 `EXACT_HOST_MAP`）
   - `360buyimg.com` / `*.360buyimg.com` → `jd-360buyimg`
   - `img.myshopline.com` / `img-*.myshopline.com` → `shopline-image-cdn`
2. **`EXACT_HOST_MAP`**：hostname 精确匹配
3. **Shopify 路径兜底**：pathname 以 `/cdn/shop/files/` 开头 → `old-order-shopify`
4. **`PARTIAL_MATCH_RULES`**：完整 URL 字符串包含指定片段

未识别到 hostType 时，`cleanUrl` 原样返回 raw，不改写链接。

### cleanUrl 行为

```js
cleanUrl(urlStr) → { raw, clean, hostType }
```

- 解析失败 / 无 hostType：`clean === raw`，`hostType === null`
- 有 hostType 但 `HOST_RULE_MAP` 无对应链：仍返回 hostType，`clean === raw`（展示用标签，但不清洗）
- 有规则链：按数组顺序依次 `rule.apply(url)`

> **维护要点**：新增动态识别的 hostType 时，**必须同时**在 `HOST_RULE_MAP` 挂上规则链，否则会出现「显示了 [hostType] 但不清洗」的半接线问题（v1.17.6 已修复的京东规则即属此类）。

---

## 📊 当前支持的网站与规则

以下清单基于当前 `image-helper.user.js` 中的 `EXACT_HOST_MAP`、`HOST_RULE_MAP` 及动态 host 识别逻辑整理，按品类分组。

> **说明**
>
> - "规则摘要"展示的是规则链意图，不逐字复制完整源码实现。
> - 同一规则组可能对应多个 host。
> - 此表不含 `PARTIAL_MATCH_RULES` 中的 URL 片段命中项，详见[后文补充](#-基于-url-片段的补充支持partial_match_rules)。
> - 部分 host（如 `jd-360buyimg`、`img-*.myshopline.com`）为动态识别，不在 `EXACT_HOST_MAP` 中。

### 👟 球鞋交易与垂直零售

| 区域            | 规则组               | 支持 host                   | 规则摘要                                                |
| --------------- | -------------------- | --------------------------- | ------------------------------------------------------- |
| Goat            | goat                 | `image.goat.com`            | 折叠 transform 包装路径，并仅移除已知派生图片参数       |
| FlightClub      | flightclub           | `cdn.flightclub.com`        | 去 query                                                |
| StockX          | stockx               | `images.stockx.com`         | 强制高分辨率 query                                      |
| Foot Locker     | footlocker-scene7    | `assets.footlocker.com`     | Scene7 强制 zoom2000 png                                |
| Finish Line     | finishline-media     | `media.finishline.com`      | 保守去 query                                            |
| Sneaker News    | sneakernews-wp       | `sneakernews.com`           | 去 query                                                |
| Sneaker Freaker | sneaker-freaker-bcdn | `sneaker-freaker.b-cdn.net` | decode 包装 CDN 路径并提取 pathname 中原图 URL          |
| Novelship       | novelship-img        | `images.novelship.com`      | 去 query                                                |
| Stadium Goods   | stadiumgoods-shopify | `www.stadiumgoods.com`      | 复用 Shopify 原图清洗共享规则（去尺寸后缀，再去 query） |
| Snipes 美国     | snipes-us            | `www.snipesusa.com`         | 保守去 query                                            |
| Snipes 全球     | snipes-global        | `asset.snipes.com`          | 剥离 `/images/` 变换段后再保守去 query                  |

### 🏃 运动品牌官方 / 区域站

| 区域                     | 规则组                    | 支持 host                                                      | 规则摘要                                  |
| ------------------------ | ------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| Adidas 全球              | adidas-intl               | `assets.adidas.com`                                            | 清理变换路径，JPG 转 PNG                  |
| Asics 全球               | asics-intl                | `images.asics.com`                                             | 强制高分辨率参数                          |
| Asics 香港               | cdn-91app                 | `img.cdn.91app.hk`                                             | 去版本 query                              |
| Brooks 全球              | brooks-intl               | `www.brooksrunning.com`                                        | 去 query，转 PNG                          |
| Converse 中国            | converse-cn               | `res-converse.baozun.com`, `dam-converse.baozun.com`           | 去 query                                  |
| Shopline 图片源站        | shopline-image-origin     | `shoplineimg.com`                                              | 转换到 CloudFront 原图地址                |
| Shopline 图片 CloudFront | shopline-image-cloudfront | `d31xv78q8gnfco.cloudfront.net`                                | 提取 CloudFront 原图                      |
| Shopline 图片 CDN        | shopline-image-cdn        | `img.myshopline.com`, `img-*.myshopline.com`                   | 按条件清理尺寸/质量 query                 |
| 安踏集团中国             | anta-group-cn             | `img.fishfay.com`                                              | 去 `x-image-process` 展示参数             |
| Bombas 全球              | bombas-assets             | `assets.bombas.com`                                            | 提取 Cloudinary fetch 路径中的原图 URL    |
| Hoka 全球                | hoka-intl                 | `dms.deckers.com`                                              | 去 query                                  |
| Hoka 中国                | hoka-cn                   | `b2c.hoka.wishetin.com`                                        | 去中国站 query                            |
| Li-Ning 中国             | lining-cn                 | `lining-goods-online-1302115263.file.myqcloud.com`             | 去 query                                  |
| Mizuno 美国              | mizuno-usa                | `i1.adis.ws`                                                   | 去 query                                  |
| MLB 韩国                 | mlb-korea                 | `static-resource.mlb-korea.com`                                | 调整 CDN-CGI 图片参数                     |
| MLB 韩国                 | mlb-korea-shop            | `en.mlb-korea.com`                                             | 清理 shop 文件的版本/宽度参数             |
| MLB 香港                 | cdn-91app                 | `img.cdn.91app.hk`                                             | 去版本 query                              |
| New Balance 全球         | newbalance-intl           | `nb.scene7.com`                                                | 去 query                                  |
| New Balance 中国         | newbalance-cn             | `itg-tezign-files.tezign.com`                                  | 清理 `image_process` 参数                 |
| Nike 中国                | nike-cn                   | `static.nike.com.cn`                                           | 保留中国站域名、清路径、转 PNG            |
| Nike 全球                | nike-global               | `static.nike.com`, `c.static-nike.com`                         | 清路径、转 PNG                            |
| Nike 中东                | nike-ae-like              | `www.nike.ae`, `www.nike.com.kw`, `www.nike.qa`, `www.nike.sa` | 保留原始图片格式并去展示参数              |
| On 全球                  | on-intl                   | `images.ctfassets.net`                                         | 去 query                                  |
| On 中国                  | on-cn                     | `oss.on-running.cn`                                            | 去 OSS 图片处理参数                       |
| Puma 全球                | puma-intl                 | `images.puma.com`                                              | Cloudinary upload 变换路径清理            |
| Puma 中国                | puma-cn                   | `itg-tezign-files-tx.tezign.com`                               | 清理中国站图片处理参数                    |
| Puma 香港                | cdn-91app                 | `img.cdn.91app.hk`                                             | 去版本 query                              |
| Puma 台湾                | cdn-91app                 | `img.91app.com`                                                | 去版本 query                              |
| Salomon 全球             | salomon-intl              | `cdn.dam.salomon.com`                                          | 去 query                                  |
| Saucony 全球             | saucony-intl              | `s7d4.scene7.com`                                              | 先去 Scene7 `$...$` 段，再去 query        |
| Skechers 美国            | skechers-usa              | `images.skechers.com`                                          | 清理 `/image;...` 风格路径                |
| Skechers 香港            | skechers-hk               | `www.skechers.com.hk`                                          | 去版本 query                              |
| Skechers 新加坡          | skechers-sg               | `www.skechers.com.sg`                                          | 去尺寸后缀，再去版本 query                |
| Skechers 台湾            | cdn-91app                 | `img.91app.com`                                                | 去版本 query                              |
| The North Face 全球      | thenorthface-intl         | `assets.thenorthface.com`                                      | 清理 `t_img/.../v...` 变换路径            |
| The North Face 中国      | thenorthface-cn           | `img2.thenorthface.com.cn`                                     | 去中国站 query                            |
| The North Face 台湾      | cdn-91app                 | `img.91app.com`                                                | 去版本 query                              |
| Under Armour 全球        | underarmour-scene7        | `underarmour.scene7.com`                                       | 统一重写为 `?scl=1&fmt=png-alpha&qlt=100` |
| Vans 全球                | vans-intl                 | `assets.vans.com`                                              | 清理国际站图片参数路径                    |
| Vans 台湾                | cdn-91app                 | `img.91app.com`                                                | 去版本 query                              |

### 🛒 综合运动零售 / 户外 / 通用电商

| 区域                 | 规则组             | 支持 host                                  | 规则摘要                                                          |
| -------------------- | ------------------ | ------------------------------------------ | ----------------------------------------------------------------- |
| Decathlon 全球       | decathlon-intl     | `www.decathlon.com`                        | 去 query                                                          |
| Decathlon 中国       | decathlon-cn       | `pixl.decathlon.com.cn`                    | 去 query，转 PNG                                                  |
| Decathlon 香港       | decathlon-hk       | `contents.mediadecathlon.com`              | 去 query，转 PNG                                                  |
| Catalog 香港         | hkstore-catalog    | `catalog.hkstore.com`                      | Magento 媒体图保守去 query                                        |
| Amazon               | amazon-media       | `m.media-amazon.com`                       | 清理媒体图尺寸/格式片段                                           |
| eBay                 | ebay-img-force-png | `i.ebayimg.com`                            | 强制改为 `s-l2000.png`                                            |
| END. Clothing        | end-clothing       | `media.endclothing.com`                    | 清理媒体路径                                                      |
| Old Order            | old-order-shopify  | `old-order.com`                            | 复用 Shopify 原图清洗共享规则（去尺寸后缀，再去 query）           |
| Runnmore             | runnmore           | `www.runnmore.com`                         | thumbs 路径回原图                                                 |
| Sport Vision MK / HR | sportvision-mk     | `www.sportvision.mk`, `www.sportvision.hr` | 精确回退 `/files/thumbs/files/` 缩略路径并去除末段冗余 `/images/` |
| GNK Store            | opencart-generic   | `gnk-store.ru`                             | 缓存图转原图                                                      |
| Shiekh Shoes         | magento-shiekh     | `static.shiekh.com`                        | Magento 缓存图转原图路径                                          |
| Farfetch             | farfetch-contents  | `cdn-images.farfetch-contents.com`         | 去文件名末尾尺寸后缀，再去 query                                  |
| Complex              | complex-cloudinary | `images.complex.com`                       | 清理连续 transform path，保留资源路径                             |
| Zalora 香港          | zalora-dynamic-cdn | `dynamic.zacdn.com`                        | 提取包装 CDN pathname 后段的明文原图 URL                          |
| Hypebeast CDN        | hypebeast-cdn      | `image-cdn.hypb.st`                        | decode 包装 CDN 路径并提取 pathname 中原图 URL                    |
| Noon                 | noon-cdn           | `f.nooncdn.com`                            | 去 query                                                          |
| 京东图片 CDN         | jd-360buyimg       | `*.360buyimg.com`（动态识别，非 EXACT_HOST_MAP） | 去掉 `.jpg.avif` / `.png.avif` 等双后缀，保留真实扩展名      |

### 🎨 时尚 / 平台 / 通用图片 CDN

| 区域      | 规则组            | 支持 host                                    | 规则摘要                          |
| --------- | ----------------- | -------------------------------------------- | --------------------------------- |
| 91APP CDN | cdn-91app         | `img.cdn.91app.hk`, `img.91app.com`          | 去版本 query                      |
| Shein     | shein-ltwebstatic | `img.ltwebstatic.com`, `img.shein.com`       | 去 `_thumbnail_` 后缀，再去 query |
| Poizon    | poizon-cdn        | `cdn.poizon.com`                             | 强制 PNG 参数                     |
| 识货      | shihuo-cdn        | `static.shihuocdn.cn`, `eimage.shihuocdn.cn` | 去尺寸后缀，再去 query            |
| AliCDN    | alicdn            | `gw.alicdn.com`, `img.alicdn.com`            | 去文件名尾部阿里系后缀            |
| Sanity    | sanity-cdn        | `cdn.sanity.io`                              | 保留原始资源主路径                |

---

## 🔍 基于 URL 片段的补充支持（PARTIAL_MATCH_RULES）

以下规则不依赖精确 host，而依赖 URL 片段识别；展示顺序也与主表保持一致，优先从区域/归属视角阅读：

| 区域 / 归属    | 规则组            | 匹配片段                                         | 规则摘要                                                |
| -------------- | ----------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Decathlon 全球 | decathlon-intl    | `cdn.shopify.com/s/files/1/1330/6287/files`      | 去 query                                                |
| Reebok 全球    | reebok-intl       | `cdn.shopify.com/s/files/1/0862/7834/0912/files` | 去 query                                                |
| KicksCrew 全球 | kickscrew-shopify | `cdn.shopify.com/s/files/1/0603/3031/1875/files` | 复用 Shopify 原图清洗共享规则（去尺寸后缀，再去 query） |
| T4S Czechia    | t4s-cdn           | `t4s.cz`                                         | 去尾部尺寸号，必要时补 `.jpg`                           |

---

## 🔄 图片清洗流程

1. **收集候选**
   - 默认：`<img>` / `srcset` / 常见 lazy 属性 / `application/ld+json`
   - 增强模式（设置可开）：更深挖 `application/json`、`#__NEXT_DATA__`、`data-*` 等
   - 背景图扫描（`scanBackgroundImages`）当前默认关闭，且无 UI，属半成品配置
2. **规范化 URL**：相对路径转绝对；过滤 `data:` / `blob:` / `javascript:`
3. **hostType 识别 + 规则链清洗**（见[规则系统设计](#-规则系统设计)）
4. **过滤**：按最小边长、最小体积（若已探测）、扩展名白名单
5. **展示 / 保存**
   - 幻灯片主图按 `slideLoadMode` 加载；`raw-then-clean` 用 `tmToken` 防止竞态
   - 缩略图条最多渲染前 `THUMB_MAX_RENDER`（800）张；列表本身可更长，键盘/滚轮仍可切到后面

---

## ➕ 新增站点与维护模板

### A. 精确 host（最常见）

1. 在 `EXACT_HOST_MAP` 增加 `["cdn.example.com", "example-cdn"]`
2. 若需专用逻辑：在 `BRAND_RULES` 增加规则对象（`{ apply(url) { ... } }`）
3. 在 `HOST_RULE_MAP` 增加 `"example-cdn": [BRAND_RULES.XXX]` 或复用 `REUSABLE_RULES` / `RULE_CHAINS`
4. 更新本文件的「支持站点速览」与「当前支持的网站与规则」表格

### B. URL 片段匹配

1. 在 `PARTIAL_MATCH_RULES` 增加 `{ str: "cdn.../files", type: "xxx" }`
2. 确保 `HOST_RULE_MAP["xxx"]` 已存在
3. 更新「基于 URL 片段的补充支持」表格

### C. 动态 host（正则 / 后缀）

1. 在 `detectHostTypeByUrlObj` **前部**增加特殊判断（参考 `jd-360buyimg`、`shopline-image-cdn`）
2. **同步**挂 `HOST_RULE_MAP`
3. 文档中注明「动态识别，非 EXACT_HOST_MAP」

### D. 规则编写建议

- 优先复用 `REUSABLE_RULES`（去 query、转 PNG、去尺寸后缀等）
- 包装型 CDN 优先用 `extractEncodedOriginFromPath` / `extractPlainOriginFromWrappedPath`
- Cloudinary upload 变换路径优先用 `createCloudinaryUploadStripRule`
- 规则应**幂等**：对已是原图的 URL 再 apply 一次应尽量不变
- 不要过度扩大 host 匹配范围，避免误伤无关域名

---

## 📝 文档维护原则

1. **版本对齐**：`image-helper.user.js` 的 `@version`、`README.md` 当前版本、本文件 badge/表格应一致
2. **表格与源码同源**：规则明细以 `EXACT_HOST_MAP` / `HOST_RULE_MAP` / `PARTIAL_MATCH_RULES` / 动态识别逻辑为准
3. **规则摘要写意图**，不逐字粘贴完整正则源码
4. **配置 schema 版本 ≠ 脚本版本**：黑名单导出 JSON 中的 `version: "1.2"` 是配置格式版本
5. **仅文档修正可不升脚本版本号**（按仓库 SemVer 约定：X 大版本 / Y 功能 / Z 小修；文档/注释可不升）
6. 目录锚点对应的章节必须真实存在，避免“目录有、正文无”

---

## ⚠️ 当前已知注意事项

### 权限与跨域

- `@connect *` 权限较宽，开启「探测文件大小」时可能增加 Tampermonkey 跨域确认噪音；可在设置中关闭 `probeFilesize`
- 下载依赖 `GM_download`；不同脚本管理器对「带文件夹的 name」支持不一致，脚本已做平铺降级

### 黑名单

- 仅精确域名；`*.example.com` 会去掉 `*.` 前缀后存为 `example.com`
- 列表渲染使用 `createElement` + `textContent`，避免把导入域名拼进 HTML

### 半成品 / 内部配置（无 UI）

| 配置 | 默认 | 说明 |
| :--- | :--- | :--- |
| `scanBackgroundImages` | `false` | 背景图扫描，不持久化、无设置项 |
| `maxElementsForBgScan` | `8000` | 背景扫描元素上限 |
| `preloadRadius` | `2` | 幻灯片邻图预加载半径 |

上述项若暴露为用户功能，应按 **Y（功能位）** 升版本。

### 体验边界

- 缩略图条只渲染前 800 张；超过后仍可用键盘/滚轮浏览，但底部条无对应入口
- `STYLE_ID`（如 `sih-style-v1440`）与脚本版本号无强制绑定；同页热更新时若旧 style 节点残留，CSS 变更可能不生效
- 仅在**顶层窗口**注入悬浮按钮，避免 iframe 重复注入
- 自定义保存文件夹会经 `sanitizeSaveFolderPath` 清洗；全非法输入时回退默认「根目录/标题_时间」

### 仓库说明

- 详细交互与实现以本文件 + 源码为准；仓库根 `README.md` 只做脚本列表总览
- 当前仓库**不含** `image-helper.regression.js`；若日后补回归脚本，应同步更新 README
