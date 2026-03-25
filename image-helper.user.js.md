# image-helper.user.js

## 概述

`image-helper.user.js` 是一个浏览器用户脚本，用于扫描当前页面中的图片资源，尽可能将图片链接清洗为更高清的原图地址，并提供统一的浏览、复制与保存能力。

当前脚本头信息：

- 名称：Image Helper / 图片助手
- 版本：`1.10.11`
- 运行时机：`document-idle`
- 匹配范围：`*://*/*`

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

## 规则系统设计

脚本采用“host 路由 + 规则链”的结构。

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

## 当前支持的网站与规则

以下清单基于当前 `image-helper.user.js` 中的 `EXACT_HOST_MAP` 与 `HOST_RULE_MAP` 整理。

> 说明：
>
> - “规则摘要”展示的是规则链意图，不逐字复制完整源码实现。
> - 同一规则组可能对应多个 host。
> - 此表不含 `PARTIAL_MATCH_RULES` 中的 URL 片段命中项，详见后文补充。

| 规则组               | 支持 host                                                       | 规则摘要                                                           |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| adidas-assets        | `assets.adidas.com`                                             | 清理 Adidas 变换路径，JPG 转 PNG                                   |
| alicdn               | `gw.alicdn.com`, `img.alicdn.com`                               | 移除文件名尾部阿里系后缀                                           |
| amazon-media         | `m.media-amazon.com`                                            | 清理 Amazon 媒体图尺寸/格式片段                                    |
| asics-hk             | `img.cdn.91app.hk`                                              | 删除版本 query                                                     |
| asics-intl           | `images.asics.com`                                              | 强制高分辨率参数                                                   |
| asics-tw             | `img.91app.com`                                                 | 删除版本 query                                                     |
| brooks-intl          | `www.brooksrunning.com`                                         | 去 query，转 PNG                                                   |
| converse-cn          | `res-converse.baozun.com`, `dam-converse.baozun.com`            | 去 query                                                           |
| complex-cloudinary   | `images.complex.com`                                            | 去掉 `/complex/image/upload/` 后连续 transform path，保留真实资源  |
| decathlon-cn         | `pixl.decathlon.com.cn`                                         | 去 query，转 PNG                                                   |
| decathlon-hk         | `contents.mediadecathlon.com`                                   | 去 query，转 PNG                                                   |
| decathlon-intl       | `www.decathlon.com`                                             | 去 query                                                           |
| ebay-img-force-png   | `i.ebayimg.com`                                                 | 强制改为 `s-l2000.png`                                             |
| end-clothing         | `media.endclothing.com`                                         | 清理 END. Clothing 媒体路径                                        |
| farfetch-contents    | `cdn-images.farfetch-contents.com`                              | 去文件名末尾尺寸后缀，再去 query                                   |
| fila-hk              | `shoplineimg.com`                                               | 转换到 CloudFront 原图地址                                         |
| fila-hk-cloudfront   | `d31xv78q8gnfco.cloudfront.net`                                 | 提取 CloudFront 原图                                               |
| fila-sg              | `img.myshopline.com`                                            | 按条件清理尺寸/质量 query                                          |
| finishline-media     | `media.finishline.com`                                          | 保守去 query                                                       |
| flightclub           | `cdn.flightclub.com`                                            | 去 query                                                           |
| footlocker-scene7    | `assets.footlocker.com`                                         | Scene7 强制 zoom2000 png                                           |
| goat                 | `image.goat.com`                                                | 清理 transform 路径或去 query                                      |
| hoka-cn              | `b2c.hoka.wishetin.com`                                         | 删除 HOKA 中国站 query                                             |
| hoka-intl            | `dms.deckers.com`                                               | 去 query                                                           |
| lining-cn            | `lining-goods-online-1302115263.file.myqcloud.com`              | 去 query                                                           |
| magento-shiekh       | `static.shiekh.com`                                             | Magento 缓存图转原图路径                                           |
| mizuno-usa           | `i1.adis.ws`                                                    | 去 query                                                           |
| mlb-korea            | `static-resource.mlb-korea.com`                                 | 调整 CDN-CGI 图片参数                                              |
| mlb-korea-shop       | `en.mlb-korea.com`                                              | 清理 shop 文件的版本/宽度参数                                      |
| newbalance-cn        | `itg-tezign-files.tezign.com`                                   | 清理 `image_process` 参数                                          |
| newbalance-intl      | `nb.scene7.com`                                                 | 去 query                                                           |
| nike-ae-like         | `www.nike.ae`, `www.nike.com.kw`, `www.nike.qa`, `www.nike.sa`  | Nike 中东站系路径/格式处理                                         |
| nike-cn              | `static.nike.com.cn`                                            | 中国站域名转全球、清路径、转 PNG                                   |
| nike-global          | `static.nike.com`, `c.static-nike.com`                          | 清路径、转 PNG                                                     |
| novelship-img        | `images.novelship.com`                                          | 去 query                                                           |
| old-order-shopify    | `old-order.com`                                                 | Shopify 尺寸后缀清理，再去 query                                   |
| on-cn                | `oss.on-running.cn`                                             | 去 OSS 图片处理参数                                                |
| on-intl              | `images.ctfassets.net`                                          | 去 query                                                           |
| opencart-generic     | `gnk-store.ru`                                                  | OpenCart 缓存图转原图                                              |
| poizon-cdn           | `cdn.poizon.com`                                                | 强制 PNG 参数                                                      |
| puma-cn              | `itg-tezign-files-tx.tezign.com`                                | 清理中国站图片处理参数                                             |
| puma-intl            | `images.puma.com`                                               | 复用通用 Cloudinary upload 清洗 helper，清理 upload 变换路径       |
| runnmore-like        | `www.runnmore.com`, `www.extrasports.com`, `www.sportvision.mk` | thumbs 路径回原图                                                  |
| salomon-intl         | `cdn.dam.salomon.com`                                           | 去 query                                                           |
| sanity-cdn           | `cdn.sanity.io`                                                 | 保留 Sanity 原始资源主路径                                         |
| saucony-intl         | `s7d4.scene7.com`                                               | 先去 Scene7 `$...$` 段，再去 query                                 |
| shein-ltwebstatic    | `img.ltwebstatic.com`, `img.shein.com`                          | 移除 `_thumbnail_220x293` / `_thumbnail_x460` 一类后缀，再去 query |
| shihuo-cdn           | `static.shihuocdn.cn`, `eimage.shihuocdn.cn`                    | 去尺寸后缀，再去 query                                             |
| skechers-hk          | `www.skechers.com.hk`                                           | 删除版本 query                                                     |
| skechers-sg          | `www.skechers.com.sg`                                           | 去尺寸后缀，再删版本 query                                         |
| skechers-usa         | `images.skechers.com`                                           | 清理 `/image;...` 风格路径                                         |
| sneakernews-wp       | `sneakernews.com`                                               | 去 query                                                           |
| snipes-demandware    | `www.snipesusa.com`                                             | 去 query                                                           |
| stadiumgoods-shopify | `www.stadiumgoods.com`                                          | Shopify 尺寸后缀清理，再去 query                                   |
| stockx               | `images.stockx.com`                                             | 强制高分辨率 query                                                 |
| thenorthface-cn      | `img2.thenorthface.com.cn`                                      | 删除中国站 query                                                   |
| thenorthface-intl    | `assets.thenorthface.com`                                       | 清理 `t_img/.../v...` 变换路径                                     |
| underarmour-scene7   | `underarmour.scene7.com`                                        | 统一重写为高质量 PNG 参数                                          |
| vans-intl            | `assets.vans.com`                                               | 清理国际站图片参数路径                                             |

