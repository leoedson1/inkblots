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
app.setPath('userData', fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'inkweave-workspace-test-')));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1440, height: 1000,
    webPreferences: { preload: path.join(__dirname, '../preload.js'), contextIsolation: true, sandbox: true } });
  let closeRequests = 0;
  ipcMain.on('close-window', event => { if (event.sender === win.webContents) closeRequests++; });
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 2) console.log(message); });
  const output = path.join(__dirname, '../dist/qa'); fs.mkdirSync(output, { recursive: true });
  try {
    await win.loadFile(path.join(__dirname, '../renderer/index.html'));
    await win.webContents.executeJavaScript(`(async () => {
      const A = window.Inkweave;
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
    if (closeRequests !== 1) throw new Error('Close Inkweave button did not request native close');
    fs.writeFileSync(path.join(output, 'empty-workspace.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(`(async () => {
      const A = window.Inkweave;
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
        const source = A.State.nodes[edge.dataset.from], target = A.State.nodes[edge.dataset.to];
        const sourcePos = A.State.layout[source.id], targetPos = A.State.layout[target.id];
        if (sourcePos[0] + source._el.offsetWidth > targetPos[0]) {
          if (!d.includes(' Q')) throw new Error('Return links must use rounded external routing');
          const sourceBox = {x:sourcePos[0],y:sourcePos[1],w:source._el.offsetWidth,h:source._el.offsetHeight};
          const targetBox = {x:targetPos[0],y:targetPos[1],w:target._el.offsetWidth,h:target._el.offsetHeight};
          for (let t = 1; t < 100; t++) {
            const p = edge.getPointAtLength(edge.getTotalLength() * t / 100);
            for (const b of [sourceBox,targetBox]) if (p.x > b.x+1 && p.x < b.x+b.w-1 && p.y > b.y+1 && p.y < b.y+b.h-1) throw new Error('Return link intersects an endpoint card');
          }
        }
      }
    })()`);
    fs.writeFileSync(path.join(output, 'connection-routing.png'), (await win.webContents.capturePage()).toPNG());
    console.log('Workspace checks passed: cancel/discard, zero tabs, New/Open, shortcuts, native close, and forward/backward/self routing.');
    console.log('Screenshots: ' + output);
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
