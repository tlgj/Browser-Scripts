// ==UserScript==
// @name         网页链接打开方式自定义-增强版
// @namespace    https://github.com/tlgj/Browser-Scripts
// @version      1.1.1
// @description  自定义特定网站的链接打开方式（后台静默/前台跳转）。支持子域名优先，缓存优化，尊重修饰键。支持导入导出配置。
// @author       tlgj
// @match        *://*/*
// @updateURL    https://github.com/tlgj/Browser-Scripts/raw/refs/heads/main/Custom-Link-Opener.user.js
// @downloadURL  https://github.com/tlgj/Browser-Scripts/raw/refs/heads/main/Custom-Link-Opener.user.js
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_addValueChangeListener
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 配置管理 ---
    const DEFAULT_CONFIG = {};
    let SITE_RULES = GM_getValue('site_rules', DEFAULT_CONFIG);
    const currentHost = window.location.hostname;
    
    // 缓存当前页面的模式
    let cachedMode = 'native';
    let isWaitingForBody = false;

    function calculateCurrentMode() {
        let bestMatch = null;
        let maxLen = 0;

        for (let domain in SITE_RULES) {
            if (currentHost.includes(domain)) {
                if (domain.length > maxLen) {
                    maxLen = domain.length;
                    bestMatch = SITE_RULES[domain];
                }
            }
        }
        cachedMode = bestMatch || 'native';
    }

    calculateCurrentMode();

    GM_addValueChangeListener('site_rules', function(name, oldVal, newVal) {
        if (newVal !== undefined) {
            SITE_RULES = newVal;
            calculateCurrentMode();
        }
    });

    // --- 2. 注册菜单 (修复iframe重复问题) ---
    function registerMenus() {
        if (window.self !== window.top) return; // 仅在顶层窗口注册

        GM_registerMenuCommand(`📊 当前状态: [${getModeText(cachedMode)}]`, () => {}); 
        GM_registerMenuCommand("🌙 设为：后台静默打开", () => updateRule('background'));
        GM_registerMenuCommand("☀️ 设为：前台立即打开", () => updateRule('foreground'));
        GM_registerMenuCommand("❌ 禁用 (恢复默认)", () => removeRule());
        // 修改：统一菜单名称为“配置列表管理”
        GM_registerMenuCommand("⚙️ 配置列表管理", showSettingsModal);
    }
    
    function getModeText(mode) {
        if (mode === 'background') return '后台静默';
        if (mode === 'foreground') return '前台跳转';
        return '系统默认';
    }
    
    registerMenus();

    // --- 3. 配置操作 ---
    function syncConfig() {
        SITE_RULES = GM_getValue('site_rules', {});
        return SITE_RULES;
    }

    function updateRule(mode) {
        syncConfig();
        SITE_RULES[currentHost] = mode;
        GM_setValue('site_rules', SITE_RULES);
        location.reload();
    }

    function removeRule() {
        syncConfig();
        delete SITE_RULES[currentHost];
        GM_setValue('site_rules', SITE_RULES);
        location.reload();
    }

    function parseRulesFromText(text) {
        const newRules = {};
        text.split('\n').forEach(line => {
            if (!line.trim() || line.startsWith('//')) return;
            const splitIndex = line.lastIndexOf('=');
            if (splitIndex === -1) return;
            const key = line.substring(0, splitIndex).trim();
            let mode = line.substring(splitIndex + 1).trim().toLowerCase();

            if (!key) return;

            if (['bg', 'back', 'background'].some(x => mode.includes(x))) {
                newRules[key] = 'background';
            } else if (['fg', 'front', 'foreground'].some(x => mode.includes(x))) {
                newRules[key] = 'foreground';
            }
        });
        return newRules;
    }

    // --- 4. 核心拦截 ---
    document.addEventListener('click', function(e) {
        if (cachedMode === 'native') return;
        if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;

        const link = e.target.closest('a');
        if (!link || !link.href) return;

        const overlay = document.getElementById('custom-link-settings-overlay');
        if (overlay && overlay.contains(e.target)) {
            return;
        }

        const hrefVal = link.getAttribute('href');
        if (!hrefVal || hrefVal.startsWith('#') || hrefVal.startsWith('javascript:') || hrefVal === '') return;

        e.preventDefault();
        e.stopPropagation();

        GM_openInTab(link.href, {
            active: (cachedMode === 'foreground'),
            insert: true,
            setParent: true
        });
    }, true);

    // --- 5. UI 美化 ---
    GM_addStyle(`
        #custom-link-settings-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); z-index: 2147483647;
            display: flex; justify-content: center; align-items: center;
            backdrop-filter: blur(4px); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            opacity: 0; transition: opacity 0.2s ease;
        }
        #custom-link-settings-overlay.visible { opacity: 1; }
        
        #custom-link-box {
            background: #fff; color: #333; padding: 0; border-radius: 16px;
            width: 550px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            display: flex; flex-direction: column; overflow: hidden;
            transform: scale(0.95); transition: transform 0.2s ease;
        }
        #custom-link-settings-overlay.visible #custom-link-box { transform: scale(1); }

        .custom-header {
            padding: 20px 25px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;
            background: #fafafa;
        }
        .custom-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: #222; }
        .custom-close { cursor: pointer; font-size: 24px; line-height: 1; color: #999; transition: color 0.2s;}
        .custom-close:hover { color: #333; }

        .custom-body { padding: 25px; }
        .custom-desc { 
            font-size: 13px; color: #555; background: #f0f7ff; padding: 12px 15px; 
            border-radius: 8px; border-left: 4px solid #3b82f6; line-height: 1.6; margin-bottom: 15px;
        }
        
        textarea#custom-config-input {
            width: 100%; height: 260px; padding: 15px; border-radius: 8px;
            border: 1px solid #e0e0e0; font-family: 'Menlo', 'Consolas', monospace; 
            resize: vertical; box-sizing: border-box; white-space: pre; font-size: 13px; line-height: 1.5;
            background: #f9f9f9; transition: border 0.2s, background 0.2s;
        }
        textarea#custom-config-input:focus { outline: none; border-color: #3b82f6; background: #fff; }

        .custom-footer {
            padding: 15px 25px; border-top: 1px solid #eee; background: #fff;
            display: flex; justify-content: space-between; align-items: center;
        }
        .footer-left { display: flex; gap: 8px; }
        .footer-right { display: flex; align-items: center; }

        button.custom-btn {
            padding: 10px 24px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 14px;
            transition: all 0.2s;
        }
        
        /* 这里的 #custom-cancel 就是面板里的取消按钮 */
        #custom-cancel { 
            background: #fff; 
            color: #666; 
            margin-right: 10px; 
            border: 1px solid #ccc; /* 确保有明显的灰色边框 */
        }
        #custom-cancel:hover { background: #f5f5f5; color: #333; border-color: #999; }
        
        #custom-save { background: #3b82f6; color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        #custom-save:hover { background: #2563eb; transform: translateY(-1px); }
        #custom-save:active { transform: translateY(0); }

        .custom-btn-small {
            padding: 6px 12px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff;
            cursor: pointer; font-size: 12px; color: #555; display: flex; align-items: center; gap: 4px;
            transition: all 0.2s; font-weight: 500;
        }
        .custom-btn-small:hover { background: #f9fafb; border-color: #d1d5db; color: #111; }

        @media (prefers-color-scheme: dark) {
            #custom-link-box { background: #1e1e1e; color: #eee; }
            .custom-header, .custom-footer { background: #252525; border-color: #333; }
            .custom-header h2 { color: #fff; }
            .custom-desc { background: #2a2a2a; color: #ccc; border-left-color: #60a5fa; }
            textarea#custom-config-input { background: #121212; color: #ddd; border-color: #333; }
            textarea#custom-config-input:focus { border-color: #60a5fa; background: #000; }
            
            #custom-cancel { background: #252525; border-color: #555; color: #aaa; }
            #custom-cancel:hover { background: #333; border-color: #777; color: #fff; }
            
            .custom-btn-small { background: #252525; border-color: #444; color: #aaa; }
            .custom-btn-small:hover { background: #333; border-color: #666; color: #fff; }
        }
    `);

    function showSettingsModal() {
        if (document.getElementById('custom-link-settings-overlay')) return;
        
        if (!document.body) {
            if (isWaitingForBody) return;
            isWaitingForBody = true;
            document.addEventListener('DOMContentLoaded', () => {
                isWaitingForBody = false;
                showSettingsModal();
            }, { once: true });
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'custom-link-settings-overlay';

        syncConfig();
        let configText = "";
        let keys = Object.keys(SITE_RULES).sort();
        for (let key of keys) configText += `${key} = ${SITE_RULES[key]}\n`;

        overlay.innerHTML = `
            <div id="custom-link-box">
                <div class="custom-header">
                    <h2>配置列表管理</h2>
                    <span class="custom-close" id="custom-close-x">×</span>
                </div>
                <div class="custom-body">
                    <div class="custom-desc">
                        <b>格式：</b> <code>域名 = 模式</code> (一行一条)<br>
                        <b>模式：</b> <code>background</code> (后台) | <code>foreground</code> (前台)<br>
                        <b>优先级：</b> 域名越长优先级越高
                    </div>
                    <textarea id="custom-config-input" spellcheck="false" placeholder="暂无配置...">${configText}</textarea>
                </div>
                <div class="custom-footer">
                    <div class="footer-left">
                        <button id="custom-export" class="custom-btn-small" title="导出为JSON文件">📤 导出</button>
                        <button id="custom-import" class="custom-btn-small" title="从JSON文件导入">📥 导入</button>
                        <input type="file" id="custom-import-file" style="display:none" accept=".json">
                    </div>
                    <div class="footer-right">
                        <button id="custom-cancel" class="custom-btn">取消</button>
                        <button id="custom-save" class="custom-btn">保存配置</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        requestAnimationFrame(() => overlay.classList.add('visible'));

        const closePanel = () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 200);
        };

        document.getElementById('custom-cancel').onclick = closePanel;
        document.getElementById('custom-close-x').onclick = closePanel;
        
        document.getElementById('custom-export').onclick = () => {
            const currentText = document.getElementById('custom-config-input').value;
            const currentRules = parseRulesFromText(currentText);
            const blob = new Blob([JSON.stringify(currentRules, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `link-opener-config-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        document.getElementById('custom-import').onclick = () => {
            document.getElementById('custom-import-file').click();
        };

        document.getElementById('custom-import-file').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (typeof imported !== 'object') throw new Error('Format Error');
                    
                    let newText = "";
                    Object.keys(imported).sort().forEach(key => {
                        newText += `${key} = ${imported[key]}\n`;
                    });
                    
                    document.getElementById('custom-config-input').value = newText;
                    
                    const btn = document.getElementById('custom-import');
                    const originalText = btn.innerHTML;
                    btn.innerHTML = "✅ 已读取";
                    setTimeout(() => btn.innerHTML = originalText, 1500);
                    
                } catch (err) {
                    alert('导入失败：文件格式不正确，请确保是有效的JSON配置文件。');
                }
                e.target.value = '';
            };
            reader.readAsText(file);
        };

        document.getElementById('custom-save').onclick = () => {
            const rawText = document.getElementById('custom-config-input').value;
            const newRules = parseRulesFromText(rawText);
            
            GM_setValue('site_rules', newRules);
            SITE_RULES = newRules;
            calculateCurrentMode();
            
            const btn = document.getElementById('custom-save');
            btn.textContent = "✅ 已保存";
            btn.style.background = "#10b981";
            setTimeout(() => { closePanel(); location.reload(); }, 600);
        };
        
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
    }
})();