## 按品类分组查看支持站点

以下分组便于从业务视角快速判断脚本覆盖范围；一个站点只按当前最主要用途归类一次。

### 1. Sneaker / 球鞋交易与垂直零售

| 品牌/站点                 | 区域/站型        | Host / 片段                                      | 规则组                 |
| ------------------------- | ---------------- | ------------------------------------------------ | ---------------------- |
| GOAT                      | GOAT 站          | `image.goat.com`                                 | `goat`                 |
| Flight Club               | Flight Club 站   | `cdn.flightclub.com`                             | `flightclub`           |
| StockX                    | StockX 站        | `images.stockx.com`                              | `stockx`               |
| Foot Locker               | Foot Locker 站   | `assets.footlocker.com`                          | `footlocker-scene7`    |
| Finish Line               | Finish Line 站   | `media.finishline.com`                           | `finishline-media`     |
| Sneaker News              | Sneaker News 站  | `sneakernews.com`                                | `sneakernews-wp`       |
| Novelship                 | Novelship 站     | `images.novelship.com`                           | `novelship-img`        |
| Stadium Goods             | Stadium Goods 站 | `www.stadiumgoods.com`                           | `stadiumgoods-shopify` |
| SNIPES                    | SNIPES 站        | `www.snipesusa.com`                              | `snipes-demandware`    |
| KicksCrew（URL 片段命中） | KicksCrew 站     | `cdn.shopify.com/s/files/1/0603/3031/1875/files` | `kickscrew-shopify`    |

