// ==UserScript==
// @name         多品牌图片链接统一清理器
// @namespace    http://tampermonkey.net/
// @version      2.7.2
// @description  自动跳转到高清原图：移除 CDN 参数、清理缩略图路径、统一格式。Nike 默认 JPG，可临时切换 PNG。
// @author       tlgj
// @license      MIT
// @updateURL    https://github.com/tlgj/Browser-Scripts/raw/refs/heads/main/Universal-Sneaker-Image-Optimizer.user.js
// @downloadURL  https://github.com/tlgj/Browser-Scripts/raw/refs/heads/main/Universal-Sneaker-Image-Optimizer.user.js
// @run-at       document-start
// @connect      d31xv78q8gnfco.cloudfront.net
// @connect      cloudfront.net
// @connect      flightclub.com
// @connect      goat.com
// ───────────────────────────────────────────────────────────
// 品牌官网 - 运动鞋类 (Brand Official Sites - Sneakers)
// ───────────────────────────────────────────────────────────
// GOAT (全球二级市场平台)
// @match        https://image.goat.com/*
// FlightClub (美国 - 球鞋寄售平台)
// @match        https://cdn.flightclub.com/*
// StockX (全球 - 球鞋交易平台)
// @match        https://images.stockx.com/*
// ───────────────────────────────────────────────────────────
// Adidas (阿迪达斯 - 全球)
// @match        https://assets.adidas.com/*
// ───────────────────────────────────────────────────────────
// ASICS (亚瑟士)
// 国际站
// @match        https://images.asics.com/*
// 香港站
// @match        https://img.cdn.91app.hk/*
// 台湾站
// @match        https://img.91app.com/*
// ───────────────────────────────────────────────────────────
// Brooks (布鲁克斯 - 美国)
// @match        https://www.brooksrunning.com/*
// ───────────────────────────────────────────────────────────
// Converse (匡威 - 中国)
// @match        https://dam-converse.baozun.com/*
// @match        https://res-converse.baozun.com/*
// ───────────────────────────────────────────────────────────
// Decathlon (迪卡侬)
// 国际站 (Shopify)
// @match        https://cdn.shopify.com/s/files/1/1330/6287/files/*
// @match        https://www.decathlon.com/cdn/shop/files/*
// 中国站
// @match        https://pixl.decathlon.com.cn/*
// 香港站
// @match        https://contents.mediadecathlon.com/*
// ───────────────────────────────────────────────────────────
// Fila (斐乐)
// 新加坡站
// @match        https://img.myshopline.com/*
// 香港站 (Shopline)
// @match        https://shoplineimg.com/*
// 香港站 (CloudFront CDN)
// @match        https://d31xv78q8gnfco.cloudfront.net/*
// ───────────────────────────────────────────────────────────
// HOKA (霍卡)
// 国际站 (Deckers 图片服务)
// @match        https://dms.deckers.com/hoka/*
// 中国站
// @match        https://b2c.hoka.wishetin.com/*
// ───────────────────────────────────────────────────────────
// Li-Ning (李宁 - 中国)
// @match        https://lining-goods-online-1302115263.file.myqcloud.com/*
// ───────────────────────────────────────────────────────────
// Mizuno (美津浓 - 美国)
// @match        https://i1.adis.ws/i/mizunousa/*
// ───────────────────────────────────────────────────────────
// MLB (韩国官方店)
// CDN 资源
// @match        https://static-resource.mlb-korea.com/*
// 在线商城
// @match        https://en.mlb-korea.com/*
// ───────────────────────────────────────────────────────────
// New Balance (新百伦)
// 国际站 (Scene7 CDN)
// @match        https://nb.scene7.com/*
// 中国站 (特赞图库)
// @match        https://itg-tezign-files.tezign.com/*
// ───────────────────────────────────────────────────────────
// Nike (耐克)
// 中国站
// @match        https://static.nike.com.cn/*
// 全球站
// @match        https://c.static-nike.com/*
// @match        https://static.nike.com/*
// 中东站点 (阿联酋)
// @match        https://www.nike.ae/*
// 中东站点 (科威特)
// @match        https://www.nike.com.kw/*
// 中东站点 (卡塔尔)
// @match        https://www.nike.qa/*
// 中东站点 (沙特阿拉伯)
// @match        https://www.nike.sa/*
// ───────────────────────────────────────────────────────────
// OLD ORDER (香港潮流品牌 - Shopify)
// @match        https://old-order.com/cdn/shop/files/*
// ───────────────────────────────────────────────────────────
// On (昂跑)
// 国际站 (Contentful CDN)
// @match        https://images.ctfassets.net/*
// 中国站 (阿里云 OSS)
// @match        https://oss.on-running.cn/*
// ───────────────────────────────────────────────────────────
// Puma (彪马)
// 国际站
// @match        https://images.puma.com/*
// 中国站 (特赞图库 - 腾讯云)
// @match        https://itg-tezign-files-tx.tezign.com/*
// ───────────────────────────────────────────────────────────
// Reebok (锐步 - 国际站 Shopify)
// @match        https://cdn.shopify.com/s/files/1/0862/7834/0912/files/*
// ───────────────────────────────────────────────────────────
// Salomon (萨洛蒙 - 全球)
// @match        https://cdn.dam.salomon.com/*
// ───────────────────────────────────────────────────────────
// Saucony (索康尼 - 美国)
// @match        https://s7d4.scene7.com/is/image/WolverineWorldWide/*
// ───────────────────────────────────────────────────────────
// Skechers (斯凯奇)
// 美国站
// @match        https://images.skechers.com/*
// 香港站
// @match        https://www.skechers.com.hk/*
// 新加坡站
// @match        https://www.skechers.com.sg/*
// ───────────────────────────────────────────────────────────
// The North Face (北面)
// 国际站 (Cloudinary CDN)
// @match        https://assets.thenorthface.com/*
// 中国站
// @match        https://img2.thenorthface.com.cn/*
// ───────────────────────────────────────────────────────────
// Under Armour (安德玛 - 全球 Scene7)
// @match        https://underarmour.scene7.com/is/image/Underarmour/*
// ───────────────────────────────────────────────────────────
// Vans (范斯 - 国际站)
// @match        https://assets.vans.com/*
// ───────────────────────────────────────────────────────────
// 潮流电商与媒体 (Streetwear E-commerce & Media)
// ───────────────────────────────────────────────────────────
// Sneaker News (美国球鞋资讯媒体)
// @match        https://sneakernews.com/*
// HouseOfHeat (澳大利亚球鞋媒体 - Sanity CDN)
// @match        https://cdn.sanity.io/*
// Poizon (得物 - 中国球鞋交易平台)
// @match        https://cdn.poizon.com/*
// Shihuo (识货 - 中国球鞋导购平台)
// @match        https://static.shihuocdn.cn/*
// @match        http://static.shihuocdn.cn/*
// @match        https://eimage.shihuocdn.cn/*
// KicksCrew (香港球鞋电商 - Shopify)
// @match        https://cdn.shopify.com/s/files/1/0603/3031/1875/files/*
// Novelship (新加坡球鞋交易平台)
// @match        https://images.novelship.com/*
// Snipes (美国球鞋零售商 - Demandware)
// @match        https://www.snipesusa.com/dw/image/v2/*/*
// Shiekh Shoes (美国球鞋零售商 - Magento)
// @match        https://static.shiekh.com/media/catalog/product/cache/image/*/*
// ───────────────────────────────────────────────────────────
// 运动零售商 / 官网电商 (Sports Retailers)
// ───────────────────────────────────────────────────────────
// Foot Locker（美国/国际零售商 - Scene7 / Adobe Dynamic Media）
// @match        https://assets.footlocker.com/is/image/*
// Stadium Goods（美国 - 官网 Shopify）
// @match        https://www.stadiumgoods.com/cdn/shop/files/*
// ───────────────────────────────────────────────────────────
// 综合电商平台 (General E-commerce Platforms)
// ───────────────────────────────────────────────────────────
// Amazon (亚马逊 - 全球媒体 CDN)
// @match        https://m.media-amazon.com/images/I/*
// eBay (易贝 - 全球图片服务)
// @match        https://i.ebayimg.com/images/g/*/*
// END. Clothing (英国潮流电商)
// @match        https://media.endclothing.com/*
// ───────────────────────────────────────────────────────────
// 欧洲地区电商 (European Regional E-commerce)
// ───────────────────────────────────────────────────────────
// Extrasports (塞尔维亚运动用品商)
// @match        https://www.extrasports.com/files/thumbs/files/images/slike_proizvoda/media/*/*
// GNK Store (俄罗斯球鞋店 - OpenCart)
// @match        https://gnk-store.ru/image/cache/catalog/*/*
// Runnmore (塞尔维亚跑步装备商)
// @match        https://www.runnmore.com/files/thumbs/files/images/slike-proizvoda/media/*/*
// Sportvision (北马其顿运动用品商)
// @match        https://www.sportvision.mk/files/thumbs/files/images/slike_proizvoda/media/*/*
// T4S (捷克球鞋店)
// @match        https://i*.t4s.cz/products/*/*
// ───────────────────────────────────────────────────────────
// 通用 CDN (General CDNs)
// ───────────────────────────────────────────────────────────
// AliCDN (阿里云 CDN - 中国)
// @match        https://gw.alicdn.com/*
// @match        https://img.alicdn.com/*
// ==/UserScript==

