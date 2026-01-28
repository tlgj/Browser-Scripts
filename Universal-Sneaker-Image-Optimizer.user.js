// ==UserScript==
// @name         多品牌图片链接统一清理器
// @namespace    http://tampermonkey.net/
// @version      2.8.0.1
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
// T4S (捷克球鞋店)  —— 修复：Tampermonkey 不支持 i*.t4s.cz 这种前缀通配
// @match        https://*.t4s.cz/products/*/*
// ───────────────────────────────────────────────────────────
// 通用 CDN (General CDNs)
// ───────────────────────────────────────────────────────────
// AliCDN (阿里云 CDN - 中国)
// @match        https://gw.alicdn.com/*
// @match        https://img.alicdn.com/*
// ==/UserScript==

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

      // OLD ORDER (明确站点，不再作为 Shopify 通用兜底名)
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
      // Shopify 通用兜底：不再复用 old-order 名称（修复 P1 语义问题）
      if (window.location.pathname.startsWith('/cdn/shop/files/')) {
        hostType = 'shopify-generic';
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
    // 3. 工具函数（加强：保留 hash、避免 query 残片）
    // ═══════════════════════════════════════════════════════════════

    const safeUrlParse = (urlStr) => {
      try { return new URL(urlStr); } catch (e) { return null; }
    };

    const splitHash = (urlStr) => {
      const i = urlStr.indexOf('#');
      if (i < 0) return { preHash: urlStr, hash: '' };
      return { preHash: urlStr.slice(0, i), hash: urlStr.slice(i) }; // hash 含 '#'
    };

    const stripQueryPreserveHash = (urlStr) => {
      const u = safeUrlParse(urlStr);
      if (u) { u.search = ''; return u.toString(); }

      const { preHash, hash } = splitHash(urlStr);
      const q = preHash.indexOf('?');
      const base = q >= 0 ? preHash.slice(0, q) : preHash;
      return base + hash;
    };

    const replaceQueryPreserveHash = (urlStr, newQuery /*含 ?*/) => {
      const u = safeUrlParse(urlStr);
      if (u) { u.search = newQuery; return u.toString(); }

      const { preHash, hash } = splitHash(urlStr);
      const q = preHash.indexOf('?');
      const base = q >= 0 ? preHash.slice(0, q) : preHash;
      return base + newQuery + hash;
    };

    // 用于清理“非 key=value”的奇怪 query（例如 imageMogr2/...）
    const removeQuerySegmentsPreserveHash = (urlStr, shouldRemoveSegmentFn) => {
      const { preHash, hash } = splitHash(urlStr);
      const qi = preHash.indexOf('?');
      if (qi < 0) return urlStr;

      const base = preHash.slice(0, qi);
      const query = preHash.slice(qi + 1);
      if (!query) return base + hash;

      const segments = query.split('&').filter(Boolean);
      const kept = segments.filter(seg => !shouldRemoveSegmentFn(seg));
      return (kept.length ? `${base}?${kept.join('&')}` : base) + hash;
    };

    const createRegexRule = (regex, replacement) => ({
      apply: (url) => url.replace(regex, replacement)
    });

    // 修复 P1：替换 query 时保留 hash（不再 split('?') 丢 fragment）
    const createQueryReplaceRule = (newQuery) => ({
      apply: (urlStr) => replaceQueryPreserveHash(urlStr, newQuery)
    });

    // 修复 P0：整站 @match 站点增加“仅处理图片 URL”防误伤
    const isProbablyImageUrl = (urlStr) => {
      const u = safeUrlParse(urlStr);
      if (!u) return false;

      const p = u.pathname.toLowerCase();

      // 常见图片后缀
      if (/\.(png|jpe?g|webp|gif|avif|bmp|svg)$/.test(p)) return true;

      // 常见图片服务路径（可能无后缀）
      if (p.includes('/dw/image/')) return true;      // Demandware
      if (p.includes('/is/image/')) return true;      // Scene7 / Dynamic Media
      if (p.includes('/cdn-cgi/image/')) return true; // Cloudflare Image Resizing

      return false;
    };

    // 对少数 hostType 允许无后缀图片服务
    const HOSTTYPE_ALLOW_NON_EXT = new Set([
      'nike-ae-like',
      'footlocker-scene7',
      'underarmour-scene7',
      'saucony-intl',
      'snipes-demandware',
      'mlb-korea',
    ]);

    if (!HOSTTYPE_ALLOW_NON_EXT.has(hostType) && !isProbablyImageUrl(CURRENT_HREF)) {
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. 规则定义
    // ═══════════════════════════════════════════════════════════════

    // 4.1 可复用规则（修复：清 query 不再连 hash 一起删）
    const REUSABLE_RULES = {
      REMOVE_ALL_QUERY: { apply: (urlStr) => stripQueryPreserveHash(urlStr) },

      TO_PNG: createRegexRule(/\.(?:webp|jpe?g)(?=\?|$)/i, '.png'),

      // 修复 P1：删除 v 参数更稳 & 保留 hash（不只匹配 ?v=123$）
      REMOVE_VERSION_QUERY: {
        apply: (urlStr) => {
          const u = safeUrlParse(urlStr);
          if (!u) return urlStr.replace(/\?v=\d+$/, ''); // 兜底
          if (u.searchParams.has('v')) u.searchParams.delete('v');
          return u.toString();
        }
      },

      REMOVE_SIZE_SUFFIX: createRegexRule(/_\d+x\d+(?=\.\w+$)/, ''),
    };

    // 4.2 品牌/站点专用规则
    const BRAND_RULES = {
      // New Balance 中国：删除 image_process，保留其他参数与 hash（修复 P1）
      NEWBALANCE_CN_CLEAN: {
        apply: (urlStr) => {
          const u = safeUrlParse(urlStr);
          if (!u) return urlStr;
          if (u.searchParams.has('image_process')) u.searchParams.delete('image_process');
          return u.toString();
        }
      },

      NIKE_CN_TO_GLOBAL: createRegexRule(/\/\/static\.nike\.com\.cn\//, '//static.nike.com/'),

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

      NIKE_AE_LIKE: {
        apply: (urlStr) => {
          if (!urlStr.includes('/dw/image/')) return urlStr;
          const u = safeUrlParse(urlStr);
          if (!u) return urlStr;

          if (u.searchParams.get('tm_fmt') === 'png') {
            const newPath = u.pathname.replace(/\.jpe?g$/i, '.png');
            const newUrl = new URL(u.protocol + '//' + u.host + newPath + u.hash);
            newUrl.searchParams.set('sw', '3000');
            newUrl.searchParams.set('sh', '3000');
            newUrl.searchParams.set('fmt', 'png-alpha');
            newUrl.searchParams.set('tm_fmt', 'png');
            return newUrl.toString();
          } else {
            const newPath = u.pathname.replace(/\.png$/i, '.jpg');
            const newUrl = new URL(u.protocol + '//' + u.host + newPath + u.hash);
            // 维持原先行为：JPG 模式不强加 query
            newUrl.search = '';
            return newUrl.toString();
          }
        }
      },

      // GOAT：去 transform 段 + 清 query（修复：清 query 保留 hash）
      GOAT_CLEAN: {
        apply: (urlStr) => {
          let out = urlStr;
          if (out.includes('/transform/') && out.includes('/attachments/')) {
            out = out.replace(/\/transform\/.*\/attachments\//, '/attachments/');
          }
          return stripQueryPreserveHash(out);
        }
      },

      STOCKX_HIGH_RES: createQueryReplaceRule('?fm=jpg&dpr=3'),

      ADIDAS_ASSETS_PATH: createRegexRule(/(\/images\/)[^/]+,[^/]+\//, '$1'),
      ADIDAS_JPG_TO_PNG: createRegexRule(/\.jpg(?=\?|$)/i, '.png'),

      ASICS_HIGH_RES: createQueryReplaceRule('?wid=3000&hei=3000&fmt=png-alpha&qlt=100'),

      // Fila SG：移除 w/h/q 查询参数时，保留 hash（修复 P1）
      FILA_SG_QUERY: {
        apply: (urlStr) => {
          const u = safeUrlParse(urlStr);
          if (!u) return urlStr;
          if (u.searchParams.has('w') || u.searchParams.has('h') || u.searchParams.has('q')) {
            u.search = '';
            return u.toString();
          }
          return urlStr;
        }
      },

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

      MLB_KOREA_PARAMS: createRegexRule(/\/cdn-cgi\/image\/[^/]+(\/images\/.*)/, '/cdn-cgi/image/q=100,format=auto$1'),

      // MLB Shop：删除 v/width（修复 P1：更稳且保留 hash）
      MLB_KOREA_SHOP_FILES: {
        apply: (urlStr) => {
          const u = safeUrlParse(urlStr);
          if (!u) return urlStr.replace(/\?(?:v=\d+&width=\d+|width=\d+&v=\d+|v=\d+|width=\d+)/, '');
          u.searchParams.delete('v');
          u.searchParams.delete('width');
          return u.toString();
        }
      },

      PUMA_INTL_UPLOAD_PARAMS: createRegexRule(/(\/upload\/)[^/]+\/(global\/.+)/, '$1$2'),

      // Puma 中国：移除 imageMogr2/...（修复 P1：不留 ?/& 残片，保留 hash）
      PUMA_CN_IMAGE_PROCESSING: {
        apply: (urlStr) => removeQuerySegmentsPreserveHash(urlStr, (seg) => seg.startsWith('imageMogr2/'))
      },

      SKECHERS_USA_PATH: createRegexRule(/(\/image);[^/]+/, '$1'),
      SKECHERS_SG_SUFFIX: createRegexRule(/(\_\d+x\d+)(?=\.(?:jpg|jpeg|png|webp|gif))/i, ''),

      THENORTHFACE_INTL_CLEAN: createRegexRule(/\/t_img\/[^/]+\/v(\d+\/)/, '/v$1'),

      // TNF CN：移除 ?123 这类时间戳 query，但保留 hash（修复 P1）
      THENORTHFACE_CN_REMOVE_QUERY: {
        apply: (urlStr) => {
          const u = safeUrlParse(urlStr);
          if (!u) return urlStr.replace(/\?\d+$/, '');
          if (/^\?\d+$/.test(u.search)) u.search = '';
          return u.toString();
        }
      },

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

      VANS_INTL_CLEAN_PARAMS: createRegexRule(/(\/images\/).*?(v\d+\/.*)/, '$1$2'),

      SAUCONY_SCENE7_REMOVE_DOLLAR_PARAMS: createRegexRule(/\$[^$]+\$/, ''),

      // HOKA CN：移除 ?时间戳，但保留 hash（修复 P1）
      HOKA_CN_REMOVE_QUERY: {
        apply: (urlStr) => {
          const u = safeUrlParse(urlStr);
          if (!u) return urlStr.replace(/\?\d+(?:#\w+)?$/, '');
          if (/^\?\d+$/.test(u.search)) u.search = '';
          return u.toString();
        }
      },

      // On CN：移除 x-oss-process=image/...，保留其他参数与 hash（修复 P1）
      ON_CN_REMOVE_OSS_QUERY: {
        apply: (urlStr) => {
          const u = safeUrlParse(urlStr);
          if (!u) return urlStr.replace(/\?x-oss-process=image\/.*/, '');
          const v = u.searchParams.get('x-oss-process');
          if (v && v.startsWith('image/')) u.searchParams.delete('x-oss-process');
          return u.toString();
        }
      },

      POIZON_FORCE_PNG: createQueryReplaceRule('?x-oss-process=image/format,png'),

      SHOPIFY_REMOVE_SIZE: createRegexRule(/(\_\d+x\d*|\_pico|\_icon|\_thumb|\_small|\_compact|\_medium|\_large|\_grande|\_original|\_master)(?=\.\w+)/, ''),

      // Sanity CDN：清 query 但不再“顺带丢 hash”（修复 P1）
      SANITY_CLEAN: {
        apply: (urlStr) => {
          const u = safeUrlParse(urlStr);
          if (!u) {
            // 兜底：保留 hash
            const { preHash, hash } = splitHash(urlStr);
            const m = preHash.match(/^(https:\/\/cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/[^/?#]+)/);
            return (m ? m[1] : preHash) + hash;
          }
          // 仅保留 /images/<project>/<dataset>/<asset>
          const m = u.pathname.match(/^\/images\/[^/]+\/[^/]+\/[^/]+/);
          if (m) u.pathname = m[0];
          u.search = '';
          return u.toString();
        }
      },

      ALICDN_REMOVE_SUFFIX: { apply: (url) => url.replace(/(\.(jpg|jpeg|png|webp|gif))_[^/]*$/i, '$1') },

      AMAZON_MEDIA_CLEAN: createRegexRule(/^(https:\/\/m\.media-amazon\.com\/images\/I\/[^._]+)\._[^.]*_\.(\w+)$/, '$1.$2'),

      EBAY_TO_PNG_2000: createRegexRule(/\/s-l\d+\.(?:jpg|jpeg|png|webp)$/i, '/s-l2000.png'),

      END_CLOTHING_CLEAN: createRegexRule(/\/media\/[^/]+\/(?:prodmedia\/)?media\/catalog\/product\//, '/media/catalog/product/'),

      RUNNMORE_LIKE_TO_ORIGINAL: {
        apply: (url) => url
          .replace(/\/files\/thumbs\//, '/files/')
          .replace(/\/images\/thumbs_\d+\//, '/')
          .replace(/(\_\d+\_\d+px)(\.\w+)$/, '$2')
      },

      MAGENTO_TO_ORIGINAL: createRegexRule(/\/media\/catalog\/product\/cache\/image\/\d+x\d+\/[^/]+\/(.+)/, '/media/catalog/product/$1'),

      OPENCART_TO_ORIGINAL: createRegexRule(/^https?:\/\/([^/]+)(\/image)\/cache(\/catalog\/.+?)(-\d+x\d+)(\.\w+)$/i, 'https://$1$2$3$5'),

      T4S_TO_ORIGINAL: {
        apply: (url) => {
          let c = url.replace(/-\d+(\.\w+)$/, '$1');
          return c.endsWith('.jpg') ? c : c.replace(/\.\w+$/, '.jpg');
        }
      },

      FOOTLOCKER_SCENE7_FORCE_ZOOM2000PNG: {
        apply: (urlStr) => {
          if (!urlStr.includes('/is/image/')) return urlStr;
          // 修复：保留 hash（P1）
          const { preHash, hash } = splitHash(urlStr);
          const base = preHash.split('?')[0];
          return `${base}?$zoom2000png$${hash}`;
        }
      }
    };

    // ═══════════════════════════════════════════════════════════════
    // 5. 规则映射表
    // ═══════════════════════════════════════════════════════════════
    const HOST_RULE_MAP = {
      'goat': [BRAND_RULES.GOAT_CLEAN],
      'flightclub': [REUSABLE_RULES.REMOVE_ALL_QUERY],
      'stockx': [BRAND_RULES.STOCKX_HIGH_RES],

      'nike-cn': [BRAND_RULES.NIKE_CN_TO_GLOBAL, BRAND_RULES.NIKE_CLEAN_PATH, REUSABLE_RULES.TO_PNG],
      'nike-global': [BRAND_RULES.NIKE_CLEAN_PATH, REUSABLE_RULES.TO_PNG],
      'nike-ae-like': [BRAND_RULES.NIKE_AE_LIKE],

      'adidas-assets': [BRAND_RULES.ADIDAS_ASSETS_PATH, BRAND_RULES.ADIDAS_JPG_TO_PNG],

      'asics-intl': [BRAND_RULES.ASICS_HIGH_RES],
      'asics-hk': [REUSABLE_RULES.REMOVE_VERSION_QUERY],
      'asics-tw': [REUSABLE_RULES.REMOVE_VERSION_QUERY],

      'brooks-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY, REUSABLE_RULES.TO_PNG],

      'converse-cn': [REUSABLE_RULES.REMOVE_ALL_QUERY],

      'decathlon-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],
      'decathlon-cn': [REUSABLE_RULES.REMOVE_ALL_QUERY, REUSABLE_RULES.TO_PNG],
      'decathlon-hk': [REUSABLE_RULES.REMOVE_ALL_QUERY, REUSABLE_RULES.TO_PNG],

      'fila-sg': [BRAND_RULES.FILA_SG_QUERY],
      'fila-hk': [BRAND_RULES.FILA_HK_TO_CLOUDFRONT],
      'fila-hk-cloudfront': [BRAND_RULES.FILA_HK_CLOUDFRONT],

      'hoka-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],
      'hoka-cn': [BRAND_RULES.HOKA_CN_REMOVE_QUERY],

      'lining-cn': [REUSABLE_RULES.REMOVE_ALL_QUERY],

      'mizuno-usa': [REUSABLE_RULES.REMOVE_ALL_QUERY],

      'mlb-korea': [BRAND_RULES.MLB_KOREA_PARAMS],
      'mlb-korea-shop': [BRAND_RULES.MLB_KOREA_SHOP_FILES],

      'newbalance-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],
      'newbalance-cn': [BRAND_RULES.NEWBALANCE_CN_CLEAN],

      // OLD ORDER（明确站点）
      'old-order-shopify': [BRAND_RULES.SHOPIFY_REMOVE_SIZE, REUSABLE_RULES.REMOVE_ALL_QUERY],
      // Shopify 通用兜底（修复 P1 命名语义）
      'shopify-generic': [BRAND_RULES.SHOPIFY_REMOVE_SIZE, REUSABLE_RULES.REMOVE_ALL_QUERY],

      'on-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],
      'on-cn': [BRAND_RULES.ON_CN_REMOVE_OSS_QUERY],

      'puma-intl': [BRAND_RULES.PUMA_INTL_UPLOAD_PARAMS],
      'puma-cn': [BRAND_RULES.PUMA_CN_IMAGE_PROCESSING],

      'reebok-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],

      'salomon-intl': [REUSABLE_RULES.REMOVE_ALL_QUERY],

      'saucony-intl': [BRAND_RULES.SAUCONY_SCENE7_REMOVE_DOLLAR_PARAMS, REUSABLE_RULES.REMOVE_ALL_QUERY],

      'skechers-usa': [BRAND_RULES.SKECHERS_USA_PATH],
      'skechers-hk': [REUSABLE_RULES.REMOVE_VERSION_QUERY],
      'skechers-sg': [BRAND_RULES.SKECHERS_SG_SUFFIX, REUSABLE_RULES.REMOVE_VERSION_QUERY],

      'thenorthface-intl': [BRAND_RULES.THENORTHFACE_INTL_CLEAN],
      'thenorthface-cn': [BRAND_RULES.THENORTHFACE_CN_REMOVE_QUERY],

      'underarmour-scene7': [BRAND_RULES.UNDERARMOUR_SCENE7],

      'vans-intl': [BRAND_RULES.VANS_INTL_CLEAN_PARAMS],

      'sneakernews-wp': [REUSABLE_RULES.REMOVE_ALL_QUERY],
      'sanity-cdn': [BRAND_RULES.SANITY_CLEAN],

      'poizon-cdn': [BRAND_RULES.POIZON_FORCE_PNG],
      'shihuo-cdn': [REUSABLE_RULES.REMOVE_SIZE_SUFFIX, REUSABLE_RULES.REMOVE_ALL_QUERY],

      'kickscrew-shopify': [BRAND_RULES.SHOPIFY_REMOVE_SIZE, REUSABLE_RULES.REMOVE_ALL_QUERY],

      'novelship-img': [REUSABLE_RULES.REMOVE_ALL_QUERY],

      'snipes-demandware': [REUSABLE_RULES.REMOVE_ALL_QUERY],

      'magento-shiekh': [BRAND_RULES.MAGENTO_TO_ORIGINAL],

      'amazon-media': [BRAND_RULES.AMAZON_MEDIA_CLEAN],

      'ebay-img-force-png': [BRAND_RULES.EBAY_TO_PNG_2000],

      'end-clothing': [BRAND_RULES.END_CLOTHING_CLEAN],

      'runnmore-like': [BRAND_RULES.RUNNMORE_LIKE_TO_ORIGINAL],

      'opencart-generic': [BRAND_RULES.OPENCART_TO_ORIGINAL],

      't4s-cdn': [BRAND_RULES.T4S_TO_ORIGINAL],

      'alicdn': [BRAND_RULES.ALICDN_REMOVE_SUFFIX],

      'footlocker-scene7': [BRAND_RULES.FOOTLOCKER_SCENE7_FORCE_ZOOM2000PNG],

      'stadiumgoods-shopify': [BRAND_RULES.SHOPIFY_REMOVE_SIZE, REUSABLE_RULES.REMOVE_ALL_QUERY],
    };

    // ═══════════════════════════════════════════════════════════════
    // 6. 执行规则
    // ═══════════════════════════════════════════════════════════════
    if ((hostType === 'nike-ae-like' && !CURRENT_HREF.includes('/dw/image/')) ||
        (hostType === 'saucony-intl' && !CURRENT_HREF.includes('/WolverineWorldWide/'))) {
      return;
    }

    const rules = HOST_RULE_MAP[hostType];
    if (!rules) return;

    let newUrl = CURRENT_HREF;
    for (const rule of rules) newUrl = rule.apply(newUrl);

    if (newUrl !== CURRENT_HREF) {
      window.stop();
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
          if (isPngMode) targetUrl.searchParams.delete('tm_fmt');
          else targetUrl.searchParams.set('tm_fmt', 'png');
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