// ==UserScript==
// @name         球鞋看图助手
// @name:en      Sneaker Image Helper
// @namespace    https://github.com/tlgj/Browser-Scripts
// @version      1.4.4.4
// @description  提取页面图片并清洗到高清，支持多品牌URL规则。幻灯片浏览，内置独立查看器（拖动/缩放/滚轮切图）。支持保存/一键保存/全部保存/停止，自动创建子文件夹。链接信息显示/隐藏持久化。默认提取 JPEG/PNG/WebP/AVIF 格式。支持后缀名预设快速选择。
// @author       tlgj
// @license      MIT
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @connect      *
// @downloadURL  https://github.com/tlgj/Browser-Scripts/raw/refs/heads/main/sneaker-image-helper.user.js
// @updateURL    https://github.com/tlgj/Browser-Scripts/raw/refs/heads/main/sneaker-image-helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================
    // 固定底部栏高度（用于"固定图片框大小"，避免切换时闪烁/跳动）
    // =========================================================
    const FOOTER_HEIGHT_PX = 180;

    // =========================================================
    // 一键/全部保存：自动子文件夹
    // 说明：GM_download 的 name 支持 "folder/file.ext" 时才会创建文件夹；
    // 若环境不支持，本脚本会自动降级为"平铺文件名"继续下载。
    // =========================================================

    function sanitizePathPart(input, maxLen = 60) {
        const s = String(input || '')
            .trim()
            .replace(/[\\/:*?"<>|]+/g, '_')
            .replace(/\s+/g, ' ')
            .replace(/[\u0000-\u001f]+/g, '_');
        return (s || 'untitled').slice(0, maxLen);
    }

    function yyyymmdd() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    }

    function buildSaveFolderForPage() {
        const root = sanitizePathPart(SETTINGS.saveRootFolder || 'TM_Images', 30);
        const host = sanitizePathPart(location.hostname, 40);
        const title = sanitizePathPart(document.title || 'page', 60);
        return `${root}/${host}_${yyyymmdd()}_${title}`;
    }

    // =========================================================
    // 0) 存储与简化配置
    // =========================================================
    const STORE_KEYS = {
        ENABLE_BUTTON: 'sih_enable_button',
        BTN_POS: 'sih_btn_pos',
        FILTER: 'sih_filter',
        BLACKLIST: 'sih_blacklist',
        SAVE_ROOT_FOLDER: 'sih_save_root_folder',
    };

    const DEFAULTS = {
        enableButton: true,
        btnPos: null,
        filter: {
            minSidePx: 100,
            minSizeKB: 0,
            exts: 'jpeg,jpg,png,webp,avif',
        },
        scanBackgroundImages: false,
        maxElementsForBgScan: 8000,
        preloadRadius: 2,
        blacklist: [],
        saveRootFolder: 'TM_Images',
    };

    const SETTINGS = {
        enableButton: GM_getValue(STORE_KEYS.ENABLE_BUTTON, DEFAULTS.enableButton),
        btnPos: GM_getValue(STORE_KEYS.BTN_POS, DEFAULTS.btnPos),
        filter: (() => {
            const savedFilter = GM_getValue(STORE_KEYS.FILTER, {});
            return {
                minSidePx: savedFilter.minSidePx !== undefined && savedFilter.minSidePx !== '' ? savedFilter.minSidePx : DEFAULTS.filter.minSidePx,
                minSizeKB: savedFilter.minSizeKB !== undefined && savedFilter.minSizeKB !== '' ? savedFilter.minSizeKB : DEFAULTS.filter.minSizeKB,
                exts: savedFilter.exts !== undefined && savedFilter.exts !== '' ? savedFilter.exts : DEFAULTS.filter.exts,
            };
        })(),
        scanBackgroundImages: DEFAULTS.scanBackgroundImages,
        maxElementsForBgScan: DEFAULTS.maxElementsForBgScan,
        preloadRadius: DEFAULTS.preloadRadius,
        blacklist: GM_getValue(STORE_KEYS.BLACKLIST, DEFAULTS.blacklist) || [],
        saveRootFolder: GM_getValue(STORE_KEYS.SAVE_ROOT_FOLDER, DEFAULTS.saveRootFolder),
    };

    function saveFilter() {
        const filterToSave = {
            minSidePx: SETTINGS.filter.minSidePx !== '' && SETTINGS.filter.minSidePx !== null ? SETTINGS.filter.minSidePx : DEFAULTS.filter.minSidePx,
            minSizeKB: SETTINGS.filter.minSizeKB !== '' && SETTINGS.filter.minSizeKB !== null ? SETTINGS.filter.minSizeKB : DEFAULTS.filter.minSizeKB,
            exts: SETTINGS.filter.exts !== '' && SETTINGS.filter.exts !== null ? SETTINGS.filter.exts : DEFAULTS.filter.exts,
        };
        GM_setValue(STORE_KEYS.FILTER, filterToSave);
    }
    function saveBlacklist() { GM_setValue(STORE_KEYS.BLACKLIST, SETTINGS.blacklist); }

    function isBlacklisted() {
        if (!SETTINGS.blacklist || !SETTINGS.blacklist.length) return false;
        const hostname = location.hostname.toLowerCase();
        return SETTINGS.blacklist.some(site => {
            const pattern = site.trim().toLowerCase();
            if (!pattern) return false;
            if (pattern.startsWith('*.')) {
                const domain = pattern.slice(2);
                return hostname === domain || hostname.endsWith('.' + domain);
            }
            return hostname === pattern;
        });
    }

    // =========================================================
    // UI Styles（美化版）
    // =========================================================
    const STYLE_ID = 'sih-style-v1440';
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
:root{
  --tm-font: system-ui, -apple-system, Segoe UI, Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  --tm-fg: rgba(255,255,255,0.94);
  --tm-dim: rgba(255,255,255,0.74);
  --tm-border: rgba(255,255,255,0.12);
  --tm-glass: rgba(18,18,20,0.62);
  --tm-glass-2: rgba(18,18,20,0.72);
  --tm-shadow: 0 18px 50px rgba(0,0,0,0.50);
  --tm-btn: rgba(255,255,255,0.10);
  --tm-btn-hover: rgba(255,255,255,0.16);
  --tm-danger: #ff5d5d;
  --tm-radius: 14px;
  --tm-accent: rgba(77,163,255,1);
  --tm-accent-soft: rgba(77,163,255,0.35);
}

#tm-img-slide-overlay, #tm-img-viewer-overlay{ font-family: var(--tm-font); }

.tm-glassbar{
  background: var(--tm-glass);
  border-bottom: 1px solid var(--tm-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.tm-glassfooter{
  background: var(--tm-glass-2);
  border-top: 1px solid var(--tm-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.tm-topbar{
  display:flex; align-items:center; gap: 14px; padding: 12px 14px;
}

.tm-top-left{ display:flex; align-items:center; gap:12px; }
.tm-top-right{ display:flex; align-items:center; gap:10px; flex-wrap: wrap; justify-content:flex-end; }

.tm-filename{
  flex: 1; text-align: center; padding: 0 12px;
  font-size: 20px; font-weight: 900; letter-spacing: 0.2px;
  color: rgba(255,255,255,0.94);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  user-select: text;
}

/* ===== 按钮样式（美化版） ===== */
.tm-btn{
  appearance: none;
  border: 1px solid var(--tm-border);
  background: var(--tm-btn);
  color: rgba(255,255,255,0.92);
  font: 900 16px/1 var(--tm-font);
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: transform .12s ease, background .15s ease, 
              border-color .15s ease, box-shadow .18s ease, opacity .15s ease;
}

.tm-btn:hover{
  background: var(--tm-btn-hover);
  border-color: rgba(255,255,255,0.18);
  transform: translateY(-1px);
  box-shadow: none;
}

.tm-btn:active{
  transform: translateY(1px);
  box-shadow: none;
}

.tm-btn:disabled{ opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

.tm-btn-primary{
  border-color: rgba(77,163,255,0.55);
  background: rgba(77,163,255,0.16);
}

.tm-btn-primary:hover{
  background: rgba(77,163,255,0.22);
  border-color: rgba(77,163,255,0.80);
  box-shadow: none;
}

.tm-btn-danger{
  border-color: rgba(255,93,93,0.55);
  background: rgba(255,93,93,0.14);
}

.tm-btn-danger:hover{
  background: rgba(255,93,93,0.22);
  border-color: rgba(255,93,93,0.82);
  box-shadow: none;
}

.tm-btn-ghost{
  border-color: transparent;
  background: transparent;
  color: rgba(255,255,255,0.74);
}

.tm-btn-ghost:hover{
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.94);
  box-shadow: none;
}

.tm-pill{
  display:inline-flex; align-items:center; gap:8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--tm-border);
  background: rgba(0,0,0,0.18);
}

.tm-kv{ font-size: 16px; color: rgba(255,255,255,0.94); letter-spacing: .2px; }
.tm-kv small{ font-size: 14px; color: rgba(255,255,255,0.74); font-weight: 800; }

.tm-label{ font-size: 14px; color: rgba(255,255,255,0.74); margin-bottom: 6px; }

.tm-url{ 
  font-size: 15px; 
  color: rgba(255,255,255,0.88); 
  word-break: break-all; 
  line-height: 1.5;
  padding: 8px 10px;
  background: rgba(0,0,0,0.25);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.06);
}

.tm-stage{
  height: 100%;
  min-height: 0;
  display:flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 12px 12px 12px;
  gap: 10px;
  overflow: hidden;
}

.tm-canvas{
  position: relative;
  flex: 1 1 auto;
  width: min(96vw, 1400px);
  height: 100%;
  min-height: 0;
}

.tm-image-box{
  position: absolute;
  inset: 0;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow: hidden;
  border-radius: var(--tm-radius);
}

/* ===== 主图样式（美化版） ===== */
.tm-main-img{
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background: rgba(0,0,0,0.35);
  border: 1px solid var(--tm-border);
  border-radius: var(--tm-radius);
  box-shadow: var(--tm-shadow);
  cursor: pointer;
  user-select: none;
  -webkit-user-drag: none;
  opacity: 1;
  transition: opacity .2s ease, box-shadow .25s ease;
}

.tm-main-img:hover {
  box-shadow: 0 24px 60px rgba(0,0,0,0.55);
}

/* ===== 加载动画 ===== */
@keyframes tm-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.tm-main-img.loading {
  background: linear-gradient(90deg, 
    rgba(255,255,255,0.04) 25%, 
    rgba(255,255,255,0.10) 50%, 
    rgba(255,255,255,0.04) 75%
  );
  background-size: 200% 100%;
  animation: tm-shimmer 1.8s infinite;
}

/* ===== 提示气泡 ===== */
.tm-hint{
  position:absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: rgba(255,255,255,0.90);
  background: rgba(0,0,0,0.35);
  border: 1px solid var(--tm-border);
  padding: 8px 12px;
  border-radius: 999px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 4;
  animation: tm-hint-in 0.25s ease;
}

@keyframes tm-hint-in {
  from { 
    opacity: 0; 
    transform: translateX(-50%) translateY(8px); 
  }
  to { 
    opacity: 1; 
    transform: translateX(-50%) translateY(0); 
  }
}

#tm-status.tm-hint{ bottom: 14px; }
#tm-help.tm-hint{ bottom: 56px; }

/* ===== 导航按钮（美化版） ===== */
.tm-navbtn{
  position:absolute;
  top:50%;
  transform: translateY(-50%);
  width: 60px;
  height: 60px;
  display:grid;
  place-items:center;
  border-radius: 16px;
  border: 1px solid var(--tm-border);
  background: rgba(0,0,0,0.28);
  color: rgba(255,255,255,0.92);
  font-size: 32px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 5;
  opacity: 0.6;
  transition: all .2s ease;
}

.tm-navbtn:hover{ 
  opacity: 1;
  background: rgba(255,255,255,0.12); 
  transform: translateY(-50%) scale(1.08);
}

.tm-navbtn:active{ 
  transform: translateY(-50%) scale(0.96); 
}

/* ===== 缩略图条（美化版） ===== */
.tm-strip-panel{
  position: relative;
  width: min(96vw, 1400px);
  background: rgba(0,0,0,0.26);
  border: 1px solid var(--tm-border);
  border-radius: 16px;
  padding: 10px 10px 12px 10px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.tm-strip{
  display:flex;
  gap:10px;
  overflow-x:auto;
  scroll-behavior: smooth;
  padding: 2px;
}

.tm-strip::-webkit-scrollbar{ height: 8px; }

.tm-strip::-webkit-scrollbar-thumb{ 
  background: rgba(255,255,255,0.18); 
  border-radius: 4px; 
}

.tm-strip::-webkit-scrollbar-thumb:hover{ 
  background: rgba(255,255,255,0.28); 
}

.tm-strip::-webkit-scrollbar-track{ 
  background: rgba(255,255,255,0.04); 
  border-radius: 4px; 
}

/* ===== 缩略图（美化版） ===== */
.tm-thumb{
  width: 86px;
  height: 86px;
  flex: 0 0 auto;
  border-radius: 14px;
  object-fit: cover;
  background: rgba(0,0,0,0.25);
  border: 1px solid var(--tm-border);
  opacity: 0.78;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  transition: all .18s ease;
}

.tm-thumb:hover{
  opacity: 0.96;
  border-color: rgba(255,255,255,0.18);
  transform: translateY(-3px) scale(1.05);
  box-shadow: none;
  z-index: 2;
}

.tm-thumb:active{ 
  transform: translateY(-1px) scale(1.02); 
}

.tm-thumb.active{
  opacity: 1;
  border-color: rgba(77,163,255,0.85);
  transform: translateY(-2px);
  box-shadow: none;
}

/* ===== 浮动按钮（美化版） ===== */
#tm-img-slide-float-btn{
  font-family: var(--tm-font);
  font-size: 16px !important;
  font-weight: 900;
  letter-spacing: 0.4px;
  transition: transform .15s ease, box-shadow .2s ease, background .15s ease;
}

#tm-img-slide-float-btn:hover {
  transform: scale(1.05);
  box-shadow: none;
}

/* ===== 设置面板输入框 ===== */
#tm-slide-settings-simple input{
  font-family: var(--tm-font);
  font-size: 15px;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid var(--tm-border);
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.94);
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease;
}

