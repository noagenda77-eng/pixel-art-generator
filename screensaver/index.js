const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;

// Parse command line arguments standard to Windows Screensavers
// /S = Show fullscreen
// /P <hwnd> = Preview in small window
// /C = Configure settings
const args = process.argv.slice(1);
const isShow = args.some(arg => arg.toUpperCase().includes('/S'));
const isPreview = args.some(arg => arg.toUpperCase().includes('/P'));
const isConfig = args.some(arg => arg.toUpperCase().includes('/C'));

function createWindow() {
    // Logic for different modes
    if (isConfig) {
        // Show a simple message box or dialog if we had one, for now just exit
        // Typically, you'd show a "No settings available" dialog
        app.quit();
        return;
    }

    if (isPreview) {
        // Preview mode is complex (embedding handled window), skipping for MVP
        app.quit();
        return;
    }

    // Default /S mode (Show)
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width,
        height,
        frame: false,         // No window border
        fullscreen: true,     // Fullscreen
        alwaysOnTop: true,    // Keep on top
        skipTaskbar: true,    // Hide from taskbar
        kiosk: true,          // Kiosk mode
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Load the live generator
    mainWindow.loadURL('https://pixel.domctorcheems.com');

    // When renderer sends 'quit' message (mouse move/keypress), close app
    ipcMain.on('quit', () => {
        app.quit();
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// Ensure single instance lock (screensavers can be triggered multiple times)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('ready', createWindow);

    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') app.quit();
    });
}
