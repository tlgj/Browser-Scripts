// ==UserScript==
// @name         Pornhub Tool V2.4.1
// @namespace    http://tampermonkey.net/
// @version      2.4.1
// @description  Pornhub 增强工具：已看降噪 / 短视频屏蔽 / 关键词屏蔽 / 用户屏蔽
// @author       tlgj
// @match        https://*.pornhub.com/*
// @updateURL    https://github.com/tlgj/Browser-Scripts/raw/refs/heads/main/Pornhub-Tool.user.js
// @downloadURL  https://github.com/tlgj/Browser-Scripts/raw/refs/heads/main/Pornhub-Tool.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // ===========================
    //      配置管理
    // ===========================
    const CONFIG_KEY = 'ph_tool_v2_config';

    const DEFAULT_CONFIG = {
        dimmerEnabled: true,
        dimmerOpacity: 0.3,
        blockerEnabled: true,
        minDuration: 60,
        keywordEnabled: true,
        keywordOpacity: 0.05,
        keywords: [],
        userFilterEnabled: true,
        userOpacity: 0.05,
        blockedUsers: []
    };

    let config = { ...DEFAULT_CONFIG, ...GM_getValue(CONFIG_KEY, DEFAULT_CONFIG) };
    if (!Array.isArray(config.blockedUsers)) config.blockedUsers = [];

    function saveConfig() {
        GM_setValue(CONFIG_KEY, config);
    }

    GM_addValueChangeListener(CONFIG_KEY, (name, oldVal, newVal) => {
        if (newVal) {
            config = { ...DEFAULT_CONFIG, ...newVal };
            updateCssVariables();
            refreshView();
            updateUIPanel();
        }
    });

    const WATCHED_REGEX = /(watched|已看过|已观看)/i;

    // ===========================
    //      UI 构建
    // ===========================
    let ui = {};

    function createSettingsUI() {
        // 1. 悬浮球
        const toggleBtn = document.createElement('div');
        toggleBtn.innerHTML = '⚙️';
        toggleBtn.title = 'PH Tool 设置';
        toggleBtn.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; width: 40px; height: 40px;
            background: #1a1a1a; color: #fff; border-radius: 50%; text-align: center;
            line-height: 40px; cursor: pointer; z-index: 999999; font-size: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6); border: 1px solid #444;
            transition: transform 0.2s; user-select: none;
        `;
        toggleBtn.onclick = () => {
            ui.panel.style.display = ui.panel.style.display === 'none' ? 'block' : 'none';
        };

        // 2. 设置面板
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed; bottom: 70px; right: 20px; width: 280px;
            background: rgba(20, 20, 20, 0.98); color: #eee; padding: 15px; border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.9); z-index: 999999; display: none;
            border: 1px solid #333; font-family: Arial, sans-serif; font-size: 13px;
            backdrop-filter: blur(5px); max-height: 85vh; overflow-y: auto;
        `;

        // 通用样式
        const addBtnStyle = `
            width: 42px; height: 32px; font-size: 20px; font-weight: bold;
            background: #d9534f; color: #fff; border: none; border-radius: 4px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: background 0.2s;
        `;

        const inputStyle = `
            flex: 1; background: #333; border: 1px solid #555; color: #fff;
            padding: 0 8px; height: 32px; border-radius: 4px; outline: none;
        `;

        panel.innerHTML = `
            <div style="text-align: center; margin-bottom: 12px; font-weight: bold; color: #ffa31a; border-bottom: 1px solid #333; padding-bottom: 8px; font-size: 15px;">
                PH 工具箱 V2.4
            </div>

            <!-- 1. 已看过 -->
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: bold;">👁️ 已看过降噪</span>
                    <input type="checkbox" id="ph-dimmer-toggle" style="transform: scale(1.2);">
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #aaa; font-size: 12px;">透明度</span>
                    <input type="range" id="ph-opacity-slider" min="0" max="1" step="0.05" style="flex: 1;">
                    <span id="ph-opacity-val" style="width: 32px; text-align: right;"></span>
                </div>
            </div>
            <hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">

            <!-- 2. 短视频 -->
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: bold;">⏱️ 短视频隐藏</span>
                    <input type="checkbox" id="ph-blocker-toggle" style="transform: scale(1.2);">
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="color: #aaa; font-size: 12px;">少于(秒):</span>
                    <input type="number" id="ph-duration-input" style="width: 60px; background: #333; border: 1px solid #555; color: #fff; padding: 4px; border-radius: 4px;">
                </div>
            </div>
            <hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">

            <!-- 3. 关键词 -->
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: bold;">🚫 关键词屏蔽</span>
                    <input type="checkbox" id="ph-kw-toggle" style="transform: scale(1.2);">
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="color: #aaa; font-size: 12px;">透明度</span>
                    <input type="range" id="ph-kw-slider" min="0" max="1" step="0.05" style="flex: 1;">
                    <span id="ph-kw-val" style="width: 32px; text-align: right;"></span>
                </div>
                <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                    <input type="text" id="ph-kw-input" placeholder="输入屏蔽词..." style="${inputStyle}">
                    <button id="ph-kw-btn" style="${addBtnStyle}">+</button>
                </div>
                <div id="ph-kw-list" style="display: flex; flex-wrap: wrap; gap: 5px; max-height: 80px; overflow-y: auto;"></div>
            </div>
            <hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">

            <!-- 4. 用户屏蔽 -->
            <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: bold;">👤 用户屏蔽</span>
                    <input type="checkbox" id="ph-user-toggle" style="transform: scale(1.2);">
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="color: #aaa; font-size: 12px;">透明度</span>
                    <input type="range" id="ph-user-slider" min="0" max="1" step="0.05" style="flex: 1;">
                    <span id="ph-user-val" style="width: 32px; text-align: right;"></span>
                </div>
                <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                    <input type="text" id="ph-user-input" placeholder="输入用户名..." style="${inputStyle}">
                    <button id="ph-user-btn" style="${addBtnStyle}">+</button>
                </div>
                <div id="ph-user-list" style="display: flex; flex-wrap: wrap; gap: 5px; max-height: 80px; overflow-y: auto;"></div>
            </div>
        `;

        document.body.appendChild(toggleBtn);
        document.body.appendChild(panel);

        // 绑定 UI 元素
        ui = {
            panel,
            dimToggle: panel.querySelector('#ph-dimmer-toggle'),
            dimSlider: panel.querySelector('#ph-opacity-slider'),
            dimVal: panel.querySelector('#ph-opacity-val'),
            blkToggle: panel.querySelector('#ph-blocker-toggle'),
            durInput: panel.querySelector('#ph-duration-input'),
            kwToggle: panel.querySelector('#ph-kw-toggle'),
            kwSlider: panel.querySelector('#ph-kw-slider'),
            kwVal: panel.querySelector('#ph-kw-val'),
            kwInput: panel.querySelector('#ph-kw-input'),
            kwBtn: panel.querySelector('#ph-kw-btn'),
            kwList: panel.querySelector('#ph-kw-list'),
            userToggle: panel.querySelector('#ph-user-toggle'),
            userSlider: panel.querySelector('#ph-user-slider'),
            userVal: panel.querySelector('#ph-user-val'),
            userInput: panel.querySelector('#ph-user-input'),
            userBtn: panel.querySelector('#ph-user-btn'),
            userList: panel.querySelector('#ph-user-list'),
        };

        // 注册菜单命令
        GM_registerMenuCommand("⚙️ 打开设置面板", () => {
             ui.panel.style.display = ui.panel.style.display === 'none' ? 'block' : 'none';
        });

        // 事件监听
        const handleChange = () => {
            config.dimmerEnabled = ui.dimToggle.checked;
            config.dimmerOpacity = parseFloat(ui.dimSlider.value);
            config.blockerEnabled = ui.blkToggle.checked;
            config.minDuration = parseInt(ui.durInput.value) || 0;
            config.keywordEnabled = ui.kwToggle.checked;
            config.keywordOpacity = parseFloat(ui.kwSlider.value);
            config.userFilterEnabled = ui.userToggle.checked;
            config.userOpacity = parseFloat(ui.userSlider.value);
            saveConfig();
            updateUIPanel();
        };

        [ui.dimToggle, ui.dimSlider, ui.blkToggle, ui.durInput,
         ui.kwToggle, ui.kwSlider, ui.userToggle, ui.userSlider].forEach(el => {
            el.onchange = handleChange;
            el.oninput = handleChange;
        });

        // 按钮动画与交互
        const animateBtn = (btn) => {
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => btn.style.transform = 'scale(1)', 100);
        };

        const addKw = () => {
            const val = ui.kwInput.value.trim();
            if (val && !config.keywords.includes(val)) {
                config.keywords.push(val);
                ui.kwInput.value = '';
                animateBtn(ui.kwBtn);
                saveConfig(); updateUIPanel();
            }
        };
        ui.kwBtn.onclick = addKw;
        ui.kwInput.onkeypress = e => { if(e.key === 'Enter') addKw(); };

        const addUser = () => {
            const val = ui.userInput.value.trim();
            if (val && !config.blockedUsers.includes(val)) {
                config.blockedUsers.push(val);
                ui.userInput.value = '';
                animateBtn(ui.userBtn);
                saveConfig(); updateUIPanel();
            }
        };
        ui.userBtn.onclick = addUser;
        ui.userInput.onkeypress = e => { if(e.key === 'Enter') addUser(); };

        updateUIPanel();
    }

    function renderList(container, list, removeCallback) {
        container.innerHTML = '';
        list.forEach((item, idx) => {
            const tag = document.createElement('span');
            tag.style.cssText = `background: #444; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; display: flex; align-items: center; gap: 5px; margin-bottom: 2px;`;
            tag.innerHTML = `${item} <span style="cursor: pointer; color: #ff6b6b; font-weight: bold; font-size: 14px;">×</span>`;
            tag.querySelector('span').onclick = () => removeCallback(idx);
            container.appendChild(tag);
        });
    }

    function updateUIPanel() {
        if (!ui.panel) return;
        ui.dimToggle.checked = config.dimmerEnabled;
        ui.dimSlider.value = config.dimmerOpacity;
        ui.dimVal.innerText = Math.round(config.dimmerOpacity * 100) + '%';
        ui.blkToggle.checked = config.blockerEnabled;
        ui.durInput.value = config.minDuration;
        ui.kwToggle.checked = config.keywordEnabled;
        ui.kwSlider.value = config.keywordOpacity;
        ui.kwVal.innerText = Math.round(config.keywordOpacity * 100) + '%';
        ui.userToggle.checked = config.userFilterEnabled;
        ui.userSlider.value = config.userOpacity;
        ui.userVal.innerText = Math.round(config.userOpacity * 100) + '%';

        renderList(ui.kwList, config.keywords, (idx) => { config.keywords.splice(idx, 1); saveConfig(); updateUIPanel(); });
        renderList(ui.userList, config.blockedUsers, (idx) => { config.blockedUsers.splice(idx, 1); saveConfig(); updateUIPanel(); });
    }

    // ===========================
    //      逻辑处理 (Logic)
    // ===========================

    function injectBaseStyles() {
        const style = document.createElement('style');
        style.textContent = `
            :root { --ph-watched-op: 1; --ph-kw-op: 1; --ph-user-op: 1; }
            .ph-item-watched { opacity: var(--ph-watched-op) !important; filter: grayscale(100%) !important; transition: all 0.3s !important; }
            .ph-item-keyword { opacity: var(--ph-kw-op) !important; filter: grayscale(100%) blur(3px) !important; transition: all 0.3s !important; }
            .ph-item-blocked-user { opacity: var(--ph-user-op) !important; filter: grayscale(100%) blur(5px) !important; transition: all 0.3s !important; }
            .ph-item-watched:hover, .ph-item-keyword:hover, .ph-item-blocked-user:hover { opacity: 1 !important; filter: none !important; transform: scale(1.02); box-shadow: 0 4px 15px rgba(0,0,0,0.5); z-index: 50; }
            .ph-item-hidden { display: none !important; }
        `;
        document.head.appendChild(style);
    }

    function updateCssVariables() {
        const root = document.documentElement;
        root.style.setProperty('--ph-watched-op', config.dimmerEnabled ? config.dimmerOpacity : 1);
        root.style.setProperty('--ph-kw-op', config.keywordEnabled ? config.keywordOpacity : 1);
        root.style.setProperty('--ph-user-op', config.userFilterEnabled ? config.userOpacity : 1);
    }

    function parseDuration(timeStr) {
        if (!timeStr) return 99999;
        const parts = timeStr.trim().split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 99999;
    }

    function scanAndTag() {
        // 使用宽泛选择器以适应不同页面布局
        const candidates = document.querySelectorAll('li.js-pop, .videoblock, .pcVideoListItem, div.wrap');
        candidates.forEach(card => {
            if (card.dataset.phScanned) return;

            // 简单校验是否为视频卡片 (避免 div.wrap 误伤其他元素)
            const durationTag = card.querySelector('var, .duration');
            if(!durationTag && !card.querySelector('a[href*="/view_video"]')) {
                // 如果既没有时长也没有视频链接，可能不是视频卡片
                return;
            }

            card.dataset.phDuration = durationTag ? parseDuration(durationTag.innerText) : 99999;
            const fullText = card.textContent.toLowerCase();
            card.dataset.phFullText = fullText;
            let author = '';
            const authorElem = card.querySelector('.usernameWrap, .model-name, .username');
            if (authorElem) author = authorElem.innerText.trim().toLowerCase();
            card.dataset.phAuthor = author;
            card.dataset.phWatched = WATCHED_REGEX.test(fullText) ? 'true' : 'false';
            card.dataset.phScanned = 'true';
        });
        refreshView();
    }

    function refreshView() {
        updateCssVariables();
        const items = document.querySelectorAll('[data-ph-scanned="true"]');
        items.forEach(card => {
            const duration = parseInt(card.dataset.phDuration);
            const isWatched = card.dataset.phWatched === 'true';
            const fullText = card.dataset.phFullText;
            const author = card.dataset.phAuthor;

            // 1. 短视频隐藏 (最优先，直接隐藏)
            if (config.blockerEnabled && duration < config.minDuration) {
                card.classList.add('ph-item-hidden');
                return;
            }
            card.classList.remove('ph-item-hidden');

            // 状态标记
            let applyUserBlock = false;
            let applyKeyword = false;
            let applyWatched = false;

            // 2. 检查用户屏蔽
            if (config.userFilterEnabled && config.blockedUsers.length > 0) {
                if (config.blockedUsers.some(user => author.includes(user.toLowerCase()))) {
                    applyUserBlock = true;
                }
            }

            // 3. 检查关键词屏蔽 (如果未被用户屏蔽)
            if (!applyUserBlock && config.keywordEnabled && config.keywords.length > 0) {
                if (config.keywords.some(kw => fullText.includes(kw.toLowerCase()))) {
                    applyKeyword = true;
                }
            }

            // 4. 检查已看降噪 (如果未被任何屏蔽)
            if (!applyUserBlock && !applyKeyword && isWatched && config.dimmerEnabled) {
                applyWatched = true;
            }

            // 应用样式 (使用 toggle 确保互斥时移除旧样式)
            card.classList.toggle('ph-item-blocked-user', applyUserBlock);
            card.classList.toggle('ph-item-keyword', applyKeyword);
            card.classList.toggle('ph-item-watched', applyWatched);
        });
    }

    injectBaseStyles();
    createSettingsUI();
    updateCssVariables();
    scanAndTag();
    window.addEventListener('load', scanAndTag);
    new MutationObserver(() => scanAndTag()).observe(document.body, { childList: true, subtree: true });

})();
