const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const SNIPPETS = require('./renderer/snippets.js');

let win = null;
let pendingFiles = [];   // files that arrived (via argv or open-file) before the window had loaded

function readFileSafe(p) {
  try { return { path: p, name: path.basename(p), content: fs.readFileSync(p, 'utf8') }; }
  catch (e) { return null; }
}

// picks out real, existing .ink/.txt paths from a raw argv list, so this
// works regardless of how many leading args (exe path, ".", flags) precede them
function extractInkPaths(argv) {
  return argv.filter(a => /\.(ink|txt)$/i.test(a) && fs.existsSync(a));
}

function send(cmd, arg) {
  if (win) win.webContents.send('menu', cmd, arg);
}

// queues until the page has actually finished loading, then delivers —
// replaces the old fixed setTimeout guess for the macOS double-click case
function openPaths(paths) {
  const files = paths.map(readFileSafe).filter(Boolean);
  if (!files.length) return;
  if (win && !win.webContents.isLoading()) send('openPaths', files);
  else pendingFiles.push(...files);
}

let allowClose = false;   // set true right before the second, real win.close() below
let closeInProgress = false;

// Electron doesn't show any dialog on its own when a renderer's beforeunload
// blocks a close — it just silently refuses to close the window. This asks
// the page directly (flushing any edit still mid-debounce first) and only
// bothers the person with a dialog if there's actually something to lose.
async function confirmAndClose() {
  // Reuse the editor's themed modal and await the user's choice. Keep the
  // native dialog below as a fallback if the renderer cannot show its UI.
  try {
    const approved = await win.webContents.executeJavaScript(`(function () {
      var A = window.Inkweave;
      return A && A.confirmWindowClose ? A.confirmWindowClose() : null;
    })()`);
    if (typeof approved === 'boolean') {
      if (approved) { allowClose = true; win.close(); }
      return;
    }
  } catch (error) { /* Fall back to native confirmation. */ }

  let names = [];
  try {
    names = await win.webContents.executeJavaScript(`(function () {
      var A = window.Inkweave;
      if (!A) return [];
      if (A.flushPendingEdit) A.flushPendingEdit();
      return A.Tabs.filter(function (t) { return t.dirty; }).map(function (t) { return t.fileName; });
    })()`);
  } catch (e) { names = []; }   // if anything goes wrong reading it, don't hold the window hostage over it

  if (!names.length) { allowClose = true; win.close(); return; }

  const r = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ["Don't Save", 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Unsaved changes',
    message: `You have unsaved changes in ${names.length} tab${names.length > 1 ? 's' : ''}.`,
    detail: names.map(n => '• ' + n).join('\n') + '\n\nClosing now will lose these changes.',
  });
  if (r.response === 0) { allowClose = true; win.close(); }
}

function createWindow() {
  allowClose = false;
  closeInProgress = false;
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#11141b',
    title: 'Inkweave',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  win.on('close', (e) => {
    if (allowClose) return;
    e.preventDefault();
    if (closeInProgress) return;
    closeInProgress = true;
    confirmAndClose()
      .catch(error => { console.error('Unable to confirm close:', error); })
      .finally(() => { closeInProgress = false; });
  });

  // Only override a renderer veto after the main-process close check approves.
  // This also handles a failed preload leaving the browser-only guard active.
  win.webContents.on('will-prevent-unload', (e) => {
    if (allowClose) e.preventDefault();
  });

  // the window title is driven explicitly by the 'edited' IPC message below,
  // so it can include the active tab's dirty dot; don't let Electron also
  // sync it from document.title (which exists for the browser build) and fight it
  win.on('page-title-updated', (e) => e.preventDefault());

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.webContents.once('did-finish-load', () => {
    if (pendingFiles.length) { send('openPaths', pendingFiles); pendingFiles = []; }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Tab', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveAs') },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => send('closeTab') },
        // Quit lives in the app menu on mac; kept here explicitly for Windows/Linux,
        // which have no app menu and would otherwise have no menu path to it
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit' }]),
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
        { type: 'separator' },
        // literal 'Control+Tab', not 'CmdOrCtrl' — Cmd+Tab is the OS app-switcher
        // on macOS and the app would never even see it if bound there
        { label: 'Next Tab', accelerator: 'Control+Tab', click: () => send('nextTab') },
        { label: 'Previous Tab', accelerator: 'Control+Shift+Tab', click: () => send('prevTab') },
      ],
    },
    {
      label: 'Story',
      submenu: [
        { label: 'Play', accelerator: 'CmdOrCtrl+Return', click: () => send('play') },
        { label: 'Tidy layout', accelerator: 'CmdOrCtrl+L', click: () => send('layout') },
        { label: 'Show full script', accelerator: 'CmdOrCtrl+E', click: () => send('source') },
      ],
    },
    {
      label: 'Ink',
      submenu: SNIPPETS.reduce((out, group) => {
        if (group.label === 'Full stories') out.push({ type: 'separator' });
        out.push({
          label: group.label,
          submenu: group.items.map(it => ({ label: it.label, click: () => send('snippet', it.id) })),
        });
        return out;
      }, []),
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Ink writing guide', click: () => shell.openExternal('https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// multi-select: selecting several files opens each in its own tab
ipcMain.handle('open', async () => {
  const r = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Ink script', extensions: ['ink', 'txt'] }],
    properties: ['openFile', 'multiSelections'],
  });
  if (r.canceled || !r.filePaths.length) return null;
  return r.filePaths.map(readFileSafe).filter(Boolean);
});

ipcMain.handle('saveDialog', async (_e, suggested) => {
  const r = await dialog.showSaveDialog(win, {
    defaultPath: suggested || 'story.ink',
    filters: [{ name: 'Ink script', extensions: ['ink'] }],
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle('write', async (_e, p, text) => { fs.writeFileSync(p, text, 'utf8'); return true; });
ipcMain.handle('read', async (_e, p) => fs.readFileSync(p, 'utf8'));
// The Ink compiler needs synchronous INCLUDE reads. Keep Node filesystem APIs
// here so the preload can run with Electron's default sandbox enabled.
ipcMain.on('readRelative', (event, basePath, name) => {
  try {
    const p = path.resolve(path.dirname(basePath), name);
    event.returnValue = { content: fs.readFileSync(p, 'utf8') };
  } catch (error) {
    event.returnValue = { error: error.message };
  }
});
ipcMain.on('edited', (_e, edited, name) => {
  if (!win) return;
  win.setDocumentEdited(edited);
  win.setTitle(name ? (edited ? '• ' : '') + name + ' — Inkweave' : 'Inkweave');
});

// one window, many tabs: a second launch (or "Open with" on another file)
// hands its files to the existing window instead of starting a second copy
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
    openPaths(extractInkPaths(argv));
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();
    openPaths(extractInkPaths(process.argv));   // files this launch itself was opened with
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

  // double-clicking a .ink file on macOS
  app.on('open-file', (event, p) => {
    event.preventDefault();
    openPaths([p]);
  });
}
