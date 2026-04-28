// ==UserScript==
// @name         Image Helper
// @name:zh-CN   图片助手
// @name:en      Image Helper
// @namespace    https://github.com/tlgj/Browser-Scripts
// @version      1.16.0
// @description  提取页面图片并清洗到高清，支持多品牌 URL 规则、幻灯片浏览、独立查看器、保存/快速保存/全部保存，并支持脚本黑名单。
// @author       tlgj
// @license      MIT
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_setClipboard
// @connect      *
// @downloadURL  https://raw.githubusercontent.com/tlgj/Browser-Scripts/main/image-helper.user.js
// @updateURL    https://raw.githubusercontent.com/tlgj/Browser-Scripts/main/image-helper.user.js
// ==/UserScript==

(function () {
  "use strict";

  // =========================================================
  // 固定底部栏高度（用于"固定图片框大小"，避免切换时闪烁/跳动）
  // =========================================================
  const FOOTER_HEIGHT_PX = 180;

  // =========================================================
  // 一键/全部保存：自动子文件夹
  // 说明：GM_download 的 name 支持 "folder/file.ext" 时才会创建文件夹；
  // 若环境不支持，本脚本会自动降级为"平铺文件名"继续下载。
  // =========================================================

  // 专门用于清理文件名的函数
  // 处理更多可能导致保存失败的特殊字符
  function sanitizeFilename(input, maxLen = 255) {
    const s = String(input || "")
      .trim()
      // 替换文件名中不允许的字符（Windows/Mac/Linux通用）
      .replace(/[\\/:*?"<>|]+/g, "_")
      // 替换其他可能导致问题的特殊字符
      .replace(/[%#@&!;()\[\]{}<>]+/g, "_")
      // 替换控制字符
      .replace(/[\u0000-\u001f\u007f-\u009f]+/g, "_")
      // 替换连续空格和特殊符号
      .replace(/\s+/g, "_")
      .replace(/[._]{2,}/g, "_")
      // 移除开头/结尾的特殊字符
      .replace(/^[_\.\s-]+|[_\.\s-]+$/g, "")
      // 替换换行符
      .replace(/[\r\n\t]+/g, "_");
    return (s || "untitled").slice(0, maxLen);
  }

  function buildSaveFolderForPage() {
    const root = sanitizeFilename(SETTINGS.saveRootFolder || "TM_Images", 30);
    const title = sanitizeFilename(document.title || "page", 60);
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const timeStr = `${yyyy}-${mo}-${dd}_${hh}${mm}${ss}`;
    return `${root}/${title}_${timeStr}`;
  }

  // =========================================================
  // 0) 存储与简化配置
  // =========================================================
  const STORE_KEYS = {
    ENABLE_BUTTON: "sih_enable_button",
    BTN_POS: "sih_btn_pos",
    BTN_POS_LOCKED: "sih_btn_pos_locked",
    FILTER: "sih_filter",
    BLACKLIST: "sih_blacklist",
    SAVE_ROOT_FOLDER: "sih_save_root_folder",
    SLIDE_LOAD_MODE: "sih_slide_load_mode",
    SLIDE_RAW_PREVIEW_DELAY_MS: "sih_slide_raw_preview_delay_ms",
    ENHANCED_IMAGE_DISCOVERY: "sih_enhanced_image_discovery",
  };

  const DEFAULT_BTN_OFFSET = 18;
  const DEFAULT_BTN_PANEL_GAP = 12;

  const DEFAULTS = {
    enableButton: true,
    btnPos: null,
    btnPosLocked: false,
    filter: {
      minSidePx: 100,
      minSizeKB: 0,
      exts: "jpeg,jpg,png,webp,avif",
    },
    scanBackgroundImages: false,
    maxElementsForBgScan: 8000,
    enhancedImageDiscovery: false,
    preloadRadius: 2,
    blacklist: [],
    saveRootFolder: "TM_Images",
    // 幻灯片主图加载模式：
    // - clean：直接加载清洗后的高清链接（默认）
    // - raw：直接加载原始链接（更省流/更快，但可能不清晰）
    // - raw-then-clean：先原始预览，再切换到清洗后的高清（体验最好）
    slideLoadMode: "raw-then-clean",
    // raw-then-clean 模式下：raw 预览停留多久再切 clean（毫秒）
    slideRawPreviewDelayMs: 120,
  };

  const SETTINGS = {
    enableButton: GM_getValue(STORE_KEYS.ENABLE_BUTTON, DEFAULTS.enableButton),
    btnPos: GM_getValue(STORE_KEYS.BTN_POS, DEFAULTS.btnPos),
    btnPosLocked: GM_getValue(STORE_KEYS.BTN_POS_LOCKED, DEFAULTS.btnPosLocked),
    slideLoadMode: GM_getValue(
      STORE_KEYS.SLIDE_LOAD_MODE,
      DEFAULTS.slideLoadMode
    ),
    slideRawPreviewDelayMs: GM_getValue(
      STORE_KEYS.SLIDE_RAW_PREVIEW_DELAY_MS,
      DEFAULTS.slideRawPreviewDelayMs
    ),
    filter: (() => {
      const savedFilter = GM_getValue(STORE_KEYS.FILTER, {});
      return {
        minSidePx:
          savedFilter.minSidePx !== undefined && savedFilter.minSidePx !== ""
            ? savedFilter.minSidePx
            : DEFAULTS.filter.minSidePx,
        minSizeKB:
          savedFilter.minSizeKB !== undefined && savedFilter.minSizeKB !== ""
            ? savedFilter.minSizeKB
            : DEFAULTS.filter.minSizeKB,
        exts:
          savedFilter.exts !== undefined && savedFilter.exts !== ""
            ? savedFilter.exts
            : DEFAULTS.filter.exts,
      };
    })(),
    scanBackgroundImages: DEFAULTS.scanBackgroundImages,
    maxElementsForBgScan: DEFAULTS.maxElementsForBgScan,
    enhancedImageDiscovery: GM_getValue(
      STORE_KEYS.ENHANCED_IMAGE_DISCOVERY,
      DEFAULTS.enhancedImageDiscovery
    ),
    preloadRadius: DEFAULTS.preloadRadius,
    blacklist: GM_getValue(STORE_KEYS.BLACKLIST, DEFAULTS.blacklist) || [],
    saveRootFolder: GM_getValue(
      STORE_KEYS.SAVE_ROOT_FOLDER,
      DEFAULTS.saveRootFolder
    ),
  };

  function saveFilter() {
    const filterToSave = {
      minSidePx:
        SETTINGS.filter.minSidePx !== "" && SETTINGS.filter.minSidePx !== null
          ? SETTINGS.filter.minSidePx
          : DEFAULTS.filter.minSidePx,
      minSizeKB:
        SETTINGS.filter.minSizeKB !== "" && SETTINGS.filter.minSizeKB !== null
          ? SETTINGS.filter.minSizeKB
          : DEFAULTS.filter.minSizeKB,
      exts:
        SETTINGS.filter.exts !== "" && SETTINGS.filter.exts !== null
          ? SETTINGS.filter.exts
          : DEFAULTS.filter.exts,
    };
    GM_setValue(STORE_KEYS.FILTER, filterToSave);
  }
  function saveBlacklist() {
    GM_setValue(STORE_KEYS.BLACKLIST, SETTINGS.blacklist);
  }

  function normalizeBlacklistEntry(input) {
    const value = String(input || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^\.+/, "")
      .replace(/\/+.*$/, "")
      .replace(/:\d+$/, "");
    if (!value) return "";
    if (value === "*") return "";
    if (value.startsWith("*.")) {
      const domain = value.slice(2).replace(/^\.+/, "");
      return domain ? `*.${domain}` : "";
    }
    return value;
  }

  function getCurrentHostVariants() {
    const hostname = String(location.hostname || "")
      .trim()
      .toLowerCase();
    if (!hostname) return [];
    const variants = new Set([hostname]);
    if (hostname.startsWith("www.")) {
      variants.add(hostname.slice(4));
    } else {
      variants.add(`www.${hostname}`);
    }
    return Array.from(variants).filter(Boolean);
  }

  function isHostExactMatchedInList(hostname, list) {
    if (!list || !list.length) return false;
    const host = String(hostname || "")
      .trim()
      .toLowerCase();
    if (!host) return false;
    return list.some((site) => normalizeBlacklistEntry(site) === host);
  }

  function isBlacklisted(hostname = location.hostname) {
    return isHostExactMatchedInList(hostname, SETTINGS.blacklist);
  }

  function refreshButtonVisibilityByBlacklist() {
    const existedBtn = document.getElementById(BTN_ID);
    const settingsPanel = document.getElementById(PANEL_ID);
    const blacklistPanel = document.getElementById(BLACKLIST_PANEL_ID);
    if (isBlacklisted()) {
      if (overlay) closeSlideshow();
      if (settingsPanel) settingsPanel.remove();
      if (blacklistPanel) blacklistPanel.remove();
      if (existedBtn) existedBtn.remove();
      return false;
    }
    injectButton();
    return true;
  }

  function canRunSlideshowScan(options = {}) {
    const { silent = false } = options;
    if (!isBlacklisted()) return true;
    refreshButtonVisibilityByBlacklist();
    if (!silent) {
      alert("当前站点已在脚本黑名单中，已禁止打开幻灯片和扫描页面图片。");
    }
    return false;
  }

  // =========================================================
  // UI Styles（美化版）
  // =========================================================
  const STYLE_ID = "sih-style-v1440";
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
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
  flex-wrap: wrap;
}

.tm-top-left{ display:flex; align-items:center; gap:12px; flex-wrap: wrap; }
.tm-top-right{ display:flex; align-items:center; gap:10px; flex-wrap: wrap; justify-content:flex-end; }

.tm-filename{
  flex: 1 1 320px; min-width: 220px; text-align: center; padding: 0 12px;
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

.tm-link-row{
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tm-link-main{
  flex: 1 1 auto;
  min-width: 0;
}

.tm-copy-btn{
  flex: 0 0 auto;
  min-width: 72px;
  padding: 8px 10px;
  font-size: 14px;
  font-weight: 800;
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  white-space: nowrap;
  text-align: center;
}

/* 文件夹区域样式 */
#tm-folder-pill{
  max-width: 350px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
#tm-folder-pill:hover{
  background: rgba(0,0,0,0.28);
  border-color: rgba(255,255,255,0.18);
}
#tm-folder-pill .tm-kv{
  max-width: 100%;
  overflow: hidden;
}
#tm-folder{
  display: inline-block;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

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
#tm-prev.tm-navbtn{ left:0; }
#tm-next.tm-navbtn{ right:0; }

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
  white-space: nowrap;
  word-break: keep-all;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  // Rules（清洗规则 / host 映射）
  // 说明：按“工具函数 → 可复用规则 → 品牌/站点规则 → host 映射”的结构集中放置，
  //       仅做组织与注释分区，不改变任何规则/执行顺序/行为。
  // =========================================================

  // ===== Rules: helpers =====
  const safeUrlParse = (urlStr) => {
    try {
      return new URL(urlStr);
    } catch {
      return null;
    }
  };

  const createRegexRule = (regex, replacement) => ({
    apply: (url) => url.replace(regex, replacement),
  });

  const createQueryReplaceRule = (newQuery) => ({
    apply: (url) => url.split("?")[0] + newQuery,
  });

  function extractEncodedOriginFromPath(pathname) {
    const path = String(pathname || "").replace(/^\/+/, "");
    if (!path) return null;

    const decodedPath = (() => {
      try {
        return decodeURIComponent(path);
      } catch {
        return path;
      }
    })();

    const originMatch = decodedPath.match(/^https?:\/\/[^?#]+/i);
    return originMatch ? originMatch[0] : null;
  }

  function extractPlainOriginFromWrappedPath(pathname) {
    const path = String(pathname || "");
    if (!path) return null;

    const plainMatch = path.match(/https?:\/\/[^?#]+/i);
    return plainMatch ? plainMatch[0] : null;
  }

  const CLOUINARY_TRANSFORM_SEGMENT_RE =
    /^[a-z]{1,3}_[^/]+(?:,[a-z]{1,3}_[^/]+)*$/i;

  function isCloudinaryTransformSegment(segment) {
    return CLOUINARY_TRANSFORM_SEGMENT_RE.test(String(segment || ""));
  }

  function stripCloudinaryUploadTransforms(urlStr, uploadPrefix, options = {}) {
    const { assetPathStartsWith = null } = options;
    const u = safeUrlParse(urlStr);
    if (!u) return urlStr;
    if (!u.pathname.startsWith(uploadPrefix)) return urlStr;

    const segments = u.pathname
      .slice(uploadPrefix.length)
      .split("/")
      .filter(Boolean);
    if (!segments.length) return urlStr;

    let firstAssetIndex = 0;
    while (
      firstAssetIndex < segments.length &&
      isCloudinaryTransformSegment(segments[firstAssetIndex])
    ) {
      firstAssetIndex += 1;
    }

    if (firstAssetIndex <= 0 || firstAssetIndex >= segments.length)
      return urlStr;

    const assetPath = segments.slice(firstAssetIndex).join("/");
    if (
      assetPathStartsWith &&
      !String(assetPath || "").startsWith(assetPathStartsWith)
    ) {
      return urlStr;
    }

    return `${u.origin}${uploadPrefix}${assetPath}`;
  }

  const createCloudinaryUploadStripRule = (uploadPrefix, options = {}) => ({
    apply: (urlStr) =>
      stripCloudinaryUploadTransforms(urlStr, uploadPrefix, options),
  });

  // ===== Rules: reusable rules =====
  const REUSABLE_RULES = {
    REMOVE_ALL_QUERY: createRegexRule(/\?.*$/, ""),
    TO_PNG: createRegexRule(/\.(?:webp|jpe?g)(?=\?|$)/i, ".png"),
    REMOVE_VERSION_QUERY: createRegexRule(/\?v=\d+$/, ""),
    REMOVE_SIZE_SUFFIX: createRegexRule(/_\d+x\d+(?=\.\w+$)/, ""),
    SHEIN_LTWEBSTATIC_REMOVE_THUMBNAIL_SUFFIX: createRegexRule(
      /_thumbnail_(?:\d+x\d+|x\d+)(?=\.(?:jpg|jpeg|png|webp|gif|avif)(?:$|[?#]))/i,
      ""
    ),
  };

  // ===== Rules: brand/site rules =====
  const BRAND_RULES = {
    JD_360BUYIMG_REMOVE_AVIF: {
      apply: (url) =>
        url.replace(/(\.(?:jpe?g|png|webp|gif))\.avif(?=$|[?#])/i, "$1"),
    },

    NEWBALANCE_CN_CLEAN: {
      apply: (url) =>
        url.replace(/([?&])image_process=[^&]*(&?)/, (_match, p1, p2) => {
          if (p1 === "?") return p2 === "&" ? "?" : "";
          return p2;
        }),
    },
    NIKE_CLEAN_PATH: {
      apply: (urlStr) => {
        if (!urlStr.includes("/a/images/")) return urlStr;
        const baseUrl = urlStr.substring(0, urlStr.indexOf("/a/images/"));

        const transformMatch = urlStr.match(
          /\/a\/images\/t_[^/]+\/(?:[^/]+\/)*([a-z0-9]+\/[^?]+\.(?:png|jpg|jpeg|webp|gif))/i
        );
        if (transformMatch) return `${baseUrl}/a/images/${transformMatch[1]}`;

        const uuidMatch = urlStr.match(
          /\/a\/images\/[^/]+\/(.+?\/)([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/.+?)$/i
        );
        if (uuidMatch) return `${baseUrl}/a/images/${uuidMatch[2]}`;

        const shortIdMatch = urlStr.match(
          /\/a\/images\/[^/]+\/([a-z0-9_-]+\/[^?]+)$/i
        );
        if (shortIdMatch) return `${baseUrl}/a/images/${shortIdMatch[1]}`;

        return urlStr;
      },
    },
    NIKE_AE_LIKE: {
      apply: (urlStr) => {
        if (!urlStr.includes("/dw/image/")) return urlStr;
        const u = safeUrlParse(urlStr);
        if (!u) return urlStr;

        if (u.searchParams.get("tm_fmt") === "png") {
          const newPath = u.pathname.replace(/\.jpe?g$/i, ".png");
          const newUrl = new URL(u.protocol + "//" + u.host + newPath);
          newUrl.searchParams.set("sw", "3000");
          newUrl.searchParams.set("sh", "3000");
          newUrl.searchParams.set("fmt", "png-alpha");
          newUrl.searchParams.set("tm_fmt", "png");
          return newUrl.toString();
        }

        if (/\.png$/i.test(u.pathname)) {
          return u.protocol + "//" + u.host + u.pathname;
        }

        return u.protocol + "//" + u.host + u.pathname;
      },
    },
    GOAT_CLEAN: {
      apply: (urlStr) => {
        let cleanedUrl = urlStr;
        if (
          cleanedUrl.includes("/transform/") &&
          cleanedUrl.includes("/attachments/")
        ) {
          cleanedUrl = cleanedUrl.replace(
            /\/transform\/.*\/attachments\//,
            "/attachments/"
          );
        }
        const u = safeUrlParse(cleanedUrl);
        if (!u) return cleanedUrl.replace(/\?.*$/, "");
        ["action", "width", "height", "fit", "crop", "quality"].forEach((key) =>
          u.searchParams.delete(key)
        );
        return u.search ? u.toString() : u.origin + u.pathname;
      },
    },
    STOCKX_HIGH_RES: createQueryReplaceRule("?fm=jpg&dpr=3"),
    ADIDAS_ASSETS_PATH: createRegexRule(/(\/images\/)[^/]+,[^/]+\//, "$1"),
    ADIDAS_JPG_TO_PNG: createRegexRule(/\.jpg(?=\?|$)/i, ".png"),
    ASICS_HIGH_RES: createQueryReplaceRule(
      "?wid=3000&hei=3000&fmt=png-alpha&qlt=100"
    ),

    // Shopline 图片规则：CDN 清理 / 源站转 CloudFront / CloudFront 原图提取
    SHOPLINE_IMAGE_CDN_QUERY: {
      apply: (url) => {
        const u = safeUrlParse(url);
        if (!u) return url;
        if (
          u.searchParams.has("w") ||
          u.searchParams.has("h") ||
          u.searchParams.has("q")
        )
          return url.split("?")[0];
        return url;
      },
    },
    ANTA_GROUP_CN_QUERY: {
      apply: (url) => {
        const u = safeUrlParse(url);
        if (!u) return url;
        if (u.searchParams.has("x-image-process")) {
          return url.split("?")[0];
        }
        return url;
      },
    },
    SNIPES_ASSET_ORIGINAL: {
      apply: (urlStr) => {
        const u = safeUrlParse(urlStr);
        if (!u || u.hostname !== "asset.snipes.com") return urlStr;
        return stripCloudinaryUploadTransforms(urlStr, "/images/");
      },
    },
    SHOPLINE_IMAGE_ORIGIN_TO_CLOUDFRONT: {
      apply: (url) =>
        url.replace(
          /^https:\/\/shoplineimg\.com\/[a-f0-9]+\/([a-f0-9]+)\/[^?]+\.(jpg|jpeg|png|webp|gif).*/i,
          "https://d31xv78q8gnfco.cloudfront.net/media/image_clips/$1/original.$2"
        ),
    },
    SHOPLINE_IMAGE_CLOUDFRONT: {
      apply: (url) => {
        const m = url.match(
          /(https:\/\/d31xv78q8gnfco\.cloudfront\.net\/media\/image_clips\/[a-f0-9]+\/original\.(?:jpg|jpeg|png|webp|gif))/i
        );
        return m ? m[0] : url;
      },
    },
    MLB_KOREA_PARAMS: createRegexRule(
      /\/cdn-cgi\/image\/[^/]+(\/images\/.*)/,
      "/cdn-cgi/image/q=100,format=auto$1"
    ),
    MLB_KOREA_SHOP_FILES: createRegexRule(
      /\?(?:v=\d+&width=\d+|width=\d+&v=\d+|v=\d+|width=\d+)/,
      ""
    ),
    PUMA_INTL_UPLOAD_PARAMS: createCloudinaryUploadStripRule("/upload/", {
      assetPathStartsWith: "global/",
    }),
    PUMA_CN_IMAGE_PROCESSING: createRegexRule(/([?&]imageMogr2\/[^&]*)/, ""),
    SKECHERS_USA_PATH: createRegexRule(/(\/image);[^/]+/, "$1"),
    SKECHERS_SG_SUFFIX: createRegexRule(
      /(\_\d+x\d+)(?=\.(?:jpg|jpeg|png|webp|gif))/i,
      ""
    ),
    THENORTHFACE_INTL_CLEAN: createRegexRule(
      /\/t_img\/[^/]+\/v(\d+\/)/,
      "/v$1"
    ),
    THENORTHFACE_CN_REMOVE_QUERY: createRegexRule(/\?\d+$/, ""),
    UNDERARMOUR_SCENE7: {
      apply: (urlStr) => {
        const u = safeUrlParse(urlStr);
        if (!u) return urlStr;
        u.search = "";
        u.searchParams.set("scl", "1");
        u.searchParams.set("fmt", "png-alpha");
        u.searchParams.set("qlt", "100");
        return u.toString();
      },
    },
    VANS_INTL_CLEAN_PARAMS: createRegexRule(
      /(\/images\/).*?(v\d+\/.*)/,
      "$1$2"
    ),
    SAUCONY_SCENE7_REMOVE_DOLLAR_PARAMS: createRegexRule(/\$[^$]+\$/, ""),
    HOKA_CN_REMOVE_QUERY: createRegexRule(/\?\d+(?:#\w+)?$/, ""),
    ON_CN_REMOVE_OSS_QUERY: createRegexRule(/\?x-oss-process=image\/.*/, ""),
    POIZON_FORCE_PNG: createQueryReplaceRule("?x-oss-process=image/format,png"),
    SHOPIFY_REMOVE_SIZE: createRegexRule(
      /(\_\d+x\d*|\_pico|\_icon|\_thumb|\_small|\_compact|\_medium|\_large|\_grande|\_original|\_master)(?=\.\w+)/,
      ""
    ),
    SANITY_CLEAN: createRegexRule(
      /^(https:\/\/cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/[^/?#]+).*/,
      "$1"
    ),
    ALICDN_REMOVE_SUFFIX: {
      apply: (url) => url.replace(/(\.(jpg|jpeg|png|webp|gif))_[^/]*$/i, "$1"),
    },
    FARFETCH_CONTENTS_REMOVE_SIZE_SUFFIX: createRegexRule(
      /_\d+(?=\.(?:jpg|jpeg|png|webp|gif|avif)(?:$|[?#]))/i,
      ""
    ),
    AMAZON_MEDIA_CLEAN: createRegexRule(
      /^(https:\/\/m\.media-amazon\.com\/images\/I\/[^._]+)\._[^.]*_\.(\w+)$/,
      "$1.$2"
    ),
    EBAY_TO_PNG_2000: createRegexRule(
      /\/s-l\d+\.(?:jpg|jpeg|png|webp)$/i,
      "/s-l2000.png"
    ),
    END_CLOTHING_CLEAN: createRegexRule(
      /\/media\/[^/]+\/(?:prodmedia\/)?media\/catalog\/product\//,
      "/media/catalog/product/"
    ),
    RUNNMORE_TO_ORIGINAL: {
      apply: (url) =>
        url
          .replace(/\/files\/thumbs\/files\//, "/files/")
          .replace(/\/images\/thumbs_\d+\//, "/")
          .replace(/(\_\d+\_\d+px)(\.\w+)$/, "$2"),
    },
    SPORTVISION_MK_TO_ORIGINAL: {
      apply: (url) =>
        url
          .replace(/\/files\/thumbs\/files\//, "/files/")
          .replace(/\/images\/thumbs_\d+\//, "/")
          .replace(/\/images\/([^/]+)_\d+_\d+px(?=\.\w+$)/, "/$1")
          .replace(/(\_\d+\_\d+px)(\.\w+)$/, "$2"),
    },
    MAGENTO_TO_ORIGINAL: createRegexRule(
      /\/media\/catalog\/product\/cache\/image\/\d+x\d+\/[^/]+\/(.+)/,
      "/media/catalog/product/$1"
    ),
    OPENCART_TO_ORIGINAL: createRegexRule(
      /^https?:\/\/([^/]+)(\/image)\/cache(\/catalog\/.+?)(-\d+x\d+)(\.\w+)$/i,
      "https://$1$2$3$5"
    ),
    T4S_TO_ORIGINAL: {
      apply: (url) => {
        let c = url.replace(/-\d+(\.\w+)$/, "$1");
        return c.endsWith(".jpg") ? c : c.replace(/\.\w+$/, ".jpg");
      },
    },
    FOOTLOCKER_SCENE7_FORCE_ZOOM2000PNG: {
      apply: (url) => {
        if (!url.includes("/is/image/")) return url;
        const base = url.split("?")[0];
        return `${base}?$zoom2000png$`;
      },
    },
    COMPLEX_CLOUDINARY_CLEAN: createCloudinaryUploadStripRule(
      "/complex/image/upload/",
      {
        assetPathStartsWith: "sanity-new/",
      }
    ),
    HYPEBEAST_CDN_ORIGINAL: {
      apply: (urlStr) => {
        const u = safeUrlParse(urlStr);
        if (!u || u.hostname !== "image-cdn.hypb.st") return urlStr;

        const extracted = extractEncodedOriginFromPath(u.pathname);
        return extracted || urlStr;
      },
    },
    SNEAKER_FREAKER_BCDN_ORIGINAL: {
      apply: (urlStr) => {
        const u = safeUrlParse(urlStr);
        if (!u || u.hostname !== "sneaker-freaker.b-cdn.net") return urlStr;

        const extracted = extractEncodedOriginFromPath(u.pathname);
        return extracted || urlStr;
      },
    },
    ZALORA_DYNAMIC_ORIGINAL: {
      apply: (urlStr) => {
        const u = safeUrlParse(urlStr);
        if (!u || u.hostname !== "dynamic.zacdn.com") return urlStr;

        const extracted = extractPlainOriginFromWrappedPath(u.pathname);
        return extracted || urlStr;
      },
    },
  };

  const RULE_CHAINS = {
    SHOPIFY_ORIGINAL_CLEAN: [
      BRAND_RULES.SHOPIFY_REMOVE_SIZE,
      REUSABLE_RULES.REMOVE_ALL_QUERY,
    ],
  };

  // ===== Rules: host maps =====
  const EXACT_HOST_MAP = new Map([
    ["image.goat.com", "goat"],
    ["cdn.flightclub.com", "flightclub"],
    ["images.stockx.com", "stockx"],
    ["static.nike.com.cn", "nike-cn"],
    ["static.nike.com", "nike-global"],
    ["c.static-nike.com", "nike-global"],
    ["www.nike.ae", "nike-ae-like"],
    ["www.nike.com.kw", "nike-ae-like"],
    ["www.nike.qa", "nike-ae-like"],
    ["www.nike.sa", "nike-ae-like"],
    ["assets.adidas.com", "adidas-intl"],
    ["images.asics.com", "asics-intl"],
    ["img.cdn.91app.hk", "cdn-91app"],
    ["img.91app.com", "cdn-91app"],
    ["www.brooksrunning.com", "brooks-intl"],
    ["res-converse.baozun.com", "converse-cn"],
    ["dam-converse.baozun.com", "converse-cn"],
    ["www.decathlon.com", "decathlon-intl"],
    ["pixl.decathlon.com.cn", "decathlon-cn"],
    ["contents.mediadecathlon.com", "decathlon-hk"],

    // Shopline 图片域名
    ["img.myshopline.com", "shopline-image-cdn"],
    ["img.fishfay.com", "anta-group-cn"],
    ["shoplineimg.com", "shopline-image-origin"],
    ["d31xv78q8gnfco.cloudfront.net", "shopline-image-cloudfront"],
    ["dms.deckers.com", "hoka-intl"],
    ["b2c.hoka.wishetin.com", "hoka-cn"],
    ["lining-goods-online-1302115263.file.myqcloud.com", "lining-cn"],
    ["i1.adis.ws", "mizuno-usa"],
    ["static-resource.mlb-korea.com", "mlb-korea"],
    ["en.mlb-korea.com", "mlb-korea-shop"],
    ["nb.scene7.com", "newbalance-intl"],
    ["itg-tezign-files.tezign.com", "newbalance-cn"],
    ["old-order.com", "old-order-shopify"],
    ["images.ctfassets.net", "on-intl"],
    ["oss.on-running.cn", "on-cn"],
    ["images.puma.com", "puma-intl"],
    ["itg-tezign-files-tx.tezign.com", "puma-cn"],
    ["cdn.dam.salomon.com", "salomon-intl"],
    ["s7d4.scene7.com", "saucony-intl"],
    ["images.skechers.com", "skechers-usa"],
    ["www.skechers.com.hk", "skechers-hk"],
    ["www.skechers.com.sg", "skechers-sg"],
    ["assets.thenorthface.com", "thenorthface-intl"],
    ["img2.thenorthface.com.cn", "thenorthface-cn"],
    ["underarmour.scene7.com", "underarmour-scene7"],
    ["assets.vans.com", "vans-intl"],
    ["sneakernews.com", "sneakernews-wp"],
    ["cdn.sanity.io", "sanity-cdn"],
    ["cdn.poizon.com", "poizon-cdn"],
    ["static.shihuocdn.cn", "shihuo-cdn"],
    ["eimage.shihuocdn.cn", "shihuo-cdn"],
    ["images.novelship.com", "novelship-img"],
    ["www.snipesusa.com", "snipes-us"],
    ["asset.snipes.com", "snipes-global"],
    ["static.shiekh.com", "magento-shiekh"],
    ["m.media-amazon.com", "amazon-media"],
    ["i.ebayimg.com", "ebay-img-force-png"],
    ["media.endclothing.com", "end-clothing"],
    ["media.finishline.com", "finishline-media"],
    ["www.runnmore.com", "runnmore"],
    ["www.sportvision.mk", "sportvision-mk"],
    ["www.sportvision.hr", "sportvision-mk"],
    ["gnk-store.ru", "opencart-generic"],
    ["gw.alicdn.com", "alicdn"],
    ["img.alicdn.com", "alicdn"],
    ["assets.footlocker.com", "footlocker-scene7"],
    ["cdn-images.farfetch-contents.com", "farfetch-contents"],
    ["img.ltwebstatic.com", "shein-ltwebstatic"],
    ["img.shein.com", "shein-ltwebstatic"],
    ["images.complex.com", "complex-cloudinary"],
    ["image-cdn.hypb.st", "hypebeast-cdn"],
    ["sneaker-freaker.b-cdn.net", "sneaker-freaker-bcdn"],
    ["catalog.hkstore.com", "hkstore-catalog"],
    ["dynamic.zacdn.com", "zalora-dynamic-cdn"],
    ["www.stadiumgoods.com", "stadiumgoods-shopify"],
  ]);

  const PARTIAL_MATCH_RULES = [
    {
      str: "cdn.shopify.com/s/files/1/1330/6287/files",
      type: "decathlon-intl",
    },
    {
      str: "cdn.shopify.com/s/files/1/0862/7834/0912/files",
      type: "reebok-intl",
    },
    {
      str: "cdn.shopify.com/s/files/1/0603/3031/1875/files",
      type: "kickscrew-shopify",
    },
    { str: "t4s.cz", type: "t4s-cdn" },
  ];

  // ===== Rules: hostType → rule chain =====
  const HOST_RULE_MAP = {
    goat: [BRAND_RULES.GOAT_CLEAN],
    flightclub: [REUSABLE_RULES.REMOVE_ALL_QUERY],
    stockx: [BRAND_RULES.STOCKX_HIGH_RES],
    "nike-cn": [BRAND_RULES.NIKE_CLEAN_PATH, REUSABLE_RULES.TO_PNG],
    "nike-global": [BRAND_RULES.NIKE_CLEAN_PATH, REUSABLE_RULES.TO_PNG],
    "nike-ae-like": [BRAND_RULES.NIKE_AE_LIKE],
    "adidas-intl": [
      BRAND_RULES.ADIDAS_ASSETS_PATH,
      BRAND_RULES.ADIDAS_JPG_TO_PNG,
    ],
    "asics-intl": [BRAND_RULES.ASICS_HIGH_RES],
    "cdn-91app": [REUSABLE_RULES.REMOVE_VERSION_QUERY],
    "brooks-intl": [REUSABLE_RULES.REMOVE_ALL_QUERY, REUSABLE_RULES.TO_PNG],
    "converse-cn": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "decathlon-intl": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "decathlon-cn": [REUSABLE_RULES.REMOVE_ALL_QUERY, REUSABLE_RULES.TO_PNG],
    "decathlon-hk": [REUSABLE_RULES.REMOVE_ALL_QUERY, REUSABLE_RULES.TO_PNG],

    // Shopline 图片规则链
    "shopline-image-cdn": [BRAND_RULES.SHOPLINE_IMAGE_CDN_QUERY],
    "anta-group-cn": [BRAND_RULES.ANTA_GROUP_CN_QUERY],
    "shopline-image-origin": [BRAND_RULES.SHOPLINE_IMAGE_ORIGIN_TO_CLOUDFRONT],
    "shopline-image-cloudfront": [BRAND_RULES.SHOPLINE_IMAGE_CLOUDFRONT],
    "hoka-intl": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "hoka-cn": [BRAND_RULES.HOKA_CN_REMOVE_QUERY],
    "lining-cn": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "mizuno-usa": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "mlb-korea": [BRAND_RULES.MLB_KOREA_PARAMS],
    "mlb-korea-shop": [BRAND_RULES.MLB_KOREA_SHOP_FILES],
    "newbalance-intl": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "newbalance-cn": [BRAND_RULES.NEWBALANCE_CN_CLEAN],
    "old-order-shopify": RULE_CHAINS.SHOPIFY_ORIGINAL_CLEAN,
    "on-intl": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "on-cn": [BRAND_RULES.ON_CN_REMOVE_OSS_QUERY],
    "puma-intl": [BRAND_RULES.PUMA_INTL_UPLOAD_PARAMS],
    "puma-cn": [BRAND_RULES.PUMA_CN_IMAGE_PROCESSING],
    "reebok-intl": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "salomon-intl": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "saucony-intl": [
      BRAND_RULES.SAUCONY_SCENE7_REMOVE_DOLLAR_PARAMS,
      REUSABLE_RULES.REMOVE_ALL_QUERY,
    ],
    "skechers-usa": [BRAND_RULES.SKECHERS_USA_PATH],
    "skechers-hk": [REUSABLE_RULES.REMOVE_VERSION_QUERY],
    "skechers-sg": [
      BRAND_RULES.SKECHERS_SG_SUFFIX,
      REUSABLE_RULES.REMOVE_VERSION_QUERY,
    ],
    "thenorthface-intl": [BRAND_RULES.THENORTHFACE_INTL_CLEAN],
    "thenorthface-cn": [BRAND_RULES.THENORTHFACE_CN_REMOVE_QUERY],
    "underarmour-scene7": [BRAND_RULES.UNDERARMOUR_SCENE7],
    "vans-intl": [BRAND_RULES.VANS_INTL_CLEAN_PARAMS],
    "sneakernews-wp": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "sanity-cdn": [BRAND_RULES.SANITY_CLEAN],
    "poizon-cdn": [BRAND_RULES.POIZON_FORCE_PNG],
    "shihuo-cdn": [
      REUSABLE_RULES.REMOVE_SIZE_SUFFIX,
      REUSABLE_RULES.REMOVE_ALL_QUERY,
    ],
    "kickscrew-shopify": RULE_CHAINS.SHOPIFY_ORIGINAL_CLEAN,
    "novelship-img": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "snipes-us": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "snipes-global": [
      BRAND_RULES.SNIPES_ASSET_ORIGINAL,
      REUSABLE_RULES.REMOVE_ALL_QUERY,
    ],
    "magento-shiekh": [BRAND_RULES.MAGENTO_TO_ORIGINAL],
    "amazon-media": [BRAND_RULES.AMAZON_MEDIA_CLEAN],
    "ebay-img-force-png": [BRAND_RULES.EBAY_TO_PNG_2000],
    "end-clothing": [BRAND_RULES.END_CLOTHING_CLEAN],
    "finishline-media": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    runnmore: [BRAND_RULES.RUNNMORE_TO_ORIGINAL],
    "sportvision-mk": [BRAND_RULES.SPORTVISION_MK_TO_ORIGINAL],
    "opencart-generic": [BRAND_RULES.OPENCART_TO_ORIGINAL],
    "t4s-cdn": [BRAND_RULES.T4S_TO_ORIGINAL],
    alicdn: [BRAND_RULES.ALICDN_REMOVE_SUFFIX],
    "footlocker-scene7": [BRAND_RULES.FOOTLOCKER_SCENE7_FORCE_ZOOM2000PNG],
    "farfetch-contents": [
      BRAND_RULES.FARFETCH_CONTENTS_REMOVE_SIZE_SUFFIX,
      REUSABLE_RULES.REMOVE_ALL_QUERY,
    ],
    "shein-ltwebstatic": [
      REUSABLE_RULES.SHEIN_LTWEBSTATIC_REMOVE_THUMBNAIL_SUFFIX,
      REUSABLE_RULES.REMOVE_ALL_QUERY,
    ],
    "complex-cloudinary": [BRAND_RULES.COMPLEX_CLOUDINARY_CLEAN],
    "hypebeast-cdn": [BRAND_RULES.HYPEBEAST_CDN_ORIGINAL],
    "sneaker-freaker-bcdn": [BRAND_RULES.SNEAKER_FREAKER_BCDN_ORIGINAL],
    "hkstore-catalog": [REUSABLE_RULES.REMOVE_ALL_QUERY],
    "zalora-dynamic-cdn": [BRAND_RULES.ZALORA_DYNAMIC_ORIGINAL],
    "stadiumgoods-shopify": RULE_CHAINS.SHOPIFY_ORIGINAL_CLEAN,
  };

  function detectHostTypeByUrlObj(u, fullUrlStr) {
    if (
      u.hostname === "360buyimg.com" ||
      u.hostname.endsWith(".360buyimg.com")
    ) {
      return "jd-360buyimg";
    }

    if (
      u.hostname === "img.myshopline.com" ||
      /^img-[a-z0-9-]+\.myshopline\.com$/i.test(u.hostname)
    ) {
      return "shopline-image-cdn";
    }

    let hostType = EXACT_HOST_MAP.get(u.hostname);
    if (!hostType) {
      if (u.pathname.startsWith("/cdn/shop/files/")) {
        hostType = "old-order-shopify";
      } else {
        for (const rule of PARTIAL_MATCH_RULES) {
          if (fullUrlStr.includes(rule.str)) {
            hostType = rule.type;
            break;
          }
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
    try {
      return new URL(s, location.href).toString();
    } catch {
      return null;
    }
  }

  function pickBestFromSrcset(srcset) {
    if (!srcset) return null;
    const parts = srcset
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return null;

    let best = null;
    for (const p of parts) {
      const seg = p.split(/\s+/).filter(Boolean);
      const url = seg[0];
      const desc = seg[1] || "";
      let score = 0;
      let wHint = 0;

      const mw = desc.match(/^(\d+)w$/i);
      if (mw) {
        wHint = parseInt(mw[1], 10);
        score = wHint;
      }

      const mx = desc.match(/^(\d+(?:\.\d+)?)x$/i);
      if (mx) score = parseFloat(mx[1]) * 10000;

      if (!best || score > best.score) best = { url, score, wHint };
    }
    return best;
  }

  function getExt(urlStr) {
    try {
      const u = new URL(urlStr);
      const fn = u.pathname.split("/").pop() || "";
      const m = fn.match(/\.([a-z0-9]+)$/i);
      return m ? m[1].toLowerCase() : "";
    } catch {
      return "";
    }
  }

  function guessExtFromUrl(urlStr, extFromPath) {
    if (extFromPath) return extFromPath;
    const match = urlStr.match(/\$(zoom2000(png|jpg))\$/i);
    return match ? match[2] : "";
  }

  function safeFilenameFromUrl(urlStr, fallbackExt = "jpg") {
    try {
      const u = new URL(urlStr);
      const pathname = u.pathname;
      let name = pathname.split("/").pop() || "image";
      // 清理文件名中的特殊字符
      name = sanitizeFilename(name, 200);
      if (/\.[a-z0-9]+$/i.test(name)) return name;
      return `${name}.${fallbackExt}`;
    } catch {
      return `image.${fallbackExt}`;
    }
  }

  function getFileName(urlStr, fallbackExt) {
    try {
      const u = new URL(urlStr);
      let name = u.pathname.split("/").pop() || "";
      // 安全解码并清理特殊字符
      try {
        name = decodeURIComponent(name);
      } catch {
        // 如果解码失败，使用原始名称
      }
      // 清理文件名中的特殊字符（仅用于显示，保留较长限制）
      name = sanitizeFilename(name, 200);
      if (!/\.[a-z0-9]+$/i.test(name) && fallbackExt)
        name = `${name}.${fallbackExt}`;
      return name || "(无文件名)";
    } catch {
      return "(无文件名)";
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

    const addUrlsFromCssText = (cssText) => {
      if (!cssText || cssText === "none") return;

      const urlMatches = cssText.matchAll(/url\(["']?(.*?)["']?\)/gi);
      for (const m of urlMatches) add(m[1], 0);

      const imageSetMatches = cssText.matchAll(/image-set\((.*?)\)/gi);
      for (const match of imageSetMatches) {
        const body = match[1] || "";
        const candidates = Array.from(
          body.matchAll(
            /(?:url\()?["']?([^"')\s,]+)["']?\)?\s*(\d+(?:\.\d+)?x|\d+w)?/gi
          )
        )
          .map((m) => {
            const url = m[1];
            const descriptor = (m[2] || "").toLowerCase();
            let score = 0;
            if (/w$/.test(descriptor)) score = parseInt(descriptor, 10) || 0;
            else if (/x$/.test(descriptor)) {
              score = (parseFloat(descriptor) || 0) * 10000;
            }
            return { url, score };
          })
          .filter((item) => item.url && !/^type$/i.test(item.url));

        if (!candidates.length) continue;
        candidates.sort((a, b) => b.score - a.score);
        add(candidates[0].url, 0);
      }
    };

    const addBestSrcset = (srcset) => {
      if (!srcset) return;
      const best = pickBestFromSrcset(srcset);
      if (best?.url) add(best.url, best.wHint || 0);
    };

    const addJsonImageValues = (value, depth = 0) => {
      if (depth > 4 || value == null) return;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return;
        if (
          /\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:[?#]|$)/i.test(trimmed) ||
          /[?&](?:image|img|format)=/i.test(trimmed)
        ) {
          add(trimmed, 0);
          return;
        }
        if (/^https?:\/\//i.test(trimmed) || /^(?:\/\/|\/)/.test(trimmed)) {
          if (
            /\/(?:images?|media|product|gallery|content|uploads?)\//i.test(
              trimmed
            )
          ) {
            add(trimmed, 0);
          }
        }
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) addJsonImageValues(item, depth + 1);
        return;
      }
      if (typeof value !== "object") return;

      for (const [key, val] of Object.entries(value)) {
        const lowerKey = String(key || "").toLowerCase();
        if (
          /(^|[_-])(image|img|thumb|thumbnail|picture|zoom|src|srcset|avatar)([_-]|$)/.test(
            lowerKey
          ) ||
          /(^|[_-])(gallery|images|media)([_-]|$)/.test(lowerKey)
        ) {
          addJsonImageValues(val, depth + 1);
        }
      }
    };

    const addJsonStringIfLikelyImagePayload = (raw, sourceHint = "") => {
      if (!raw) return;
      const trimmed = raw.trim();
      if (!trimmed) return;

      const lowerSource = String(sourceHint || "").toLowerCase();
      const lowerRaw = trimmed.slice(0, 400).toLowerCase();
      const looksLikeImagePayload =
        /(?:image|img|thumb|thumbnail|gallery|media|picture|zoom|src|srcset)/.test(
          lowerSource
        ) ||
        /(?:image|img|thumb|thumbnail|gallery|media|picture|zoom|src|srcset)/.test(
          lowerRaw
        );
      if (!looksLikeImagePayload) return;

      try {
        addJsonImageValues(JSON.parse(trimmed));
      } catch {
        if (
          /\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:[?#]|$)/i.test(trimmed) ||
          /[?&](?:image|img|format)=/i.test(trimmed)
        ) {
          add(trimmed, 0);
        }
      }
    };

    const parseScriptJsonForImages = (script) => {
      const raw = script.textContent || "";
      if (!raw) return;

      const lowerId = String(script.id || "").toLowerCase();
      const lowerClass = String(script.className || "").toLowerCase();
      const lowerType = String(script.type || "").toLowerCase();
      const hintText = `${lowerId} ${lowerClass} ${lowerType}`;
      const isNextData = lowerId === "__next_data__";
      const isLdJson = lowerType === "application/ld+json";
      const shouldParseJson =
        isNextData ||
        isLdJson ||
        /(?:image|img|gallery|media|product)/.test(hintText) ||
        /(?:image|img|gallery|media|product)/.test(
          raw.slice(0, 400).toLowerCase()
        );

      if (!shouldParseJson) return;

      try {
        addJsonImageValues(JSON.parse(raw));
      } catch {
        const matches = raw.matchAll(
          /https?:\/\/[^\s"'<>]+(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:[^\s"'<>]*)/gi
        );
        for (const m of matches) add(m[0], 0);
      }
    };

    const LAZY_URL_ATTRS = [
      "data-src",
      "data-original",
      "data-lazy",
      "data-lazy-src",
      "data-url",
      "data-image",
      "data-img",
      "data-zoom",
      "data-zoom-image",
      "data-large_image",
      "data-highres",
      "data-hires",
      "data-full",
      "data-full-url",
      "data-image-src",
      "data-original-src",
      "data-fullsize",
      "data-src-large",
      "data-media",
      "data-thumb",
      "data-fancybox",
    ];
    const LAZY_SRCSET_ATTRS = ["data-srcset", "data-lazy-srcset"];

    document.querySelectorAll("img, source").forEach((el) => {
      const tagName = el.tagName.toLowerCase();

      addBestSrcset(el.getAttribute("srcset"));

      if (tagName === "img") {
        const src = el.currentSrc || el.src;
        if (src) add(src, getMinSideHintFromImg(el));
      }

      for (const a of LAZY_URL_ATTRS) {
        const v = el.getAttribute(a);
        if (v) add(v, 0);
      }
      for (const a of LAZY_SRCSET_ATTRS) {
        addBestSrcset(el.getAttribute(a));
      }
    });

    document
      .querySelectorAll(
        'meta[property="og:image"][content], meta[name="og:image"][content]'
      )
      .forEach((m) => add(m.getAttribute("content"), 0));
    document
      .querySelectorAll('link[rel="preload"][as="image"][href]')
      .forEach((l) => add(l.getAttribute("href"), 0));
    document
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((script) => {
        parseScriptJsonForImages(script);
      });

    const IMG_EXT_RE = /\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:[?#]|$)/i;
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && IMG_EXT_RE.test(href)) add(href, 0);
    });

    document
      .querySelectorAll('[style*="url("], [style*="image-set("]')
      .forEach((el) => {
        addUrlsFromCssText(el.getAttribute("style") || "");
      });

    if (SETTINGS.enhancedImageDiscovery) {
      document
        .querySelectorAll("[data-gallery], [data-images], [data-media]")
        .forEach((el) => {
          for (const attrName of [
            "data-gallery",
            "data-images",
            "data-media",
          ]) {
            addJsonStringIfLikelyImagePayload(
              el.getAttribute(attrName),
              attrName
            );
          }
        });

      document
        .querySelectorAll(
          'script[type="application/json"], script#__NEXT_DATA__'
        )
        .forEach((script) => {
          parseScriptJsonForImages(script);
        });
    }

    if (SETTINGS.scanBackgroundImages) {
      const all = document.getElementsByTagName("*");
      if (all.length <= SETTINGS.maxElementsForBgScan) {
        for (let i = 0; i < all.length; i++) {
          addUrlsFromCssText(getComputedStyle(all[i]).backgroundImage);
        }
      }
    }

    return list;
  }

  // =========================================================
  // 3) Content-Length 过滤
  // =========================================================
  function parseLengthFromHeaders(headers) {
    const h = headers || "";

    let m = h.match(/content-range:\s*bytes\s+\d+-\d+\/(\d+)/i);
    if (m) return parseInt(m[1], 10);

    m = h.match(/content-length:\s*(\d+)/i);
    if (m) return parseInt(m[1], 10);

    return null;
  }

  // Content-Length 探测缓存：避免同一 URL 在一次扫描/多次重扫中重复 HEAD/Range
  // value = Promise<number|null>（保证并发请求去重）
  const contentLengthProbeCache = new Map();

  function probeContentLength(url) {
    if (!url) return Promise.resolve(null);

    const cached = contentLengthProbeCache.get(url);
    if (cached) return cached;

    const p = (async () => {
      const timeoutMs = 8000;

      const doHEAD = () =>
        new Promise((resolve) => {
          GM_xmlhttpRequest({
            method: "HEAD",
            url,
            timeout: timeoutMs,
            onload: (res) =>
              resolve(parseLengthFromHeaders(res.responseHeaders)),
            onerror: () => resolve(null),
            ontimeout: () => resolve(null),
          });
        });

      const doRangedGET = () =>
        new Promise((resolve) => {
          let finished = false;
          let req = null;

          const done = (v) => {
            if (finished) return;
            finished = true;
            resolve(v);
          };

          req = GM_xmlhttpRequest({
            method: "GET",
            url,
            headers: { Range: "bytes=0-0" },
            timeout: timeoutMs,
            responseType: "arraybuffer",
            onprogress: (evt) => {
              if (evt && evt.loaded > 65536) {
                try {
                  req && req.abort && req.abort();
                } catch {
                  /* ignore */
                }
                done(null);
              }
            },
            onload: (res) => done(parseLengthFromHeaders(res.responseHeaders)),
            onerror: () => done(null),
            ontimeout: () => done(null),
          });
        });

      const len1 = await doHEAD();
      if (len1 != null) return len1;
      return await doRangedGET();
    })();

    contentLengthProbeCache.set(url, p);
    return p;
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

    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, () =>
        worker()
      )
    );
    setStatus?.(`检测完成：保留 ${out.length}/${items.length}`);
    return out;
  }

  // =========================================================
  // 4) 简化过滤
  // =========================================================
  function extAllowed(ext) {
    const exts = String(SETTINGS.filter.exts || "").trim();
    if (!exts) return true;
    const allow = new Set(
      exts
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    if (ext === "jpeg" && allow.has("jpg")) return true;
    if (ext === "jpg" && allow.has("jpeg")) return true;
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
      const dot = name.lastIndexOf(".");
      return dot > 0
        ? `${name.slice(0, dot)}__${c}${name.slice(dot)}`
        : `${name}__${c}`;
    };
  }

  function gmDownloadUnified({
    url,
    name,
    saveAs,
    setStatus,
    onOkText,
    onFailText,
    onTimeoutText,
  }) {
    return new Promise((resolve) => {
      let retriedFlat = false;
      let retriedClean = false;

      const start = (finalName) => {
        GM_download({
          url,
          name: finalName,
          saveAs: !!saveAs,
          onload: () => {
            if (setStatus && onOkText !== undefined) setStatus(onOkText || "");
            resolve(true);
          },
          ontimeout: () => {
            if (onTimeoutText) setStatus?.(onTimeoutText);
            else if (setStatus) setStatus("保存超时");
            resolve(false);
          },
          onerror: () => {
            // 第一次重试：如果包含文件夹路径，尝试平铺文件名
            if (
              !saveAs &&
              !retriedFlat &&
              typeof finalName === "string" &&
              finalName.includes("/")
            ) {
              retriedFlat = true;
              const flat = finalName.replace(/\//g, "_");
              if (setStatus)
                setStatus(
                  "当前环境可能不支持自动建文件夹，已降级为平铺文件名继续下载…"
                );
              start(flat);
              return;
            }
            // 第二次重试：清理文件名中的特殊字符
            if (!saveAs && !retriedClean && typeof finalName === "string") {
              const filenamePart = finalName.split("/").pop();
              const pathPart = finalName.includes("/")
                ? finalName.substring(0, finalName.lastIndexOf("/") + 1)
                : "";
              const cleaned = sanitizeFilename(filenamePart, 200);
              const cleanedName = pathPart + cleaned;
              if (cleaned !== filenamePart) {
                retriedClean = true;
                if (setStatus) setStatus("文件名包含特殊字符，已自动清理重试…");
                start(cleanedName);
                return;
              }
            }
            if (setStatus && onFailText !== undefined)
              setStatus(onFailText || "保存失败（可能被防盗链/跨域限制）");
            resolve(false);
          },
        });
      };

      start(name);
    });
  }

  async function runBulkDownload({
    plan,
    state,
    download,
    onProgress,
    concurrency = 2,
    delayMs = 80,
  }) {
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
        if (delayMs) await new Promise((res) => setTimeout(res, delayMs));
      }
    }

    onProgress?.(0, 0, 0);
    await Promise.all(
      Array.from({ length: Math.min(concurrency, plan.length) }, () => worker())
    );
    return { attempted, ok, fails };
  }

  async function bulkSaveAll({
    items,
    folder,
    state,
    setHintFn,
    updateStopBtnFn,
    singleSaveFn,
  }) {
    if (!items.length) {
      if (singleSaveFn) {
        singleSaveFn();
      } else {
        setHintFn("没有图片可保存");
      }
      return;
    }
    if (state.running) {
      setHintFn('正在全部保存中…如需重新开始请先点"停止"');
      return;
    }

    const total = items.length;
    const saveFolder = folder || buildSaveFolderForPage();
    state.running = true;
    state.cancel = false;
    updateStopBtnFn();

    const uniqName = createUniqueNameGenerator();
    const plan = items.map((it, idx) => {
      const extPath = getExt(it.cleanUrl);
      const ext = it.ext || guessExtFromUrl(it.cleanUrl, extPath) || "jpg";
      const base = safeFilenameFromUrl(it.cleanUrl, ext);
      const numbered = `${String(idx + 1).padStart(3, "0")}_${base}`;
      return { url: it.cleanUrl, name: uniqName(`${saveFolder}/${numbered}`) };
    });

    const download = (p) => gmDownloadUnified({ url: p.url, name: p.name });

    const res1 = await runBulkDownload({
      plan,
      state,
      download,
      onProgress: (attempted, ok, fail) =>
        setHintFn(
          `全部保存中：${attempted}/${total}（成功 ${ok}，失败 ${fail}）`
        ),
    });

    if (state.cancel) {
      state.running = false;
      updateStopBtnFn();
      setHintFn(`已停止：成功 ${res1.ok}/${total}，失败 ${res1.fails.length}`);
      return;
    }

    if (res1.fails.length > 0) {
      const retry = window.confirm(
        `全部保存完成：成功 ${res1.ok}/${total}，失败 ${res1.fails.length}\n是否重试失败项？`
      );
      if (retry) {
        const res2 = await runBulkDownload({
          plan: res1.fails,
          state,
          download,
          onProgress: (attempted, ok2) => {
            const okTotal = res1.ok + ok2;
            setHintFn(
              `重试中：${attempted}/${res1.fails.length}（重试成功 ${ok2}）总成功 ${okTotal}/${total}`
            );
          },
        });

        state.running = false;
        updateStopBtnFn();

        if (state.cancel) {
          setHintFn(`已停止：总成功 ${res1.ok + res2.ok}/${total}`);
          return;
        }

        const okTotal = res1.ok + res2.ok;
        setHintFn(
          `全部保存完成：成功 ${okTotal}/${total}，失败 ${total - okTotal}`
        );
        return;
      }
    }

    state.running = false;
    updateStopBtnFn();
    setHintFn(
      `全部保存完成：成功 ${res1.ok}/${total}，失败 ${res1.fails.length}`
    );
  }

  function saveFast({ item, index, folder, setHintFn, onOkText }) {
    const extPath = getExt(item.cleanUrl);
    const ext = item.ext || guessExtFromUrl(item.cleanUrl, extPath) || "jpg";
    const base = safeFilenameFromUrl(item.cleanUrl, ext);
    const numbered = `${String(index + 1).padStart(3, "0")}_${base}`;

    if (!folder) folder = buildSaveFolderForPage();
    setHintFn(`快速保存：${folder}/…`);

    gmDownloadUnified({
      url: item.cleanUrl,
      name: `${folder}/${numbered}`,
      saveAs: false,
      setStatus: setHintFn,
      onOkText: onOkText || `已开始下载到：${folder}/`,
    });
  }

  function stopAll({ state, setHintFn, updateStopBtnFn }) {
    if (!state.running) return;
    state.cancel = true;
    setHintFn("已请求停止下载…将停止后续任务（无法取消正在进行的单个下载）");
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
    if (!overlay) {
      cachedEls = null;
      return;
    }
    cachedEls = {
      counter: overlay.querySelector("#tm-counter"),
      status: overlay.querySelector("#tm-status"),
      hostType: overlay.querySelector("#tm-hosttype"),
      filename: overlay.querySelector("#tm-filename"),
      urlClean: overlay.querySelector("#tm-url-clean"),
      urlRaw: overlay.querySelector("#tm-url-raw"),
      mainImg: overlay.querySelector("#tm-main-img"),
      strip: overlay.querySelector("#tm-strip"),
      saveStop: overlay.querySelector("#tm-save-stop"),
      filesizePill: overlay.querySelector("#tm-filesize-pill"),
      filesize: overlay.querySelector("#tm-filesize"),
    };
  }

  function updateSlideStopBtn() {
    updateStopBtn(overlay, "#tm-save-stop", slideBulk);
  }

  function setStatus(text) {
    const el = cachedEls?.status || overlay?.querySelector("#tm-status");
    if (!el) return;
    if (!text) {
      el.style.display = "none";
      el.textContent = "";
    } else {
      el.style.display = "block";
      el.textContent = text;
    }
  }

  function updateCounter() {
    const c = cachedEls?.counter || overlay?.querySelector("#tm-counter");
    if (c) c.textContent = `${list.length ? current + 1 : 0} / ${list.length}`;
  }

  const BTN_ID = "tm-img-slide-float-btn";
  function updateFloatingButtonText() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.textContent = overlay ? "关闭" : "图片";
    btn.title = overlay ? "关闭图片幻灯片（Esc）" : "打开图片幻灯片";
  }

  function preloadAround(i) {
    const radius = Number(SETTINGS.preloadRadius || 0);
    if (!radius || list.length === 0) return;

    for (let d = 1; d <= radius; d++) {
      const a = (i + d + list.length) % list.length;
      const b = (i - d + list.length) % list.length;

      [a, b].forEach((k) => {
        const u = list[k]?.cleanUrl;
        if (!u) return;
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.src = u;
      });
    }
  }

  function ensureThumbObserver(stripEl) {
    if (thumbObserver) return;
    thumbObserver = new IntersectionObserver(
      (entries) => {
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
      },
      { root: stripEl, rootMargin: "140px", threshold: 0.01 }
    );
  }

  function renderThumbnails() {
    const strip = cachedEls?.strip || overlay?.querySelector("#tm-strip");
    if (!strip) return;

    // ✅ 修复：先断开再置空
    if (thumbObserver) {
      thumbObserver.disconnect();
      thumbObserver = null;
    }

    strip.innerHTML = "";
    if (!list.length) return;

    const renderCount = Math.min(list.length, THUMB_MAX_RENDER);
    ensureThumbObserver(strip);

    const frag = document.createDocumentFragment();
    for (let i = 0; i < renderCount; i++) {
      const it = list[i];
      const img = document.createElement("img");
      img.className = "tm-thumb";
      img.alt = String(i + 1);
      img.loading = "lazy";
      img.decoding = "async";
      img.src = THUMB_PLACEHOLDER;

      img.dataset.src = it.rawUrl;

      img.addEventListener("error", () => {
        if (img.dataset.fallbackTried) {
          img.style.opacity = "0.3";
          img.alt = "加载失败";
          return;
        }
        img.dataset.fallbackTried = "1";
        img.src = it.cleanUrl;
      });

      img.addEventListener("click", (e) => {
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
    const strip = cachedEls?.strip || overlay?.querySelector("#tm-strip");
    if (!strip) return;

    const thumbs = strip.querySelectorAll(".tm-thumb");
    thumbs.forEach((t) => t.classList.remove("active"));

    const active = thumbs[current];
    if (active) {
      active.classList.add("active");
      try {
        active.scrollIntoView({ block: "nearest", inline: "center" });
      } catch {
        /* ignore */
      }
    }
  }

  function saveCurrentImage() {
    if (!list.length) return;
    const it = list[current];
    const filename = safeFilenameFromUrl(it.cleanUrl, it.ext || "jpg");
    setStatus("准备保存…");
    gmDownloadUnified({
      url: it.cleanUrl,
      name: filename,
      saveAs: true,
      setStatus,
      onOkText: "",
    });
  }

  function saveCurrentImageFast() {
    if (!list.length) return;
    if (!slideSaveFolder) slideSaveFolder = buildSaveFolderForPage();
    saveFast({
      item: list[current],
      index: current,
      folder: slideSaveFolder,
      setHintFn: setStatus,
      onOkText: `已开始下载到：${slideSaveFolder}/`,
    });
  }

  async function slideSaveAll() {
    return bulkSaveAll({
      items: list,
      folder: slideSaveFolder,
      state: slideBulk,
      setHintFn: setStatus,
      updateStopBtnFn: updateSlideStopBtn,
    });
  }

  function slideStopAll() {
    return stopAll({
      state: slideBulk,
      setHintFn: setStatus,
      updateStopBtnFn: updateSlideStopBtn,
    });
  }

  function show(i) {
    if (!list.length) return;
    current = (i + list.length) % list.length;

    const it = list[current];
    updateCounter();

    const els = cachedEls || {};
    if (els.hostType)
      els.hostType.textContent = it.hostType ? `[${it.hostType}]` : "[no-rule]";
    if (els.filename) els.filename.textContent = it.fileName || "(无文件名)";
    if (els.urlClean) els.urlClean.textContent = it.cleanUrl;
    if (els.urlRaw) els.urlRaw.textContent = it.rawUrl;

    const imgEl = els.mainImg || overlay?.querySelector("#tm-main-img");
    setStatus("加载中…");

    // ✅ 美化：添加加载动画
    imgEl.classList.add("loading");
    imgEl.style.opacity = "0";

    // 用 token 防止快速切换时旧 onload/onerror 乱入
    const token = String(Date.now()) + "_" + String(Math.random());
    imgEl.dataset.tmToken = token;

    // 更新顶部文件大小胶囊
    const filesizePill =
      els.filesizePill || overlay?.querySelector("#tm-filesize-pill");
    const filesizeEl = els.filesize || overlay?.querySelector("#tm-filesize");
    if (filesizePill) filesizePill.style.display = "none";
    if (filesizeEl) filesizeEl.textContent = "-";

    const trySettleSuccess = () => {
      if (imgEl.dataset.tmToken !== token) return;
      setStatus("");
      imgEl.style.opacity = "1";
      imgEl.classList.remove("loading");

      // 图片加载成功后，异步获取并显示文件大小
      const showFilesize = (len) => {
        if (imgEl.dataset.tmToken !== token) return;
        if (filesizePill && filesizeEl) {
          if (len != null) {
            filesizeEl.textContent = formatFileSize(len);
            filesizePill.style.display = "";
          } else {
            filesizeEl.textContent = "-";
            filesizePill.style.display = "none";
          }
        }
      };

      if (!it.contentLength && it.cleanUrl) {
        probeContentLength(it.cleanUrl).then((len) => {
          it.contentLength = len;
          showFilesize(len);
        });
      } else {
        showFilesize(it.contentLength);
      }
    };

    const trySettleError = () => {
      if (imgEl.dataset.tmToken !== token) return;
      setStatus("加载失败（可能防盗链/不存在）");
      imgEl.style.opacity = "0.5";
      imgEl.classList.remove("loading");
    };

    imgEl.onload = () => {
      // raw-then-clean 时：raw 加载成功先显示，并清掉“加载中”避免用户误判卡死；clean 成功后再静默收口一次
      if (imgEl.dataset.tmToken !== token) return;
      if (
        SETTINGS.slideLoadMode === "raw-then-clean" &&
        imgEl.dataset.tmPhase === "raw"
      ) {
        imgEl.style.opacity = "1";
        imgEl.classList.remove("loading");
        setStatus("");
        return;
      }
      trySettleSuccess();
    };

    imgEl.onerror = () => {
      if (imgEl.dataset.tmToken !== token) return;
      // raw-then-clean：raw 失败就直接切 clean 再试一次
      if (
        SETTINGS.slideLoadMode === "raw-then-clean" &&
        imgEl.dataset.tmPhase === "raw"
      ) {
        imgEl.dataset.tmPhase = "clean";
        imgEl.src = it.cleanUrl;
        return;
      }
      trySettleError();
    };

    // 根据设置选择加载策略
    if (SETTINGS.slideLoadMode === "raw") {
      imgEl.dataset.tmPhase = "raw";
      imgEl.src = it.rawUrl || it.cleanUrl;
    } else if (SETTINGS.slideLoadMode === "raw-then-clean") {
      imgEl.dataset.tmPhase = "raw";
      imgEl.src = it.rawUrl || it.cleanUrl;

      // raw 已经开始加载；稍后无论如何都尝试切到 clean（若 raw 本身就是 clean，则不重复）
      if (it.cleanUrl && it.rawUrl && it.cleanUrl !== it.rawUrl) {
        const delay = clamp(
          Number(SETTINGS.slideRawPreviewDelayMs || 0),
          0,
          5000
        );
        setTimeout(() => {
          if (imgEl.dataset.tmToken !== token) return;
          imgEl.dataset.tmPhase = "clean";
          imgEl.src = it.cleanUrl;
        }, delay);
      }
    } else {
      // clean（默认）
      imgEl.dataset.tmPhase = "clean";
      imgEl.src = it.cleanUrl;
    }

    preloadAround(current);
    updateActiveThumbnail();
    updateFloatingButtonText();

    if (viewerOpen) {
      openImageViewer(it.cleanUrl, it.fileName || it.cleanUrl);
    }
  }

  async function rebuildAndOpen() {
    if (!canRunSlideshowScan({ silent: true })) return;
    // 每次重新扫描前清空探测缓存，避免缓存无限增长
    contentLengthProbeCache.clear();

    setStatus("扫描页面图片…");
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

    list = await applySizeFilter(tmp, (s) => setStatus(s));
    current = 0;

    if (!list.length) {
      setStatus("未提取到图片（可能被过滤条件筛掉）");
      const els = cachedEls || {};
      if (els.hostType) els.hostType.textContent = "";
      if (els.filename) els.filename.textContent = "";
      if (els.urlClean) els.urlClean.textContent = "";
      if (els.urlRaw) els.urlRaw.textContent = "";
      if (els.mainImg) els.mainImg.src = "";
      if (els.strip) els.strip.innerHTML = "";
      updateCounter();
      updateFloatingButtonText();
      return;
    }

    setStatus("");
    renderThumbnails();
    show(0);
  }

  // =========================================================
  // Viewer（独立查看器）
  // =========================================================
  let viewerOverlay = null;
  let viewerImgEl = null;
  let viewerCurrentUrl = "";
  let viewerCurrentFilename = "";

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
    const hint = viewerOverlay?.querySelector(".tmv-hint");
    if (!hint) return;
    hint.textContent =
      text || "滚轮切图 · Alt+滚轮缩放 · 拖动平移 · 单击返回幻灯片 · Esc 关闭";
  }

  function updateViewerStopBtn() {
    updateStopBtn(viewerOverlay, "#tmv-stop", viewerBulk);
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
      name: viewerCurrentFilename || "image.jpg",
      saveAs: !!saveAs,
    }).then((ok) => {
      setViewerHint(
        ok
          ? saveAs
            ? "已打开保存对话框"
            : "已开始下载"
          : "保存失败（可能被防盗链/跨域限制）"
      );
    });
  }

  function viewerSaveFast() {
    if (!list.length) {
      setViewerHint("没有图片可保存");
      return;
    }
    if (!slideSaveFolder) slideSaveFolder = buildSaveFolderForPage();
    saveFast({
      item: list[current],
      index: current,
      folder: slideSaveFolder,
      setHintFn: setViewerHint,
      onOkText: "已开始下载",
    });
  }

  async function viewerSaveAll() {
    return bulkSaveAll({
      items: list,
      folder: slideSaveFolder,
      state: viewerBulk,
      setHintFn: setViewerHint,
      updateStopBtnFn: updateViewerStopBtn,
      singleSaveFn: () => viewerSave(false),
    });
  }

  function viewerStopAll() {
    return stopAll({
      state: viewerBulk,
      setHintFn: setViewerHint,
      updateStopBtnFn: updateViewerStopBtn,
    });
  }

  function closeImageViewer() {
    viewerOpen = false;
    if (viewerBulk.running) viewerBulk.cancel = true;

    if (!viewerOverlay) return;
    document.removeEventListener("keydown", onViewerKeydown, true);

    // ✅ 清理图片引用
    if (viewerImgEl) {
      viewerImgEl.onload = null;
      viewerImgEl.onerror = null;
    }

    viewerOverlay.remove();
    viewerOverlay = null;
    viewerImgEl = null;

    viewerCurrentUrl = "";
    viewerCurrentFilename = "";
    viewerBulk.running = false;
    viewerBulk.cancel = false;
  }

  function onViewerKeydown(e) {
    if (!viewerOverlay) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      closeImageViewer();
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      show(current - 1);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      show(current + 1);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      e.stopPropagation();
      show(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      e.stopPropagation();
      show(list.length - 1);
      return;
    }

    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      e.stopPropagation();
      viewerZoom.scale = Math.min(12, viewerZoom.scale * 1.15);
      applyViewerZoom();
      return;
    }
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      e.stopPropagation();
      viewerZoom.scale = Math.max(0.1, viewerZoom.scale / 1.15);
      applyViewerZoom();
      return;
    }
    if (e.key === "0") {
      e.preventDefault();
      e.stopPropagation();
      resetViewerZoom();
      return;
    }
  }

  function openImageViewer(urlStr, titleText = "") {
    injectStyles();
    viewerOpen = true;

    if (!viewerOverlay) {
      viewerOverlay = document.createElement("div");
      viewerOverlay.id = "tm-img-viewer-overlay";

      viewerOverlay.innerHTML = `
                <div class="tmv-top">
                    <div class="tmv-title" id="tmv-title"></div>
                    <button class="tm-btn tm-btn-primary" id="tmv-save" style="padding:8px 10px;">保存</button>
                    <button class="tm-btn" id="tmv-save-fast" style="padding:8px 10px;">快速保存</button>
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

      viewerImgEl = viewerOverlay.querySelector("#tmv-img");
      const stageEl = viewerOverlay.querySelector("#tmv-stage");

      viewerOverlay
        .querySelector("#tmv-close")
        .addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeImageViewer();
        });

      viewerOverlay
        .querySelector("#tmv-reset")
        .addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          resetViewerZoom();
        });

      viewerOverlay
        .querySelector("#tmv-save")
        .addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          viewerSave(true);
        });

      viewerOverlay
        .querySelector("#tmv-save-fast")
        .addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          viewerSaveFast();
        });

      viewerOverlay
        .querySelector("#tmv-save-all")
        .addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await viewerSaveAll();
        });

      viewerOverlay
        .querySelector("#tmv-open")
        .addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!viewerCurrentUrl) return;
          window.open(viewerCurrentUrl, "_blank", "noopener,noreferrer");
        });

      viewerOverlay
        .querySelector("#tmv-stop")
        .addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          viewerStopAll();
        });

      stageEl.addEventListener("click", (e) => {
        if (e.target === stageEl) closeImageViewer();
      });

      viewerImgEl.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (viewerImgMoved) {
          viewerImgMoved = false;
          return;
        }
        closeImageViewer();
      });

      let wheelLock = 0;
      stageEl.addEventListener(
        "wheel",
        (e) => {
          const dy = e.deltaY || 0;
          if (Math.abs(dy) < 2) return;

          if (e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            const factor = dy < 0 ? 1.12 : 1 / 1.12;
            viewerZoom.scale = Math.max(
              0.1,
              Math.min(12, viewerZoom.scale * factor)
            );
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
        },
        { passive: false }
      );

      viewerImgEl.addEventListener("pointerdown", (e) => {
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

      viewerImgEl.addEventListener("pointermove", (e) => {
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
      viewerImgEl.addEventListener("pointerup", endDrag);
      viewerImgEl.addEventListener("pointercancel", endDrag);

      document.addEventListener("keydown", onViewerKeydown, true);
    }

    viewerOverlay.querySelector("#tmv-title").textContent = titleText || urlStr;

    viewerCurrentUrl = urlStr;
    const extPath = getExt(urlStr);
    const ext = guessExtFromUrl(urlStr, extPath) || "jpg";
    viewerCurrentFilename = safeFilenameFromUrl(urlStr, ext);

    resetViewerZoom();
    updateViewerStopBtn();
    setViewerHint("");

    viewerOverlay.querySelector("#tmv-stop").disabled = !viewerBulk.running;

    viewerImgEl.onerror = () => {
      setViewerHint("加载失败（可能防盗链/不存在）");
    };
    viewerImgEl.src = urlStr;
  }

  // =========================================================
  // 幻灯片 overlay 构建/事件
  // =========================================================
  function buildOverlay() {
    injectStyles();
    slideSaveFolder = buildSaveFolderForPage();

    overlay = document.createElement("div");
    overlay.id = "tm-img-slide-overlay";
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
                    <div class="tm-pill">
                      <div class="tm-kv" id="tm-folder-pill" title="点击修改保存文件夹"><small>📁</small> <span id="tm-folder">...</span></div>
                    </div>
                    <div class="tm-pill" id="tm-filesize-pill" style="display:none;">
                      <div class="tm-kv"><small>📦</small> <span id="tm-filesize">-</span></div>
                    </div>
                </div>

                <div class="tm-top-right">
                    <button id="tm-save" class="tm-btn tm-btn-primary">保存</button>
                    <button id="tm-save-fast" class="tm-btn">快速保存</button>
                    <button id="tm-save-all" class="tm-btn">全部保存</button>
                    <button id="tm-save-stop" class="tm-btn tm-btn-danger" disabled>停止</button>
                    <button id="tm-open" class="tm-btn">新标签打开</button>
                    <button id="tm-refresh" class="tm-btn">重新扫描</button>
                    <button id="tm-close" class="tm-btn tm-btn-danger">关闭</button>

                </div>

                <div id="tm-filename" class="tm-filename"></div>
            </div>


            <div class="tm-stage">
                <div class="tm-canvas" id="tm-canvas">
                    <button id="tm-prev" class="tm-navbtn">‹</button>

                    <div class="tm-image-box">
                        <img id="tm-main-img" class="tm-main-img" title="点击：打开查看器；滚轮：切换图片" />
                    </div>

                    <button id="tm-next" class="tm-navbtn">›</button>

<div id="tm-status" class="tm-hint" style="display:none;"></div>
                    <div id="tm-help" class="tm-hint" style="display:block; opacity: 1; transition: opacity .35s ease;">滚轮切换 · 点击主图：查看器 · ←/→ 切换 · Esc 关闭</div>

                </div>

                <div class="tm-strip-panel">
                    <div id="tm-strip" class="tm-strip"></div>
                </div>
            </div>

            <div class="tm-glassfooter" style="padding:12px 14px; height:${FOOTER_HEIGHT_PX}px; overflow:auto;">
                <div id="tm-link-block" style="margin-top:8px;">
                    <div class="tm-label">当前链接（已清洗）</div>
                    <div class="tm-link-row">
                        <div class="tm-link-main">
                            <div id="tm-url-clean" class="tm-url"></div>
                        </div>
                        <button id="tm-open-clean" class="tm-btn tm-copy-btn" type="button">打开</button>
                        <button id="tm-copy-clean" class="tm-btn tm-copy-btn" type="button">复制</button>
                    </div>

                    <div class="tm-label">原始链接</div>
                    <div class="tm-link-row" style="margin-bottom:0;">
                        <div class="tm-link-main">
                            <div id="tm-url-raw" class="tm-url"></div>
                        </div>
                        <button id="tm-open-raw" class="tm-btn tm-copy-btn" type="button">打开</button>
                        <button id="tm-copy-raw" class="tm-btn tm-copy-btn" type="button">复制</button>
                    </div>
                </div>
            </div>
        `;
    const $ = (sel) => overlay.querySelector(sel);

    // 顶部操作提示：打开时短暂显示后自动淡出，避免遮挡看图
    const helpEl = $("#tm-help");
    if (helpEl) {
      // 先确保可见
      helpEl.style.opacity = "1";
      // 3 秒后淡出
      setTimeout(() => {
        if (!overlay || !helpEl.isConnected) return;
        helpEl.style.opacity = "0";
      }, 3000);
    }

    bindClick($("#tm-close"), closeSlideshow);

    bindClick($("#tm-prev"), () => show(current - 1));
    bindClick($("#tm-next"), () => show(current + 1));
    bindClick($("#tm-refresh"), rebuildAndOpen);

    bindClick($("#tm-open"), () => {
      if (!list.length) return;
      window.open(list[current].cleanUrl, "_blank", "noopener,noreferrer");
    });

    const copyBtnTimers = new WeakMap();
    function flashCopiedButton(btn) {
      if (!btn) return;
      const timer = copyBtnTimers.get(btn);
      if (timer) clearTimeout(timer);
      if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.textContent || "复制";
      }
      btn.textContent = "已复制";
      btn.disabled = true;
      const resetTimer = setTimeout(() => {
        btn.textContent = btn.dataset.originalText || "复制";
        btn.disabled = false;
        copyBtnTimers.delete(btn);
      }, 1200);
      copyBtnTimers.set(btn, resetTimer);
    }

    function openUrlInNewTab(url, successText) {
      const value = String(url || "").trim();
      if (!value) {
        setStatus("无可打开的链接");
        return;
      }
      const opened = window.open(value, "_blank", "noopener,noreferrer");
      if (opened) {
        setStatus(successText);
      } else {
        setStatus("打开失败，可能被浏览器拦截弹窗");
      }
    }

    async function copyTextToClipboard(text, successText, btn) {
      const value = String(text || "").trim();
      if (!value) {
        setStatus("无可复制的链接");
        return;
      }
      try {
        if (navigator.clipboard?.writeText && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
        } else if (typeof GM_setClipboard === "function") {
          GM_setClipboard(value, "text");
        } else {
          throw new Error("No clipboard API available");
        }
        flashCopiedButton(btn);
        setStatus(successText);
      } catch (err) {
        console.error("复制链接失败：", err);
        setStatus("复制失败，请手动复制");
      }
    }

    bindClick($("#tm-copy-clean"), (e) => {
      if (!list.length) return;
      copyTextToClipboard(
        list[current]?.cleanUrl,
        "已复制当前链接",
        e.currentTarget
      );
    });
    bindClick($("#tm-copy-raw"), (e) => {
      if (!list.length) return;
      copyTextToClipboard(
        list[current]?.rawUrl,
        "已复制原始链接",
        e.currentTarget
      );
    });

    bindClick($("#tm-open-clean"), () => {
      if (!list.length) return;
      openUrlInNewTab(list[current]?.cleanUrl, "已打开当前链接");
    });
    bindClick($("#tm-open-raw"), () => {
      if (!list.length) return;
      openUrlInNewTab(list[current]?.rawUrl, "已打开原始链接");
    });

    bindClick($("#tm-save"), saveCurrentImage);
    bindClick($("#tm-save-fast"), saveCurrentImageFast);
    bindClick($("#tm-save-all"), slideSaveAll);
    bindClick($("#tm-save-stop"), slideStopAll);

    // 文件夹显示和点击修改功能
    const folderEl = $("#tm-folder");
    const folderPill = $("#tm-folder-pill");
    const updateFolderDisplay = () => {
      folderEl.textContent = slideSaveFolder || "未设置";
    };
    updateFolderDisplay();

    bindClick(folderPill, () => {
      const newFolder = window.prompt(
        "修改保存文件夹（留空则使用默认）:",
        slideSaveFolder || ""
      );
      if (newFolder !== null) {
        const trimmed = newFolder.trim();
        slideSaveFolder = trimmed || buildSaveFolderForPage();
        updateFolderDisplay();
        setStatus(`保存文件夹已更新为：${slideSaveFolder}`);
      }
    });

    bindClick($("#tm-main-img"), () => {
      if (!list.length) return;
      const it = list[current];
      openImageViewer(it.cleanUrl, it.fileName || it.cleanUrl);
    });

    let wheelLock = 0;
    const canvasEl = $("#tm-canvas");
    wheelHandler = (e) => {
      // ✅ 修复：查看器打开时不响应
      if (viewerOpen) return;

      const now = Date.now();
      if (now - wheelLock < 120) return;

      const dy = e.deltaY || 0;
      if (Math.abs(dy) < 2) return;

      if (e.target instanceof Element && e.target.closest(".tm-navbtn")) return;

      e.preventDefault();
      e.stopPropagation();

      wheelLock = now;
      if (dy > 0) show(current + 1);
      else show(current - 1);
    };
    canvasEl.addEventListener("wheel", wheelHandler, { passive: false });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeSlideshow();
    });

    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKeydown, true);

    cacheOverlayElements();

    updateSlideStopBtn();
    setStatus("");
  }

  function openSlideshow() {
    if (overlay) return;
    if (!canRunSlideshowScan()) return;
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
    const canvasEl = overlay.querySelector("#tm-canvas");
    if (canvasEl && wheelHandler) {
      canvasEl.removeEventListener("wheel", wheelHandler);
      wheelHandler = null;
    }

    // ✅ 修复：清理 observer
    if (thumbObserver) {
      thumbObserver.disconnect();
      thumbObserver = null;
    }

    document.removeEventListener("keydown", onKeydown, true);
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
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn(e);
    });
  }
  function bindEvent(el, type, fn) {
    el.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn(e);
    });
  }

  function yyyymmdd(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }

  function setBtnPos(btn, left, top) {
    btn.style.left = `${left}px`;
    btn.style.top = `${top}px`;
    btn.style.right = "auto";
    btn.style.bottom = "auto";
  }

  function resetBtnPositionStorage() {
    SETTINGS.btnPos = null;
    GM_setValue(STORE_KEYS.BTN_POS, SETTINGS.btnPos);
  }

  function clearAllButtonPositionStorage() {
    resetBtnPositionStorage();
    SETTINGS.btnPosLocked = DEFAULTS.btnPosLocked;
    GM_setValue(STORE_KEYS.BTN_POS_LOCKED, SETTINGS.btnPosLocked);
  }

  function restoreButtonAfterPositionReset(btn) {
    if (!btn) return;
    btn.title = SETTINGS.btnPosLocked
      ? "图片按钮位置已锁定：可点击打开，但不可拖动"
      : "可拖动图片按钮位置";
    btn.setAttribute("aria-label", btn.title);
    btn.style.cursor = SETTINGS.btnPosLocked ? "default" : "pointer";
    applyBtnPosition(btn);
  }

  function clearAndResetGlobalButtonPosition() {
    clearAllButtonPositionStorage();
    restoreButtonAfterPositionReset(document.getElementById(BTN_ID));
  }

  function getDefaultBtnRect() {
    return {
      right: DEFAULT_BTN_OFFSET,
      bottom: DEFAULT_BTN_OFFSET,
      left: Math.max(6, window.innerWidth - DEFAULT_BTN_OFFSET),
      top: Math.max(6, window.innerHeight - DEFAULT_BTN_OFFSET),
    };
  }

  function applyDefaultBtnPosition(btn) {
    btn.style.left = "auto";
    btn.style.top = "auto";
    btn.style.right = `${DEFAULT_BTN_OFFSET}px`;
    btn.style.bottom = `${DEFAULT_BTN_OFFSET}px`;
  }

  // 右下角可拖动按钮
  // =========================================================
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // 格式化文件大小显示
  function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined) return "";
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = (bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0);

    return `${size} ${units[i]}`;
  }

  function applyBtnPosition(btn) {
    const pos = SETTINGS.btnPos;
    if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
      setBtnPos(btn, pos.left, pos.top);

      const r = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const left = clamp(r.left, 6, vw - r.width - 6);
      const top = clamp(r.top, 6, vh - r.height - 6);
      if (left !== r.left || top !== r.top) {
        setBtnPos(btn, left, top);
        SETTINGS.btnPos = { left, top };
        GM_setValue(STORE_KEYS.BTN_POS, SETTINGS.btnPos);
      }
    } else {
      applyDefaultBtnPosition(btn);
    }
  }

  function injectButton() {
    // 仅在顶层窗口注入，避免 iframe 内重复出现
    if (window.top && window.top !== window) return;

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

    const btn = document.createElement("button");
    const setBtnInteractiveStyle = (state) => {
      const isLocked = SETTINGS.btnPosLocked;
      const nextState = isLocked ? state === "active" : state;
      const styleMap = {
        idle: isLocked
          ? {
              background: "rgba(28,52,86,0.82)",
              borderColor: "rgba(120,190,255,0.34)",
              boxShadow:
                "0 0 0 1px rgba(120,190,255,0.14), 0 10px 26px rgba(8,20,40,0.26)",
              transform: "translateY(0)",
            }
          : {
              background: "rgba(18,18,20,0.72)",
              borderColor: "rgba(255,255,255,0.14)",
              boxShadow: "none",
              transform: "translateY(0)",
            },
        hover: isLocked
          ? {
              background: "rgba(34,62,102,0.86)",
              borderColor: "rgba(144,205,255,0.46)",
              boxShadow:
                "0 0 0 1px rgba(120,190,255,0.18), 0 12px 28px rgba(10,24,48,0.30)",
              transform: "translateY(-1px)",
            }
          : {
              background: "rgba(28,28,32,0.82)",
              borderColor: "rgba(255,255,255,0.22)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
              transform: "translateY(-1px)",
            },
        active: {
          background: isLocked ? "rgba(32,58,96,0.88)" : "rgba(36,36,42,0.9)",
          borderColor: isLocked
            ? "rgba(144,205,255,0.52)"
            : "rgba(255,255,255,0.28)",
          boxShadow: isLocked
            ? "0 0 0 1px rgba(120,190,255,0.22), 0 8px 20px rgba(10,24,48,0.24)"
            : "0 6px 16px rgba(0,0,0,0.26)",
          transform: "translateY(0)",
        },
      };
      const style = styleMap[nextState] || styleMap.idle;
      btn.style.background = style.background;
      btn.style.borderColor = style.borderColor;
      btn.style.boxShadow = style.boxShadow;
      btn.style.transform = style.transform;
    };

    btn.id = BTN_ID;
    btn.type = "button";
    btn.textContent = "图片";
    btn.title = SETTINGS.btnPosLocked
      ? "图片按钮位置已锁定：可点击打开，但不可拖动"
      : "可拖动图片按钮位置";
    btn.setAttribute("aria-label", btn.title);
    btn.style.cssText = `
            position: fixed;
            z-index: 2147483645;
            padding: 12px 16px;
            border: 1px solid ${
              SETTINGS.btnPosLocked
                ? "rgba(120,190,255,0.34)"
                : "rgba(255,255,255,0.14)"
            };
            border-radius: 14px;
            background: ${
              SETTINGS.btnPosLocked
                ? "rgba(28,52,86,0.82)"
                : "rgba(18,18,20,0.72)"
            };
            color: rgba(255,255,255,0.92);
            cursor: ${SETTINGS.btnPosLocked ? "default" : "pointer"};
            box-shadow: ${
              SETTINGS.btnPosLocked
                ? "0 0 0 1px rgba(120,190,255,0.14), 0 10px 26px rgba(8,20,40,0.26)"
                : "none"
            };
            user-select: none;
            touch-action: none;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transition: transform .15s ease, box-shadow .2s ease, background .15s ease, border-color .15s ease;
            font-family: var(--tm-font);
            font-size: 16px;
            font-weight: 900;
            letter-spacing: .4px;
        `;
    setBtnInteractiveStyle("idle");

    let dragging = false;
    let moved = false;
    let startX = 0,
      startY = 0;
    let startLeft = 0,
      startTop = 0;

    const getRectLT = () => {
      const r = btn.getBoundingClientRect();
      return { left: r.left, top: r.top, w: r.width, h: r.height };
    };

    bindEvent(btn, "pointerenter", () => {
      if (dragging) return;
      setBtnInteractiveStyle("hover");
    });
    bindEvent(btn, "pointerleave", () => {
      if (dragging) return;
      setBtnInteractiveStyle("idle");
    });

    bindEvent(btn, "pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType !== "touch") return;
      setBtnInteractiveStyle("active");
      if (SETTINGS.btnPosLocked) return;
      btn.setPointerCapture?.(e.pointerId);

      dragging = true;
      moved = false;

      const r = getRectLT();
      startLeft = r.left;
      startTop = r.top;
      startX = e.clientX;
      startY = e.clientY;
    });

    bindEvent(btn, "pointermove", (e) => {
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
      const hadPointerCapture = dragging;
      if (hadPointerCapture) {
        dragging = false;
        btn.releasePointerCapture?.(e.pointerId);
      }

      setBtnInteractiveStyle("idle");
      if (!hadPointerCapture) return;
      if (!moved) return;
      const r = getRectLT();
      SETTINGS.btnPos = { left: r.left, top: r.top };
      GM_setValue(STORE_KEYS.BTN_POS, SETTINGS.btnPos);
    };

    bindEvent(btn, "pointerup", endDrag);
    bindEvent(btn, "pointercancel", endDrag);
    bindEvent(btn, "lostpointercapture", () => {
      dragging = false;
      setBtnInteractiveStyle("idle");
    });

    bindClick(btn, () => {
      if (moved) return;
      toggleSlideshow();
    });

    applyBtnPosition(btn);
    document.body.appendChild(btn);
  }

  const PANEL_ID = "tm-slide-settings-simple";

  function openSettingsPanel() {
    injectStyles();
    if (document.getElementById(PANEL_ID)) return;

    const currentHost = location.hostname || "当前站点";
    const hostVariants = getCurrentHostVariants();
    const normalizedCurrentHost = normalizeBlacklistEntry(currentHost);
    const currentHostBlacklisted = isBlacklisted(currentHost);

    const p = document.createElement("div");
    p.id = PANEL_ID;
    const defaultBtnRect = getDefaultBtnRect();
    p.style.cssText = `
            position: fixed;
            right: 18px;
            bottom: ${defaultBtnRect.bottom + 180 + DEFAULT_BTN_PANEL_GAP}px;
            width: 340px;
            max-width: calc(100vw - 36px);
            max-height: 70vh;
            overflow: auto;
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
                <input id="tm-root-folder" type="text" value="${String(
                  SETTINGS.saveRootFolder || "TM_Images"
                )}" placeholder="TM_Images" />
            </div>

            <div style="margin-top:10px;">
                <div class="tm-label">分辨率：最短边 ≥ (px)</div>
                <input id="tm-minSide" type="number" min="0" value="${Number(
                  SETTINGS.filter.minSidePx || 0
                )}" />
            </div>

            <div style="margin-top:10px;">
                <div class="tm-label" style="line-height:1.35;">文件大小：Content-Length ≥ (KB)（0=不限）</div>
                <input id="tm-minKB" type="number" min="0" value="${Number(
                  SETTINGS.filter.minSizeKB || 0
                )}" />
            </div>

            <div style="margin-top:10px;">
                <div class="tm-label">允许后缀名（逗号分隔；空=不限）</div>
                <input id="tm-exts" type="text" value="${String(
                  SETTINGS.filter.exts || ""
                )}" placeholder="jpg,png,webp" />
                <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
                    <button class="tm-ext-preset tm-btn tm-btn-ghost" style="padding:6px 10px;font-size:13px;" data-value="jpeg,jpg,png,webp,avif">全部常见</button>
                    <button class="tm-ext-preset tm-btn tm-btn-ghost" style="padding:6px 10px;font-size:13px;" data-value="jpeg,jpg,png,webp">常用</button>
                    <button class="tm-ext-preset tm-btn tm-btn-ghost" style="padding:6px 10px;font-size:13px;" data-value="png,avif">高质量</button>
                    <button class="tm-ext-preset tm-btn tm-btn-ghost" style="padding:6px  10px;font-size:13px;" data-value="jpeg,jpg">JPEG</button>
                    <button class="tm-ext-preset tm-btn tm-btn-ghost" style="padding:6px 10px;font-size:13px;" data-value="webp">WebP</button>
                </div>
            </div>

            <div style="margin-top:10px;">
                <div class="tm-label">幻灯片主图加载模式</div>
                <select id="tm-slide-load-mode" style="width:100%;font-family:var(--tm-font);font-size:15px;padding:10px 10px;border-radius:12px;border:1px solid var(--tm-border);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.94);outline:none;">
                    <option value="raw-then-clean" ${
                      SETTINGS.slideLoadMode === "raw-then-clean"
                        ? "selected"
                        : ""
                    }>先原始预览，再切高清（推荐）</option>
                    <option value="clean" ${
                      SETTINGS.slideLoadMode === "clean" ? "selected" : ""
                    }>直接高清（清洗后链接）</option>
                    <option value="raw" ${
                      SETTINGS.slideLoadMode === "raw" ? "selected" : ""
                    }>直接原始（更省流/更快）</option>
                </select>
                <div style="margin-top:8px;">
                  <div class="tm-label">raw→clean 切换延迟 (ms)（仅“先原始预览”生效）</div>
                  <input id="tm-slide-raw-preview-delay" type="number" min="0" max="5000" value="${Number(
                    SETTINGS.slideRawPreviewDelayMs || 0
                  )}" />
                </div>
                <div style="margin-top:6px;font-size:12px;line-height:1.4;color:rgba(255,255,255,0.74);">
                    “先原始预览”会先加载页面原图/缩略图以更快出图，随后自动切换到清洗后的高清链接。
                </div>
            </div>

            <div style="margin-top:10px;">
                <div class="tm-label">当前站点黑名单</div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input id="tm-blacklist-current-host" type="text" value="${currentHost}"
                        readonly style="flex:1;opacity:0.78;cursor:not-allowed;" />
                    <button id="tm-toggle-current-host-blacklist" class="tm-btn ${
                      currentHostBlacklisted
                        ? "tm-btn-danger"
                        : "tm-btn-primary"
                    }" style="white-space:nowrap;">
                      ${currentHostBlacklisted ? "移出黑名单" : "加入黑名单"}
                    </button>
                </div>
                <div style="margin-top:6px;font-size:12px;line-height:1.4;color:rgba(255,255,255,0.74);">
                    当前支持自动识别 ${hostVariants.join(
                      " / "
                    )}，可一键将当前域名加入或移出黑名单。
                </div>
            </div>

            <div style="margin-top:10px;">
                <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;user-select:none;">
                    <input id="tm-enhanced-image-discovery" type="checkbox" ${
                      SETTINGS.enhancedImageDiscovery ? "checked" : ""
                    } style="margin-top:3px;" />
                    <span>
                        <div class="tm-label" style="margin:0;">加强图片挖掘模式</div>
                        <div style="margin-top:4px;font-size:12px;line-height:1.4;color:rgba(255,255,255,0.74);">
                            额外扫描常见图库 data 属性、JSON-LD / application/json / __NEXT_DATA__ 中的图片字段，提升商品页和 SPA 页命中率；关闭时保持当前轻量扫描。
                        </div>
                    </span>
                </label>
            </div>

            <div style="margin-top:10px;">
                <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;user-select:none;">
                    <input id="tm-btn-pos-locked" type="checkbox" ${
                      SETTINGS.btnPosLocked ? "checked" : ""
                    } style="margin-top:3px;" />
                    <span>
                        <div class="tm-label" style="margin:0;">锁定图片按钮位置</div>
                        <div style="margin-top:4px;font-size:12px;line-height:1.4;color:rgba(255,255,255,0.74);">
                            锁定后将禁止拖动右下角“图片”按钮；按钮会显示锁定态高亮与悬浮提示。重置按钮位置会恢复到默认右下角。
                        </div>
                    </span>
                </label>
            </div>

            <div style="margin-top:12px;display:flex;gap:10px;">
                <button id="tm-s-save" class="tm-btn tm-btn-primary" style="flex:1;">保存</button>
                <button id="tm-s-resetpos" class="tm-btn" style="flex:1;">重置按钮位置</button>
            </div>
            <div style="margin-top:10px;display:flex;gap:10px;">
                <button id="tm-s-clear-global-btn-pos" class="tm-btn tm-btn-danger" style="flex:1;">清理并重置全局按钮位置</button>
            </div>
`;

    p.querySelector("#tm-s-close").onclick = () => p.remove();

    p.querySelector("#tm-s-resetpos").onclick = () => {
      resetBtnPositionStorage();
      const btn = document.getElementById(BTN_ID);
      if (btn) applyBtnPosition(btn);
    };

    p.querySelector("#tm-s-clear-global-btn-pos").onclick = () => {
      clearAndResetGlobalButtonPosition();
      p.remove();
      openSettingsPanel();
    };

    const enhancedImageDiscoveryInput = p.querySelector(
      "#tm-enhanced-image-discovery"
    );
    const btnPosLockedInput = p.querySelector("#tm-btn-pos-locked");

    p.querySelectorAll(".tm-ext-preset").forEach((btn) => {
      btn.onclick = () => {
        const value = btn.dataset.value;
        const input = p.querySelector("#tm-exts");
        if (input) input.value = value;
      };
    });

    const toggleCurrentHostBtn = p.querySelector(
      "#tm-toggle-current-host-blacklist"
    );
    if (toggleCurrentHostBtn) {
      toggleCurrentHostBtn.onclick = () => {
        if (currentHostBlacklisted) {
          SETTINGS.blacklist = SETTINGS.blacklist.filter(
            (entry) => normalizeBlacklistEntry(entry) !== normalizedCurrentHost
          );
        } else if (
          normalizedCurrentHost &&
          !SETTINGS.blacklist.some(
            (entry) => normalizeBlacklistEntry(entry) === normalizedCurrentHost
          )
        ) {
          SETTINGS.blacklist.push(normalizedCurrentHost);
        }

        SETTINGS.blacklist = SETTINGS.blacklist
          .map((entry) => normalizeBlacklistEntry(entry))
          .filter((entry) => entry && !entry.startsWith("*."))
          .filter((entry, index, arr) => arr.indexOf(entry) === index);

        saveBlacklist();
        refreshButtonVisibilityByBlacklist();
        p.remove();
        openSettingsPanel();
      };
    }

    p.querySelector("#tm-s-save").onclick = () => {
      SETTINGS.saveRootFolder = String(
        p.querySelector("#tm-root-folder").value || "TM_Images"
      );
      SETTINGS.filter.minSidePx = Math.max(
        0,
        parseInt(p.querySelector("#tm-minSide").value, 10) || 0
      );
      SETTINGS.filter.minSizeKB = Math.max(
        0,
        parseInt(p.querySelector("#tm-minKB").value, 10) || 0
      );
      SETTINGS.filter.exts = String(p.querySelector("#tm-exts").value || "");
      SETTINGS.enhancedImageDiscovery = !!enhancedImageDiscoveryInput?.checked;
      SETTINGS.btnPosLocked = !!btnPosLockedInput?.checked;

      const modeEl = p.querySelector("#tm-slide-load-mode");
      const newMode = modeEl ? String(modeEl.value || "") : "";
      if (["clean", "raw", "raw-then-clean"].includes(newMode)) {
        SETTINGS.slideLoadMode = newMode;
        GM_setValue(STORE_KEYS.SLIDE_LOAD_MODE, SETTINGS.slideLoadMode);
      }

      const delayEl = p.querySelector("#tm-slide-raw-preview-delay");
      const delayRaw = delayEl ? Number(delayEl.value) : NaN;
      if (Number.isFinite(delayRaw)) {
        SETTINGS.slideRawPreviewDelayMs = clamp(Math.floor(delayRaw), 0, 5000);
        GM_setValue(
          STORE_KEYS.SLIDE_RAW_PREVIEW_DELAY_MS,
          SETTINGS.slideRawPreviewDelayMs
        );
      }

      GM_setValue(
        STORE_KEYS.ENHANCED_IMAGE_DISCOVERY,
        SETTINGS.enhancedImageDiscovery
      );
      GM_setValue(STORE_KEYS.BTN_POS_LOCKED, SETTINGS.btnPosLocked);
      GM_setValue(STORE_KEYS.SAVE_ROOT_FOLDER, SETTINGS.saveRootFolder);
      saveFilter();
      if (overlay) {
        show(current);
      }
      p.remove();
    };

    document.body.appendChild(p);
  }

  // =========================================================
  // 黑名单设置面板
  // =========================================================
  const BLACKLIST_PANEL_ID = "tm-blacklist-panel";

  function openBlacklistPanel() {
    injectStyles();
    const existingPanel = document.getElementById(BLACKLIST_PANEL_ID);
    if (existingPanel) {
      existingPanel.remove();
      return;
    }

    const viewportMargin = 18;
    const anchorBottom = 210;
    const maxPanelHeight = Math.max(
      320,
      window.innerHeight - anchorBottom - viewportMargin
    );

    const p = document.createElement("div");
    p.id = BLACKLIST_PANEL_ID;
    p.style.cssText = `
            position: fixed;
            right: ${viewportMargin}px;
            bottom: ${anchorBottom}px;
            width: min(520px, calc(100vw - ${viewportMargin * 2}px));
            max-width: calc(100vw - ${viewportMargin * 2}px);
            max-height: min(78vh, ${maxPanelHeight}px);
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
            overflow: hidden;
        `;

    p.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div style="font-weight:900;font-size:18px;">域名过滤设置</div>
                <div style="flex:1;"></div>
                <button id="tm-bl-close" class="tm-btn tm-btn-ghost" style="padding:8px 10px;">关闭</button>
            </div>

            <div style="margin-bottom:12px;font-size:14px;color:rgba(255,255,255,0.74);line-height:1.5;flex:0 0 auto;">
                脚本域名黑名单：在这些网站上脚本按钮不会显示，仅按精确域名匹配，不支持 *.example.com。
            </div>

            <div style="flex:1;min-height:0;overflow:auto;padding-right:4px;">
                <div style="padding:10px 0 6px;font-weight:800;">脚本域名黑名单</div>
                <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">
                    <input id="tm-bl-input" type="text" placeholder="输入域名（如 example.com）"
                        style="flex:1;min-width:0;font-family:var(--tm-font);font-size:15px;padding:10px 12px;
                        border-radius:12px;border:1px solid var(--tm-border);
                        background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.94);outline:none;">
                    <button id="tm-bl-add" class="tm-btn tm-btn-primary" style="padding:10px 16px;flex:0 0 auto;white-space:nowrap;">添加</button>
                </div>
                <div id="tm-bl-list" style="max-height:180px;overflow-y:auto;padding:8px 0;border-top:1px solid var(--tm-border);"></div>
                <div style="margin-top:8px;display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;">
                    <div style="color:rgba(255,255,255,0.74);font-size:13px;padding:8px 0;">
                        共 <span id="tm-bl-count">0</span> 个网站
                    </div>
                    <button id="tm-bl-clear" class="tm-btn tm-btn-danger" style="padding:8px 12px;flex:0 0 auto;">清空脚本黑名单</button>
                </div>
            </div>

            <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;flex:0 0 auto;flex-wrap:wrap;">
                <button id="tm-bl-export" class="tm-btn" style="padding:8px 12px;">导出配置</button>
                <button id="tm-bl-import" class="tm-btn tm-btn-primary" style="padding:8px 12px;">导入配置</button>
            </div>
            <div style="display:none;">
                <input id="tm-bl-import-file" type="file" accept=".json" />
            </div>
        `;

    const listEl = p.querySelector("#tm-bl-list");
    const inputEl = p.querySelector("#tm-bl-input");
    const countEl = p.querySelector("#tm-bl-count");

    function normalizeDomainList(list) {
      return (list || [])
        .map((entry) => normalizeBlacklistEntry(entry))
        .filter(Boolean)
        .filter((entry, index, arr) => arr.indexOf(entry) === index);
    }

    function syncUiAfterBlacklistChange() {
      if (isBlacklisted()) {
        const existedBtn = document.getElementById(BTN_ID);
        if (existedBtn) existedBtn.remove();
        if (overlay) closeSlideshow();
      } else {
        injectButton();
      }
    }

    function renderSimpleList(
      targetEl,
      targetList,
      emptyText,
      deleteClassName
    ) {
      targetEl.innerHTML = "";
      if (!targetList || targetList.length === 0) {
        targetEl.innerHTML = `<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.54);font-size:14px;">${emptyText}</div>`;
        return;
      }

      targetList.forEach((site, idx) => {
        const item = document.createElement("div");
        item.style.cssText =
          "display:flex;align-items:center;gap:8px;padding:8px 0;";
        item.innerHTML = `
                    <span style="flex:1;font-family:monospace;font-size:14px;
                        color:rgba(255,255,255,0.88);word-break:break-all;">${site}</span>
                    <button class="${deleteClassName} tm-btn tm-btn-danger" data-idx="${idx}"
                        style="padding:6px 12px;font-size:13px;">删除</button>
                `;
        targetEl.appendChild(item);
      });
    }

    function renderList() {
      SETTINGS.blacklist = normalizeDomainList(SETTINGS.blacklist);

      renderSimpleList(
        listEl,
        SETTINGS.blacklist,
        "暂无脚本黑名单网站（在所有网站启用脚本）",
        "tm-bl-delete"
      );

      countEl.textContent = SETTINGS.blacklist.length;
    }

    listEl.addEventListener("click", (e) => {
      if (e.target.classList.contains("tm-bl-delete")) {
        const idx = parseInt(e.target.dataset.idx, 10);
        SETTINGS.blacklist.splice(idx, 1);
        saveBlacklist();
        renderList();
        syncUiAfterBlacklistChange();
      }
    });

    p.querySelector("#tm-bl-add").onclick = () => {
      const input = normalizeBlacklistEntry(inputEl.value);
      if (!input) return;
      if (SETTINGS.blacklist.includes(input)) {
        alert("该网站已存在于脚本黑名单中");
        return;
      }
      SETTINGS.blacklist.push(input);
      SETTINGS.blacklist = normalizeDomainList(SETTINGS.blacklist);
      saveBlacklist();
      inputEl.value = "";
      renderList();
      syncUiAfterBlacklistChange();
    };

    inputEl.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        p.querySelector("#tm-bl-add").click();
      }
    });

    p.querySelector("#tm-bl-clear").onclick = () => {
      if (SETTINGS.blacklist.length === 0) return;
      if (confirm("确认清空脚本黑名单吗？之后将在所有网站启用脚本按钮。")) {
        SETTINGS.blacklist = [];
        saveBlacklist();
        renderList();
        syncUiAfterBlacklistChange();
      }
    };

    p.querySelector("#tm-bl-export").onclick = () => {
      const data = JSON.stringify(
        {
          blacklist: SETTINGS.blacklist,
          version: "1.2",
        },
        null,
        2
      );
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-helper-domain-filters-${yyyymmdd()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const importFileInput = p.querySelector("#tm-bl-import-file");
    p.querySelector("#tm-bl-import").onclick = () => {
      importFileInput.click();
    };

    importFileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          const importedBlacklist = Array.isArray(data.blacklist)
            ? normalizeDomainList(data.blacklist)
            : [];

          if (importedBlacklist.length === 0) {
            alert("导入的脚本黑名单配置为空");
            return;
          }

          const merge = confirm(
            `检测到脚本黑名单 ${importedBlacklist.length} 项。\n\n点击"确定"将合并到现有配置，点击"取消"将替换现有配置。`
          );

          if (merge) {
            SETTINGS.blacklist = normalizeDomainList([
              ...SETTINGS.blacklist,
              ...importedBlacklist,
            ]);
          } else {
            SETTINGS.blacklist = importedBlacklist;
          }

          saveBlacklist();
          renderList();
          syncUiAfterBlacklistChange();
          alert(
            `导入成功！当前脚本黑名单共 ${SETTINGS.blacklist.length} 个网站。`
          );
        } catch (err) {
          console.error("导入域名过滤配置失败：", err);
          alert("导入失败：无法解析文件");
        }
        importFileInput.value = "";
      };
      reader.readAsText(file);
    };

    p.querySelector("#tm-bl-close").onclick = () => p.remove();

    renderList();
    document.body.appendChild(p);
    inputEl.focus();
  }

  // =========================================================
  // 菜单项
  // =========================================================
  if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("打开/关闭 幻灯片", toggleSlideshow);

    GM_registerMenuCommand(
      `${SETTINGS.enableButton ? "停用" : "启用"} 右下角按钮（同步）`,
      () => {
        SETTINGS.enableButton = !SETTINGS.enableButton;
        GM_setValue(STORE_KEYS.ENABLE_BUTTON, SETTINGS.enableButton);
        injectButton();
      }
    );

    GM_registerMenuCommand(
      "清理并重置全局按钮位置",
      clearAndResetGlobalButtonPosition
    );
    GM_registerMenuCommand("设置：根目录/分辨率/大小/后缀", openSettingsPanel);
    GM_registerMenuCommand("黑名单设置", openBlacklistPanel);
  }

  // =========================================================
  // 启动
  // =========================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectButton);
  } else {
    injectButton();
  }
})();