### 2. 运动品牌官方 / 区域站

| 品牌/站点      | 区域/站型                       | Host / 片段                                                              |
| -------------- | ------------------------------- | ------------------------------------------------------------------------ |
| Nike           | 中国站                          | `static.nike.com.cn`                                                     |
| Nike           | 国际站                          | `static.nike.com`、`c.static-nike.com`                                   |
| Nike           | 阿联酋 / 科威特 / 卡塔尔 / 沙特 | `www.nike.ae`、`www.nike.com.kw`、`www.nike.qa`、`www.nike.sa`           |
| Adidas         | 国际站                          | `assets.adidas.com`                                                      |
| ASICS          | 国际站                          | `images.asics.com`                                                       |
| ASICS          | 中国香港 / 中国台湾             | `img.cdn.91app.hk`、`img.91app.com`                                      |
| Brooks         | 国际站                          | `www.brooksrunning.com`                                                  |
| Converse       | 中国站                          | `res-converse.baozun.com`、`dam-converse.baozun.com`                     |
| HOKA           | 国际站                          | `dms.deckers.com`                                                        |
| HOKA           | 中国站                          | `b2c.hoka.wishetin.com`                                                  |
| Li-Ning        | 中国站                          | `lining-goods-online-1302115263.file.myqcloud.com`                       |
| Mizuno         | 国际站                          | `i1.adis.ws`                                                             |
| New Balance    | 国际站                          | `nb.scene7.com`                                                          |
| New Balance    | 中国站                          | `itg-tezign-files.tezign.com`                                            |
| On             | 国际站                          | `images.ctfassets.net`                                                   |
| On             | 中国站                          | `oss.on-running.cn`                                                      |
| Puma           | 国际站                          | `images.puma.com`                                                        |
| Puma           | 中国站                          | `itg-tezign-files-tx.tezign.com`                                         |
| Salomon        | 国际站                          | `cdn.dam.salomon.com`                                                    |
| Saucony        | 国际站                          | `s7d4.scene7.com`                                                        |
| Skechers       | 国际站                          | `images.skechers.com`                                                    |
| Skechers       | 中国香港 / 新加坡               | `www.skechers.com.hk`、`www.skechers.com.sg`                             |
| The North Face | 国际站                          | `assets.thenorthface.com`                                                |
| The North Face | 中国站                          | `img2.thenorthface.com.cn`                                               |
| Under Armour   | 国际站                          | `underarmour.scene7.com`                                                 |
| Vans           | 国际站                          | `assets.vans.com`                                                        |
| FILA           | 中国香港 / 东南亚站             | `img.myshopline.com`、`shoplineimg.com`、`d31xv78q8gnfco.cloudfront.net` |
| MLB Korea      | 韩国站                          | `static-resource.mlb-korea.com`                                          |
| MLB Korea      | 韩国站                          | `en.mlb-korea.com`                                                       |