/**
 * ┌───────────────────────────────────────────────────────────┐
 * │  多品牌图片链接统一清理器                                 │
 * ├───────────────────────────────────────────────────────────┤
 * │  功能说明                                                 │
 * │  • 自动识别多个品牌/电商的图片 URL                        │
 * │  • 移除 CDN 压缩参数（如 ?w=300 / ?width=1024）           │
 * │  • 清理缩略图路径标记（如 /thumbs_800/）                  │
 * │  • 统一跳转到原始/高清资源                                │
 * │  • Nike 中东站点支持 JPG/PNG 临时切换                     │
 * ├───────────────────────────────────────────────────────────┤
 * │  使用方法                                                 │
 * │  1. 安装后自动工作，无需配置                              │
 * │  2. Nike 中东站点会在右下角显示格式切换按钮               │
 * │  3. 如需调试，可在控制台查看 URL 跳转信息                 │
 * ├───────────────────────────────────────────────────────────┤
 * │  注意事项                                                 │
 * │  • 可能增加图片下载流量（原图通常 > 缩略图）              │
 * │  • 在 document-start 阶段执行，阻断原始请求               │
 * │  • 使用 window.location.replace 进行无痕跳转              │
 * └───────────────────────────────────────────────────────────┘
 */

(function () {
    'use strict';

    try {
        const HOSTNAME = window.location.hostname;
        const CURRENT_HREF = window.location.href;

        // ═══════════════════════════════════════════════════════════════
        // 1. 主机映射表 (使用 Map 提升查找性能)
        // ═══════════════════════════════════════════════════════════════
        const EXACT_HOST_MAP = new Map([
            // GOAT & FlightClub & StockX
            ['image.goat.com', 'goat'],
            ['cdn.flightclub.com', 'flightclub'],
            ['images.stockx.com', 'stockx'],

            // Nike
            ['static.nike.com.cn', 'nike-cn'],
            ['static.nike.com', 'nike-global'],
            ['c.static-nike.com', 'nike-global'],
            ['www.nike.ae', 'nike-ae-like'],
            ['www.nike.com.kw', 'nike-ae-like'],
            ['www.nike.qa', 'nike-ae-like'],
            ['www.nike.sa', 'nike-ae-like'],

            // Adidas
            ['assets.adidas.com', 'adidas-assets'],

            // ASICS
            ['images.asics.com', 'asics-intl'],
            ['img.cdn.91app.hk', 'asics-hk'],
            ['img.91app.com', 'asics-tw'],

            // Brooks
            ['www.brooksrunning.com', 'brooks-intl'],

            // Converse
            ['res-converse.baozun.com', 'converse-cn'],
            ['dam-converse.baozun.com', 'converse-cn'],

            // Decathlon
            ['www.decathlon.com', 'decathlon-intl'],
            ['pixl.decathlon.com.cn', 'decathlon-cn'],
            ['contents.mediadecathlon.com', 'decathlon-hk'],

            // Fila
            ['img.myshopline.com', 'fila-sg'],
            ['shoplineimg.com', 'fila-hk'],
            ['d31xv78q8gnfco.cloudfront.net', 'fila-hk-cloudfront'],

            // HOKA
            ['dms.deckers.com', 'hoka-intl'],
            ['b2c.hoka.wishetin.com', 'hoka-cn'],

            // Li-Ning
            ['lining-goods-online-1302115263.file.myqcloud.com', 'lining-cn'],

            // Mizuno
            ['i1.adis.ws', 'mizuno-usa'],

            // MLB
            ['static-resource.mlb-korea.com', 'mlb-korea'],
            ['en.mlb-korea.com', 'mlb-korea-shop'],

            // New Balance
            ['nb.scene7.com', 'newbalance-intl'],
            ['itg-tezign-files.tezign.com', 'newbalance-cn'],

            // OLD ORDER
            ['old-order.com', 'old-order-shopify'],

            // On
            ['images.ctfassets.net', 'on-intl'],
            ['oss.on-running.cn', 'on-cn'],

            // Puma
            ['images.puma.com', 'puma-intl'],
            ['itg-tezign-files-tx.tezign.com', 'puma-cn'],

            // Salomon
            ['cdn.dam.salomon.com', 'salomon-intl'],

            // Saucony
            ['s7d4.scene7.com', 'saucony-intl'],

            // Skechers
            ['images.skechers.com', 'skechers-usa'],
            ['www.skechers.com.hk', 'skechers-hk'],
            ['www.skechers.com.sg', 'skechers-sg'],

            // The North Face
            ['assets.thenorthface.com', 'thenorthface-intl'],
            ['img2.thenorthface.com.cn', 'thenorthface-cn'],

            // Under Armour
            ['underarmour.scene7.com', 'underarmour-scene7'],

            // Vans
            ['assets.vans.com', 'vans-intl'],

            // Sneaker News & HouseOfHeat
            ['sneakernews.com', 'sneakernews-wp'],
            ['cdn.sanity.io', 'sanity-cdn'],

            // Poizon & Shihuo
            ['cdn.poizon.com', 'poizon-cdn'],
            ['static.shihuocdn.cn', 'shihuo-cdn'],
            ['eimage.shihuocdn.cn', 'shihuo-cdn'],

            // Novelship
            ['images.novelship.com', 'novelship-img'],

            // Snipes
            ['www.snipesusa.com', 'snipes-demandware'],

            // Shiekh
            ['static.shiekh.com', 'magento-shiekh'],

            // Amazon
            ['m.media-amazon.com', 'amazon-media'],

            // eBay
            ['i.ebayimg.com', 'ebay-img-force-png'],

            // END.
            ['media.endclothing.com', 'end-clothing'],

            // Runnmore-like
            ['www.runnmore.com', 'runnmore-like'],
            ['www.extrasports.com', 'runnmore-like'],
            ['www.sportvision.mk', 'runnmore-like'],

            // GNK Store
            ['gnk-store.ru', 'opencart-generic'],

            // AliCDN
            ['gw.alicdn.com', 'alicdn'],
            ['img.alicdn.com', 'alicdn'],

            // Foot Locker (Scene7)
            ['assets.footlocker.com', 'footlocker-scene7'],

            // Stadium Goods (Shopify)
            ['www.stadiumgoods.com', 'stadiumgoods-shopify'],
        ]);

        // 部分匹配规则（用于 URL 路径特征识别）
        const PARTIAL_MATCH_RULES = [
            { str: 'cdn.shopify.com/s/files/1/1330/6287/files', type: 'decathlon-intl' },
            { str: 'cdn.shopify.com/s/files/1/0862/7834/0912/files', type: 'reebok-intl' },
            { str: 'cdn.shopify.com/s/files/1/0603/3031/1875/files', type: 'kickscrew-shopify' },
            { str: 't4s.cz', type: 't4s-cdn' }
        ];

        // ═══════════════════════════════════════════════════════════════
        // 2. 确定当前页面类型
        // ═══════════════════════════════════════════════════════════════
        let hostType = EXACT_HOST_MAP.get(HOSTNAME);

        if (!hostType) {
            // 特殊处理：部分 Shopify 站点的通用路径（兜底）
            if (window.location.pathname.startsWith('/cdn/shop/files/')) {
                hostType = 'old-order-shopify';
            } else {
                for (const rule of PARTIAL_MATCH_RULES) {
                    if (CURRENT_HREF.includes(rule.str)) {
                        hostType = rule.type;
                        break;
                    }
                }
            }
        }

        if (!hostType) return;

        // ═══════════════════════════════════════════════════════════════
        // 3. 工具函数
        // ═══════════════════════════════════════════════════════════════

        /**
         * 安全解析 URL
         * @param {string} urlStr - 待解析的 URL 字符串
         * @returns {URL|null} URL 对象，失败返回 null
         */
        const safeUrlParse = (urlStr) => {
            try {
                return new URL(urlStr);
            } catch (e) {
                return null;
            }
        };

        /**
         * 创建正则替换规则
         * @param {RegExp} regex - 匹配模式
         * @param {string} replacement - 替换字符串
         * @returns {{apply: function(string): string}}
         */
        const createRegexRule = (regex, replacement) => ({
            apply: (url) => url.replace(regex, replacement)
        });

        /**
         * 创建查询参数替换规则
         * @param {string} newQuery - 新的查询字符串（含 ?）
         * @returns {{apply: function(string): string}}
         * @example
         * createQueryReplaceRule('?w=3000&h=3000')
         * // URL: img.com/a.jpg?old=1 → img.com/a.jpg?w=3000&h=3000
         */
        const createQueryReplaceRule = (newQuery) => ({
            apply: (url) => url.split('?')[0] + newQuery
        });

        // ═══════════════════════════════════════════════════════════════
        // 4. 规则定义
        // ═══════════════════════════════════════════════════════════════

        // 4.1 可复用规则
        const REUSABLE_RULES = {
            REMOVE_ALL_QUERY: createRegexRule(/\?.*$/, ''),
            TO_PNG: createRegexRule(/\.(?:webp|jpe?g)(?=\?|$)/i, '.png'),
            REMOVE_VERSION_QUERY: createRegexRule(/\?v=\d+$/, ''),
            REMOVE_SIZE_SUFFIX: createRegexRule(/_\d+x\d+(?=\.\w+$)/, ''),
        };

        // 4.2 品牌/站点专用规则
        const BRAND_RULES = {
            // New Balance 中国
            // 示例转换：
            //   前: itg-tezign-files.tezign.com/img.jpg?image_process=resize,w_500&x-oss-process=...
            //   后: itg-tezign-files.tezign.com/img.jpg?x-oss-process=...
            NEWBALANCE_CN_CLEAN: {
                apply: (url) => url.replace(/([?&])image_process=[^&]*(&?)/, (match, p1, p2) => {
                    if (p1 === '?') return p2 === '&' ? '?' : '';
                    return p2;
                })
            },

            // Nike 中国 → 全球 CDN
            // 示例转换：
            //   前: static.nike.com.cn/a/images/shoe.png
            //   后: static.nike.com/a/images/shoe.png
            NIKE_CN_TO_GLOBAL: createRegexRule(/\/\/static\.nike\.com\.cn\//, '//static.nike.com/'),

            // Nike 路径清理（移除转换参数）
            // 示例转换：
            //   前: static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/dri-fit.png
            //   后: static.nike.com/a/images/dri-fit.png
            NIKE_CLEAN_PATH: {
                apply: (urlStr) => {
                    if (!urlStr.includes('/a/images/')) return urlStr;
                    const baseUrl = urlStr.substring(0, urlStr.indexOf('/a/images/'));

                    const transformMatch = urlStr.match(/\/a\/images\/t_[^/]+\/(?:[^/]+\/)*([a-z0-9]+\/[^?]+\.(?:png|jpg|jpeg|webp|gif))/i);
                    if (transformMatch) return `${baseUrl}/a/images/${transformMatch[1]}`;

                    const uuidMatch = urlStr.match(/\/a\/images\/[^/]+\/(.+?\/)([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/.+?)$/i);
                    if (uuidMatch) return `${baseUrl}/a/images/${uuidMatch[2]}`;

                    const shortIdMatch = urlStr.match(/\/a\/images\/[^/]+\/([a-z0-9_-]+\/[^?]+)$/i);
                    if (shortIdMatch) return `${baseUrl}/a/images/${shortIdMatch[1]}`;

                    return urlStr;
                }
            },

            // Nike 中东站点（AE/KW/QA/SA）：默认 JPG；加 tm_fmt=png 临时切 PNG
            NIKE_AE_LIKE: {
                apply: (urlStr) => {
                    if (!urlStr.includes('/dw/image/')) return urlStr;
                    const u = safeUrlParse(urlStr);
                    if (!u) return urlStr;

                    if (u.searchParams.get('tm_fmt') === 'png') {
                        const newPath = u.pathname.replace(/\.jpe?g$/i, '.png');
                        const newUrl = new URL(u.protocol + '//' + u.host + newPath);
                        newUrl.searchParams.set('sw', '3000');
                        newUrl.searchParams.set('sh', '3000');
                        newUrl.searchParams.set('fmt', 'png-alpha');
                        newUrl.searchParams.set('tm_fmt', 'png');
                        return newUrl.toString();
                    } else {
                        const newPath = u.pathname.replace(/\.png$/i, '.jpg');
                        return u.protocol + '//' + u.host + newPath;
                    }
                }
            },

            // GOAT：移除 transform 段 / query
            GOAT_CLEAN: {
                apply: (urlStr) => {
                    if (urlStr.includes('/transform/') && urlStr.includes('/attachments/')) {
                        return urlStr.replace(/\/transform\/.*\/attachments\//, '/attachments/');
                    }
                    return urlStr.replace(/\?.*$/, '');
                }
            },

            // StockX：高清参数
            STOCKX_HIGH_RES: createQueryReplaceRule('?fm=jpg&dpr=3'),

            // Adidas：清路径并强制 PNG
            ADIDAS_ASSETS_PATH: createRegexRule(/(\/images\/)[^/]+,[^/]+\//, '$1'),
            ADIDAS_JPG_TO_PNG: createRegexRule(/\.jpg(?=\?|$)/i, '.png'),

            // ASICS 国际站：高分辨率参数
            ASICS_HIGH_RES: createQueryReplaceRule('?wid=3000&hei=3000&fmt=png-alpha&qlt=100'),

            // Fila SG：仅当存在 w/h/q 参数时移除查询字符串
            FILA_SG_QUERY: {
                apply: (url) => {
                    const u = safeUrlParse(url);
                    if (!u) return url;
                    if (u.searchParams.has('w') || u.searchParams.has('h') || u.searchParams.has('q')) {
                        return url.split('?')[0];
                    }
                    return url;
                }
            },

            // Fila HK：Shopline → CloudFront 源图
            FILA_HK_TO_CLOUDFRONT: {
                apply: (url) => url.replace(
                    /^https:\/\/shoplineimg\.com\/[a-f0-9]+\/([a-f0-9]+)\/[^?]+\.(jpg|jpeg|png|webp|gif).*/i,
                    'https://d31xv78q8gnfco.cloudfront.net/media/image_clips/$1/original.$2'
                )
            },
            FILA_HK_CLOUDFRONT: {
                apply: (url) => {
                    const m = url.match(/(https:\/\/d31xv78q8gnfco\.cloudfront\.net\/media\/image_clips\/[a-f0-9]+\/original\.(?:jpg|jpeg|png|webp|gif))/i);
                    return m ? m[0] : url;
                }
            },

            // MLB Korea：Cloudflare Image Resizing，改为最高质量
            MLB_KOREA_PARAMS: createRegexRule(/\/cdn-cgi\/image\/[^/]+(\/images\/.*)/, '/cdn-cgi/image/q=100,format=auto$1'),
            MLB_KOREA_SHOP_FILES: createRegexRule(/\?(?:v=\d+&width=\d+|width=\d+&v=\d+|v=\d+|width=\d+)/, ''),

            // Puma 国际：移除 upload 下的参数段
            PUMA_INTL_UPLOAD_PARAMS: createRegexRule(/(\/upload\/)[^/]+\/(global\/.+)/, '$1$2'),

            // Puma 中国：移除 imageMogr2 参数段
            PUMA_CN_IMAGE_PROCESSING: createRegexRule(/([?&]imageMogr2\/[^&]*)/, ''),

            // Skechers USA：移除分号参数
            SKECHERS_USA_PATH: createRegexRule(/(\/image);[^/]+/, '$1'),

            // Skechers SG：移除尺寸后缀
            SKECHERS_SG_SUFFIX: createRegexRule(/(\_\d+x\d+)(?=\.(?:jpg|jpeg|png|webp|gif))/i, ''),

            // The North Face 国际：移除 t_img 转换路径
            THENORTHFACE_INTL_CLEAN: createRegexRule(/\/t_img\/[^/]+\/v(\d+\/)/, '/v$1'),
            THENORTHFACE_CN_REMOVE_QUERY: createRegexRule(/\?\d+$/, ''),

            // Under Armour：Scene7 参数重置为高质量 PNG
            UNDERARMOUR_SCENE7: {
                apply: (urlStr) => {
                    const u = safeUrlParse(urlStr);
                    if (!u) return urlStr;
                    u.search = '';
                    u.searchParams.set('scl', '0.7');
                    u.searchParams.set('fmt', 'png-alpha');
                    u.searchParams.set('qlt', '100');
                    return u.toString();
                }
            },

            // Vans：清理 t_* 转换路径
            VANS_INTL_CLEAN_PARAMS: createRegexRule(/(\/images\/).*?(v\d+\/.*)/, '$1$2'),

            // Saucony：移除 Scene7 的 $模板$ 并清 query
            SAUCONY_SCENE7_REMOVE_DOLLAR_PARAMS: createRegexRule(/\$[^$]+\$/, ''),

            // HOKA CN：移除 ?时间戳(#hash)
            HOKA_CN_REMOVE_QUERY: createRegexRule(/\?\d+(?:#\w+)?$/, ''),

            // On CN：移除 OSS 图片处理参数
            ON_CN_REMOVE_OSS_QUERY: createRegexRule(/\?x-oss-process=image\/.*/, ''),

            // Poizon：强制 PNG
            POIZON_FORCE_PNG: createQueryReplaceRule('?x-oss-process=image/format,png'),

            // Shopify：移除尺寸后缀（_800x 等）
            SHOPIFY_REMOVE_SIZE: createRegexRule(/(\_\d+x\d*|\_pico|\_icon|\_thumb|\_small|\_compact|\_medium|\_large|\_grande|\_original|\_master)(?=\.\w+)/, ''),

            // Sanity CDN：清 query 保留资源
            SANITY_CLEAN: createRegexRule(/^(https:\/\/cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/[^/?#]+).*/, '$1'),

            // AliCDN：移除后缀裁剪段
            ALICDN_REMOVE_SUFFIX: { apply: (url) => url.replace(/(\.(jpg|jpeg|png|webp|gif))_[^/]*$/i, '$1') },

            // Amazon：移除 _AC_..._ 变体段
            AMAZON_MEDIA_CLEAN: createRegexRule(/^(https:\/\/m\.media-amazon\.com\/images\/I\/[^._]+)\._[^.]*_\.(\w+)$/, '$1.$2'),

            // eBay：强制 s-l2000.png
            EBAY_TO_PNG_2000: createRegexRule(/\/s-l\d+\.(?:jpg|jpeg|png|webp)$/i, '/s-l2000.png'),

            // END. Clothing：清理中间路径
            END_CLOTHING_CLEAN: createRegexRule(/\/media\/[^/]+\/(?:prodmedia\/)?media\/catalog\/product\//, '/media/catalog/product/'),

            // Runnmore-like：还原原图路径
            RUNNMORE_LIKE_TO_ORIGINAL: {
                apply: (url) => url
                    .replace(/\/files\/thumbs\//, '/files/')
                    .replace(/\/images\/thumbs_\d+\//, '/')
                    .replace(/(\_\d+\_\d+px)(\.\w+)$/, '$2')
            },

            // Magento：去缓存目录
            MAGENTO_TO_ORIGINAL: createRegexRule(/\/media\/catalog\/product\/cache\/image\/\d+x\d+\/[^/]+\/(.+)/, '/media/catalog/product/$1'),

            // OpenCart：去 cache 与尺寸
            OPENCART_TO_ORIGINAL: createRegexRule(/^https?:\/\/([^/]+)(\/image)\/cache(\/catalog\/.+?)(-\d+x\d+)(\.\w+)$/i, 'https://$1$2$3$5'),

            // T4S：移除尺寸后缀，强制 jpg
            T4S_TO_ORIGINAL: {
                apply: (url) => {
                    let c = url.replace(/-\d+(\.\w+)$/, '$1');
                    return c.endsWith('.jpg') ? c : c.replace(/\.\w+$/, '.jpg');
                }
            },

            // Foot Locker（Scene7）强制最大 PNG 预设
            // 示例转换：
            //   前: https://assets.footlocker.com/is/image/FLDM/KI6956_01?$addtocart98jpg$=true&bgc=f5f5f5
            //   后: https://assets.footlocker.com/is/image/FLDM/KI6956_01?$zoom2000png$
            //
            // 说明：该站点常限制自由 wid/fmt 参数，仅允许 preset（?$xxx$）。
            // 这里统一替换为 zoom2000png，以获取更大/更接近原始的 PNG。
            FOOTLOCKER_SCENE7_FORCE_ZOOM2000PNG: {
                apply: (url) => {
                    if (!url.includes('/is/image/')) return url;
                    const base = url.split('?')[0];
                    return `${base}?$zoom2000png$`;
                }
            }
        };

        // ═══════════════════════════════════════════════════════════════
        // 5. 规则映射表
        // ═══════════════════════════════════════════════════════════════
        const HOST_RULE_MAP = {
            // GOAT & FlightClub & StockX
            'goat': [BRAND_RULES.GOAT_CLEAN],
            'flightclub': [REUSABLE_RULES.REMOVE_ALL_QUERY],
            'stockx': [BRAND_RULES.STOCKX_HIGH_RES],

            // Nike
            'nike-cn': [BRAND_RULES.NIKE_CN_TO_GLOBAL, BRAND_RULES.NIKE_CLEAN_PATH, REUSABLE_RULES.TO_PNG],
            'nike-global': [BRAND_RULES.NIKE_CLEAN_PATH, REUSABLE_RULES.TO_PNG],
            'nike-ae-like': [BRAND_RULES.NIKE_AE_LIKE],

            // Adidas
            'adidas-assets': [BRAND_RULES.ADIDAS_ASSETS_PATH, BRAND_RULES.ADIDAS_JPG_TO_PNG],

            // ASICS
            'asics-intl': [BRAND_RULES.ASICS_HIGH_RES],
            'asics-hk': [REUSABLE_RULES.REMOVE_VERSION_QUERY],
            'asics-tw': [REUSABLE_RULES.REMOVE_VERSION_QUERY],

            // Brooks
            'brooks-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY, REUSABLE_RULES.TO_PNG],

            // Converse
            'converse-cn': [REUSABLE_RULES.REMOVE_ALL_QUERY],

            // Decathlon
            'decathlon-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],
            'decathlon-cn': [REUSABLE_RULES.REMOVE_ALL_QUERY, REUSABLE_RULES.TO_PNG],
            'decathlon-hk': [REUSABLE_RULES.REMOVE_ALL_QUERY, REUSABLE_RULES.TO_PNG],

            // Fila
            'fila-sg': [BRAND_RULES.FILA_SG_QUERY],
            'fila-hk': [BRAND_RULES.FILA_HK_TO_CLOUDFRONT],
            'fila-hk-cloudfront': [BRAND_RULES.FILA_HK_CLOUDFRONT],

            // HOKA
            'hoka-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],
            'hoka-cn': [BRAND_RULES.HOKA_CN_REMOVE_QUERY],

            // Li-Ning
            'lining-cn': [REUSABLE_RULES.REMOVE_ALL_QUERY],

            // Mizuno
            'mizuno-usa': [REUSABLE_RULES.REMOVE_ALL_QUERY],

            // MLB
            'mlb-korea': [BRAND_RULES.MLB_KOREA_PARAMS],
            'mlb-korea-shop': [BRAND_RULES.MLB_KOREA_SHOP_FILES],

            // New Balance
            'newbalance-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],
            'newbalance-cn': [BRAND_RULES.NEWBALANCE_CN_CLEAN],

            // OLD ORDER
            'old-order-shopify': [BRAND_RULES.SHOPIFY_REMOVE_SIZE, REUSABLE_RULES.REMOVE_ALL_QUERY],

            // On
            'on-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],
            'on-cn': [BRAND_RULES.ON_CN_REMOVE_OSS_QUERY],

            // Puma
            'puma-intl': [BRAND_RULES.PUMA_INTL_UPLOAD_PARAMS],
            'puma-cn': [BRAND_RULES.PUMA_CN_IMAGE_PROCESSING],

            // Reebok
            'reebok-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],

            // Salomon
            'salomon-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],

            // Saucony
            'saucony-intl': [BRAND_RULES.SAUCONY_SCENE7_REMOVE_DOLLAR_PARAMS, REUSABLE_RULES.REMOVE_ALL_QUERY],

            // Skechers
            'skechers-usa': [BRAND_RULES.SKECHERS_USA_PATH],
            'skechers-hk': [REUSABLE_RULES.REMOVE_VERSION_QUERY],
            'skechers-sg': [BRAND_RULES.SKECHERS_SG_SUFFIX, REUSABLE_RULES.REMOVE_VERSION_QUERY],

            // The North Face
            'thenorthface-intl': [BRAND_RULES.THENORTHFACE_INTL_CLEAN],
            'thenorthface-cn': [BRAND_RULES.THENORTHFACE_CN_REMOVE_QUERY],

            // Under Armour
            'underarmour-scene7': [BRAND_RULES.UNDERARMOUR_SCENE7],

            // Vans
            'vans-intl': [BRAND_RULES.VANS_INTL_CLEAN_PARAMS],

            // Sneaker News & HouseOfHeat
            'sneakernews-wp': [REUSABLE_RULES.REMOVE_ALL_QUERY],
            'sanity-cdn': [BRAND_RULES.SANITY_CLEAN],

            // Poizon & Shihuo
            'poizon-cdn': [BRAND_RULES.POIZON_FORCE_PNG],
            'shihuo-cdn': [REUSABLE_RULES.REMOVE_SIZE_SUFFIX, REUSABLE_RULES.REMOVE_ALL_QUERY],

            // KicksCrew
            'kickscrew-shopify': [BRAND_RULES.SHOPIFY_REMOVE_SIZE, REUSABLE_RULES.REMOVE_ALL_QUERY],

            // Novelship
            'novelship-img': [REUSABLE_RULES.REMOVE_ALL_QUERY],

            // Snipes
            'snipes-demandware': [REUSABLE_RULES.REMOVE_ALL_QUERY],

            // Shiekh (Magento)
            'magento-shiekh': [BRAND_RULES.MAGENTO_TO_ORIGINAL],

            // Amazon
            'amazon-media': [BRAND_RULES.AMAZON_MEDIA_CLEAN],

            // eBay
            'ebay-img-force-png': [BRAND_RULES.EBAY_TO_PNG_2000],

            // END.
            'end-clothing': [BRAND_RULES.END_CLOTHING_CLEAN],

            // Runnmore-like
            'runnmore-like': [BRAND_RULES.RUNNMORE_LIKE_TO_ORIGINAL],

            // OpenCart
            'opencart-generic': [BRAND_RULES.OPENCART_TO_ORIGINAL],

            // T4S
            't4s-cdn': [BRAND_RULES.T4S_TO_ORIGINAL],

            // AliCDN
            'alicdn': [BRAND_RULES.ALICDN_REMOVE_SUFFIX],

            // Foot Locker
            'footlocker-scene7': [BRAND_RULES.FOOTLOCKER_SCENE7_FORCE_ZOOM2000PNG],

            // Stadium Goods (Shopify)
            'stadiumgoods-shopify': [BRAND_RULES.SHOPIFY_REMOVE_SIZE, REUSABLE_RULES.REMOVE_ALL_QUERY],
        };

        // ═══════════════════════════════════════════════════════════════
        // 6. 执行规则
        // ═══════════════════════════════════════════════════════════════

        // 特殊检查：某些站点需要特定路径才触发规则
        // - Nike 中东：仅处理 /dw/image/ 路径（Demandware 图片服务）
        // - Saucony：仅处理 /WolverineWorldWide/ 路径（Scene7 CDN）
        if ((hostType === 'nike-ae-like' && !CURRENT_HREF.includes('/dw/image/')) ||
            (hostType === 'saucony-intl' && !CURRENT_HREF.includes('/WolverineWorldWide/'))) {
            return;
        }

        const rules = HOST_RULE_MAP[hostType];
        if (!rules) return;

        let newUrl = CURRENT_HREF;
        for (const rule of rules) {
            newUrl = rule.apply(newUrl);
        }

        // 如果 URL 发生变化：阻断当前请求并跳转到新 URL
        if (newUrl !== CURRENT_HREF) {
            // window.stop() 在 document-start 阶段可阻止浏览器继续请求原始（低质量/非目标）资源
            window.stop();
            // replace 不产生历史记录
            window.location.replace(newUrl);
            return;
        }

        // ═══════════════════════════════════════════════════════════════
        // 7. 特殊 UI: Nike 格式切换按钮（仅在 Nike 中东站点显示）
        // ═══════════════════════════════════════════════════════════════
        if (hostType === 'nike-ae-like') {
            const injectModeSwitch = () => {
                if (document.getElementById('tm-nike-mode-switch')) return;

                const currentUrl = new URL(window.location.href);
                const isPngMode = currentUrl.searchParams.get('tm_fmt') === 'png';

                const switchBtn = document.createElement('button');
                switchBtn.id = 'tm-nike-mode-switch';
                switchBtn.innerText = isPngMode ? '当前: PNG (切回 JPG)' : '当前: JPG (切换 PNG)';
                switchBtn.title = '本次临时切换，不影响默认设置';

                Object.assign(switchBtn.style, {
                    position: 'fixed',
                    bottom: '100px',
                    right: '30px',
                    zIndex: '2147483647',
                    padding: '10px 20px',
                    backgroundColor: '#343a40',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    display: 'block'
                });

                switchBtn.onclick = () => {
                    switchBtn.innerText = '切换中...';
                    const targetUrl = new URL(window.location.href);
                    if (isPngMode) {
                        targetUrl.searchParams.delete('tm_fmt');
                    } else {
                        targetUrl.searchParams.set('tm_fmt', 'png');
                    }
                    window.location.href = targetUrl.toString();
                };

                document.body.appendChild(switchBtn);
            };

            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                injectModeSwitch();
            } else {
                window.addEventListener('DOMContentLoaded', injectModeSwitch);
                window.addEventListener('load', injectModeSwitch);
            }
        }

    } catch (e) {
        console.error('Image Clean Script Error:', e);
    }

})();