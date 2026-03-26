# Image Helper / 图片助手

> 脚本文件：`image-helper.user.js`

![version](https://img.shields.io/badge/version-1.10.15-blue)
![match](https://img.shields.io/badge/match-*://*/*-green)
![run](https://img.shields.io/badge/run-document--idle-yellow)

## 概述

`image-helper.user.js`（展示名：`Image Helper / 图片助手`）是一个浏览器用户脚本，用于扫描当前页面中的图片资源。

文档当前整理时会优先着重关注 sneaker 类网站及其常见品牌、电商与内容站图片链路，同时兼顾其他服饰、综合零售与通用图片 CDN 场景。

它尽可能将图片链接清洗为更高清的原图地址，并提供统一的浏览、复制与保存能力。

| 属性     | 值                      |
| -------- | ----------------------- |
| 名称     | Image Helper / 图片助手 |
| 版本     | `1.10.15`               |
| 运行时机 | `document-idle`         |
| 匹配范围 | `*://*/*`               |

## 目录

- [支持站点速览](#支持站点速览)
- [核心功能](#核心功能)
- [规则系统设计](#规则系统设计)
- [当前支持的网站与规则](#当前支持的网站与规则)
- [基于 URL 片段的补充支持](#基于-url-片段的补充支持partial_match_rules)
- [图片清洗流程](#图片清洗流程)
- [新增站点与维护模板](#新增站点与维护模板)
- [文档维护原则](#文档维护原则)

---

## 支持站点速览

> 这一节用于快速查看“当前大致支持哪些站点 / 品牌 / 平台”，优先保留品牌与区域层面的阅读友好性，不展开 host、规则链与实现细节；具体映射关系请继续查看后文的规则明细表与 `PARTIAL_MATCH_RULES` 补充表。

### 球鞋交易与垂直零售

- Goat
- FlightClub
- StockX
- Foot Locker
- Finish Line
- Sneaker News
- Sneaker Freaker
- Novelship
- Stadium Goods
- Snipes

### 运动品牌官方 / 区域站

- Adidas 全球
- Asics 全球 / 香港 / 台湾
- Brooks 全球
- Converse 中国
- Hoka 全球 / 中国
- Li-Ning 中国
- Mizuno 美国
- New Balance 全球 / 中国
- On 全球 / 中国
- Puma 全球 / 中国
- Salomon 全球
- Saucony 全球
- Skechers 美国 / 香港 / 新加坡
- The North Face 全球 / 中国
- Under Armour 全球
- Vans 全球
- Nike 中国 / 全球 / 中东
- Fila 香港 / 东南亚
- MLB 韩国

### 综合运动零售 / 户外 / 通用电商

- Decathlon 全球 / 中国 / 香港
- Amazon
- eBay
- END. Clothing
- Old Order
- Runnmore
- Extra Sports
- Sport Vision
- GNK Store
- Shiekh Shoes
- Farfetch
- Complex
- Zalora 香港

### 时尚 / 平台 / 通用图片 CDN

- Shein
- Poizon
- 识货
- AliCDN
- Sanity

### URL 片段补充支持

- Decathlon 全球（Shopify 文件路径）
- Reebok 全球（Shopify 文件路径）
- KicksCrew 全球（Shopify 文件路径）
- T4S Czechia

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

- 去 query：`REMOVE_ALL_QUERY`
- 转成 `.png`：`TO_PNG`
- 去版本 query：`REMOVE_VERSION_QUERY`
- 去通用尺寸后缀：`REMOVE_SIZE_SUFFIX`
- 去 Shein / LTWebStatic 缩略图后缀：`SHEIN_LTWEBSTATIC_REMOVE_THUMBNAIL_SUFFIX`

### 2. `BRAND_RULES`

站点/品牌定制规则，封装更强的路径重写、参数替换、Scene7 规则、Shopify 尺寸清洗等行为。

### 3. `EXACT_HOST_MAP`

将精确 host 映射到某个规则组类型（hostType）。

示例：

- `static.nike.com` → `nike-global`
- `media.finishline.com` → `finishline-media`
- `img.shein.com` → `shein-ltwebstatic`
- `images.complex.com` → `complex-cloudinary`
- `image-cdn.hypb.st` → `hypebeast-cdn`
- `sneaker-freaker.b-cdn.net` → `sneaker-freaker-bcdn`
- `catalog.hkstore.com` → `hkstore-catalog`
- `dynamic.zacdn.com` → `zalora-dynamic-cdn`

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
- `hypebeast-cdn`：对 `image-cdn.hypb.st` 的包装 CDN 路径做 decode，从 `pathname` 中提取被 percent-encode 的真实原图 URL
- `sneaker-freaker-bcdn`：对 `sneaker-freaker.b-cdn.net` 的包装 CDN 路径做 decode，从 `pathname` 中提取被 percent-encode 的真实原图 URL
- `hkstore-catalog`：对 `catalog.hkstore.com/media/catalog/product/...` 的 Magento 媒体图保守去 query，保留原始图片路径
- `zalora-dynamic-cdn`：对 `dynamic.zacdn.com/.../https://static-hk.zacdn.com/...` 这类包装 CDN 路径直接提取 pathname 后段的明文原图 URL
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

| 区域            | 规则组               | 支持 host                   | 规则摘要                                       |
| --------------- | -------------------- | --------------------------- | ---------------------------------------------- |
| Goat            | goat                 | `image.goat.com`            | 清理 transform 路径或去 query                  |
| FlightClub      | flightclub           | `cdn.flightclub.com`        | 去 query                                       |
| StockX          | stockx               | `images.stockx.com`         | 强制高分辨率 query                             |
| Foot Locker     | footlocker-scene7    | `assets.footlocker.com`     | Scene7 强制 zoom2000 png                       |
| Finish Line     | finishline-media     | `media.finishline.com`      | 保守去 query                                   |
| Sneaker News    | sneakernews-wp       | `sneakernews.com`           | 去 query                                       |
| Sneaker Freaker | sneaker-freaker-bcdn | `sneaker-freaker.b-cdn.net` | decode 包装 CDN 路径并提取 pathname 中原图 URL |
| Novelship       | novelship-img        | `images.novelship.com`      | 去 query                                       |
| Stadium Goods   | stadiumgoods-shopify | `www.stadiumgoods.com`      | Shopify 尺寸后缀清理，再去 query               |
| Snipes          | snipes-demandware    | `www.snipesusa.com`         | 去 query                                       |

### 运动品牌官方 / 区域站

| 区域                 | 规则组             | 支持 host                                                      | 规则摘要                           |
| -------------------- | ------------------ | -------------------------------------------------------------- | ---------------------------------- |
| Adidas 全球          | adidas-intl        | `assets.adidas.com`                                            | 清理变换路径，JPG 转 PNG           |
| Asics 全球           | asics-intl         | `images.asics.com`                                             | 强制高分辨率参数                   |
| Asics 香港           | asics-hk           | `img.cdn.91app.hk`                                             | 去版本 query                       |
| Asics 台湾           | asics-tw           | `img.91app.com`                                                | 去版本 query                       |
| Brooks 全球          | brooks-intl        | `www.brooksrunning.com`                                        | 去 query，转 PNG                   |
| Converse 中国        | converse-cn        | `res-converse.baozun.com`                                      | 去 query                           |
| Converse 中国        | converse-cn        | `dam-converse.baozun.com`                                      | 去 query                           |
| Hoka 全球            | hoka-intl          | `dms.deckers.com`                                              | 去 query                           |
| Hoka 中国            | hoka-cn            | `b2c.hoka.wishetin.com`                                        | 去中国站 query                     |
| Li-Ning 中国         | lining-cn          | `lining-goods-online-1302115263.file.myqcloud.com`             | 去 query                           |
| Mizuno 美国          | mizuno-usa         | `i1.adis.ws`                                                   | 去 query                           |
| New Balance 全球     | newbalance-intl    | `nb.scene7.com`                                                | 去 query                           |
| New Balance 中国     | newbalance-cn      | `itg-tezign-files.tezign.com`                                  | 清理 `image_process` 参数          |
| On 全球              | on-intl            | `images.ctfassets.net`                                         | 去 query                           |
| On 中国              | on-cn              | `oss.on-running.cn`                                            | 去 OSS 图片处理参数                |
| Puma 全球            | puma-intl          | `images.puma.com`                                              | Cloudinary upload 变换路径清理     |
| Puma 中国            | puma-cn            | `itg-tezign-files-tx.tezign.com`                               | 清理中国站图片处理参数             |
| Salomon 全球         | salomon-intl       | `cdn.dam.salomon.com`                                          | 去 query                           |
| Saucony 全球         | saucony-intl       | `s7d4.scene7.com`                                              | 先去 Scene7 `$...$` 段，再去 query |
| Skechers 美国        | skechers-usa       | `images.skechers.com`                                          | 清理 `/image;...` 风格路径         |
| Skechers 香港        | skechers-hk        | `www.skechers.com.hk`                                          | 去版本 query                       |
| Skechers 新加坡      | skechers-sg        | `www.skechers.com.sg`                                          | 去尺寸后缀，再去版本 query         |
| The North Face 全球  | thenorthface-intl  | `assets.thenorthface.com`                                      | 清理 `t_img/.../v...` 变换路径     |
| The North Face 中国  | thenorthface-cn    | `img2.thenorthface.com.cn`                                     | 去中国站 query                     |
| Under Armour 全球    | underarmour-scene7 | `underarmour.scene7.com`                                       | 统一重写为高质量 PNG 参数          |
| Vans 全球            | vans-intl          | `assets.vans.com`                                              | 清理国际站图片参数路径             |
| Nike 中国            | nike-cn            | `static.nike.com.cn`                                           | 中国站域名转全球、清路径、转 PNG   |
| Nike 全球            | nike-global        | `static.nike.com`                                              | 清路径、转 PNG                     |
| Nike 全球            | nike-global        | `c.static-nike.com`                                            | 清路径、转 PNG                     |
| Nike 中东            | nike-ae-like       | `www.nike.ae`, `www.nike.com.kw`, `www.nike.qa`, `www.nike.sa` | 中东站系路径/格式处理              |
| Fila 香港            | fila-hk            | `shoplineimg.com`                                              | 转换到 CloudFront 原图地址         |
| Fila 香港 CloudFront | fila-hk-cloudfront | `d31xv78q8gnfco.cloudfront.net`                                | 提取 CloudFront 原图               |
| Fila 东南亚          | fila-sg            | `img.myshopline.com`                                           | 按条件清理尺寸/质量 query          |
| MLB 韩国             | mlb-korea          | `static-resource.mlb-korea.com`                                | 调整 CDN-CGI 图片参数              |
| MLB 韩国             | mlb-korea-shop     | `en.mlb-korea.com`                                             | 清理 shop 文件的版本/宽度参数      |

### 综合运动零售 / 户外 / 通用电商

| 区域           | 规则组             | 支持 host                          | 规则摘要                                       |
| -------------- | ------------------ | ---------------------------------- | ---------------------------------------------- |
| Decathlon 全球 | decathlon-intl     | `www.decathlon.com`                | 去 query                                       |
| Decathlon 中国 | decathlon-cn       | `pixl.decathlon.com.cn`            | 去 query，转 PNG                               |
| Decathlon 香港 | decathlon-hk       | `contents.mediadecathlon.com`      | 去 query，转 PNG                               |
| Catalog 香港   | hkstore-catalog    | `catalog.hkstore.com`              | Magento 媒体图保守去 query                     |
| Amazon         | amazon-media       | `m.media-amazon.com`               | 清理媒体图尺寸/格式片段                        |
| eBay           | ebay-img-force-png | `i.ebayimg.com`                    | 强制改为 `s-l2000.png`                         |
| END. Clothing  | end-clothing       | `media.endclothing.com`            | 清理媒体路径                                   |
| Old Order      | old-order-shopify  | `old-order.com`                    | Shopify 尺寸后缀清理，再去 query               |
| Runnmore       | runnmore-like      | `www.runnmore.com`                 | thumbs 路径回原图                              |
| Extra Sports   | runnmore-like      | `www.extrasports.com`              | thumbs 路径回原图                              |
| Sport Vision   | runnmore-like      | `www.sportvision.mk`               | thumbs 路径回原图                              |
| GNK Store      | opencart-generic   | `gnk-store.ru`                     | 缓存图转原图                                   |
| Shiekh Shoes   | magento-shiekh     | `static.shiekh.com`                | Magento 缓存图转原图路径                       |
| Farfetch       | farfetch-contents  | `cdn-images.farfetch-contents.com` | 去文件名末尾尺寸后缀，再去 query               |
| Complex        | complex-cloudinary | `images.complex.com`               | 清理连续 transform path，保留资源路径          |
| Zalora 香港    | zalora-dynamic-cdn | `dynamic.zacdn.com`                | 提取包装 CDN pathname 后段的明文原图 URL       |
| Hypebeast CDN  | hypebeast-cdn      | `image-cdn.hypb.st`                | decode 包装 CDN 路径并提取 pathname 中原图 URL |
| Hypebeast CDN  | hypebeast-cdn      | `www.hypebeast.com`                | decode 包装 CDN 路径并提取 pathname 中原图 URL |

### 时尚 / 平台 / 通用图片 CDN

| 区域   | 规则组            | 支持 host             | 规则摘要                          |
| ------ | ----------------- | --------------------- | --------------------------------- |
| Shein  | shein-ltwebstatic | `img.ltwebstatic.com` | 去 `_thumbnail_` 后缀，再去 query |
| Shein  | shein-ltwebstatic | `img.shein.com`       | 去 `_thumbnail_` 后缀，再去 query |
| Poizon | poizon-cdn        | `cdn.poizon.com`      | 强制 PNG 参数                     |
| 识货   | shihuo-cdn        | `static.shihuocdn.cn` | 去尺寸后缀，再去 query            |
| 识货   | shihuo-cdn        | `eimage.shihuocdn.cn` | 去尺寸后缀，再去 query            |
| AliCDN | alicdn            | `gw.alicdn.com`       | 去文件名尾部阿里系后缀            |
| AliCDN | alicdn            | `img.alicdn.com`      | 去文件名尾部阿里系后缀            |
| Sanity | sanity-cdn        | `cdn.sanity.io`       | 保留原始资源主路径                |

---

## 基于 URL 片段的补充支持（PARTIAL_MATCH_RULES）

以下规则不依赖精确 host，而依赖 URL 片段识别；展示顺序也与主表保持一致，优先从区域/归属视角阅读：

| 区域 / 归属    | 规则组            | 匹配片段                                         | 规则摘要                         |
| -------------- | ----------------- | ------------------------------------------------ | -------------------------------- |
| Decathlon 全球 | decathlon-intl    | `cdn.shopify.com/s/files/1/1330/6287/files`      | 去 query                         |
| Reebok 全球    | reebok-intl       | `cdn.shopify.com/s/files/1/0862/7834/0912/files` | 去 query                         |
| KicksCrew 全球 | kickscrew-shopify | `cdn.shopify.com/s/files/1/0603/3031/1875/files` | Shopify 尺寸后缀清理，再去 query |
| T4S Czechia    | t4s-cdn           | `t4s.cz`                                         | 去尾部尺寸号，必要时补 `.jpg`    |

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

文档里建议写"规则效果"，不要堆完整实现。摘要措辞也尽量保持统一：优先使用“去 query”“去尺寸后缀”“清理图片处理参数/变换路径”等结果导向表达，避免在同类规则中混用“删除 query”“清路径”“改参数”等粒度不一致的描述。例如：

- 去 query
- 去尺寸后缀，再去 query
- Scene7 强制高分辨率 PNG
- Shopify 尺寸后缀清理
- 缓存图转原图路径

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

### 规则组命名规范（品牌 / 区域 / 服务）

规则组命名默认采用“品牌-区域-服务”结构，但实际执行遵循“最小但充分信息量”原则：

1. 若 `品牌-区域` 已足够唯一，可保留两段式命名，如 `adidas-intl`、`newbalance-cn`、`skechers-sg`
2. 若同一品牌或同类链路下存在多个服务商 / CDN / 图片协议，应显式补第三段，如 `footlocker-scene7`、`snipes-demandware`、`shein-ltwebstatic`
3. 文档中的“规则组”列必须严格映射源码真实 key，不可只改文档展示名而不改源码
4. 速览章节优先承担“品牌 / 区域 / 平台”的轻量导航职责，避免混入过多 host、服务商或实现细节
5. 主表与 `PARTIAL_MATCH_RULES` 补充表优先承担工程映射职责；若速览与明细表出现表达层级差异，以后者为准
6. 若仅调整展示层品牌写法（如官方大小写、标题式可读名），不得影响规则 key、host 映射与脚本行为
7. 涉及真实规则 key 重命名时，必须同步检查 `EXACT_HOST_MAP`、`HOST_RULE_MAP`、相关脚本引用、回归结果，并按 SemVer 重新评估版本号
8. 已明确保留的历史决策（如 `adidas-intl`）不再为追求形式统一而继续改名

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
