# image-helper.user.js

![version](https://img.shields.io/badge/version-1.10.11-blue)
![match](https://img.shields.io/badge/match-*://*/*-green)
![run](https://img.shields.io/badge/run-document--idle-yellow)

## 概述

`image-helper.user.js` 是一个浏览器用户脚本，用于扫描当前页面中的图片资源。

它尽可能将图片链接清洗为更高清的原图地址，并提供统一的浏览、复制与保存能力。

| 属性 | 值 |
| --- | --- |
| 名称 | Image Helper / 图片助手 |
| 版本 | `1.10.11` |
| 运行时机 | `document-idle` |
| 匹配范围 | `*://*/*` |

## 目录

- [核心功能](#核心功能)
- [规则系统设计](#规则系统设计)
- [当前支持的网站与规则](#当前支持的网站与规则)
- [基于 URL 片段的补充支持](#基于-url-片段的补充支持partial_match_rules)
- [图片清洗流程](#图片清洗流程)
- [新增站点与维护模板](#新增站点与维护模板)
- [文档维护原则](#文档维护原则)

---

## 核心功能

### 1. 页面图片提取与清洗

- 扫描页面中的图片候选资源
- 支持从常见图片 URL、`srcset` 等来源中提取候选图
- 对已识别站点应用专用清洗规则，将缩略图、带尺寸参数图、带渲染 query 的图片尽量转换成更高清版本
- 未命中规则时，保留原始链接

### 2. 幻灯片浏览

- 以全屏 overlay 方式浏览已提取图片
- 支持上一张 / 下一张切换
- 显示当前图片计数、命中的规则类型（hostType）、保存目录、文件名、清洗后链接与原始链接
- 支持滚轮切换、键盘切换与 Esc 关闭

### 3. 图片查看器

- 点击主图可进入独立查看器
- 适合对当前图片做更聚焦的预览

### 4. 复制链接

- 可分别复制：
  - 当前链接（已清洗）
  - 原始链接
- 优先使用 `navigator.clipboard.writeText`
- 不可用时回退到 `document.execCommand('copy')`

### 5. 保存能力

- 支持：
  - 保存当前图片
  - 快速保存当前图片
  - 全部保存
  - 停止批量保存
- 自动根据页面标题与当前时间生成子文件夹名
- 对文件名进行安全清洗，减少 Windows/macOS/Linux 上保存失败风险
- 若运行环境不支持带目录的下载名，会自动降级为平铺文件名

### 6. 黑名单与设置

- 支持站点黑名单，命中后禁止打开幻灯片与扫描图片
- 支持保存目录、按钮位置、过滤条件等配置持久化
- 支持主图加载模式：
  - `clean`
  - `raw`
  - `raw-then-clean`

---

## 规则系统设计

脚本采用"host 路由 + 规则链"的结构，由以下 5 个模块组成。

### 1. `REUSABLE_RULES`

通用复用规则，适合多个站点共享，例如：

- 删除全部 query：`REMOVE_ALL_QUERY`
- 转成 `.png`：`TO_PNG`
- 移除版本 query：`REMOVE_VERSION_QUERY`
- 移除通用尺寸后缀：`REMOVE_SIZE_SUFFIX`
- 移除 Shein / LTWebStatic 缩略图后缀：`SHEIN_LTWEBSTATIC_REMOVE_THUMBNAIL_SUFFIX`

### 2. `BRAND_RULES`

站点/品牌定制规则，封装更强的路径重写、参数替换、Scene7 规则、Shopify 尺寸清洗等行为。

### 3. `EXACT_HOST_MAP`

将精确 host 映射到某个规则组类型（hostType）。

示例：

- `static.nike.com` → `nike-global`
- `media.finishline.com` → `finishline-media`
- `img.shein.com` → `shein-ltwebstatic`
- `images.complex.com` → `complex-cloudinary`

### 4. `PARTIAL_MATCH_RULES`

用于处理无法仅靠 host 精确识别、需要按 URL 片段命中的规则。

当前包含：

- 指定 Shopify 文件路径的 Decathlon / Reebok / KicksCrew
- `t4s.cz`

### 5. `HOST_RULE_MAP`

将规则组类型映射为一串规则链；清洗时会按顺序依次执行。

示例：

- `nike-cn`：先中国站转全局域名，再清理路径，再转 png
- `shein-ltwebstatic`：先移除 `_thumbnail_(宽x高|x高)` 后缀，再去 query
- `finishline-media`：仅保守去 query
- `complex-cloudinary`：复用通用 Cloudinary upload 清洗 helper，移除 `/complex/image/upload/` 后连续的 transform path，保留真实资源路径
- `puma-intl`：复用同一 helper，但要求真实资源路径必须以 `global/` 开头

---

## 当前支持的网站与规则

以下清单基于当前 `image-helper.user.js` 中的 `EXACT_HOST_MAP` 与 `HOST_RULE_MAP` 整理，按品类分组。

> **说明**
>
> - "规则摘要"展示的是规则链意图，不逐字复制完整源码实现。
> - 同一规则组可能对应多个 host。
> - 此表不含 `PARTIAL_MATCH_RULES` 中的 URL 片段命中项，详见[后文补充](#基于-url-片段的补充支持partial_match_rules)。

### 球鞋交易与垂直零售

| 规则组 | 支持 host | 区域 | 规则摘要 |
| --- | --- | --- | --- |
| goat | image.goat.com | GOAT | 清理 transform 路径或去 query |
| flightclub | cdn.flightclub.com | Flight Club | 去 query |
| stockx | images.stockx.com | StockX | 强制高分辨率 query |
| footlocker-scene7 | assets.footlocker.com | Foot Locker | Scene7 强制 zoom2000 png |
| finishline-media | media.finishline.com | Finish Line | 保守去 query |
| sneakernews-wp | sneakernews.com | Sneaker News | 去 query |
| novelship-img | images.novelship.com | Novelship | 去 query |
| stadiumgoods-shopify | www.stadiumgoods.com | Stadium Goods | Shopify 尺寸后缀清理，再去 query |
| snipes-demandware | www.snipesusa.com | SNIPES | 去 query |

### 运动品牌官方 / 区域站

| 规则组 | 支持 host | 区域 | 规则摘要 |
| --- | --- | --- | --- |
| adidas-assets | assets.adidas.com | Adidas 全球 | 清理变换路径，JPG 转 PNG |
| asics-intl | images.asics.com | ASICS 全球 | 强制高分辨率参数 |
| asics-hk | img.cdn.91app.hk | ASICS 香港 | 删除版本 query |
| asics-tw | img.91app.com | ASICS 台湾 | 删除版本 query |
| brooks-intl | www.brooksrunning.com | Brooks 全球 | 去 query，转 PNG |
| converse-cn | res-converse.baozun.com | Converse 中国 | 去 query |
| converse-cn | dam-converse.baozun.com | Converse 中国 | 去 query |
| hoka-intl | dms.deckers.com | HOKA 全球 | 去 query |
| hoka-cn | b2c.hoka.wishetin.com | HOKA 中国 | 删除中国站 query |
| lining-cn | lining-goods-online-1302115263.file.myqcloud.com | Li-Ning 中国 | 去 query |
| mizuno-usa | i1.adis.ws | Mizuno 全球 | 去 query |
| newbalance-intl | nb.scene7.com | NB 全球 | 去 query |
| newbalance-cn | itg-tezign-files.tezign.com | NB 中国 | 清理 `image_process` 参数 |
| on-intl | images.ctfassets.net | On 全球 | 去 query |
| on-cn | oss.on-running.cn | On 中国 | 去 OSS 图片处理参数 |
| puma-intl | images.puma.com | Puma 全球 | Cloudinary upload 变换路径清理 |
| puma-cn | itg-tezign-files-tx.tezign.com | Puma 中国 | 清理中国站图片处理参数 |
| salomon-intl | cdn.dam.salomon.com | Salomon 全球 | 去 query |
| saucony-intl | s7d4.scene7.com | Saucony 全球 | 先去 Scene7 `$...$` 段，再去 query |
| skechers-usa | images.skechers.com | Skechers 全球 | 清理 `/image;...` 风格路径 |
| skechers-hk | www.skechers.com.hk | Skechers 香港 | 删除版本 query |
| skechers-sg | www.skechers.com.sg | Skechers 新加坡 | 去尺寸后缀，再删版本 query |
| thenorthface-intl | assets.thenorthface.com | TNF 全球 | 清理 `t_img/.../v...` 变换路径 |
| thenorthface-cn | img2.thenorthface.com.cn | TNF 中国 | 删除中国站 query |
| underarmour-scene7 | underarmour.scene7.com | UA 全球 | 统一重写为高质量 PNG 参数 |
| vans-intl | assets.vans.com | Vans 全球 | 清理国际站图片参数路径 |
| nike-cn | static.nike.com.cn | Nike 中国 | 中国站域名转全球、清路径、转 PNG |
| nike-global | static.nike.com | Nike 全球 | 清路径、转 PNG |
| nike-global | c.static-nike.com | Nike 全球 | 清路径、转 PNG |
| nike-ae-like | www.nike.ae, www.nike.com.kw, www.nike.qa, www.nike.sa | Nike 中东 | 中东站系路径/格式处理 |
| fila-hk | shoplineimg.com | FILA 香港 | 转换到 CloudFront 原图地址 |
| fila-hk-cloudfront | d31xv78q8gnfco.cloudfront.net | FILA 香港 (CF) | 提取 CloudFront 原图 |
| fila-sg | img.myshopline.com | FILA 东南亚 | 按条件清理尺寸/质量 query |
| mlb-korea | static-resource.mlb-korea.com | MLB Korea | 调整 CDN-CGI 图片参数 |
| mlb-korea-shop | en.mlb-korea.com | MLB Korea | 清理 shop 文件的版本/宽度参数 |

### 综合运动零售 / 户外 / 通用电商

| 规则组 | 支持 host | 区域 | 规则摘要 |
| --- | --- | --- | --- |
| decathlon-intl | www.decathlon.com | Decathlon 全球 | 去 query |
| decathlon-cn | pixl.decathlon.com.cn | Decathlon 中国 | 去 query，转 PNG |
| decathlon-hk | contents.mediadecathlon.com | Decathlon 全球 | 去 query，转 PNG |
| amazon-media | m.media-amazon.com | Amazon | 清理媒体图尺寸/格式片段 |
| ebay-img-force-png | i.ebayimg.com | eBay | 强制改为 `s-l2000.png` |
| end-clothing | media.endclothing.com | END. | 清理媒体路径 |
| old-order-shopify | old-order.com | Old Order | Shopify 尺寸后缀清理，再去 query |
| runnmore-like | www.runnmore.com | Runnmore | thumbs 路径回原图 |
| runnmore-like | www.extrasports.com | Extra Sports | thumbs 路径回原图 |
| runnmore-like | www.sportvision.mk | Sport Vision | thumbs 路径回原图 |
| opencart-generic | gnk-store.ru | OpenCart 示例 | 缓存图转原图 |
| magento-shiekh | static.shiekh.com | Shiekh | Magento 缓存图转原图路径 |
| farfetch-contents | cdn-images.farfetch-contents.com | Farfetch | 去文件名末尾尺寸后缀，再去 query |
| complex-cloudinary | images.complex.com | Complex | 去 `/complex/image/upload/` 后连续 transform path |

### 时尚 / 平台 / 通用图片 CDN

| 规则组 | 支持 host | 区域 | 规则摘要 |
| --- | --- | --- | --- |
| shein-ltwebstatic | img.ltwebstatic.com | Shein | 移除 `_thumbnail_` 后缀，再去 query |
| shein-ltwebstatic | img.shein.com | Shein | 移除 `_thumbnail_` 后缀，再去 query |
| poizon-cdn | cdn.poizon.com | Poizon | 强制 PNG 参数 |
| shihuo-cdn | static.shihuocdn.cn | 识货 | 去尺寸后缀，再去 query |
| shihuo-cdn | eimage.shihuocdn.cn | 识货 | 去尺寸后缀，再去 query |
| alicdn | gw.alicdn.com | AliCDN | 移除文件名尾部阿里系后缀 |
| alicdn | img.alicdn.com | AliCDN | 移除文件名尾部阿里系后缀 |
| sanity-cdn | cdn.sanity.io | Sanity | 保留原始资源主路径 |

---

## 基于 URL 片段的补充支持（PARTIAL_MATCH_RULES）

以下规则不依赖精确 host，而依赖 URL 片段识别：

| 匹配片段 | 规则组 | 规则摘要 |
| --- | --- | --- |
| `cdn.shopify.com/s/files/1/1330/6287/files` | decathlon-intl | 去 query |
| `cdn.shopify.com/s/files/1/0862/7834/0912/files` | reebok-intl | 去 query |
| `cdn.shopify.com/s/files/1/0603/3031/1875/files` | kickscrew-shopify | Shopify 尺寸后缀清理，再去 query |
| `t4s.cz` | t4s-cdn | 去尾部尺寸号，必要时补 `.jpg` |

---

## 图片清洗流程

脚本的 URL 清洗主流程为：

1. 尝试将输入解析为合法 URL
2. 通过 `detectHostTypeByUrlObj()` 识别命中的规则组
   - 优先查 `EXACT_HOST_MAP`
   - 未命中时再检查特殊 host 与 `PARTIAL_MATCH_RULES`
3. 根据 `HOST_RULE_MAP[hostType]` 获取规则链
4. 依次执行每条规则，产出清洗后的 URL
5. 返回 `{ raw, clean, hostType }`

---

## 新增站点与维护模板

### 1. 收集样本

- 页面 URL：`https://www.example.com/product/xxx`
- 原始图片 URL（至少 2~3 条，最好覆盖列表图/详情图/缩略图）：
  - `https://cdn.example.com/img/a_300x300.jpg`
  - `https://cdn.example.com/img/b_300x300.jpg`
- 目标高清 URL 预期：`https://cdn.example.com/img/a.jpg`
- 是否存在多个图片 host：是 / 否

### 2. 判断接入方式

- 是否可直接复用 `REUSABLE_RULES`：是 / 否
- 是否需要新增 `BRAND_RULES`：是 / 否
- 使用精确 host 匹配还是 URL 片段匹配：
  - `EXACT_HOST_MAP`
  - `PARTIAL_MATCH_RULES`

### 3. 实施清单

1. 先确认图片 host 是否稳定
2. 优先复用 `REUSABLE_RULES`；若品牌有特殊路径/参数语义，再新增 `BRAND_RULES`
3. 在 `EXACT_HOST_MAP` 或 `PARTIAL_MATCH_RULES` 中登记入口
4. 在 `HOST_RULE_MAP` 中配置规则链顺序
5. 用样本 URL 静态验证清洗结果
6. 若属于脚本行为变更，按 SemVer 更新 `image-helper.user.js` 版本号
7. 执行基础校验：
   ```powershell
   node --check image-helper.user.js
   node image-helper.regression.js
   ```
8. 同步更新本文档中的：
   - [当前支持的网站与规则](#当前支持的网站与规则)
   - [基于 URL 片段的补充支持](#基于-url-片段的补充支持partial_match_rules)
   - [当前已知注意事项](#当前已知注意事项)（如有边界条件）

### 4. 规则摘要写法建议

文档里建议写"规则效果"，不要堆完整实现。例如：

- 去 query
- 去尺寸后缀后再去 query
- Scene7 强制高分辨率 PNG
- Shopify 图片尺寸后缀清理
- 缓存图路径回原图路径

---

## 文档维护原则

本文件定位为：

- 功能概览
- 规则架构说明
- 支持站点索引
- 新增站点时的维护模板

不追求逐条复制完整源码细节。若后续规则新增或 host 映射变化，建议同步更新：

- "当前支持的网站与规则"
- "基于 URL 片段的补充支持"
- "当前已知注意事项"

---

## 当前已知注意事项

<details>
<summary>点击展开</summary>

- Shein / LTWebStatic 规则当前明确兼容：
  - `_thumbnail_220x293`
  - `_thumbnail_x460`
- Finish Line 当前仅基于样例做了保守 query 清理，后续如发现更明确的尺寸升级策略，可再扩展。
- Complex Images 当前通过通用 Cloudinary upload helper 处理：会剥离 `/complex/image/upload/` 后连续的 transform segment，并仅在真实资源路径以 `sanity-new/` 开头时生效；若后续出现非下划线命名的 transform token，需先核对样本再扩展识别模式。
- Puma International 当前也复用同一 helper，但额外限制真实资源路径必须以 `global/` 开头，避免把非目标 upload 路径误清洗。
- 2026-03-26 进一步复查后，当前未再发现第三个可以安全并入该 Cloudinary upload helper 的明确候选；像 GOAT、Nike、MLB Korea、Scene7 系规则虽然也涉及 transform / 图像处理，但路径语义与资源边界不同，强行抽象更容易误伤。
- 复制功能仍包含 `document.execCommand('copy')` 兼容性回退，因此 IDE 可能提示 deprecated hint，属预期。

</details>
