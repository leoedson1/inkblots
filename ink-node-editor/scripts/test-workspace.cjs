const path = require('node:path');
if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process');
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(require('electron'), [__filename], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
app.setPath('userData', fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'inkblots-workspace-test-')));
require('electron').ipcMain.on('system-languages', e => { e.returnValue=['en-US']; });
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1440, height: 1000, titleBarStyle: 'hidden',
    titleBarOverlay: {color:'#161a23',symbolColor:'#e3e7f0',height:48},
    webPreferences: { preload: path.join(__dirname, '../preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  let closeRequests = 0;
  const windowActions = [];
  ipcMain.on('window-action', (event, action) => { if (event.sender === win.webContents) windowActions.push(action); });
  ipcMain.on('close-window', event => { if (event.sender === win.webContents) closeRequests++; });
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 2) console.log(message); });
  const output = process.env.INKBLOTS_QA_DIR || path.join(__dirname, '../dist/qa'); fs.mkdirSync(output, { recursive: true });
  try {
    await win.loadFile(path.join(__dirname, '../renderer/index.html'));
    await win.webContents.insertCSS('* { transition: none !important; animation: none !important; }');
    await win.webContents.executeJavaScript(`(async () => {
      const A = window.Inkblots;
      const check = (ok, text) => { if (!ok) throw new Error(text); };
      A.State.dirty = true;
      A.closeTab(0);
      check(document.querySelector('#scrim').classList.contains('open'), 'Dirty close must confirm');
      document.querySelector('#m-cancel').click();
      check(A.Tabs.length === 1 && A.State.dirty, 'Cancel must preserve the document');
      A.closeTab(0); document.querySelector('#m-ok').click();
      check(A.Tabs.length === 0 && A.activeTab === -1, 'Last close must leave zero tabs');
      check(!document.querySelector('#empty-workspace').hidden, 'Empty workspace missing');
      check(document.querySelector('#b-save').disabled, 'Save must be disabled');
      window.dispatchEvent(new KeyboardEvent('keydown', {key:'s',ctrlKey:true,bubbles:true}));
      document.querySelector('#canvas').dispatchEvent(new MouseEvent('dblclick', {bubbles:true}));
      check(A.Tabs.length === 0 && !document.querySelector('#scrim').classList.contains('open'), 'Empty shortcuts must not create a document');
      check(await A.confirmWindowClose(), 'Empty workspace must close without a warning');
      document.querySelector('#empty-new').click();
      check(A.Tabs.length === 1 && !document.querySelector('#b-save').disabled, 'New file must restore editor');
      A.closeTab(0);
      A.openFilesInTabs([{name:'opened.ink',content:'=== opened ===\\nHello.\\n-> END'}]);
      check(A.Tabs.length === 1 && A.State.fileName === 'opened.ink', 'Open must work after last close');
      A.newFile(); A.closeTab(1);
      check(A.Tabs.length === 1 && A.State.fileName === 'opened.ink', 'Closing one of several tabs must retain the other');
      A.closeTab(0);
      document.querySelector('#empty-close').click();
    })()`);
    await new Promise(resolve => setTimeout(resolve, 100));
    if (closeRequests !== 1) throw new Error('Close Inkblots button did not request native close');
    fs.writeFileSync(path.join(output, 'empty-workspace.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(`(async () => {
      const A = window.Inkblots;
      A.openFilesInTabs([{name:'routing.ink',content:'=== origin ===\\nChoose a route.\\n+ [Forward] -> destination\\n+ [Again] -> origin\\n=== destination ===\\nReturn to the start.\\n-> origin'}]);
      A.State.layout.origin = [80, 60]; A.State.layout.destination = [530, 270];
      A.State.view = {x:0,y:0,k:1}; A.render();
      document.querySelector('#world').style.transform = 'none';
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      const edges = [...document.querySelectorAll('#egroup path')];
      if (edges.length < 3) throw new Error('Missing routing examples');
      for (const edge of edges) {
        const d = edge.getAttribute('d');
        if (/NaN|Infinity/.test(d) || edge.getTotalLength() <= 0) throw new Error('Invalid edge geometry');
        if (!d.includes(' C')) throw new Error('Original cubic spline routing was not restored');
      }
    })()`);
    await new Promise(resolve => setTimeout(resolve, 200));
    fs.writeFileSync(path.join(output, 'connection-routing.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(`(async () => {
      const A = window.Inkblots;
      const check = (ok, msg) => { if (!ok) throw new Error(msg); };
      const tops = [...document.querySelectorAll('.menu-top')];
      check(tops.map(x=>x.textContent).join(',') === 'File,Edit,View,Story,Ink,Window,Language,Help', 'Menu ordering');
      check(getComputedStyle(document.querySelector('#legacy-actions')).display === 'none', 'Duplicate toolbar commands visible');
      const top = name => tops.find(x=>x.textContent === name);
      top('File').focus();
      top('File').dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown',bubbles:true}));
      check(document.activeElement.textContent.startsWith('New file'), 'Keyboard menu entry failed');
      document.activeElement.click();
      check(A.Tabs.length === 2, 'File > New failed');
      window.dispatchEvent(new KeyboardEvent('keydown', {key:'w',ctrlKey:true,bubbles:true}));
      check(A.Tabs.length === 1, 'Ctrl+W failed');
      const ta = document.querySelector('#side textarea'); ta.focus(); ta.setSelectionRange(0,6);
      top('Edit').dispatchEvent(new MouseEvent('mousedown', {bubbles:true,cancelable:true})); top('Edit').click();
      [...top('Edit').nextElementSibling.querySelectorAll('button')].find(x=>x.textContent.startsWith('Copy')).click();
      check(document.activeElement === ta && ta.selectionEnd === 6, 'Edit menu lost input selection');
      top('Ink').focus(); top('Ink').dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown',bubbles:true}));
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowRight',bubbles:true}));
      check(document.activeElement.parentElement.classList.contains('submenu'), 'Ink keyboard submenu failed');
      // A hidden BrowserWindow updates activeElement but does not have OS focus.
      document.activeElement.dispatchEvent(new FocusEvent('focus'));
      await new Promise(r=>setTimeout(r,650));
      check(document.querySelector('#ink-tooltip').classList.contains('show'), 'Ink keyboard tooltip missing: ' + document.activeElement.textContent + ' / ' + document.querySelector('#ink-tooltip').outerHTML);
    })()`);
    await new Promise(resolve => setTimeout(resolve, 150));
    await win.webContents.capturePage();
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(path.join(output, 'in-app-ink-menu.png'), (await win.webContents.capturePage()).toPNG());
    if (!windowActions.includes('copy')) throw new Error('Edit command did not reach native bridge');
    await win.webContents.executeJavaScript(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape',bubbles:true}));`);
    win.setSize(900, 700);
    await new Promise(resolve => setTimeout(resolve, 150));
    await win.webContents.executeJavaScript(`(() => {
      const play = document.querySelector('#b-play').getBoundingClientRect();
      if (play.right > innerWidth - 145) throw new Error('Header overlaps window controls at minimum width');
      document.querySelector('#b-theme').click();
      if (document.documentElement.getAttribute('data-theme') !== 'light') throw new Error('Theme command failed');
      if (document.querySelector('#ink-tooltip').classList.contains('show')) throw new Error('Tooltip remained after closing menu');
    })()`);
    await new Promise(resolve => setTimeout(resolve, 150));
    await win.webContents.capturePage();
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(path.join(output, 'header-small-light.png'), (await win.webContents.capturePage()).toPNG());
    console.log('Workspace checks passed: cancel/discard, zero tabs, New/Open, shortcuts, native close, and restored cubic spline routing.');
    console.log('Screenshots: ' + output);
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