### 3. 综合运动零售 / 户外 / 通用电商

| 品牌/站点                              | 区域/站型             | Host / 片段                                                     |
| -------------------------------------- | --------------------- | --------------------------------------------------------------- |
| Decathlon                              | 国际站                | `www.decathlon.com`                                             |
| Decathlon                              | 中国站                | `pixl.decathlon.com.cn`                                         |
| Decathlon                              | 国际站                | `contents.mediadecathlon.com`                                   |
| Amazon                                 | Amazon 站             | `m.media-amazon.com`                                            |
| eBay                                   | eBay 站               | `i.ebayimg.com`                                                 |
| END. Clothing                          | END. Clothing 站      | `media.endclothing.com`                                         |
| Old Order                              | Old Order 站          | `old-order.com`                                                 |
| Runnmore / Extra Sports / Sport Vision | 塞尔维亚 / 北马其顿站 | `www.runnmore.com`、`www.extrasports.com`、`www.sportvision.mk` |
| OpenCart 示例站                        | 俄罗斯站              | `gnk-store.ru`                                                  |
| Shiekh                                 | Shiekh 站             | `static.shiekh.com`                                             |
| Farfetch Contents CDN                  | Farfetch 站           | `cdn-images.farfetch-contents.com`                              |
| Complex Images                         | Complex 站            | `images.complex.com`                                            |
| T4S（URL 片段命中）                    | T4S 站                | `t4s.cz`                                                        |
| Reebok（URL 片段命中）                 | Reebok 站             | `cdn.shopify.com/s/files/1/0862/7834/0912/files`                |

### 4. 时尚 / 平台 / 通用图片 CDN

| 品牌/站点           | 区域/站型              | Host / 片段           |
| ------------------- | ---------------------- | --------------------- |
| Shein / LTWebStatic | Shein / LTWebStatic 站 | `img.ltwebstatic.com` |
| Shein / LTWebStatic | Shein / LTWebStatic 站 | `img.shein.com`       |
| Poizon              | Poizon 站              | `cdn.poizon.com`      |
| 识货                | 识货站                 | `static.shihuocdn.cn` |
| 识货                | 识货站                 | `eimage.shihuocdn.cn` |
| AliCDN              | AliCDN 站              | `gw.alicdn.com`       |
| AliCDN              | AliCDN 站              | `img.alicdn.com`      |
| Sanity CDN          | Sanity 站              | `cdn.sanity.io`       |

## 基于 URL 片段的补充支持（PARTIAL_MATCH_RULES）

以下规则不依赖精确 host，而依赖 URL 片段识别：

| 匹配片段                                         | 规则组            | 规则摘要                         |
| ------------------------------------------------ | ----------------- | -------------------------------- |
| `cdn.shopify.com/s/files/1/1330/6287/files`      | decathlon-intl    | 去 query                         |
| `cdn.shopify.com/s/files/1/0862/7834/0912/files` | reebok-intl       | 去 query                         |
| `cdn.shopify.com/s/files/1/0603/3031/1875/files` | kickscrew-shopify | Shopify 尺寸后缀清理，再去 query |
| `t4s.cz`                                         | t4s-cdn           | 去尾部尺寸号，必要时补 `.jpg`    |

## 图片清洗流程

脚本的 URL 清洗主流程为：

1. 尝试将输入解析为合法 URL
2. 通过 `detectHostTypeByUrlObj()` 识别命中的规则组
   - 优先查 `EXACT_HOST_MAP`
   - 未命中时再检查特殊 host 与 `PARTIAL_MATCH_RULES`
