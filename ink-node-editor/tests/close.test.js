const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '..');
const tick = () => new Promise(resolve => setImmediate(resolve));

async function harness({ dirty = true, veto = true, themed = false } = {}) {
  let win, resolveDialog, dialogs = 0;
  const ipcMain = new EventEmitter();
  ipcMain.handle = () => {};
  const app = new EventEmitter();
  app.requestSingleInstanceLock = () => true;
  app.whenReady = () => Promise.resolve();
  app.quit = () => {};
  const renderer = { window: { Inkweave: {
    Tabs: [{ dirty: false, fileName: 'draft.ink' }],
    flushPendingEdit() { this.Tabs[0].dirty = dirty; },
  } } };
  let modal;
  if (themed) {
    const elements = new Map();
    const $ = selector => {
      if (!elements.has(selector)) elements.set(selector, {
        textContent: '', value: '', style: {}, focus() {}, select() {},
        classList: { add() {}, remove() {} },
      });
      return elements.get(selector);
    };
    const source = fs.readFileSync(path.join(root, 'renderer/app.js'), 'utf8');
    const start = source.indexOf('let modalCb = null;');
    const end = source.indexOf("$('#m-ok').onclick", start);
    const context = vm.createContext({ $, setTimeout,
      Tabs: renderer.window.Inkweave.Tabs,
      flushPendingEdit: () => renderer.window.Inkweave.flushPendingEdit(),
    });
    vm.runInContext(source.slice(start, end), context);
    renderer.window.Inkweave.confirmWindowClose = context.confirmWindowClose;
    modal = { $, respond: context.closeModal, ask: context.ask };
  }
  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super(); win = this; this.options = options; this.closed = false;
      this.webContents = new EventEmitter();
      this.webContents.executeJavaScript = async code => vm.runInNewContext(code, renderer);
      this.webContents.setWindowOpenHandler = () => {};
    }
    loadFile() {}
    close() {
      const e = { blocked: false, preventDefault() { this.blocked = true; } };
      this.emit('close', e);
      if (e.blocked) return;
      if (veto) {
        const unload = { approved: false, preventDefault() { this.approved = true; } };
        this.webContents.emit('will-prevent-unload', unload);
        if (!unload.approved) return;
      }
      this.closed = true;
    }
  }
  const electron = { app, BrowserWindow, ipcMain, shell: {},
    Menu: { buildFromTemplate: x => x, setApplicationMenu() {} },
    dialog: { showMessageBox() { dialogs++; return new Promise(r => { resolveDialog = r; }); } },
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'main.js'), 'utf8'), {
    require: name => name === 'electron' ? electron : name === './renderer/snippets.js' ? [] : require(name),
    __dirname: root, process: { platform: 'win32', argv: [] }, console,
  });
  await tick();
  return { win, ipcMain, modal, tabs: renderer.window.Inkweave.Tabs,
    get dialogs() { return dialogs; }, respond(response) { resolveDialog({ response }); } };
}

test('Themed close uses the existing modal, closes on Don’t Save and skips native dialog', async () => {
  const h = await harness({ themed: true });
  h.win.close(); h.win.close(); await tick();
  assert.equal(h.modal.$('#m-title').textContent, 'Close draft.ink?');
  assert.equal(h.modal.$('#m-desc').textContent, 'This file has unsaved changes that will be lost.');
  assert.equal(h.modal.$('#m-ok').textContent, "Don't Save");
  assert.equal(h.win.closed, false);
  h.modal.respond(true); await tick();
  assert.equal(h.win.closed, true); assert.equal(h.dialogs, 0);
});

test('Themed cancel preserves edits and allows retry', async () => {
  const h = await harness({ themed: true });
  h.win.close(); await tick(); h.modal.respond(false); await tick();
  assert.equal(h.win.closed, false); assert.equal(h.tabs[0].dirty, true);
  h.win.close(); await tick(); h.modal.respond(true); await tick();
  assert.equal(h.win.closed, true); assert.equal(h.dialogs, 0);
});

test('Themed confirmation lists every unsaved file', async () => {
  const h = await harness({ themed: true });
  h.tabs.push({ dirty: true, fileName: 'second.ink' });
  h.win.close(); await tick();
  assert.equal(h.modal.$('#m-title').textContent, 'Close Inkweave?');
  assert.match(h.modal.$('#m-desc').textContent, /2 files.*draft\.ink, second\.ink/);
  h.modal.respond(false); await tick(); assert.equal(h.win.closed, false);
});

test('Replacing the modal cancels pending window close and restores ordinary button label', async () => {
  const h = await harness({ themed: true });
  h.win.close(); await tick();
  h.modal.ask('New knot', '', '', () => {}, false); await tick();
  assert.equal(h.win.closed, false);
  assert.equal(h.modal.$('#m-ok').textContent, 'OK');
  h.win.close(); await tick(); h.modal.respond(true); await tick();
  assert.equal(h.win.closed, true);
});

test('Themed clean close needs no confirmation', async () => {
  const h = await harness({ themed: true, dirty: false });
  h.win.close(); await tick();
  assert.equal(h.win.closed, true); assert.equal(h.dialogs, 0);
});

test('Don’t Save closes even when the renderer vetoes unload', async () => {
  const h = await harness();
  h.win.close(); await tick();
  assert.equal(h.dialogs, 1); assert.equal(h.win.closed, false);
  h.respond(0); await tick();
  assert.equal(h.win.closed, true);
});

test('Cancel preserves the window and permits a later close attempt', async () => {
  const h = await harness();
  h.win.close(); await tick(); h.respond(1); await tick();
  assert.equal(h.win.closed, false);
  const e = { preventDefault() { assert.fail('Unapproved unload was allowed'); } };
  h.win.webContents.emit('will-prevent-unload', e);
  h.win.close(); await tick(); assert.equal(h.dialogs, 2);
  h.respond(0); await tick(); assert.equal(h.win.closed, true);
});

test('Repeated close clicks share one pending confirmation', async () => {
  const h = await harness();
  h.win.close(); h.win.close(); await tick(); h.win.close();
  assert.equal(h.dialogs, 1);
  h.respond(0); await tick(); assert.equal(h.win.closed, true);
});

test('Clean window closes without a dialog', async () => {
  const h = await harness({ dirty: false, veto: false });
  h.win.close(); await tick();
  assert.equal(h.dialogs, 0); assert.equal(h.win.closed, true);
});

test('Sandboxed preload exposes native bridge and propagates INCLUDE read errors', async () => {
  const h = await harness();
  assert.equal(h.win.options.webPreferences.sandbox, true);
  let bridge;
  const ipcRenderer = {
    sendSync(channel, ...args) {
      const event = {};
      h.ipcMain.emit(channel, event, ...args);
      return event.returnValue;
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'preload.js'), 'utf8'), {
    require(name) {
      assert.equal(name, 'electron', 'Sandbox preload must not import fs or path');
      return { ipcRenderer, contextBridge: { exposeInMainWorld(name, value) {
        assert.equal(name, 'inkNative'); bridge = value;
      } } };
    },
    process: { platform: 'win32' },
  });
  assert.equal(bridge.readRelative(path.join(root, 'story.ink'), 'examples/lighthouse.ink'),
    fs.readFileSync(path.join(root, 'examples/lighthouse.ink'), 'utf8'));
  assert.throws(() => bridge.readRelative(path.join(root, 'story.ink'), 'missing.ink'), /ENOENT/);
});
