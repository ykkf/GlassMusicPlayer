// =========================================================
// main.js - Electronメインプロセス
// =========================================================
// このファイルがElectronアプリのエントリーポイントです。
// ウィンドウの作成・設定・イベント管理を行います。

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// =========================================================
// メインウィンドウの作成
// =========================================================
function createWindow() {
    const win = new BrowserWindow({
        width: 420,           // ウィンドウ幅（カード + 余白）
        height: 750,          // ウィンドウ高さ（プレイリスト展開時も余裕を持たせる）
        transparent: true,    // ウィンドウ背景を透明にする（ガラスUIを活かす）
        frame: false,         // OSのタイトルバーを非表示にする
        hasShadow: true,      // ウィンドウに影をつける（浮遊感）
        resizable: false,     // リサイズ不可（デザインを固定）
        backgroundColor: '#00000000', // 完全透明の背景色

        // セキュリティ設定
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // preload スクリプト
            contextIsolation: true,   // レンダラーとメインプロセスを分離
            nodeIntegration: false,   // レンダラーで Node.js を使わない（セキュリティ）
            webSecurity: false,       // file:// プロトコルへのXHRアクセスを許可 (Electronファイル読込用)
        },

        // アイコン設定
        icon: path.join(__dirname, 'icon.png'),
    });

    // index.html を読み込む
    win.loadFile('index.html');

    // 開発時にDevToolsを開きたい場合はコメントを外す
    // win.webContents.openDevTools({ mode: 'detach' });

    return win;
}

// =========================================================
// アプリのライフサイクル
// =========================================================

// Electronの初期化完了後にウィンドウを作成し、IPCハンドラーを登録
app.whenReady().then(() => {
    // ウィンドウ作成
    createWindow();

    // =========================================================
    // IPC（プロセス間通信）ハンドラー
    // =========================================================
    // レンダラー（index.html）からのウィンドウ操作リクエストを受け取る

    // ミニモード切り替え
    ipcMain.on('toggle-mini-mode', (event, isMini) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;
        
        if (isMini) {
            // ミニモードサイズ (横幅はそのままで高さを縮小)
            win.setSize(420, 240, true);
        } else {
            // 通常サイズ
            win.setSize(420, 750, true);
        }
    });

    // 常に手前に表示の切り替え
    ipcMain.on('toggle-always-on-top', (event, isAlwaysOnTop) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;
        win.setAlwaysOnTop(isAlwaysOnTop);
    });

    // 最小化ボタン
    ipcMain.on('window-minimize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.minimize();
    });

    // 閉じるボタン
    ipcMain.on('window-close', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.close();
    });

    // =========================================================
    // フォルダ記憶・読み込み機能
    // =========================================================
    const configPath = path.join(app.getPath('userData'), 'music-folder-config.json');

    // 再帰・または単一ディレクトリ内の音楽ファイルを検索
    function getAudioFilesFromDir(dirPath) {
        try {
            const files = fs.readdirSync(dirPath);
            const audioFiles = [];
            
            for (const file of files) {
                const fullPath = path.join(dirPath, file);
                try {
                    const stat = fs.statSync(fullPath);
                    if (stat.isFile() && file.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) {
                        audioFiles.push({
                            name: file,
                            path: fullPath,
                            isElectronFile: true
                        });
                    }
                } catch(e) { /* ignore read errors for specific files */ }
            }
            return audioFiles;
        } catch(e) {
            return [];
        }
    }

    // [機能] フォルダを選択して記憶し、ファイルリストを返す
    ipcMain.handle('select-folder', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(win, {
            title: '音楽フォルダを選択',
            properties: ['openDirectory']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const selectedFolder = result.filePaths[0];
        
        // フォルダパスを保存
        fs.writeFileSync(configPath, JSON.stringify({ folder: selectedFolder }));
        
        return getAudioFilesFromDir(selectedFolder);
    });

    // [機能] 起動時に保存されたフォルダからファイルリストを読み込んで返す
    ipcMain.handle('get-saved-folder', async () => {
        try {
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                const config = JSON.parse(configData);
                if (config && config.folder && fs.existsSync(config.folder)) {
                    return getAudioFilesFromDir(config.folder);
                }
            }
        } catch (e) {
            console.error("Failed to read saved folder:", e);
        }
        return null;
    });
});

// すべてのウィンドウが閉じられたらアプリ終了（Windows/Linux用）
app.on('window-all-closed', () => {
    app.quit();
});