#tm-slide-settings-simple input:focus{
  border-color: rgba(77,163,255,0.65);
  box-shadow: 0 0 0 3px rgba(77,163,255,0.18);
}

/* ===== 查看器样式 ===== */
#tm-img-viewer-overlay{
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: rgba(0,0,0,0.92);
  display: grid;
  grid-template-rows: auto 1fr;
  color: rgba(255,255,255,0.92);
}

#tm-img-viewer-overlay .tmv-top{
  display:flex; align-items:center; gap:10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--tm-border);
  background: rgba(18,18,20,0.62);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  flex-wrap: wrap;
}

#tm-img-viewer-overlay .tmv-title{
  flex: 1;
  font-weight: 900;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: text;
}

#tm-img-viewer-overlay .tmv-stage{
  position: relative;
  overflow: hidden;
  display:flex;
  align-items:center;
  justify-content:center;
  touch-action: none;
}

#tm-img-viewer-overlay .tmv-img{
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display:block;
  transform-origin: 50% 50%;
  user-select: none;
  -webkit-user-drag: none;
  cursor: grab;
  transition: opacity .2s ease;
}

#tm-img-viewer-overlay .tmv-img:active{ cursor: grabbing; }

#tm-img-viewer-overlay .tmv-hint{
  position:absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  font-size: 13px;
  color: rgba(255,255,255,0.90);
  background: rgba(0,0,0,0.35);
  border: 1px solid var(--tm-border);
  padding: 8px 12px;
  border-radius: 999px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events:none;
  animation: tm-hint-in 0.25s ease;
}
        `;
        document.head.appendChild(style);
    }

    // =========================================================
    // 规则工具
    // =========================================================
    const safeUrlParse = (urlStr) => { try { return new URL(urlStr); } catch { return null; } };
    const createRegexRule = (regex, replacement) => ({ apply: (url) => url.replace(regex, replacement) });
    const createQueryReplaceRule = (newQuery) => ({ apply: (url) => url.split('?')[0] + newQuery });

    const REUSABLE_RULES = {
        REMOVE_ALL_QUERY: createRegexRule(/\?.*$/, ''),
        TO_PNG: createRegexRule(/\.(?:webp|jpe?g)(?=\?|$)/i, '.png'),
        REMOVE_VERSION_QUERY: createRegexRule(/\?v=\d+$/, ''),
        REMOVE_SIZE_SUFFIX: createRegexRule(/_\d+x\d+(?=\.\w+$)/, ''),
    };

    // =========================================================
    // 1) 清洗规则（hostType → 规则链）
    // =========================================================
    const BRAND_RULES = {
        JD_360BUYIMG_REMOVE_AVIF: {
            apply: (url) => url.replace(/(\.(?:jpe?g|png|webp|gif))\.avif(?=$|[?#])/i, '$1')
        },

        NEWBALANCE_CN_CLEAN: {
            apply: (url) => url.replace(/([?&])image_process=[^&]*(&?)/, (match, p1, p2) => {
                if (p1 === '?') return p2 === '&' ? '?' : '';
                return p2;
            })
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
        GOAT_CLEAN: {
            apply: (urlStr) => {
                if (urlStr.includes('/transform/') && urlStr.includes('/attachments/')) {
                    return urlStr.replace(/\/transform\/.*\/attachments\//, '/attachments/');
                }
                return urlStr.replace(/\?.*$/, '');
            }
        },
        STOCKX_HIGH_RES: createQueryReplaceRule('?fm=jpg&dpr=3'),
        ADIDAS_ASSETS_PATH: createRegexRule(/(\/images\/)[^/]+,[^/]+\//, '$1'),
        ADIDAS_JPG_TO_PNG: createRegexRule(/\.jpg(?=\?|$)/i, '.png'),
        ASICS_HIGH_RES: createQueryReplaceRule('?wid=3000&hei=3000&fmt=png-alpha&qlt=100'),
        FILA_SG_QUERY: {
            apply: (url) => {
                const u = safeUrlParse(url);
                if (!u) return url;
                if (u.searchParams.has('w') || u.searchParams.has('h') || u.searchParams.has('q')) return url.split('?')[0];
                return url;
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
        MLB_KOREA_SHOP_FILES: createRegexRule(/\?(?:v=\d+&width=\d+|width=\d+&v=\d+|v=\d+|width=\d+)/, ''),
        PUMA_INTL_UPLOAD_PARAMS: createRegexRule(/(\/upload\/)[^/]+\/(global\/.+)/, '$1$2'),
        PUMA_CN_IMAGE_PROCESSING: createRegexRule(/([?&]imageMogr2\/[^&]*)/, ''),
        SKECHERS_USA_PATH: createRegexRule(/(\/image);[^/]+/, '$1'),
        SKECHERS_SG_SUFFIX: createRegexRule(/(\_\d+x\d+)(?=\.(?:jpg|jpeg|png|webp|gif))/i, ''),
        THENORTHFACE_INTL_CLEAN: createRegexRule(/\/t_img\/[^/]+\/v(\d+\/)/, '/v$1'),
        THENORTHFACE_CN_REMOVE_QUERY: createRegexRule(/\?\d+$/, ''),
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
        HOKA_CN_REMOVE_QUERY: createRegexRule(/\?\d+(?:#\w+)?$/, ''),
        ON_CN_REMOVE_OSS_QUERY: createRegexRule(/\?x-oss-process=image\/.*/, ''),
        POIZON_FORCE_PNG: createQueryReplaceRule('?x-oss-process=image/format,png'),
        SHOPIFY_REMOVE_SIZE: createRegexRule(/(\_\d+x\d*|\_pico|\_icon|\_thumb|\_small|\_compact|\_medium|\_large|\_grande|\_original|\_master)(?=\.\w+)/, ''),
        SANITY_CLEAN: createRegexRule(/^(https:\/\/cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/[^/?#]+).*/, '$1'),
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
            apply: (url) => {
                if (!url.includes('/is/image/')) return url;
                const base = url.split('?')[0];
                return `${base}?$zoom2000png$`;
            }
        },
    };

    const EXACT_HOST_MAP = new Map([
        ['image.goat.com', 'goat'],
        ['cdn.flightclub.com', 'flightclub'],
        ['images.stockx.com', 'stockx'],
        ['static.nike.com.cn', 'nike-cn'],
        ['static.nike.com', 'nike-global'],
        ['c.static-nike.com', 'nike-global'],
        ['www.nike.ae', 'nike-ae-like'],
        ['www.nike.com.kw', 'nike-ae-like'],
        ['www.nike.qa', 'nike-ae-like'],
        ['www.nike.sa', 'nike-ae-like'],
        ['assets.adidas.com', 'adidas-assets'],
        ['images.asics.com', 'asics-intl'],
        ['img.cdn.91app.hk', 'asics-hk'],
        ['img.91app.com', 'asics-tw'],
        ['www.brooksrunning.com', 'brooks-intl'],
        ['res-converse.baozun.com', 'converse-cn'],
        ['dam-converse.baozun.com', 'converse-cn'],
        ['www.decathlon.com', 'decathlon-intl'],
        ['pixl.decathlon.com.cn', 'decathlon-cn'],
        ['contents.mediadecathlon.com', 'decathlon-hk'],
        ['img.myshopline.com', 'fila-sg'],
        ['shoplineimg.com', 'fila-hk'],
        ['d31xv78q8gnfco.cloudfront.net', 'fila-hk-cloudfront'],
        ['dms.deckers.com', 'hoka-intl'],
        ['b2c.hoka.wishetin.com', 'hoka-cn'],
        ['lining-goods-online-1302115263.file.myqcloud.com', 'lining-cn'],
        ['i1.adis.ws', 'mizuno-usa'],
        ['static-resource.mlb-korea.com', 'mlb-korea'],
        ['en.mlb-korea.com', 'mlb-korea-shop'],
        ['nb.scene7.com', 'newbalance-intl'],
        ['itg-tezign-files.tezign.com', 'newbalance-cn'],
        ['old-order.com', 'old-order-shopify'],
        ['images.ctfassets.net', 'on-intl'],
        ['oss.on-running.cn', 'on-cn'],
        ['images.puma.com', 'puma-intl'],
        ['itg-tezign-files-tx.tezign.com', 'puma-cn'],
        ['cdn.dam.salomon.com', 'salomon-intl'],
        ['s7d4.scene7.com', 'saucony-intl'],
        ['images.skechers.com', 'skechers-usa'],
        ['www.skechers.com.hk', 'skechers-hk'],
        ['www.skechers.com.sg', 'skechers-sg'],
        ['assets.thenorthface.com', 'thenorthface-intl'],
        ['img2.thenorthface.com.cn', 'thenorthface-cn'],
        ['underarmour.scene7.com', 'underarmour-scene7'],
        ['assets.vans.com', 'vans-intl'],
        ['sneakernews.com', 'sneakernews-wp'],
        ['cdn.sanity.io', 'sanity-cdn'],
        ['cdn.poizon.com', 'poizon-cdn'],
        ['static.shihuocdn.cn', 'shihuo-cdn'],
        ['eimage.shihuocdn.cn', 'shihuo-cdn'],
        ['images.novelship.com', 'novelship-img'],
        ['www.snipesusa.com', 'snipes-demandware'],
        ['static.shiekh.com', 'magento-shiekh'],
        ['m.media-amazon.com', 'amazon-media'],
        ['i.ebayimg.com', 'ebay-img-force-png'],
        ['media.endclothing.com', 'end-clothing'],
        ['www.runnmore.com', 'runnmore-like'],
        ['www.extrasports.com', 'runnmore-like'],
        ['www.sportvision.mk', 'runnmore-like'],
        ['gnk-store.ru', 'opencart-generic'],
        ['gw.alicdn.com', 'alicdn'],
        ['img.alicdn.com', 'alicdn'],
        ['assets.footlocker.com', 'footlocker-scene7'],
        ['www.stadiumgoods.com', 'stadiumgoods-shopify'],
    ]);

    const PARTIAL_MATCH_RULES = [
        { str: 'cdn.shopify.com/s/files/1/1330/6287/files', type: 'decathlon-intl' },
        { str: 'cdn.shopify.com/s/files/1/0862/7834/0912/files', type: 'reebok-intl' },
        { str: 'cdn.shopify.com/s/files/1/0603/3031/1875/files', type: 'kickscrew-shopify' },
        { str: 't4s.cz', type: 't4s-cdn' }
    ];

    const HOST_RULE_MAP = {
        'jd-360buyimg': [BRAND_RULES.JD_360BUYIMG_REMOVE_AVIF],
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
        'old-order-shopify': [BRAND_RULES.SHOPIFY_REMOVE_SIZE, REUSABLE_RULES.REMOVE_ALL_QUERY],
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

    function detectHostTypeByUrlObj(u, fullUrlStr) {
        if (u.hostname === '360buyimg.com' || u.hostname.endsWith('.360buyimg.com')) {
            return 'jd-360buyimg';
        }

        let hostType = EXACT_HOST_MAP.get(u.hostname);
        if (!hostType) {
            if (u.pathname.startsWith('/cdn/shop/files/')) {
                hostType = 'old-order-shopify';
            } else {
                for (const rule of PARTIAL_MATCH_RULES) {
                    if (fullUrlStr.includes(rule.str)) { hostType = rule.type; break; }
                }
            }
        }
        return hostType || null;
    }

    function cleanUrl(urlStr) {
        const u = safeUrlParse(urlStr);
        if (!u) return { raw: urlStr, clean: urlStr, hostType: null };

        const hostType = detectHostTypeByUrlObj(u, urlStr);
        if (!hostType) return { raw: urlStr, clean: urlStr, hostType: null };

        const rules = HOST_RULE_MAP[hostType];
        if (!rules) return { raw: urlStr, clean: urlStr, hostType };

        let newUrl = urlStr;
        for (const r of rules) newUrl = r.apply(newUrl);
        return { raw: urlStr, clean: newUrl, hostType };
    }

    // =========================================================
    // 2) 提取候选图片
    // =========================================================
    function normalizeToAbs(url) {
        if (!url) return null;
        const s = String(url).trim();
        if (!s) return null;
        if (/^(data:|blob:|javascript:)/i.test(s)) return null;
        try { return new URL(s, location.href).toString(); } catch { return null; }
    }

    function pickBestFromSrcset(srcset) {
        if (!srcset) return null;
        const parts = srcset.split(',').map(s => s.trim()).filter(Boolean);
        if (!parts.length) return null;

        let best = null;
        for (const p of parts) {
            const seg = p.split(/\s+/).filter(Boolean);
            const url = seg[0];
            const desc = seg[1] || '';
            let score = 0;
            let wHint = 0;

            const mw = desc.match(/^(\d+)w$/i);
            if (mw) { wHint = parseInt(mw[1], 10); score = wHint; }

            const mx = desc.match(/^(\d+(?:\.\d+)?)x$/i);
            if (mx) score = parseFloat(mx[1]) * 10000;

            if (!best || score > best.score) best = { url, score, wHint };
        }
        return best;
    }

    function getExt(urlStr) {
        try {
            const u = new URL(urlStr);
            const fn = u.pathname.split('/').pop() || '';
            const m = fn.match(/\.([a-z0-9]+)$/i);
            return m ? m[1].toLowerCase() : '';
        } catch { return ''; }
    }

    function guessExtFromUrl(urlStr, extFromPath) {
        if (extFromPath) return extFromPath;
        const match = urlStr.match(/\$(zoom2000(png|jpg))\$/i);
        return match ? match[2] : '';
    }

    function safeFilenameFromUrl(urlStr, fallbackExt = 'jpg') {
        try {
            const u = new URL(urlStr);
            const pathname = u.pathname;
            const name = pathname.split('/').pop() || 'image';
            if (/\.[a-z0-9]+$/i.test(name)) return name;
            return `${name}.${fallbackExt}`;
        } catch {
            return `image.${fallbackExt}`;
        }
    }

    function getFileName(urlStr, fallbackExt) {
        try {
            const u = new URL(urlStr);
            let name = u.pathname.split('/').pop() || '';
            name = decodeURIComponent(name);
            if (!/\.[a-z0-9]+$/i.test(name) && fallbackExt) name = `${name}.${fallbackExt}`;
            return name || '(无文件名)';
        } catch {
            return '(无文件名)';
        }
    }

    function getMinSideHintFromImg(img) {
        // 优先使用 naturalWidth/Height（实际尺寸）
        let w = img.naturalWidth || 0;
        let h = img.naturalHeight || 0;

        // 如果无法获取实际尺寸，尝试使用 clientWidth/clientHeight（显示尺寸）
        if (!w || !h) {
            w = img.clientWidth || 0;
            h = img.clientHeight || 0;
        }

        // 如果仍然无法获取，返回 0
        if (!w || !h) return 0;

        return Math.min(w, h);
    }

    function extractCandidates() {
        const seen = new Set();
        const list = [];

        const add = (rawUrl, minSideHint = 0) => {
            const abs = normalizeToAbs(rawUrl);
            if (!abs) return;
            if (seen.has(abs)) return;
            seen.add(abs);
            list.push({ rawUrl: abs, minSideHint: minSideHint || 0 });
        };

        const LAZY_URL_ATTRS = [
            'data-src', 'data-original', 'data-lazy', 'data-lazy-src', 'data-url',
            'data-image', 'data-img', 'data-zoom', 'data-zoom-image', 'data-large_image',
            'data-highres', 'data-hires', 'data-full', 'data-full-url'
        ];
        const LAZY_SRCSET_ATTRS = ['data-srcset', 'data-lazy-srcset'];

        document.querySelectorAll('img, source').forEach(el => {
            const tagName = el.tagName.toLowerCase();

            const srcset = el.getAttribute('srcset');
            if (srcset) {
                const best = pickBestFromSrcset(srcset);
                if (best?.url) add(best.url, best.wHint || 0);
            }

            if (tagName === 'img') {
                const src = el.currentSrc || el.src;
                if (src) add(src, getMinSideHintFromImg(el));
            }

            for (const a of LAZY_URL_ATTRS) {
                const v = el.getAttribute(a);
                if (v) add(v, 0);
            }
            for (const a of LAZY_SRCSET_ATTRS) {
                const ss = el.getAttribute(a);
                if (ss) {
                    const best = pickBestFromSrcset(ss);
                    if (best?.url) add(best.url, best.wHint || 0);
                }
            }
        });

        document.querySelectorAll('meta[property="og:image"][content], meta[name="og:image"][content]').forEach(m => add(m.getAttribute('content'), 0));
        document.querySelectorAll('link[rel="preload"][as="image"][href]').forEach(l => add(l.getAttribute('href'), 0));

        const IMG_EXT_RE = /\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:[?#]|$)/i;
        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (href && IMG_EXT_RE.test(href)) add(href, 0);
        });

        document.querySelectorAll('[style*="url("]').forEach(el => {
            const s = el.getAttribute('style') || '';
            const matches = s.matchAll(/url\(["']?(.*?)["']?\)/gi);
            for (const m of matches) add(m[1], 0);
        });

        if (SETTINGS.scanBackgroundImages) {
            const all = document.getElementsByTagName('*');
            if (all.length <= SETTINGS.maxElementsForBgScan) {
                for (let i = 0; i < all.length; i++) {
                    const bg = getComputedStyle(all[i]).backgroundImage;
                    if (!bg || bg === 'none') continue;
                    const matches = bg.matchAll(/url\(["']?(.*?)["']?\)/gi);
                    for (const m of matches) add(m[1], 0);
                }
            }
        }

        return list;
    }

    // =========================================================
    // 3) Content-Length 过滤
    // =========================================================
    function parseLengthFromHeaders(headers) {
        const h = headers || '';

        let m = h.match(/content-range:\s*bytes\s+\d+-\d+\/(\d+)/i);
        if (m) return parseInt(m[1], 10);

        m = h.match(/content-length:\s*(\d+)/i);
        if (m) return parseInt(m[1], 10);

        return null;
    }

    function probeContentLength(url) {
        const timeoutMs = 8000;

        const doHEAD = () => new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'HEAD',
                url,
                timeout: timeoutMs,
                onload: (res) => resolve(parseLengthFromHeaders(res.responseHeaders)),
                onerror: () => resolve(null),
                ontimeout: () => resolve(null),
            });
        });

        const doRangedGET = () => new Promise((resolve) => {
            let finished = false;
            let req = null;

            const done = (v) => {
                if (finished) return;
                finished = true;
                resolve(v);
            };

            req = GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: { Range: 'bytes=0-0' },
                timeout: timeoutMs,
                responseType: 'arraybuffer',
                onprogress: (evt) => {
                    if (evt && evt.loaded > 65536) {
                        try { req && req.abort && req.abort(); } catch { /* ignore */ }
                        done(null);
                    }
                },
                onload: (res) => done(parseLengthFromHeaders(res.responseHeaders)),
                onerror: () => done(null),
                ontimeout: () => done(null),
            });
        });

        return (async () => {
            const len1 = await doHEAD();
            if (len1 != null) return len1;
            return await doRangedGET();
        })();
    }

    async function applySizeFilter(items, setStatus) {
        const minKB = Number(SETTINGS.filter.minSizeKB || 0);
        if (!minKB) return items;

        const minBytes = Math.max(0, Math.floor(minKB * 1024));
        if (!minBytes) return items;

        const concurrency = 6;
        let idx = 0;
        let done = 0;
        const out = [];
        const keepUnknown = true;

        async function worker() {
            while (idx < items.length) {
                const i = idx++;
                const it = items[i];

                setStatus?.(`检测文件大小 ${done}/${items.length}…`);
                const len = await probeContentLength(it.cleanUrl);
                done++;
                it.contentLength = len;

                if (len == null) {
                    if (keepUnknown) out.push(it);
                } else {
                    if (len >= minBytes) out.push(it);
                }
            }
        }

        await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
        setStatus?.(`检测完成：保留 ${out.length}/${items.length}`);
        return out;
    }

    // =========================================================
    // 4) 简化过滤
    // =========================================================
    function extAllowed(ext) {
        const exts = String(SETTINGS.filter.exts || '').trim();
        if (!exts) return true;
        const allow = new Set(exts.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
        if (ext === 'jpeg' && allow.has('jpg')) return true;
        if (ext === 'jpg' && allow.has('jpeg')) return true;
        return allow.has(ext);
    }

    function passSimpleFilters(minSideHint, ext) {
        const minSide = Number(SETTINGS.filter.minSidePx || 0);
        // 如果设置了分辨率过滤，过滤掉尺寸小于阈值或无法获取尺寸的图片
        if (minSide && minSideHint < minSide) return false;
        if (ext && !extAllowed(ext)) return false;
        return true;
    }

    // =========================================================
    // 工具函数
    // =========================================================
    function createUniqueNameGenerator() {
        const used = new Map();
        return (name) => {
            const c = (used.get(name) || 0) + 1;
            used.set(name, c);
            if (c === 1) return name;
            const dot = name.lastIndexOf('.');
            return dot > 0 ? `${name.slice(0, dot)}__${c}${name.slice(dot)}` : `${name}__${c}`;
        };
    }

    function gmDownloadUnified({ url, name, saveAs, setStatus, onOkText, onFailText, onTimeoutText }) {
        return new Promise((resolve) => {
            let retriedFlat = false;

            const start = (finalName) => {
                GM_download({
                    url,
                    name: finalName,
                    saveAs: !!saveAs,
                    onload: () => {
                        if (setStatus && onOkText !== undefined) setStatus(onOkText || '');
                        resolve(true);
                    },
                    ontimeout: () => {
                        if (onTimeoutText) setStatus?.(onTimeoutText);
                        else if (setStatus) setStatus('保存超时');
                        resolve(false);
                    },
                    onerror: () => {
                        if (!saveAs && !retriedFlat && typeof finalName === 'string' && finalName.includes('/')) {
                            retriedFlat = true;
                            const flat = finalName.replace(/\//g, '_');
                            if (setStatus) setStatus('当前环境可能不支持自动建文件夹，已降级为平铺文件名继续下载…');
                            start(flat);
                            return;
                        }
                        if (setStatus && onFailText !== undefined) setStatus(onFailText || '保存失败（可能被防盗链/跨域限制）');
                        resolve(false);
                    },
                });
            };

            start(name);
        });
    }

    async function runBulkDownload({ plan, state, download, onProgress, concurrency = 2, delayMs = 80 }) {
        let cursor = 0;
        let attempted = 0;
        let ok = 0;
        const fails = [];

        async function worker() {
            while (true) {
                if (state.cancel) break;
                const i = cursor++;
                if (i >= plan.length) break;

                const p = plan[i];
                const r = await download(p);
                attempted++;
                if (r) ok++;
                else fails.push(p);

                onProgress?.(attempted, ok, fails.length);
                if (delayMs) await new Promise(res => setTimeout(res, delayMs));
            }
        }

        onProgress?.(0, 0, 0);
        await Promise.all(Array.from({ length: Math.min(concurrency, plan.length) }, () => worker()));
        return { attempted, ok, fails };
    }

    async function bulkSaveAll({ items, folder, state, setHintFn, updateStopBtnFn, singleSaveFn }) {
        if (!items.length) {
            if (singleSaveFn) {
                singleSaveFn();
            } else {
                setHintFn('没有图片可保存');
            }
            return;
        }
        if (state.running) { setHintFn('正在全部保存中…如需重新开始请先点"停止"'); return; }

        const total = items.length;
        const okConfirm = window.confirm(`确认要【全部保存】${total} 张图片吗？\n可能会触发浏览器"允许多文件下载"提示。`);
        if (!okConfirm) return;

        const saveFolder = folder || buildSaveFolderForPage();
        state.running = true;
        state.cancel = false;
        updateStopBtnFn();

        const uniqName = createUniqueNameGenerator();
        const plan = items.map((it, idx) => {
            const extPath = getExt(it.cleanUrl);
            const ext = it.ext || guessExtFromUrl(it.cleanUrl, extPath) || 'jpg';
            const base = safeFilenameFromUrl(it.cleanUrl, ext);
            const numbered = `${String(idx + 1).padStart(3, '0')}_${base}`;
            return { url: it.cleanUrl, name: uniqName(`${saveFolder}/${numbered}`) };
        });

        const download = (p) => gmDownloadUnified({ url: p.url, name: p.name });

        const res1 = await runBulkDownload({
            plan,
            state,
            download,
            onProgress: (attempted, ok, fail) => setHintFn(`全部保存中：${attempted}/${total}（成功 ${ok}，失败 ${fail}）`),
        });

        if (state.cancel) {
            state.running = false;
            updateStopBtnFn();
            setHintFn(`已停止：成功 ${res1.ok}/${total}，失败 ${res1.fails.length}`);
            return;
        }

        if (res1.fails.length > 0) {
            const retry = window.confirm(`全部保存完成：成功 ${res1.ok}/${total}，失败 ${res1.fails.length}\n是否重试失败项？`);
            if (retry) {
                const res2 = await runBulkDownload({
                    plan: res1.fails,
                    state,
                    download,
                    onProgress: (attempted, ok2) => {
                        const okTotal = res1.ok + ok2;
                        setHintFn(`重试中：${attempted}/${res1.fails.length}（重试成功 ${ok2}）总成功 ${okTotal}/${total}`);
                    },
                });

                state.running = false;
                updateStopBtnFn();

                if (state.cancel) {
                    setHintFn(`已停止：总成功 ${res1.ok + res2.ok}/${total}`);
                    return;
                }

                const okTotal = res1.ok + res2.ok;
                setHintFn(`全部保存完成：成功 ${okTotal}/${total}，失败 ${total - okTotal}`);
                return;
            }
        }

        state.running = false;
        updateStopBtnFn();
        setHintFn(`全部保存完成：成功 ${res1.ok}/${total}，失败 ${res1.fails.length}`);
    }

    function saveFast({ item, index, folder, setHintFn, onOkText }) {
        const extPath = getExt(item.cleanUrl);
        const ext = item.ext || guessExtFromUrl(item.cleanUrl, extPath) || 'jpg';
        const base = safeFilenameFromUrl(item.cleanUrl, ext);
        const numbered = `${String(index + 1).padStart(3, '0')}_${base}`;

        if (!folder) folder = buildSaveFolderForPage();
        setHintFn(`一键保存：${folder}/…`);

        gmDownloadUnified({
            url: item.cleanUrl,
            name: `${folder}/${numbered}`,
            saveAs: false,
            setStatus: setHintFn,
            onOkText: onOkText || `已开始下载到：${folder}/`
        });
    }

    function stopAll({ state, setHintFn, updateStopBtnFn }) {
        if (!state.running) return;
        state.cancel = true;
        setHintFn('已请求停止下载…将停止后续任务（无法取消正在进行的单个下载）');
        updateStopBtnFn();
    }

    function updateStopBtn(overlay, selector, state) {
        const btn = overlay?.querySelector(selector);
        if (!btn) return;
        btn.disabled = !state.running;
    }

    // =========================================================
    // 5) 幻灯片 UI + 查看器联动
    // =========================================================
    let overlay = null;
    let list = [];
    let current = 0;
    let slideSaveFolder = null;

    let viewerOpen = false;

    let thumbObserver = null;
    const THUMB_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="86" height="86" viewBox="0 0 86 86">
  <rect fill="#1a1a1c" width="86" height="86" rx="14"/>
  <path fill="#333" d="M33 38a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm20 18H33l7-9 4 3 9-12 10 18z"/>
</svg>
`)}`;
    const THUMB_MAX_RENDER = 800;

    const slideBulk = { running: false, cancel: false };

    let cachedEls = null;
    let wheelHandler = null;

    function cacheOverlayElements() {
        if (!overlay) { cachedEls = null; return; }
        cachedEls = {
            counter: overlay.querySelector('#tm-counter'),
            status: overlay.querySelector('#tm-status'),
            hostType: overlay.querySelector('#tm-hosttype'),
            filename: overlay.querySelector('#tm-filename'),
            urlClean: overlay.querySelector('#tm-url-clean'),
            urlRaw: overlay.querySelector('#tm-url-raw'),
            mainImg: overlay.querySelector('#tm-main-img'),
            strip: overlay.querySelector('#tm-strip'),
            saveStop: overlay.querySelector('#tm-save-stop'),
        };
    }

    function updateSlideStopBtn() {
        updateStopBtn(overlay, '#tm-save-stop', slideBulk);
    }

    function setStatus(text) {
        const el = cachedEls?.status || overlay?.querySelector('#tm-status');
        if (!el) return;
        if (!text) { el.style.display = 'none'; el.textContent = ''; }
        else { el.style.display = 'block'; el.textContent = text; }
    }

    function updateCounter() {
        const c = cachedEls?.counter || overlay?.querySelector('#tm-counter');
        if (c) c.textContent = `${list.length ? (current + 1) : 0} / ${list.length}`;
    }

    const BTN_ID = 'tm-img-slide-float-btn';
    function updateFloatingButtonText() {
        const btn = document.getElementById(BTN_ID);
        if (!btn) return;
        btn.textContent = overlay ? '关闭' : '图片';
        btn.title = overlay ? '关闭图片幻灯片（Esc）' : '打开图片幻灯片';
    }

    function preloadAround(i) {
        const radius = Number(SETTINGS.preloadRadius || 0);
        if (!radius || list.length === 0) return;

        for (let d = 1; d <= radius; d++) {
            const a = (i + d + list.length) % list.length;
            const b = (i - d + list.length) % list.length;

            [a, b].forEach(k => {
                const u = list[k]?.cleanUrl;
                if (!u) return;
                const img = new Image();
                img.decoding = 'async';
                img.loading = 'eager';
                img.src = u;
            });
        }
    }

    function ensureThumbObserver(stripEl) {
        if (thumbObserver) return;
        thumbObserver = new IntersectionObserver((entries) => {
            for (const ent of entries) {
                if (!ent.isIntersecting) continue;
                const img = ent.target;
                const src = img.dataset.src;
                if (src) {
                    img.src = src;
                    delete img.dataset.src;
                }
                thumbObserver.unobserve(img);
            }
        }, { root: stripEl, rootMargin: '140px', threshold: 0.01 });
    }

    function renderThumbnails() {
        const strip = cachedEls?.strip || overlay?.querySelector('#tm-strip');
        if (!strip) return;

        // ✅ 修复：先断开再置空
        if (thumbObserver) {
            thumbObserver.disconnect();
            thumbObserver = null;
        }

        strip.innerHTML = '';
        if (!list.length) return;

        const renderCount = Math.min(list.length, THUMB_MAX_RENDER);
        ensureThumbObserver(strip);

        const frag = document.createDocumentFragment();
        for (let i = 0; i < renderCount; i++) {
            const it = list[i];
            const img = document.createElement('img');
            img.className = 'tm-thumb';
            img.alt = String(i + 1);
            img.loading = 'lazy';
            img.decoding = 'async';
            img.src = THUMB_PLACEHOLDER;

            img.dataset.src = it.rawUrl;

            img.addEventListener('error', () => {
                if (img.dataset.fallbackTried) {
                    img.style.opacity = '0.3';
                    img.alt = '加载失败';
                    return;
                }
                img.dataset.fallbackTried = '1';
                img.src = it.cleanUrl;
            });

            img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                show(i);
            });

            frag.appendChild(img);
            thumbObserver.observe(img);
        }
        strip.appendChild(frag);
        updateActiveThumbnail();
    }

    function updateActiveThumbnail() {
        const strip = cachedEls?.strip || overlay?.querySelector('#tm-strip');
        if (!strip) return;

        const thumbs = strip.querySelectorAll('.tm-thumb');
        thumbs.forEach(t => t.classList.remove('active'));

        const active = thumbs[current];
        if (active) {
            active.classList.add('active');
            try { active.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch { /* ignore */ }
        }
    }

    function saveCurrentImage() {
        if (!list.length) return;
        const it = list[current];
        const filename = safeFilenameFromUrl(it.cleanUrl, it.ext || 'jpg');
        setStatus('准备保存…');
        gmDownloadUnified({ url: it.cleanUrl, name: filename, saveAs: true, setStatus, onOkText: '' });
    }

    function saveCurrentImageFast() {
        if (!list.length) return;
        if (!slideSaveFolder) slideSaveFolder = buildSaveFolderForPage();
        saveFast({
            item: list[current],
            index: current,
            folder: slideSaveFolder,
            setHintFn: setStatus,
            onOkText: `已开始下载到：${slideSaveFolder}/`
        });
    }

    async function slideSaveAll() {
        return bulkSaveAll({
            items: list,
            folder: slideSaveFolder,
            state: slideBulk,
            setHintFn: setStatus,
            updateStopBtnFn: updateSlideStopBtn
        });
    }

    function slideStopAll() {
        return stopAll({
            state: slideBulk,
            setHintFn: setStatus,
            updateStopBtnFn: updateSlideStopBtn
        });
    }

    function show(i) {
        if (!list.length) return;
        current = (i + list.length) % list.length;

        const it = list[current];
        updateCounter();

        const els = cachedEls || {};
        if (els.hostType) els.hostType.textContent = it.hostType ? `[${it.hostType}]` : '[no-rule]';
        if (els.filename) els.filename.textContent = it.fileName || '(无文件名)';
        if (els.urlClean) els.urlClean.textContent = it.cleanUrl;
        if (els.urlRaw) els.urlRaw.textContent = it.rawUrl;

        const imgEl = els.mainImg || overlay?.querySelector('#tm-main-img');
        setStatus('加载中…');
        
        // ✅ 美化：添加加载动画
        imgEl.classList.add('loading');
        imgEl.style.opacity = '0';

        imgEl.onload = () => { 
            setStatus(''); 
            imgEl.style.opacity = '1'; 
            imgEl.classList.remove('loading');
        };
        imgEl.onerror = () => { 
            setStatus('加载失败（可能防盗链/不存在）'); 
            imgEl.style.opacity = '0.5'; 
            imgEl.classList.remove('loading');
        };
        imgEl.src = it.cleanUrl;

        preloadAround(current);
        updateActiveThumbnail();
        updateFloatingButtonText();

        if (viewerOpen) {
            openImageViewer(it.cleanUrl, it.fileName || it.cleanUrl);
        }
    }

    async function rebuildAndOpen() {
        setStatus('扫描页面图片…');

        const candidates = extractCandidates();
        const cleanSeen = new Set();
        const tmp = [];

        for (const c of candidates) {
            const cleaned = cleanUrl(c.rawUrl);

            const extPath = getExt(cleaned.clean);
            const ext = guessExtFromUrl(cleaned.clean, extPath);

            if (!passSimpleFilters(c.minSideHint || 0, ext)) continue;
            if (cleanSeen.has(cleaned.clean)) continue;
            cleanSeen.add(cleaned.clean);

            const fileName = getFileName(cleaned.clean, ext);

            tmp.push({
                rawUrl: c.rawUrl,
                cleanUrl: cleaned.clean,
                hostType: cleaned.hostType,
                ext,
                fileName,
                minSideHint: c.minSideHint || 0,
                contentLength: null,
            });
        }

        const filtered = await applySizeFilter(tmp, (s) => setStatus(s));
        list = filtered;
        current = 0;

        if (!list.length) {
            setStatus('未提取到图片（可能被过滤条件筛掉）');
            const els = cachedEls || {};
            if (els.hostType) els.hostType.textContent = '';
            if (els.filename) els.filename.textContent = '';
            if (els.urlClean) els.urlClean.textContent = '';
            if (els.urlRaw) els.urlRaw.textContent = '';
            if (els.mainImg) els.mainImg.src = '';
            if (els.strip) els.strip.innerHTML = '';
            updateCounter();
            updateFloatingButtonText();
            return;
        }

        setStatus('');
        renderThumbnails();
        show(0);
    }

    // =========================================================
    // Viewer（独立查看器）
    // =========================================================
    let viewerOverlay = null;
    let viewerImgEl = null;
    let viewerCurrentUrl = '';
    let viewerCurrentFilename = '';

    const viewerZoom = {
        scale: 1,
        tx: 0,
        ty: 0,
        dragging: false,
        startX: 0,
        startY: 0,
        startTx: 0,
        startTy: 0,
    };

    let viewerImgMoved = false;

    const viewerBulk = { running: false, cancel: false };

    function setViewerHint(text) {
        const hint = viewerOverlay?.querySelector('.tmv-hint');
        if (!hint) return;
        hint.textContent = text || '滚轮切图 · Alt+滚轮缩放 · 拖动平移 · 单击返回幻灯片 · Esc 关闭';
    }

    function updateViewerStopBtn() {
        updateStopBtn(viewerOverlay, '#tmv-stop', viewerBulk);
    }

    function applyViewerZoom() {
        if (!viewerImgEl) return;
        viewerImgEl.style.transform = `translate(${viewerZoom.tx}px, ${viewerZoom.ty}px) scale(${viewerZoom.scale})`;
    }

    function resetViewerZoom() {
        viewerZoom.scale = 1;
        viewerZoom.tx = 0;
        viewerZoom.ty = 0;
        viewerZoom.dragging = false;
        applyViewerZoom();
    }

    function viewerSave(saveAs) {
        if (!viewerCurrentUrl) return;
        gmDownloadUnified({
            url: viewerCurrentUrl,
            name: viewerCurrentFilename || 'image.jpg',
            saveAs: !!saveAs,
        }).then((ok) => {
            setViewerHint(ok ? (saveAs ? '已打开保存对话框' : '已开始下载') : '保存失败（可能被防盗链/跨域限制）');
        });
    }

    function viewerSaveFast() {
        if (!list.length) { setViewerHint('没有图片可保存'); return; }
        if (!slideSaveFolder) slideSaveFolder = buildSaveFolderForPage();
        saveFast({
            item: list[current],
            index: current,
            folder: slideSaveFolder,
            setHintFn: setViewerHint,
            onOkText: '已开始下载'
        });
    }

    async function viewerSaveAll() {
        return bulkSaveAll({
            items: list,
            folder: slideSaveFolder,
            state: viewerBulk,
            setHintFn: setViewerHint,
            updateStopBtnFn: updateViewerStopBtn,
            singleSaveFn: () => viewerSave(false)
        });
    }

    function viewerStopAll() {
        return stopAll({
            state: viewerBulk,
            setHintFn: setViewerHint,
            updateStopBtnFn: updateViewerStopBtn
        });
    }

    function closeImageViewer() {
        viewerOpen = false;
        if (viewerBulk.running) viewerBulk.cancel = true;

        if (!viewerOverlay) return;
        document.removeEventListener('keydown', onViewerKeydown, true);
        
        // ✅ 清理图片引用
        if (viewerImgEl) {
            viewerImgEl.onload = null;
            viewerImgEl.onerror = null;
        }
        
        viewerOverlay.remove();
        viewerOverlay = null;
        viewerImgEl = null;

        viewerCurrentUrl = '';
        viewerCurrentFilename = '';
        viewerBulk.running = false;
        viewerBulk.cancel = false;
    }

    function onViewerKeydown(e) {
        if (!viewerOverlay) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            closeImageViewer();
            return;
        }

        if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); show(current - 1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); show(current + 1); return; }
        if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); show(0); return; }
        if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); show(list.length - 1); return; }

        if (e.key === '+' || e.key === '=') {
            e.preventDefault(); e.stopPropagation();
            viewerZoom.scale = Math.min(12, viewerZoom.scale * 1.15);
            applyViewerZoom();
            return;
        }
        if (e.key === '-' || e.key === '_') {
            e.preventDefault(); e.stopPropagation();
            viewerZoom.scale = Math.max(0.1, viewerZoom.scale / 1.15);
            applyViewerZoom();
            return;
        }
        if (e.key === '0') {
            e.preventDefault(); e.stopPropagation();
            resetViewerZoom();
            return;
        }
    }

    function openImageViewer(urlStr, titleText = '') {
        injectStyles();
        viewerOpen = true;

        if (!viewerOverlay) {
            viewerOverlay = document.createElement('div');
            viewerOverlay.id = 'tm-img-viewer-overlay';

            viewerOverlay.innerHTML = `
                <div class="tmv-top">
                    <div class="tmv-title" id="tmv-title"></div>
                    <button class="tm-btn tm-btn-primary" id="tmv-save" style="padding:8px 10px;">保存</button>
                    <button class="tm-btn" id="tmv-save-fast" style="padding:8px 10px;">一键保存</button>
                    <button class="tm-btn" id="tmv-save-all" style="padding:8px 10px;">全部保存</button>
                    <button class="tm-btn" id="tmv-open" style="padding:8px 10px;">新标签打开</button>
                    <button class="tm-btn tm-btn-danger" id="tmv-stop" style="padding:8px 10px;" disabled>停止下载</button>
                    <button class="tm-btn" id="tmv-reset" style="padding:8px 10px;">还原</button>
                    <button class="tm-btn tm-btn-danger" id="tmv-close" style="padding:8px 10px;">关闭 (Esc)</button>
                </div>
                <div class="tmv-stage" id="tmv-stage">
                    <img class="tmv-img" id="tmv-img" />
                    <div class="tmv-hint">滚轮切图 · Alt+滚轮缩放 · 拖动平移 · 单击返回幻灯片 · Esc 关闭</div>
                </div>
            `;

            document.body.appendChild(viewerOverlay);

            viewerImgEl = viewerOverlay.querySelector('#tmv-img');
            const stageEl = viewerOverlay.querySelector('#tmv-stage');

            viewerOverlay.querySelector('#tmv-close').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                closeImageViewer();
            });

            viewerOverlay.querySelector('#tmv-reset').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                resetViewerZoom();
            });

            viewerOverlay.querySelector('#tmv-save').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                viewerSave(true);
            });

            viewerOverlay.querySelector('#tmv-save-fast').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                viewerSaveFast();
            });

            viewerOverlay.querySelector('#tmv-save-all').addEventListener('click', async (e) => {
                e.preventDefault(); e.stopPropagation();
                await viewerSaveAll();
            });

            viewerOverlay.querySelector('#tmv-open').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                if (!viewerCurrentUrl) return;
                window.open(viewerCurrentUrl, '_blank', 'noopener,noreferrer');
            });

            viewerOverlay.querySelector('#tmv-stop').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                viewerStopAll();
            });

            stageEl.addEventListener('click', (e) => {
                if (e.target === stageEl) closeImageViewer();
            });

            viewerImgEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (viewerImgMoved) { viewerImgMoved = false; return; }
                closeImageViewer();
            });

            let wheelLock = 0;
            stageEl.addEventListener('wheel', (e) => {
                const dy = e.deltaY || 0;
                if (Math.abs(dy) < 2) return;

                if (e.altKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    const factor = (dy < 0) ? 1.12 : 1 / 1.12;
                    viewerZoom.scale = Math.max(0.1, Math.min(12, viewerZoom.scale * factor));
                    applyViewerZoom();
                    return;
                }

                const now = Date.now();
                if (now - wheelLock < 120) return;
                wheelLock = now;

                e.preventDefault();
                e.stopPropagation();

                if (dy > 0) show(current + 1);
                else show(current - 1);
            }, { passive: false });

            viewerImgEl.addEventListener('pointerdown', (e) => {
                if (viewerZoom.scale <= 1) return;
                viewerImgMoved = false;

                viewerImgEl.setPointerCapture?.(e.pointerId);
                viewerZoom.dragging = true;
                viewerZoom.startX = e.clientX;
                viewerZoom.startY = e.clientY;
                viewerZoom.startTx = viewerZoom.tx;
                viewerZoom.startTy = viewerZoom.ty;
                e.preventDefault();
                e.stopPropagation();
            });

            viewerImgEl.addEventListener('pointermove', (e) => {
                if (!viewerZoom.dragging) return;
                const dx = e.clientX - viewerZoom.startX;
                const dy = e.clientY - viewerZoom.startY;

                if (Math.abs(dx) + Math.abs(dy) > 6) viewerImgMoved = true;

                viewerZoom.tx = viewerZoom.startTx + dx;
                viewerZoom.ty = viewerZoom.startTy + dy;
                applyViewerZoom();
                e.preventDefault();
                e.stopPropagation();
            });

            const endDrag = (e) => {
                if (!viewerZoom.dragging) return;
                viewerZoom.dragging = false;
                e.preventDefault();
                e.stopPropagation();
            };
            viewerImgEl.addEventListener('pointerup', endDrag);
            viewerImgEl.addEventListener('pointercancel', endDrag);

            document.addEventListener('keydown', onViewerKeydown, true);
        }

        viewerOverlay.querySelector('#tmv-title').textContent = titleText || urlStr;

        viewerCurrentUrl = urlStr;
        const extPath = getExt(urlStr);
        const ext = guessExtFromUrl(urlStr, extPath) || 'jpg';
        viewerCurrentFilename = safeFilenameFromUrl(urlStr, ext);

        resetViewerZoom();
        updateViewerStopBtn();
        setViewerHint('');

        viewerOverlay.querySelector('#tmv-stop').disabled = !viewerBulk.running;

        viewerImgEl.onerror = () => { setViewerHint('加载失败（可能防盗链/不存在）'); };
        viewerImgEl.src = urlStr;
    }

    // =========================================================
    // 幻灯片 overlay 构建/事件
    // =========================================================
    function buildOverlay() {
        injectStyles();
        slideSaveFolder = buildSaveFolderForPage();

        overlay = document.createElement('div');
        overlay.id = 'tm-img-slide-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.90);
            z-index: 2147483646;
            display: grid;
            grid-template-rows: auto 1fr ${FOOTER_HEIGHT_PX}px;
            color: rgba(255,255,255,0.92);
            overflow: hidden;
        `;

        overlay.innerHTML = `
            <div class="tm-glassbar tm-topbar">
                <div class="tm-top-left">
                    <div class="tm-pill">
                      <div class="tm-kv"><span id="tm-counter">0 / 0</span> <small>图片</small></div>
                    </div>
                    <div class="tm-pill">
                      <div class="tm-kv"><span id="tm-hosttype">[no-rule]</span></div>
                    </div>
                </div>

                <div id="tm-filename" class="tm-filename"></div>

                <div class="tm-top-right">
                    <button id="tm-save" class="tm-btn tm-btn-primary">保存</button>
                    <button id="tm-save-fast" class="tm-btn">一键保存</button>
                    <button id="tm-save-all" class="tm-btn">全部保存</button>
                    <button id="tm-save-stop" class="tm-btn tm-btn-danger" disabled>停止</button>
                    <button id="tm-open" class="tm-btn">新标签打开</button>
                    <button id="tm-refresh" class="tm-btn">重新扫描</button>
                    <button id="tm-close" class="tm-btn tm-btn-danger">关闭 (Esc)</button>
                </div>
            </div>

            <div class="tm-stage">
                <div class="tm-canvas" id="tm-canvas">
                    <button id="tm-prev" class="tm-navbtn" style="left:14px;">‹</button>

                    <div class="tm-image-box">
                        <img id="tm-main-img" class="tm-main-img" title="点击：打开查看器；滚轮：切换图片" />
                    </div>

                    <button id="tm-next" class="tm-navbtn" style="right:14px;">›</button>

                    <div id="tm-status" class="tm-hint" style="display:none;"></div>
                    <div id="tm-help" class="tm-hint" style="display:block;">滚轮切换 · 点击主图：查看器 · ←/→ 切换 · Esc 关闭</div>
                </div>

                <div class="tm-strip-panel">
                    <div id="tm-strip" class="tm-strip"></div>
                </div>
            </div>

            <div class="tm-glassfooter" style="padding:12px 14px; height:${FOOTER_HEIGHT_PX}px; overflow:auto;">
                <div id="tm-link-block" style="margin-top:8px;">
                    <div class="tm-label">当前链接（已清洗）</div>
                    <div id="tm-url-clean" class="tm-url" style="margin-bottom:10px;"></div>

                    <div class="tm-label">原始链接</div>
                    <div id="tm-url-raw" class="tm-url"></div>
                </div>
            </div>
        `;

        const $ = (sel) => overlay.querySelector(sel);

        bindClick($('#tm-close'), closeSlideshow);
        bindClick($('#tm-prev'), () => show(current - 1));
        bindClick($('#tm-next'), () => show(current + 1));
        bindClick($('#tm-refresh'), rebuildAndOpen);

        bindClick($('#tm-open'), () => {
            if (!list.length) return;
            window.open(list[current].cleanUrl, '_blank', 'noopener,noreferrer');
        });

        bindClick($('#tm-save'), saveCurrentImage);
        bindClick($('#tm-save-fast'), saveCurrentImageFast);
        bindClick($('#tm-save-all'), slideSaveAll);
        bindClick($('#tm-save-stop'), slideStopAll);

        bindClick($('#tm-main-img'), () => {
            if (!list.length) return;
            const it = list[current];
            openImageViewer(it.cleanUrl, it.fileName || it.cleanUrl);
        });

        let wheelLock = 0;
        const canvasEl = $('#tm-canvas');
        wheelHandler = (e) => {
            // ✅ 修复：查看器打开时不响应
            if (viewerOpen) return;
            
            const now = Date.now();
            if (now - wheelLock < 120) return;

            const dy = e.deltaY || 0;
            if (Math.abs(dy) < 2) return;

            if (e.target instanceof Element && e.target.closest('.tm-navbtn')) return;

            e.preventDefault();
            e.stopPropagation();

            wheelLock = now;
            if (dy > 0) show(current + 1);
            else show(current - 1);
        };
        canvasEl.addEventListener('wheel', wheelHandler, { passive: false });

        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSlideshow(); });

        document.body.appendChild(overlay);
        document.addEventListener('keydown', onKeydown, true);

        cacheOverlayElements();

        updateSlideStopBtn();
        setStatus('');
    }

    function openSlideshow() {
        if (overlay) return;
        buildOverlay();
        rebuildAndOpen();
        updateFloatingButtonText();
    }

    function closeSlideshow() {
        slideBulk.cancel = true;
        slideBulk.running = false;
        updateSlideStopBtn();

        if (viewerOpen) closeImageViewer();

        if (!overlay) return;
        
        // ✅ 修复：先清理监听器
        const canvasEl = overlay.querySelector('#tm-canvas');
        if (canvasEl && wheelHandler) {
            canvasEl.removeEventListener('wheel', wheelHandler);
            wheelHandler = null;
        }

        // ✅ 修复：清理 observer
        if (thumbObserver) {
            thumbObserver.disconnect();
            thumbObserver = null;
        }

        document.removeEventListener('keydown', onKeydown, true);
        overlay.remove();
        overlay = null;
        cachedEls = null;
        list = [];
        current = 0;
        slideSaveFolder = null;

        updateFloatingButtonText();
    }

    function toggleSlideshow() {
        overlay ? closeSlideshow() : openSlideshow();
    }

    function onKeydown(e) {
        if (!overlay || viewerOpen) return;

        const keyHandlers = {
            Escape: closeSlideshow,
            ArrowLeft: () => show(current - 1),
            ArrowRight: () => show(current + 1),
            Home: () => show(0),
            End: () => show(list.length - 1),
        };

        if (keyHandlers[e.key]) {
            e.preventDefault();
            keyHandlers[e.key]();
        }
    }

    // =========================================================
    // 工具函数：事件绑定辅助
    // =========================================================
    function bindClick(el, fn) {
        el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fn(e); });
    }
    function bindEvent(el, type, fn) {
        el.addEventListener(type, (e) => { e.preventDefault(); e.stopPropagation(); fn(e); });
    }

    function setVisibility(el, visible) {
        el.style.visibility = visible ? 'visible' : 'hidden';
        el.style.pointerEvents = visible ? 'auto' : 'none';
    }
    function setBtnPos(btn, left, top) {
        btn.style.left = `${left}px`;
        btn.style.top = `${top}px`;
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
    }

    // =========================================================
    // 右下角可拖动按钮
    // =========================================================
    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    function applyBtnPosition(btn) {
        const pos = SETTINGS.btnPos;
        if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
            setBtnPos(btn, pos.left, pos.top);
        } else {
            btn.style.left = 'auto';
            btn.style.top = 'auto';
            btn.style.right = '18px';
            btn.style.bottom = '140px';
        }
    }

    function injectButton() {
        injectStyles();

        if (isBlacklisted()) {
            const existed = document.getElementById(BTN_ID);
            if (existed) existed.remove();
            return;
        }

        const existed = document.getElementById(BTN_ID);
        if (!SETTINGS.enableButton) {
            if (existed) existed.remove();
            return;
        }
        if (existed || !document.body) return;

        const btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.type = 'button';
        btn.textContent = '图片';
        btn.style.cssText = `
            position: fixed;
            z-index: 2147483645;
            padding: 12px 16px;
            border: 1px solid rgba(255,255,255,0.14);
            border-radius: 14px;
            background: rgba(18,18,20,0.72);
            color: rgba(255,255,255,0.92);
            cursor: pointer;
            box-shadow: none;
            user-select: none;
            touch-action: none;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transition: transform .15s ease, box-shadow .2s ease, background .15s ease;
            font-family: var(--tm-font);
            font-size: 16px;
            font-weight: 900;
            letter-spacing: .4px;
        `;
        applyBtnPosition(btn);

        let dragging = false;
        let moved = false;
        let startX = 0, startY = 0;
        let startLeft = 0, startTop = 0;

        const getRectLT = () => {
            const r = btn.getBoundingClientRect();
            return { left: r.left, top: r.top, w: r.width, h: r.height };
        };

        bindEvent(btn, 'pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType !== 'touch') return;
            btn.setPointerCapture?.(e.pointerId);

            dragging = true;
            moved = false;

            const r = getRectLT();
            startLeft = r.left;
            startTop = r.top;
            startX = e.clientX;
            startY = e.clientY;
        });

        bindEvent(btn, 'pointermove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;

            const r = getRectLT();
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            let newLeft = clamp(startLeft + dx, 6, vw - r.w - 6);
            let newTop = clamp(startTop + dy, 6, vh - r.h - 6);

            setBtnPos(btn, newLeft, newTop);
        });

        const endDrag = (e) => {
            if (!dragging) return;
            dragging = false;

            const r = btn.getBoundingClientRect();
            SETTINGS.btnPos = { left: Math.round(r.left), top: Math.round(r.top) };
            GM_setValue(STORE_KEYS.BTN_POS, SETTINGS.btnPos);
        };

        bindEvent(btn, 'pointerup', endDrag);
        bindEvent(btn, 'pointercancel', endDrag);

        bindClick(btn, () => {
            if (moved) return;
            toggleSlideshow();
        });

        document.body.appendChild(btn);
        updateFloatingButtonText();
    }

    // =========================================================
    // 简化设置面板
    // =========================================================
    const PANEL_ID = 'tm-slide-settings-simple';

    function openSettingsPanel() {
        injectStyles();
        if (document.getElementById(PANEL_ID)) return;

        const p = document.createElement('div');
        p.id = PANEL_ID;
        p.style.cssText = `
            position: fixed;
            right: 18px;
            bottom: 210px;
            width: 340px;
            max-width: calc(100vw - 36px);
            z-index: 2147483645;
            background: rgba(18,18,20,0.78);
            color: rgba(255,255,255,0.92);
            border: 1px solid rgba(255,255,255,0.14);
            border-radius: 14px;
            box-shadow: 0 18px 50px rgba(0,0,0,0.50);
            font-family: var(--tm-font);
            padding: 14px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        `;

        p.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="font-weight:900;font-size:18px;">通用设置</div>
                <div style="flex:1;"></div>
                <button id="tm-s-close" class="tm-btn tm-btn-ghost" style="padding:8px 10px;">关闭</button>
            </div>

            <div style="margin-top:10px;">
                <div class="tm-label">下载根目录名称</div>
                <input id="tm-root-folder" type="text" value="${String(SETTINGS.saveRootFolder || 'TM_Images')}" placeholder="TM_Images" />
            </div>

            <div style="margin-top:10px;">
                <div class="tm-label">分辨率：最短边 ≥ (px)</div>
                <input id="tm-minSide" type="number" min="0" value="${Number(SETTINGS.filter.minSidePx || 0)}" />
            </div>

            <div style="margin-top:10px;">
                <div class="tm-label">文件大小：Content-Length ≥ (KB)（0=不限）</div>
                <input id="tm-minKB" type="number" min="0" value="${Number(SETTINGS.filter.minSizeKB || 0)}" />
            </div>

            <div style="margin-top:10px;">
                <div class="tm-label">允许后缀名（逗号分隔；空=不限）</div>
                <input id="tm-exts" type="text" value="${String(SETTINGS.filter.exts || '')}" placeholder="jpg,png,webp" />
                <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
                    <button class="tm-ext-preset tm-btn tm-btn-ghost" style="padding:6px 10px;font-size:13px;" data-value="jpeg,jpg,png,webp,avif">全部常见</button>
                    <button class="tm-ext-preset tm-btn tm-btn-ghost" style="padding:6px 10px;font-size:13px;" data-value="jpeg,jpg,png,webp">常用</button>
                    <button class="tm-ext-preset tm-btn tm-btn-ghost" style="padding:6px 10px;font-size:13px;" data-value="png,avif">高质量</button>
                    <button class="tm-ext-preset tm-btn tm-btn-ghost" style="padding:6px 10px;font-size:13px;" data-value="jpeg,jpg">JPEG</button>
                    <button class="tm-ext-preset tm-btn tm-btn-ghost" style="padding:6px 10px;font-size:13px;" data-value="webp">WebP</button>
                </div>
            </div>

            <div style="margin-top:12px;display:flex;gap:10px;">
                <button id="tm-s-save" class="tm-btn tm-btn-primary" style="flex:1;">保存</button>
                <button id="tm-s-resetpos" class="tm-btn" style="flex:1;">重置按钮位置</button>
            </div>
        `;

        p.querySelector('#tm-s-close').onclick = () => p.remove();

        p.querySelector('#tm-s-resetpos').onclick = () => {
            SETTINGS.btnPos = null;
            GM_setValue(STORE_KEYS.BTN_POS, SETTINGS.btnPos);
            const btn = document.getElementById(BTN_ID);
            if (btn) applyBtnPosition(btn);
        };

        p.querySelectorAll('.tm-ext-preset').forEach(btn => {
            btn.onclick = () => {
                const value = btn.dataset.value;
                const input = p.querySelector('#tm-exts');
                if (input) input.value = value;
            };
        });

        p.querySelector('#tm-s-save').onclick = () => {
            SETTINGS.saveRootFolder = String(p.querySelector('#tm-root-folder').value || 'TM_Images');
            SETTINGS.filter.minSidePx = Math.max(0, parseInt(p.querySelector('#tm-minSide').value, 10) || 0);
            SETTINGS.filter.minSizeKB = Math.max(0, parseInt(p.querySelector('#tm-minKB').value, 10) || 0);
            SETTINGS.filter.exts = String(p.querySelector('#tm-exts').value || '');
            GM_setValue(STORE_KEYS.SAVE_ROOT_FOLDER, SETTINGS.saveRootFolder);
            saveFilter();
            if (overlay) rebuildAndOpen();
            p.remove();
        };

        document.body.appendChild(p);
    }

    // =========================================================
    // 黑名单设置面板
    // =========================================================
    const BLACKLIST_PANEL_ID = 'tm-blacklist-settings';

    function openBlacklistPanel() {
        injectStyles();
        const existingPanel = document.getElementById(BLACKLIST_PANEL_ID);
        if (existingPanel) {
            existingPanel.remove();
            return;
        }

        const p = document.createElement('div');
        p.id = BLACKLIST_PANEL_ID;
        p.style.cssText = `
            position: fixed;
            right: 18px;
            bottom: 210px;
            width: 380px;
            max-width: calc(100vw - 36px);
            max-height: 80vh;
            z-index: 2147483645;
            background: rgba(18,18,20,0.78);
            color: rgba(255,255,255,0.92);
            border: 1px solid rgba(255,255,255,0.14);
            border-radius: 14px;
            box-shadow: 0 18px 50px rgba(0,0,0,0.50);
            font-family: var(--tm-font);
            padding: 14px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
        `;

        p.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div style="font-weight:900;font-size:18px;">黑名单设置</div>
                <div style="flex:1;"></div>
                <button id="tm-bl-close" class="tm-btn tm-btn-ghost" style="padding:8px 10px;">关闭</button>
            </div>

            <div style="margin-bottom:12px;font-size:14px;color:rgba(255,255,255,0.74);">
                在这些网站上脚本将不会运行。留空表示不限制。支持 *.example.com 格式（如 *.google.com）。
            </div>

            <div style="display:flex;gap:8px;margin-bottom:12px;">
                <input id="tm-bl-input" type="text" placeholder="输入域名（如 example.com）"
                    style="flex:1;font-family:var(--tm-font);font-size:15px;padding:10px 12px;
                    border-radius:12px;border:1px solid var(--tm-border);
                    background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.94);outline:none;">
                <button id="tm-bl-add" class="tm-btn tm-btn-primary" style="padding:10px 16px;">添加</button>
            </div>

            <div id="tm-bl-list" style="flex:1;overflow-y:auto;padding:8px 0;
                border-top:1px solid var(--tm-border);"></div>

            <div style="margin-top:12px;display:flex;gap:8px;justify-content:space-between;">
                <button id="tm-bl-clear" class="tm-btn tm-btn-danger" style="padding:8px 12px;">清空全部</button>
                <div style="display:flex;gap:8px;">
                    <button id="tm-bl-export" class="tm-btn" style="padding:8px 12px;">导出配置</button>
                    <button id="tm-bl-import" class="tm-btn tm-btn-primary" style="padding:8px 12px;">导入配置</button>
                </div>
            </div>
            <div style="margin-top:8px;display:flex;gap:8px;justify-content:space-between;">
                <div style="color:rgba(255,255,255,0.74);font-size:13px;padding:8px 0;">
                    共 <span id="tm-bl-count">0</span> 个网站
                </div>
                <div style="display:none;">
                    <input id="tm-bl-import-file" type="file" accept=".json" />
                </div>
            </div>
        `;

        const listEl = p.querySelector('#tm-bl-list');
        const inputEl = p.querySelector('#tm-bl-input');
        const countEl = p.querySelector('#tm-bl-count');

        function renderList() {
            listEl.innerHTML = '';
            if (!SETTINGS.blacklist || SETTINGS.blacklist.length === 0) {
                listEl.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.54);font-size:14px;">暂无黑名单网站（在所有网站启用脚本）</div>';
                countEl.textContent = '0';
                return;
            }

            SETTINGS.blacklist.forEach((site, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;';
                item.innerHTML = `
                    <span style="flex:1;font-family:monospace;font-size:14px;
                        color:rgba(255,255,255,0.88);word-break:break-all;">${site}</span>
                    <button class="tm-bl-delete tm-btn tm-btn-danger" data-idx="${idx}"
                        style="padding:6px 12px;font-size:13px;">删除</button>
                `;
                listEl.appendChild(item);
            });
            countEl.textContent = SETTINGS.blacklist.length;
        }

        listEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('tm-bl-delete')) {
                const idx = parseInt(e.target.dataset.idx, 10);
                SETTINGS.blacklist.splice(idx, 1);
                saveBlacklist();
                renderList();
            }
        });

        p.querySelector('#tm-bl-add').onclick = () => {
            const input = inputEl.value.trim();
            if (!input) return;
            if (SETTINGS.blacklist.includes(input)) {
                alert('该网站已存在于黑名单中');
                return;
            }
            SETTINGS.blacklist.push(input);
            saveBlacklist();
            inputEl.value = '';
            renderList();
            if (isBlacklisted()) {
                const existedBtn = document.getElementById(BTN_ID);
                if (existedBtn) existedBtn.remove();
            } else {
                injectButton();
            }
        };

        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                p.querySelector('#tm-bl-add').click();
            }
        });

        p.querySelector('#tm-bl-clear').onclick = () => {
            if (SETTINGS.blacklist.length === 0) return;
            if (confirm('确认清空所有黑名单网站吗？之后将在所有网站启用脚本。')) {
                SETTINGS.blacklist = [];
                saveBlacklist();
                renderList();
                injectButton();
            }
        };

        p.querySelector('#tm-bl-export').onclick = () => {
            const data = JSON.stringify({ blacklist: SETTINGS.blacklist, version: '1.0' }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sneaker-image-helper-blacklist-${yyyymmdd()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };

        const importFileInput = p.querySelector('#tm-bl-import-file');
        p.querySelector('#tm-bl-import').onclick = () => {
            importFileInput.click();
        };

        importFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (Array.isArray(data.blacklist)) {
                        const imported = data.blacklist.filter(site => typeof site === 'string' && site.trim());
                        if (imported.length === 0) {
                            alert('导入的黑名单为空');
                            return;
                        }
                        const merge = confirm(`检测到 ${imported.length} 个黑名单项。\n\n点击"确定"将合并到现有黑名单，点击"取消"将替换现有黑名单。`);
                        if (merge) {
                            const existing = new Set(SETTINGS.blacklist);
                            imported.forEach(site => {
                                if (!existing.has(site)) {
                                    SETTINGS.blacklist.push(site);
                                    existing.add(site);
                                }
                            });
                        } else {
                            SETTINGS.blacklist = imported;
                        }
                        saveBlacklist();
                        renderList();
                        if (isBlacklisted()) {
                            const existedBtn = document.getElementById(BTN_ID);
                            if (existedBtn) existedBtn.remove();
                        } else {
                            injectButton();
                        }
                        alert(`导入成功！当前黑名单共 ${SETTINGS.blacklist.length} 个网站。`);
                    } else {
                        alert('导入失败：文件格式不正确');
                    }
                } catch (err) {
                    console.error('导入黑名单失败：', err);
                    alert('导入失败：无法解析文件');
                }
                importFileInput.value = '';
            };
            reader.readAsText(file);
        };

        p.querySelector('#tm-bl-close').onclick = () => p.remove();

        renderList();
        document.body.appendChild(p);
        inputEl.focus();
    }

    // =========================================================
    // 菜单项
    // =========================================================
    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('打开/关闭 幻灯片', toggleSlideshow);

        GM_registerMenuCommand(
            `${SETTINGS.enableButton ? '停用' : '启用'} 右下角按钮（同步）`,
            () => {
                SETTINGS.enableButton = !SETTINGS.enableButton;
                GM_setValue(STORE_KEYS.ENABLE_BUTTON, SETTINGS.enableButton);
                injectButton();
            }
        );

        GM_registerMenuCommand('设置：根目录/分辨率/大小/后缀', openSettingsPanel);
        GM_registerMenuCommand('黑名单设置', openBlacklistPanel);
    }

    // =========================================================
    // 启动
    // =========================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectButton);
    } else {
        injectButton();
    }

})();
