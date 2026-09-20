(() => {
  const N = window.inkNative;
  const A = window.Inkblots;
  const I = window.InkblotsI18n;
  const nav = document.querySelector('#app-menus');
  const $ = id => document.getElementById(id);
  let previousFocus = null;
  if (N) document.documentElement.classList.add(N.platform === 'darwin' ? 'mac-header' : 'native-header');
  const native = action => N?.windowAction ? N.windowAction(action) : document.execCommand(action);
  const click = id => $(id).click();
  const closeWindow = () => N?.closeWindow ? N.closeWindow() : window.close();
  const items = [
    ['File', [
      ['New file', () => A.newFile(), 'Ctrl+N'], ['Open…', () => click('b-open'), 'Ctrl+O'],
      ['Save', () => click('b-save'), 'Ctrl+S', true], ['Save as…', () => A.saveFile(true), 'Ctrl+Shift+S', true],
      ['Close tab', () => A.closeTab(A.activeTab), 'Ctrl+W', true],
      ['Close Inkblots', closeWindow, 'Alt+F4'],
    ]],
    ['Edit', [
      ['Undo', () => edit('undo'), 'Ctrl+Z', true], ['Redo', () => edit('redo'), 'Ctrl+Shift+Z', true],
      ['Cut', () => native('cut'), 'Ctrl+X', true], ['Copy', () => native('copy'), 'Ctrl+C', true],
      ['Paste', () => native('paste'), 'Ctrl+V', true], ['Select all', () => native('selectAll'), 'Ctrl+A', true],
      ['Delete selected nodes', () => A.deleteSelectedNodes(), 'Delete', true],
      ['Find knot', () => $('search').focus(), 'Ctrl+F', true],
    ]],
    ['View', [
      ['Zoom graph in', () => click('b-zoomin'), '', true], ['Zoom graph out', () => click('b-zoomout'), '', true],
      ['Fit graph', () => click('b-zoomfit'), '', true],
      ['Zoom interface in', () => native('zoomIn'), 'Ctrl++'], ['Zoom interface out', () => native('zoomOut'), 'Ctrl+-'],
      ['Reset interface zoom', () => native('resetZoom'), 'Ctrl+0'],
      ['Switch theme', () => click('b-theme')], ['Full screen', () => native('fullscreen'), 'F11'],
      ['Reload', () => native('reload'), 'Ctrl+R'], ['Developer tools', () => native('devtools'), 'Ctrl+Shift+I'],
    ]],
    ['Story', [
      ['Insert Ink at cursor…', () => { const r = document.querySelector('#canvas').getBoundingClientRect(); window.InkblotsCanvas.openQuick(r.left+r.width/2,r.top+r.height/2); }, 'Shift+A', true],
      ['Group selected nodes', () => window.InkblotsCanvas.addZone(), 'Ctrl+G', true],
      ['Variable node', () => window.InkblotsVariables.add(), '', true],
      ['Sticky note', () => window.InkblotsCanvas.addNote(), '', true],
      ['Add knot…', () => click('b-addknot'), '', true], ['Tidy layout', () => click('b-layout'), 'Ctrl+L', true],
      ['Full script', () => click('b-source'), 'Ctrl+E', true], ['Play', () => click('b-play'), 'Ctrl+Enter', true],
    ]],
    ['Window', [
      ['Next tab', () => A.switchTab((A.activeTab + 1) % A.Tabs.length), 'Ctrl+Tab', true],
      ['Previous tab', () => A.switchTab((A.activeTab - 1 + A.Tabs.length) % A.Tabs.length), 'Ctrl+Shift+Tab', true],
      ['Minimize', () => native('minimize')], ['Maximize / restore', () => native('maximize')],
    ]],
    ['Language', [['System default', () => I.setLanguage('auto'), '', false, 'auto'], ['English', () => I.setLanguage('en'), '', false, 'en'], ['日本語', () => I.setLanguage('ja'), '', false, 'ja'], ['简体中文', () => I.setLanguage('zh-CN'), '', false, 'zh-CN'], ['Português (Brasil)', () => I.setLanguage('pt-BR'), '', false, 'pt-BR']]],
    ['Help', [['Inkblots user guide', () => window.showInkblotsGuide()], ['Hotkeys guide', () => window.showInkblotsHotkeys()], ['Ink writing guide', () => native('help')]]],
  ];
  function edit(action) {
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) native(action);
    else A[action]();
  }
  function closeMenus(restore = false) {
    nav.querySelectorAll('.menu, .submenu').forEach(el => el.classList.remove('open'));
    nav.querySelectorAll('[aria-expanded]').forEach(el => el.setAttribute('aria-expanded', 'false'));
    $('ink-tooltip').classList.remove('show');
    A.cancelInkTooltip();
    if (restore && previousFocus?.isConnected) previousFocus.focus();
  }
  function openMenu(top, focus = false) {
    if (top.disabled) return;
    closeMenus();
    const menu = top.nextElementSibling;
    menu.classList.add('open'); top.setAttribute('aria-expanded', 'true');
    menu.querySelectorAll('[data-needs-file]').forEach(el => { el.disabled = !A.Tabs.length; });
    if (focus) menu.querySelector('[role="menuitem"]:not(:disabled)')?.focus();
  }
  nav.addEventListener('mousedown', e => {
    if (!nav.contains(document.activeElement)) previousFocus = document.activeElement;
    if (e.target.closest('#b-ink')) {
      nav.querySelectorAll('.menu:not(#inkmenu)').forEach(el => el.classList.remove('open'));
      nav.querySelectorAll('.menu-top:not(#b-ink)').forEach(el => el.setAttribute('aria-expanded', 'false'));
    }
    // Keep the text selection so Edit commands target the editor, not the menu.
    e.preventDefault();
  }, true);
  for (const [label, entries] of items) {
    const anchor = document.createElement('div'); anchor.className = 'menu-anchor';
    const top = document.createElement('button'); top.className = 'menu-top'; I.bind(top, label);
    top.setAttribute('role', 'menuitem'); top.setAttribute('aria-haspopup', 'true'); top.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('div'); menu.className = 'menu app-dropdown'; menu.setAttribute('role', 'menu'); I.bind(menu, label, 'aria-label');menu.dataset.menu=label;
    entries.forEach(([name, action, shortcut, needsFile, locale]) => {
      const row = document.createElement('button'); row.className = 'menu-row'; row.setAttribute('role', 'menuitem');
      const text = document.createElement('span'); I.bind(text, name); row.appendChild(text);
      if (shortcut) { const hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = N?.platform === 'darwin' ? shortcut.replace('Ctrl', 'Cmd') : shortcut; row.appendChild(hint); }
      if (locale) { row.dataset.language=locale; const mark=document.createElement('span');mark.className='hint language-check';row.appendChild(mark); }
      if (needsFile) row.dataset.needsFile = 'true';
      row.onclick = () => { closeMenus(true); if (!needsFile || A.Tabs.length) action(); };
      menu.appendChild(row);
    });
    top.onclick = () => menu.classList.contains('open') ? closeMenus() : openMenu(top);
    anchor.append(top, menu);
    if (['File','Edit','View','Story'].includes(label)) nav.insertBefore(anchor, $('ink-anchor'));
    else nav.appendChild(anchor);
  }
  nav.querySelectorAll('.menu-top').forEach(top => {
    top.addEventListener('mouseenter', () => { if (nav.querySelector('.menu.open')) openMenu(top); });
  });
  // Make the existing Ink categories and their tooltip-bearing entries usable
  // with the same keyboard navigation as the other menus.
  nav.querySelectorAll('#inkmenu .menu-row').forEach(row => {
    row.tabIndex = -1; row.setAttribute('role', 'menuitem');
    if (row.querySelector('.submenu')) row.setAttribute('aria-haspopup', 'true');
  });
  document.addEventListener('mousedown', e => { if (!nav.contains(e.target)) closeMenus(); });
  window.addEventListener('blur', () => closeMenus());
  nav.addEventListener('keydown', e => {
    const target = document.activeElement;
    const top = target.closest('.menu-anchor')?.querySelector('.menu-top');
    if (!top) return;
    const isTop = target.classList.contains('menu-top');
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenus(true); top.focus(); return; }
    if (e.key === 'Tab') { closeMenus(); return; }
    if (isTop && ['ArrowDown','Enter',' '].includes(e.key)) { e.preventDefault(); openMenu(top, true); return; }
    const sub = target.querySelector('.submenu');
    if (sub && ['ArrowRight','Enter',' '].includes(e.key)) {
      e.preventDefault(); target.dispatchEvent(new MouseEvent('mouseenter'));
      sub.querySelector('[role="menuitem"]')?.focus(); return;
    }
    if (e.key === 'ArrowLeft' && target.parentElement.classList.contains('submenu')) {
      e.preventDefault(); target.parentElement.classList.remove('open'); target.parentElement.parentElement.focus(); return;
    }
    if (['ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault(); const tops = [...nav.querySelectorAll('.menu-top:not(:disabled)')];
      const next = tops[(tops.indexOf(top) + (e.key === 'ArrowRight' ? 1 : tops.length - 1)) % tops.length];
      next.focus(); openMenu(next, !isTop); return;
    }
    if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) {
      e.preventDefault(); const rows = [...target.parentElement.children].filter(el => el.matches('[role="menuitem"]:not(:disabled)'));
      const i = rows.indexOf(target);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
      rows[next]?.focus(); return;
    }
    if (['Enter',' '].includes(e.key) && target.closest('#inkmenu')) {
      e.preventDefault(); closeMenus(true); target.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
    }
  });
  window.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
    if (e.key === 'F10' || (e.altKey && key === 'f')) {
      e.preventDefault(); previousFocus = document.activeElement; nav.querySelector('.menu-top').focus(); openMenu(nav.querySelector('.menu-top'), e.altKey); return;
    }
    if (nav.contains(document.activeElement) && nav.querySelector('.menu.open')) return;
    let action;
    if (mod && key === 'n') action = () => A.newFile();
    else if (mod && key === 'w') action = () => A.closeTab(A.activeTab);
    else if (mod && key === 'g' && A.Tabs.length && A.State.selection.length && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName) && !e.target.isContentEditable && !$('scrim').classList.contains('open')) action = () => window.InkblotsCanvas.addZone();
    else if (mod && key === 'l' && A.Tabs.length) action = () => click('b-layout');
    else if (mod && key === 'e' && A.Tabs.length) action = () => click('b-source');
    else if (e.ctrlKey && e.key === 'Tab' && A.Tabs.length) action = () => A.switchTab((A.activeTab + (e.shiftKey ? A.Tabs.length - 1 : 1)) % A.Tabs.length);
    else if (mod && ['+','='].includes(key)) action = () => native('zoomIn');
    else if (mod && key === '-') action = () => native('zoomOut');
    else if (mod && key === '0') action = () => native('resetZoom');
    else if (e.key === 'F11') action = () => native('fullscreen');
    else if (e.key === 'F5' || (mod && key === 'r')) action = () => native('reload');
    else if (mod && e.shiftKey && key === 'i') action = () => native('devtools');
    if (action) { e.preventDefault(); e.stopImmediatePropagation(); closeMenus(); action(); }
  }, true);
  function syncLanguage(){nav.querySelectorAll('[data-language]').forEach(row=>{const selected=row.dataset.language===I.preference;row.querySelector('.language-check').textContent=selected?'✓':'';row.setAttribute('aria-current',String(selected));});}
  window.addEventListener('inkblots-language',syncLanguage);syncLanguage();
  const syncTheme = () => N?.setTheme?.(document.documentElement.getAttribute('data-theme') || 'dark');
  new MutationObserver(syncTheme).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  syncTheme();
})();
