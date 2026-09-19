// Run a hidden Electron window against the production stylesheet.
const path = require('node:path');
if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(require('electron'), [__filename], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
app.setPath('userData', fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'inkblots-inspector-test-')));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 900, height: 700 });
  win.webContents.on('console-message', (_event, _level, message) => console.log(message));
  try {
    const css = fs.readFileSync(path.join(__dirname, '../renderer/style.css'), 'utf8');
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><style>${css}</style>
      <div class="editor-wrap" style="flex:none;width:360px;height:180px"><pre><code></code></pre><textarea></textarea></div>`));
    for (const zoom of [0.8, 1, 1.25, 1.5]) {
      win.webContents.setZoomFactor(zoom);
      const result = await win.webContents.executeJavaScript(`(() => {
        const pre = document.querySelector('pre'), code = document.querySelector('code'), ta = document.querySelector('textarea');
        const text = 'The board clatters. Two trains, no announcements.\\n+ [Take the northbound train] -> north_train\\n+ [Wait, and watch the cat] -> the_cat\\n* {met_cat} [Ask the cat which train] -> cat_advice\\n';
        ta.value = text.repeat(8); code.textContent = ta.value + '\\n';
        const a = getComputedStyle(code), b = getComputedStyle(ta);
        for (const prop of ['fontFamily', 'fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'tabSize']) {
          if (a[prop] !== b[prop]) throw new Error(prop + ': highlighted=' + a[prop] + ', input=' + b[prop]);
        }
        const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        ctx.font = a.font; const highlighted = ctx.measureText(text).width;
        ctx.font = b.font; const editable = ctx.measureText(text).width;
        if (Math.abs(highlighted - editable) > 0.01) throw new Error('Character widths differ');
        for (const width of [280, 360, 520]) {
          document.querySelector('.editor-wrap').style.width = width + 'px';
          const p = getComputedStyle(pre), t = getComputedStyle(ta);
          const pw = pre.clientWidth - parseFloat(p.paddingLeft) - parseFloat(p.paddingRight);
          const tw = ta.clientWidth - parseFloat(t.paddingLeft) - parseFloat(t.paddingRight);
          if (Math.abs(pw - tw) > 1) throw new Error('Wrapping widths differ: ' + pw + ' vs ' + tw);
          // The highlight has a trailing newline to preserve the final empty line.
          if (Math.abs(pre.scrollHeight - ta.scrollHeight) > 21) throw new Error('Wrapped line heights drift');
          ta.scrollTop = 120; pre.scrollTop = ta.scrollTop;
          if (pre.scrollTop !== ta.scrollTop) throw new Error('Scroll positions differ');
          ta.setSelectionRange(50, 155); ta.focus();
        }
        return { font: a.fontFamily, selected: ta.selectionEnd - ta.selectionStart };
      })()`);
      console.log(`Inspector alignment passed at zoom ${zoom}: ${JSON.stringify(result)}`);
    }
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