3. 根据 `HOST_RULE_MAP[hostType]` 获取规则链
4. 依次执行每条规则，产出清洗后的 URL
5. 返回 `{ raw, clean, hostType }`

## 新增站点操作模板

下面这个模板适合后续新增站点时直接照着填写与检查：

### 1. 收集样本

- 页面 URL：
- 原始图片 URL（至少 2~3 条，最好覆盖列表图/详情图/缩略图）：
- 目标高清 URL 预期：
- 是否存在多个图片 host：

### 2. 判断接入方式

- 是否可直接复用 `REUSABLE_RULES`：
- 是否需要新增 `BRAND_RULES`：
- 使用精确 host 匹配还是 URL 片段匹配：
  - `EXACT_HOST_MAP`
  - `PARTIAL_MATCH_RULES`

### 3. 实施清单

1. 在 `REUSABLE_RULES` 或 `BRAND_RULES` 中添加/复用规则
2. 在 `EXACT_HOST_MAP` 或 `PARTIAL_MATCH_RULES` 中增加入口
3. 在 `HOST_RULE_MAP` 中配置规则链顺序
4. 用样本 URL 静态验证清洗结果
5. 若属于脚本行为变更，按 SemVer 更新 `image-helper.user.js` 版本号
6. 执行：
   ```powershell
   node --check image-helper.user.js
   node image-helper.regression.js
   ```
7. 同步更新本文档中的：
   - “当前支持的网站与规则”
   - “按品类分组查看支持站点”
   - “基于 URL 片段的补充支持”
   - “当前已知注意事项”（如有边界条件）

### 4. 规则摘要写法建议

文档里建议写“规则效果”，不要堆完整实现。例如：

- 去 query
- 去尺寸后缀后再去 query
- Scene7 强制高分辨率 PNG
- Shopify 图片尺寸后缀清理
- 缓存图路径回原图路径

## 维护建议

### 新增站点时建议遵循

1. 先确认图片 host 是否稳定
2. 优先复用 `REUSABLE_RULES`
3. 若品牌有特殊路径/参数语义，再新增 `BRAND_RULES`
4. 在 `EXACT_HOST_MAP` 或 `PARTIAL_MATCH_RULES` 中登记入口
5. 在 `HOST_RULE_MAP` 中配置规则链顺序
6. 变更后执行基础校验：
   ```powershell
   node --check image-helper.user.js
   node image-helper.regression.js
   ```

### 当前已知注意事项

- Shein / LTWebStatic 规则当前明确兼容：
  - `_thumbnail_220x293`
  - `_thumbnail_x460`
- Finish Line 当前仅基于样例做了保守 query 清理，后续如发现更明确的尺寸升级策略，可再扩展。
- Complex Images 当前通过通用 Cloudinary upload helper 处理：会剥离 `/complex/image/upload/` 后连续的 transform segment，并仅在真实资源路径以 `sanity-new/` 开头时生效；若后续出现非下划线命名的 transform token，需先核对样本再扩展识别模式。
- Puma International 当前也复用同一 helper，但额外限制真实资源路径必须以 `global/` 开头，避免把非目标 upload 路径误清洗。
- 2026-03-26 进一步复查后，当前未再发现第三个可以安全并入该 Cloudinary upload helper 的明确候选；像 GOAT、Nike、MLB Korea、Scene7 系规则虽然也涉及 transform / 图像处理，但路径语义与资源边界不同，强行抽象更容易误伤。
- 复制功能仍包含 `document.execCommand('copy')` 兼容性回退，因此 IDE 可能提示 deprecated hint，属预期。

## 文档维护原则

本文件定位为：

- 功能概览
- 规则架构说明
- 支持站点索引
- 新增站点时的维护模板

不追求逐条复制完整源码细节。若后续规则新增或 host 映射变化，建议同步更新：

- “当前支持的网站与规则”
- “按品类分组查看支持站点”
- “基于 URL 片段的补充支持”
- “当前已知注意事项”
