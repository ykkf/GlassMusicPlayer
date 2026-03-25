// =========================================================
// preload.js - セキュリティブリッジ
// =========================================================
// このファイルは「レンダラー（HTML側）」と「メインプロセス（main.js側）」の
// 間に立つ安全な橋渡し役です。
// contextBridge を使って、HTML側に必要最低限のAPIだけを公開します。

const { contextBridge, ipcRenderer } = require('electron');

// =========================================================
// レンダラーに公開するAPI
// =========================================================
// window.electronAPI として HTML/JS 側からアクセスできるようになる
contextBridge.exposeInMainWorld('electronAPI', {
    // ウィンドウを最小化する
    minimize: () => ipcRenderer.send('window-minimize'),
    // ウィンドウを閉じる
    close: () => ipcRenderer.send('window-close'),
    // ミニモードの切り替え
    toggleMiniMode: (isMini) => ipcRenderer.send('toggle-mini-mode', isMini),
    // 常に手前に表示の切り替え
    toggleAlwaysOnTop: (isAlwaysOnTop) => ipcRenderer.send('toggle-always-on-top', isAlwaysOnTop)
});
