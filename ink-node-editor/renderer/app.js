/* Inkblots — node-based editing for Ink scripts.
   The .ink file stays the source of truth: nodes are knots/stitches, edges are diverts. */

(function () {
'use strict';

const NATIVE = window.inkNative || null;
const $ = (s) => document.querySelector(s);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const I = window.InkblotsI18n;
const t = (key, values) => I.t(key, values);
const ui = (tag, cls, text, values) => I.bind(el(tag, cls), text, undefined, values);
const uiText = (selector, text) => I.bind($(selector), text);
const esc = (s) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const START_ID = '::start';
const LAYOUT_MARK = '// --- Inkblots layout (safe to delete) ---';

// Migrate browser preferences once; removing old keys prevents closed tabs returning.
try {
  for (const key of ['autosave', 'theme', 'side-width']) {
    const legacy = localStorage.getItem('inkweave-' + key);
    if (legacy !== null && localStorage.getItem('inkblots-' + key) === null) localStorage.setItem('inkblots-' + key, legacy);
    localStorage.removeItem('inkweave-' + key);
  }
} catch (e) {}

// One tab = one of these. `State` always points at whichever tab is active;
// switching tabs just reassigns it, so every function below keeps working unchanged.
function makeTab(name) {
  return {
    nodes: {}, order: [], layout: {},
    organizer: { zones: [], notes: [] }, selection: [],
    globals: new Set(), includes: [],
    filePath: null, fileName: name || 'Untitled.ink',
    dirty: false, sel: null,
    view: { x: 60, y: 60, k: 1 },
    history: [], future: [],
    problems: [], edges: [],
  };
}

let State = makeTab('Untitled.ink');
let Tabs = [State];
let activeTab = 0;
function nextUntitledName() {
  const used = new Set(Tabs.map(t => t.fileName.toLowerCase()));
  let i = 1, name = 'Untitled.ink';
  while (used.has(name.toLowerCase())) name = `Untitled-${++i}.ink`;
  return name;
}

const STARTER = `// A tiny story to get you started. Open one of your own with "Open".
VAR met_cat = false

You wake on the platform at Vasel with no ticket and no memory of buying one.
-> platform

=== platform ===
The board clatters. Two trains, no announcements.
+ [Take the northbound train] -> north_train
+ [Wait, and watch the cat] -> the_cat
* {met_cat} [Ask the cat which train] -> cat_advice

=== the_cat ===
~ met_cat = true
A tabby sits exactly where the timetable should be.
-> platform

=== cat_advice ===
"Neither," says the cat. "But the north one is warmer."
-> north_train

=== north_train ===
You board. The doors sigh shut behind you.
-> END
`;

// what a brand-new tab looks like — Ink's own classic example, the same one
// Inky itself opens with (a "once upon a time" with two choices and a gather)
const BLANK_DOC = `Once upon a time...

* There was a princess.
* There was a plumber.

- They lived happily ever after.
    -> END
`;

/* ------------------------------------------------------------------ parsing */

const RE_KNOT = /^\s*={2,}\s*(function\s+)?([A-Za-z_]\w*)\s*(\([^)]*\))?\s*=*\s*$/;
const RE_STITCH = /^\s*=(?!=)\s*([A-Za-z_]\w*)\s*(\([^)]*\))?\s*$/;
const RE_LABEL = /^\s*(?:[*+\-]\s*)+\(\s*([A-Za-z_]\w*)\s*\)/;
const RE_DIVERT = /(->->|->|<-)[ \t]*([A-Za-z_][\w.]*)?/g;

function stripLayout(src) {
  const layout = {};
  let organizer = { zones: [], notes: [] };
  const kept = [];
  for (const line of src.split('\n')) {
    const org = line.match(/^\s*\/\/\s*@inkblots\s+(\{.*\})\s*$/);
    if (org) { try { organizer = JSON.parse(org[1]); } catch (e) {} continue; }
    const m = line.match(/^\s*\/\/\s*@layout\s+(\{.*\})\s*$/);
    if (m) { try { Object.assign(layout, JSON.parse(m[1])); } catch (e) {} continue; }
    if (line.trim() === LAYOUT_MARK || line.trim() === '// --- inkweave layout (safe to delete) ---') continue;
    kept.push(line);
  }
  return { src: kept.join('\n'), layout, organizer };
}

// root-level stitches are addressed by bare name; knot stitches are knot.stitch
function stitchId(parent, name) {
  return !parent || parent === START_ID ? name : parent + '.' + name;
}

function parse(source) {
  const { src, layout, organizer } = stripLayout(source);
  const nodes = {}, order = [];
  let cur = { id: START_ID, name: 'Start', kind: 'start', header: null, parent: null, lines: [] };
  let curKnot = START_ID;

  const push = (n) => { n.body = n.lines.join('\n').replace(/\s+$/, ''); delete n.lines; nodes[n.id] = n; order.push(n.id); };

  const sourceLines = src.split('\n');
  const structuralLines = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).split('\n');
  for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex++) {
    const line = sourceLines[lineIndex], structural = structuralLines[lineIndex];
    let m = structural.match(RE_KNOT);
    if (m) {
      push(cur);
      const isFn = !!m[1];
      cur = { id: m[2], name: m[2], kind: isFn ? 'function' : 'knot', args: m[3] || '', header: line.trimEnd(), parent: null, lines: [] };
      curKnot = cur.id;
      continue;
    }
    m = structural.match(RE_STITCH);
    if (m) {
      push(cur);
      cur = { id: stitchId(curKnot, m[1]), name: m[1], kind: 'stitch', args: m[2] || '', header: line.trimEnd(), parent: curKnot, lines: [] };
      continue;
    }
    cur.lines.push(line);
  }
  push(cur);

  if (order.length > 1 && !nodes[START_ID].body.trim()) {
    // keep the start node anyway — it holds globals — but mark it thin
  }

  const globals = new Set(), includes = [];
  for (const id of order) {
    const n = nodes[id];
    n.labels = [];
    n.body.split('\n').forEach(l => {
      const d = l.match(/^\s*(?:VAR|CONST|LIST)\s+([A-Za-z_]\w*)/) || l.match(/^\s*~\s*temp\s+([A-Za-z_]\w*)/);
      if (d) globals.add(d[1]);
      const i = l.match(/^\s*INCLUDE\s+(.+?)\s*$/);
      if (i) includes.push(i[1]);
    });
    (String(n.args || '').match(/[A-Za-z_]\w*/g) || []).forEach(a => { if (a !== 'ref' && a !== 'divert') (n.params = n.params || []).push(a); });
    n.body.split('\n').forEach(l => { const m = l.match(RE_LABEL); if (m) n.labels.push(m[1]); });
    scanDiverts(n);
  }
  return { nodes, order, layout, globals, includes, organizer };
}

function scanDiverts(node) {
  node.diverts = [];
  const lines = node.body.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).split('\n');
  lines.forEach((line, i) => {
    const cut = line.indexOf('//');
    const scan = cut >= 0 ? line.slice(0, cut) : line;
    const isChoice = /^\s*[*+]/.test(scan);
    RE_DIVERT.lastIndex = 0;
    let m;
    while ((m = RE_DIVERT.exec(scan))) {
      const arrow = m[1], target = m[2];
      if (arrow === '->->') { node.diverts.push({ line: i, kind: 'return', target: null }); continue; }
      if (!target) continue;
      const s = m.index + m[0].length - target.length;
      const after = scan.slice(m.index + m[0].length);
      const tunnel = /^\s*->/.test(after);
      let kind = arrow === '<-' ? 'thread' : tunnel ? 'tunnel' : isChoice ? 'choice' : 'divert';
      node.diverts.push({ line: i, kind, target, s, e: s + target.length });
    }
  });
}

function resolveTarget(node, raw) {
  if (raw === 'END' || raw === 'DONE') return { special: raw };
  const N = State.nodes;
  const parts = raw.split('.');
  const knotOf = node.kind === 'stitch' ? node.parent : node.id;

  if (node.labels && node.labels.includes(raw)) return { id: node.id, label: raw };
  if (knotOf && N[stitchId(knotOf, raw)]) return { id: stitchId(knotOf, raw) };
  if (knotOf && N[knotOf] && N[knotOf].labels.includes(raw)) return { id: knotOf, label: raw };
  if (N[raw]) return { id: raw };
  if (parts.length > 1) {
    const joined = parts.slice(0, 2).join('.');
    if (N[joined]) return { id: joined, ...(parts.length>2 && N[joined].labels.includes(parts[2]) ? {label:parts[2]} : {}) };
    if (N[parts[0]] && N[parts[0]].labels.includes(parts[1])) return { id: parts[0], label: parts[1] };
  }
  for (const id of State.order) if (State.nodes[id].labels.includes(raw)) return { id, label: raw };
  for (const id of State.order) if (State.nodes[id].name === raw) return { id };
  return null;
}

function buildEdges() {
  const edges = [];
  for (const id of State.order) {
    const n = State.nodes[id];
    n.out = [];
    (n.diverts || []).forEach((d, idx) => {
      if (d.kind === 'return') { n.out.push({ idx, kind: 'return', term: '↩ return' }); return; }
      const r = resolveTarget(n, d.target);
      const rec = { idx, kind: d.kind, raw: d.target, res: r };
      if (!r) {
        const base = d.target.split('.')[0];
        if ((State.globals && State.globals.has(base)) || (n.params && n.params.indexOf(base) >= 0)) rec.soft = 'variable';
        else if (State.includes && State.includes.length) rec.soft = 'included file';
      }
      n.out.push(rec);
      if (r && r.id) edges.push({ from: id, to: r.id, kind: d.kind, idx, label: r.label });
    });
    // knot content falls through into its first stitch
    const firstStitch = State.order.find(x => State.nodes[x].parent === id);
    if (firstStitch && n.kind !== 'stitch') edges.push({ from: id, to: firstStitch, kind: 'flow', idx: -1 });
  }
  State.edges = edges;
}

/* -------------------------------------------------------------- serializing */

function serialize(withLayout, s) {
  s = s || State;
  const chunks = [], lineMap = [];
  let line = 1;
  for (const id of s.order) {
    const n = s.nodes[id];
    const parts = [];
    if (n.header) parts.push(n.header);
    if (n.body) parts.push(n.body);
    const text = parts.join('\n');
    if (!text && id === START_ID) { continue; }
    const count = text.split('\n').length;
    lineMap.push({ start: line, end: line + count - 1, id });
    chunks.push(text);
    line += count + 1;
  }
  let text = chunks.join('\n\n') + '\n';
  if (withLayout) {
    const lay = {};
    for (const id of s.order) if (s.layout[id]) lay[id] = s.layout[id].map(Math.round);
    text += '\n' + LAYOUT_MARK + '\n// @layout ' + JSON.stringify(lay) + '\n';
    text += '// @inkblots ' + JSON.stringify(s.organizer) + '\n';
  }
  return { text, lineMap };
}

/* ------------------------------------------------------------------ loading */

function load(source, opts) {
  opts = opts || {};
  const parsed = parse(source);
  State.nodes = parsed.nodes;
  State.order = parsed.order;
  State.layout = Object.assign({}, opts.keepOrganizer ? State.layout : {}, parsed.layout);
  State.organizer = opts.keepOrganizer ? State.organizer : parsed.organizer;
  State.selection = [];
  State.globals = parsed.globals;
  State.includes = parsed.includes;
  State.sel = null;
  State.problems = [];
  buildEdges();
  const missing = State.order.filter(id => !State.layout[id]);
  if (missing.length === State.order.length) autoLayout(true);
  else if (missing.length) placeNew(missing);
  render();
  if (!opts.keepView) fitView();
  renderInspector();
  if (!opts.keepHistory) { State.history = []; State.future = []; }
  setDirty(opts.dirty || false);
}

function placeNew(ids) {
  let y = 40;
  const xs = Object.values(State.layout).map(p => p[0]);
  const x = xs.length ? Math.max.apply(null, xs) + 330 : 80;
  ids.forEach(id => { State.layout[id] = [x, y]; y += 190; });
}

/* --------------------------------------------------------------------- tabs */

// only the active tab's inspector textarea can have a debounced edit in
// flight, so flushing before anything reads or leaves that tab is enough
// to guarantee its `body`/`dirty` are never stale.
let pendingEdit = null;
function scheduleCommit(fn, ms) {
  if (pendingEdit) clearTimeout(pendingEdit.timer);
  pendingEdit = { run: fn, timer: setTimeout(() => { pendingEdit = null; fn(); }, ms) };
}
function flushPendingEdit() {
  if (!pendingEdit) return;
  clearTimeout(pendingEdit.timer);
  const fn = pendingEdit.run;
  pendingEdit = null;
  fn();
}

function activateTab(i) { activeTab = i; State = Tabs[i]; }

function selectFirstReal() {
  const id = State.order.find(x => State.nodes[x].kind !== 'start') || State.order[0];
  if (id) select(id);
}

function addTab(source, opts) {
  opts = opts || {};
  const t = makeTab(opts.name || nextUntitledName());
  if (opts.path) t.filePath = opts.path;
  Tabs.push(t);
  activateTab(Tabs.length - 1);
  load(source, opts);
  if (opts.select !== false) selectFirstReal();
  return t;
}

function closeOverlays() {
  $('#play').classList.remove('open');
  $('#errors').classList.remove('open');
  closeSource();
  closeInkMenu();
  story = null;
}

function refreshChrome() {
  filterText = '';
  const s = $('#search'); if (s) s.value = '';
  applyTransform();
  render();
  renderInspector();
}

function switchTab(i) {
  if (i === activeTab || i < 0 || i >= Tabs.length) return;
  flushPendingEdit();
  closeOverlays();
  activateTab(i);
  refreshChrome();
}

// Closing the last tab leaves an empty workspace, not another document.
function closeTab(i) {
  const t = Tabs[i];
  if (!t) return;
  if (i === activeTab) flushPendingEdit();   // so `t.dirty` reflects any edit still mid-debounce
  const doClose = () => {
    Tabs.splice(i, 1);
    if (!Tabs.length) {
      closeOverlays();
      drag = link = pan = null;
      activeTab = -1;
      // Keep a detached, empty view model for resize/render callbacks. It is
      // never a document and cannot be saved or edited while no tab is open.
      State = makeTab('');
      try { localStorage.removeItem('inkblots-autosave'); } catch (e) {}
      refreshChrome();
      $('#empty-open').focus();
      return;
    }
    let next;
    if (i < activeTab) next = activeTab - 1;
    else if (i > activeTab) next = activeTab;
    else next = Math.min(i, Tabs.length - 1);
    closeOverlays();
    activateTab(next);
    refreshChrome();
  };
  if (t.dirty) ask('Close ' + t.fileName + '?', 'This file has unsaved changes that will be lost.', null, (ok) => { if (ok) doClose(); }, true);
  else doClose();
}

// used for native multi-select, drag-and-drop, and files handed in at launch.
// the first file reuses an untouched blank tab if one is sitting there,
// the same courtesy VS Code and friends extend to an empty Untitled tab.
function openFilesInTabs(files) {
  files.forEach((f, i) => {
    const active = Tabs[activeTab];
    const reuse = i === 0 && active && !active.dirty && !active.filePath;
    if (reuse) {
      if (f.path) active.filePath = f.path;
      active.fileName = f.name;
      load(f.content, {});
      selectFirstReal();
    } else {
      addTab(f.content, { name: f.name, path: f.path });
    }
  });
  toast(files.length > 1 ? 'Opened ' + files.length + ' files' : 'Opened ' + files[files.length - 1].name);
}

function renderTabBar() {
  const bar = $('#tabbar');
  if (!bar) return;
  bar.textContent = '';
  bar.setAttribute('role', 'tablist');
  Tabs.forEach((t, i) => {
    const tab = el('div', 'tab' + (i === activeTab ? ' active' : ''));
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', i === activeTab ? 'true' : 'false');
    tab.title = t.filePath || t.fileName;
    tab.appendChild(el('span', 'tab-name', t.fileName + (t.dirty ? ' \u2022' : '')));
    const x = el('span', 'tab-close', '\u2715');
    I.bind(x, 'Close', 'title');
    x.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); closeTab(i); });
    tab.appendChild(x);
    tab.addEventListener('mousedown', (e) => { if (e.target === x) return; switchTab(i); });
    bar.appendChild(tab);
  });
  const add = el('div', 'tab-add', '+');
  I.bind(add, 'New tab (Ctrl+N)', 'title');
  add.addEventListener('mousedown', (e) => { e.preventDefault(); newFile(); });
  bar.appendChild(add);
}

/* ------------------------------------------------------------------ rendering */

const nodesEl = $('#nodes'), egroup = $('#egroup'), canvas = $('#canvas');

// only plain narrative prose belongs here — anything structural (diverts,
// declarations, tags, logic) already has its own tag-style representation
// elsewhere on the card, so leaving it in as raw text would just say the
// same thing twice, once as a readable tag and once as leftover syntax.
function previewOf(n) {
  const out = [];
  for (const raw of n.body.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')) {
    let l = raw.replace(/\/\/.*$/, '').trim();
    if (!l || /^~/.test(l)) continue;                              // logic lines
    if (/^(VAR|CONST|LIST|EXTERNAL|INCLUDE)\b/.test(l)) continue;   // declarations — shown as their own tag instead
    if (/^#/.test(l)) continue;                                    // tags — never seen by a player either
    // diverts/threads must be stripped BEFORE the marker below: a bare
    // "-> knot" line starts with "-", which the marker regex also matches —
    // run that first and it eats just the dash, leaving a stray "> knot"
    // behind that no longer looks like a divert to anything downstream.
    l = l.replace(/<-.*$/, '');                 // thread — already has its own tag
    l = l.replace(/->.*$/, '');                 // divert/tunnel/return — already has its own tag
    l = l.replace(/^[*+\-\s]+/, '');            // choice/gather marker
    l = l.replace(/^\(\s*\w+\s*\)\s*/, '');     // a leading (label)
    while (/^\{[^{}]*\}\s*/.test(l)) l = l.replace(/^\{[^{}]*\}\s*/, ''); // leading choice/gather condition(s)
    l = l.trim();
    if (!l || l === '-') continue;
    out.push(l.length > 92 ? l.slice(0, 92) + '…' : l);
    if (out.length >= 4) break;
  }
  return out;
}

// VAR/CONST/LIST declarations get their own small tag instead of showing up
// as a raw "VAR gold = 0" line sitting in the middle of the story text
function declsOf(n) {
  const out = [];
  n.body.split('\n').forEach(raw => {
    const l = raw.replace(/\/\/.*$/, '').trim();
    let m = l.match(/^VAR\s+([A-Za-z_]\w*)/);
    if (m) { out.push({ kind: 'var', label: 'VAR ' + m[1] }); return; }
    m = l.match(/^CONST\s+([A-Za-z_]\w*)/);
    if (m) { out.push({ kind: 'const', label: 'CONST ' + m[1] }); return; }
    m = l.match(/^LIST\s+([A-Za-z_]\w*)/);
    if (m) { out.push({ kind: 'list', label: 'LIST ' + m[1] }); return; }
  });
  return out;
}

const PILL_GLYPH = { divert: '→', choice: '▸', thread: '⇠', tunnel: '⇥', return: '↩' };

function render() {
  nodesEl.textContent = '';
  for (const id of State.order) {
    const n = State.nodes[id];
    if (id === START_ID && !n.body.trim() && State.order.length > 1) { n._el = null; continue; }
    const pos = State.layout[id] || [0, 0];
    const d = el('div', 'node');
    d.dataset.id = id;
    d.dataset.kind = n.kind;
    d.style.left = pos[0] + 'px';
    d.style.top = pos[1] + 'px';
    if (State.sel === id || State.selection.includes(id)) d.classList.add('sel');

    const head = el('div', 'head');
    head.appendChild(el('span', 'kind'));
    head.appendChild(el('span', 'nm', n.kind === 'stitch' ? '= ' + n.name : n.name));
    d.appendChild(head);

    const decls = declsOf(n);
    if (decls.length) {
      const declRow = el('div', 'decls');
      decls.slice(0, 8).forEach(x => declRow.appendChild(el('div', 'pill decl', x.label)));
      if (decls.length > 8) declRow.appendChild(el('div', 'pill decl', '+' + (decls.length - 8)));
      d.appendChild(declRow);
    }

    const choices = window.inkChoiceView(n);
    if (choices.rows.length) d.classList.add('has-choices');
    const prose = el('div', 'prose');
    const lines = previewOf(choices.rows.length ? {body:choices.before} : n);
    if (!lines.length) prose.appendChild(ui('div', 'empty', 'no text yet'));
    else lines.forEach(l => prose.appendChild(el('div', null, l)));
    if (lines.length || !choices.rows.length) d.appendChild(prose);
    for (const choice of choices.rows) {
      const row = el('div', 'choice-row'); row.dataset.line = choice.line;
      row.classList.add(choice.sticky?'sticky-choice':'once-choice');
      const marker=el('span','choice-marker',choice.sticky?'+':'*');I.bind(marker,choice.sticky?'Sticky choice':'Choice','title');row.appendChild(marker);
      row.style.setProperty('--choice-depth', Math.min(choice.depth-1, 5));
      row.style.minHeight=Math.max(46,choice.exits.length*18+12)+'px';
      row.appendChild(choice.label ? el('div', 'choice-label', choice.label) : ui('div','choice-label','Automatic choice'));
      const ports = el('div','choice-ports');
      for (const o of choice.exits) {
        const terminal=o.kind==='return' || o.res?.special;
        const port=el('div', 'pill choice-port' + (terminal ? ' term' : !o.res && !o.soft ? ' broken' : ''));
        port.dataset.node=id;port.dataset.idx=o.idx;port.tabIndex=0;
        const target=o.raw || 'return';
        I.bind(port, terminal ? 'Ends or returns: {name}' : 'Connection to {name}', 'title', {name:target});
        I.bind(port, 'Connection to {name}', 'aria-label', {name:target});
        ports.appendChild(port);
      }
      if (!choice.exits.length) {
        const local=el('div','choice-port local');
        I.bind(local,'Continues within this node','title');ports.appendChild(local);
      }
      row.appendChild(ports);d.appendChild(row);
    }

    if(choices.rows.length) {
      const continuation=previewOf({body:choices.after});
      if(continuation.length) {
        const after=el('div','prose choice-continuation');
        continuation.forEach(line=>after.appendChild(el('div',null,line)));d.appendChild(after);
      }
    }
    const pills = el('div', 'pills');
    const otherExits = (n.out || []).filter(o=>!choices.rowExits.has(o.idx));
    (choices.rows.length ? otherExits : otherExits.slice(0,9)).forEach((o) => {
      let cls = 'pill ' + o.kind, label;
      if (o.kind === 'return') { cls = 'pill term'; label = '↩ return'; }
      else if (o.res && o.res.special) { cls = 'pill term'; label = '■ ' + o.res.special; }
      else if (!o.res && o.soft) { cls = 'pill'; label = '→ ' + o.raw; }
      else if (!o.res) { cls = 'pill broken'; label = '⚠ ' + o.raw; }
      else label = (PILL_GLYPH[o.kind] || '→') + ' ' + o.raw;
      const p = el('div', cls, label);
      p.dataset.node = id; p.dataset.idx = o.idx;
      I.bind(p, o.res ? '' : o.soft ? 'Target comes from a ' + o.soft : 'No knot, stitch or label called ' + o.raw + ' — click to create it', 'title');
      pills.appendChild(p);
    });
    if (!choices.rows.length && otherExits.length > 9) pills.appendChild(el('div', 'pill', '+' + (otherExits.length - 9)));
    if(otherExits.length) d.appendChild(pills);

    const addChoiceButton = ui('button','addchoice','+');
    I.bind(addChoiceButton,'Add choice','title');I.bind(addChoiceButton,'Add choice','aria-label');
    addChoiceButton.onclick=()=>addChoice(id);d.appendChild(addChoiceButton);
    const add = el('div', 'addout', '+');
    I.bind(add, 'Drag to another knot to add a divert', 'title');
    d.appendChild(add);
    if(choices.rows.length) {
      const bodyExit=el('div','body-exits');
      const direct=[...pills.children];
      direct.forEach(port=>{port.classList.add('body-port');port.setAttribute('aria-label',port.textContent);port.textContent='';bodyExit.appendChild(port);});
      prose.appendChild(bodyExit);
      if(!d.contains(prose))d.insertBefore(prose,head.nextSibling);
      pills.remove();
      prose.style.minHeight=Math.max(40,direct.length*18+12)+'px';
    }

    nodesEl.appendChild(d);
    if(choices.rows.length)add.style.top=(prose.offsetTop+prose.offsetHeight/2-9)+'px';
    n._el = d;
  }
  requestAnimationFrame(drawEdges);
  updateStatus();
  applyFilter();
  window.dispatchEvent(new Event('inkblots-render'));
}

function anchorFor(nodeId, idx) {
  const n = State.nodes[nodeId];
  if (!n || !n._el) return null;
  const pos = State.layout[nodeId] || [0, 0];
  const w = n._el.offsetWidth, h = n._el.offsetHeight;
  if (idx >= 0) {
    const pill = n._el.querySelector('.pill[data-idx="' + idx + '"]');
    if (pill) {
      const r=pill.getBoundingClientRect(), nodeRect=n._el.getBoundingClientRect();
      const scale=nodeRect.width/w;
      return [pos[0]+w, pos[1]+(r.top-nodeRect.top+r.height/2)/scale];
    }
  }
  const add=n._el.querySelector('.addout');
  if(add){const r=add.getBoundingClientRect(),nr=n._el.getBoundingClientRect();return [pos[0]+w,pos[1]+(r.top-nr.top+r.height/2)/(nr.width/w)];}
  return [pos[0] + w, pos[1] + h - 14];
}

function inletFor(nodeId) {
  const n = State.nodes[nodeId];
  if (!n || !n._el) return null;
  const pos = State.layout[nodeId] || [0, 0];
  return [pos[0], pos[1] + Math.min(22, n._el.offsetHeight / 2)];
}

function path(a, b) {
  const dx = Math.max(60, Math.abs(b[0] - a[0]) * 0.5);
  // loop back around when the target sits to the left
  if (b[0] < a[0] + 40) {
    const mid = (a[1] + b[1]) / 2 + 90;
    return `M${a[0]},${a[1]} C${a[0] + 80},${a[1]} ${a[0] + 60},${mid} ${(a[0] + b[0]) / 2},${mid} C${b[0] - 70},${mid} ${b[0] - 80},${b[1]} ${b[0]},${b[1]}`;
  }
  return `M${a[0]},${a[1]} C${a[0] + dx},${a[1]} ${b[0] - dx},${b[1]} ${b[0]},${b[1]}`;
}

function drawEdges() {
  egroup.textContent = '';
  const ns = 'http://www.w3.org/2000/svg';
  for (const e of State.edges) {
    const a = anchorFor(e.from, e.idx); let b = inletFor(e.to);
    if(e.label){const n=State.nodes[e.to];const line=n.body.split('\n').findIndex(l=>l.match(RE_LABEL)?.[1]===e.label);const port=n._el?.querySelector('.choice-row[data-line="'+line+'"] .choice-inlet');if(port){const r=port.getBoundingClientRect();b=screenToWorld(r.left+r.width/2,r.top+r.height/2);}}
    if (!a || !b) continue;
    const dstr = e.from === e.to
      ? `M${a[0]},${a[1]} C${a[0] + 90},${a[1] - 40} ${b[0] - 90},${b[1] - 50} ${b[0]},${b[1]}`
      : path(a, b);
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', dstr);
    const choicePort=State.nodes[e.from]?._el?.querySelector('.choice-port[data-idx="'+e.idx+'"]');
    p.setAttribute('class', 'e-' + (choicePort && e.kind==='divert' ? 'choice' : e.kind));
    p.dataset.from = e.from; p.dataset.to = e.to; p.dataset.idx=e.idx;
    egroup.appendChild(p);
  }
  applyFilter();
  window.dispatchEvent(new Event('inkblots-edges'));
}

function applyTransform() {
  const v = State.view;
  $('#world').style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.k})`;
  window.dispatchEvent(new Event('inkblots-view'));
}

function updateStatus() {
  const empty = Tabs.length === 0;
  $('#app').classList.toggle('empty', empty);
  $('#empty-workspace').hidden = !empty;
  for (const id of ['b-save', 'b-ink', 'b-addknot', 'b-layout', 'b-source', 'b-play', 'search', 'b-zoomout', 'b-zoomfit', 'b-zoomin']) $('#' + id).disabled = empty;
  uiText('#st-hint', empty ? '' : 'Shift+drag to select · Shift+A / right-click to insert');
  if (empty) {
    uiText('#st-counts', ''); uiText('#st-words', '');
    uiText('#st-state', 'No file open'); $('#st-dot').className = 'dot';
    $('#filename').textContent = ''; document.title = 'Inkblots';
    renderTabBar();
    if (NATIVE && NATIVE.setEdited) NATIVE.setEdited(false, '');
    return;
  }
  const knots = State.order.filter(id => State.nodes[id].kind !== 'stitch' && id !== START_ID).length;
  const stitches = State.order.filter(id => State.nodes[id].kind === 'stitch').length;
  const words = State.order.reduce((a, id) => a + (State.nodes[id].body.match(/[A-Za-z']+/g) || []).length, 0);
  const broken = State.order.reduce((a, id) => a + (State.nodes[id].out || []).filter(o => !o.res && !o.soft && o.kind !== 'return').length, 0);
  uiText('#st-counts', `${knots} knots · ${stitches} stitches`);
  uiText('#st-words', `${words} words`);
  const dot = $('#st-dot');
  dot.className = 'dot' + (broken ? ' err' : ' ok');
  uiText('#st-state', broken ? (broken === 1 ? '1 unresolved divert' : `${broken} unresolved diverts`) : (State.dirty ? 'Unsaved changes' : 'Saved'));
  $('#filename').innerHTML = '<b>' + esc(State.fileName) + '</b>' + (State.dirty ? ' •' : '');
  document.title = (State.dirty ? '\u2022 ' : '') + State.fileName + ' — Inkblots';
  renderTabBar();
  if (NATIVE && NATIVE.setEdited) NATIVE.setEdited(State.dirty, State.fileName);
}

function setDirty(v) {
  State.dirty = v;
  updateStatus();
}

/* ------------------------------------------------------------------- filter */

let filterText = '';
function applyFilter() {
  const q = filterText.trim().toLowerCase();
  const hits = new Set();
  if (q) for (const id of State.order) {
    const n = State.nodes[id];
    if (id.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) hits.add(id);
  }
  nodesEl.querySelectorAll('.node').forEach(d => d.classList.toggle('dim', !!q && !hits.has(d.dataset.id)));
  egroup.querySelectorAll('path').forEach(p => p.classList.toggle('dim', !!q && !(hits.has(p.dataset.from) && hits.has(p.dataset.to))));
}

/* --------------------------------------------------------------- inspector */

function hl(src) {
  const re = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|(^[ \t]*(?:VAR|CONST|LIST|EXTERNAL|INCLUDE)\b[^\n]*)|(^[ \t]*~[^\n]*)|(#[^\n]*)|(\{[^{}\n]*\})|((?:->->|->|<-)[ \t]*[\w.]*)|(^[ \t]*[*+\-]+)|(\([A-Za-z_]\w*\))/gm;
  const cls = ['tok-comment', 'tok-decl', 'tok-logic', 'tok-tag', 'tok-cond', 'tok-divert', 'tok-marker', 'tok-label'];
  let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    let k = 0; for (let i = 1; i <= 8; i++) if (m[i] !== undefined) { k = i - 1; break; }
    const help=window.InkblotsSyntaxHelp.identify(m[0],cls[k],src.slice(re.lastIndex));
    out += `<span class="${cls[k]}"${help ? ` data-help="${help}"` : ''}>${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last)) + '\n';
}

function renderInspector() {
  const box = $('#side-body');
  box.textContent = '';
  const n = State.nodes[State.sel];
  if (!n) {
    box.appendChild(ui('div', 'side-empty', 'Select a knot to edit its text, or double-click the canvas to make a new one.'));
    return;
  }

  const head = el('div', 'side-head');
  const name = el('input');
  name.value = n.name;
  name.disabled = n.kind === 'start';
  name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
  name.addEventListener('change', () => renameNode(n.id, name.value.trim()));
  head.appendChild(name);
  const playHere = ui('button', 'btn', 'Play from here');
  playHere.onclick = () => startPlay(n.id);
  head.appendChild(playHere);
  box.appendChild(head);

  const meta = el('div', 'side-meta');
  meta.appendChild(ui('span', null, n.parent ? '{knot} in {parent}' : n.kind, {knot:()=>t(n.kind),parent:n.parent}));
  meta.appendChild(ui('span', null, (n.out || []).length + ' outgoing'));
  const inc = State.edges.filter(e => e.to === n.id && e.kind !== 'flow').length;
  meta.appendChild(ui('span', null, inc + ' incoming'));
  box.appendChild(meta);

  const wrap = el('div', 'editor-wrap');
  const pre = el('pre'); const code = el('code');
  pre.appendChild(code);
  const ta = el('textarea');
  ta.spellcheck = true;
  ta.value = n.body;
  code.innerHTML = hl(n.body);
  const sync = () => {
    code.innerHTML = hl(ta.value);
    pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft;
  };
  ta.addEventListener('input', () => {
    sync();
    scheduleCommit(() => {
      pushHistory();
      n.body = ta.value;
      scanDiverts(n);
      n.labels = [];
      n.body.split('\n').forEach(l => { const m = l.match(RE_LABEL); if (m) n.labels.push(m[1]); });
      buildEdges();
      render();
      setDirty(true);
    }, 260);
  });
  ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); sync(); }
  });
  wrap.appendChild(pre); wrap.appendChild(ta);
  box.appendChild(wrap);
  window.InkblotsSyntaxHelp.attach(ta,code);

  const acts = el('div', 'side-actions');
  const mk = (label, fn) => { const b = ui('button', 'btn', label); b.onclick = fn; acts.appendChild(b); };
  mk('Add stitch', () => addStitch(n.kind === 'stitch' ? n.parent : n.id));
  mk('Duplicate', () => duplicateNode(n.id));
  if (n.kind !== 'start') mk('Delete', () => deleteSelectedNodes());
  mk('Focus', () => centerOn(n.id));
  box.appendChild(acts);
}

/* ------------------------------------------------------------ model edits */

function pushHistory() {
  State.history.push(JSON.stringify({ src: serialize(true).text, sel: State.sel, view: State.view }));
  if (State.history.length > 80) State.history.shift();
  State.future.length = 0;
}

function restore(snap) {
  const o = JSON.parse(snap);
  load(o.src, { keepView: true, keepHistory: true, dirty: true });
  State.sel = o.sel; State.view = o.view;
  applyTransform(); render(); renderInspector();
}

function undo() {
  if (!State.history.length) return;
  State.future.push(JSON.stringify({ src: serialize(true).text, sel: State.sel, view: State.view }));
  restore(State.history.pop());
  toast('Undone');
}
function redo() {
  if (!State.future.length) return;
  State.history.push(JSON.stringify({ src: serialize(true).text, sel: State.sel, view: State.view }));
  restore(State.future.pop());
}

function uniqueName(base) {
  let name = base.replace(/[^A-Za-z0-9_]/g, '_') || 'knot';
  if (/^\d/.test(name)) name = 'k' + name;
  let out = name, i = 2;
  while (State.nodes[out]) out = name + '_' + (i++);
  return out;
}

function addKnot(name, at) {
  pushHistory();
  const id = uniqueName(name || 'new_knot');
  const n = { id, name: id, kind: 'knot', header: '=== ' + id + ' ===', parent: null, body: '-> DONE', labels: [], diverts: [] };
  State.nodes[id] = n;
  State.order.push(id);
  State.layout[id] = at || screenToWorld(canvas.clientWidth / 2, canvas.clientHeight / 2);
  scanDiverts(n);
  buildEdges(); render(); select(id); setDirty(true);
  return id;
}

function addStitch(knotId) {
  if (!knotId || !State.nodes[knotId]) return;
  pushHistory();
  let base = 'part', i = 1;
  while (State.nodes[stitchId(knotId, base + i)]) i++;
  const name = base + i, id = stitchId(knotId, name);
  const n = { id, name, kind: 'stitch', header: '= ' + name, parent: knotId, body: '-> DONE', labels: [], diverts: [] };
  State.nodes[id] = n;
  // insert after the knot's last existing chunk
  let idx = State.order.indexOf(knotId);
  for (let j = idx + 1; j < State.order.length; j++) {
    if (State.nodes[State.order[j]].parent === knotId) idx = j; else break;
  }
  State.order.splice(idx + 1, 0, id);
  scanDiverts(n);
  const p = State.layout[knotId] || [0, 0];
  State.layout[id] = [p[0] + 300, p[1] + 60];
  buildEdges(); render(); select(id); setDirty(true);
}

function duplicateNode(id) {
  const src = State.nodes[id];
  if (!src || src.kind === 'start') return;
  pushHistory();
  const nid = uniqueName(src.name + '_copy');
  const n = Object.assign({}, src, { id: nid, name: nid, header: src.kind === 'stitch' ? '= ' + nid : '=== ' + nid + ' ===', _el: null });
  n.id = src.kind === 'stitch' ? stitchId(src.parent, nid) : nid;
  n.name = nid;
  State.nodes[n.id] = n;
  State.order.splice(State.order.indexOf(id) + 1, 0, n.id);
  const p = State.layout[id] || [0, 0];
  State.layout[n.id] = [p[0] + 40, p[1] + 40];
  scanDiverts(n); buildEdges(); render(); select(n.id); setDirty(true);
}

function deleteNode(id) { deleteNodes([id]); }
function deleteSelectedNodes() { deleteNodes(State.selection.length ? State.selection : [State.sel]); }
function deleteNodes(ids) {
  flushPendingEdit();
  const state=State,chosen=new Set(ids.filter(id=>State.nodes[id] && State.nodes[id].kind!=='start'));
  if(!chosen.size)return;
  const removed=new Set([...chosen,...State.order.filter(id=>chosen.has(State.nodes[id].parent))]);
  const refs=State.edges.filter(e=>removed.has(e.to) && !removed.has(e.from) && e.kind!=='flow').length;
  const names=[...removed].map(id=>State.nodes[id].name).join(', ');
  const warning=refs ? t(refs===1?'1 divert points here and will break.':'{count} diverts point here and will break.',{count:refs}) : '';
  ask(chosen.size===1?'Delete '+State.nodes[[...chosen][0]].name+'?':'Delete selected nodes?',names+(warning?'\n'+warning:''),null,ok=>{
    if(!ok || State!==state)return;
    pushHistory();for(const id of removed){delete State.nodes[id];delete State.layout[id];}
    State.order=State.order.filter(id=>!removed.has(id));State.sel=null;State.selection=[];
    for(const zone of State.organizer.zones||[])zone.members=zone.members.filter(id=>!removed.has(id));
    buildEdges();render();renderInspector();setDirty(true);
  },true);
}

function renameNode(id, newName) {
  const n = State.nodes[id];
  if (!n || !newName || newName === n.name) return;
  const clean = newName.replace(/[^A-Za-z0-9_]/g, '_');
  const newId = n.kind === 'stitch' ? stitchId(n.parent, clean) : clean;
  if (State.nodes[newId]) { toast('That name is taken'); renderInspector(); return; }
  pushHistory();
  const renamed = { [id]: newId };

  // rewrite every divert that resolved to this node
  for (const oid of State.order) {
    const o = State.nodes[oid];
    const lines = o.body.split('\n');
    let touched = false;
    (o.out || []).slice().reverse().forEach(out => {
      if (!out.res || out.res.id !== id || out.res.label) return;
      const d = o.diverts[out.idx];
      if (!d || d.s == null) return;
      const parts = d.target.split('.');
      const repl = parts.length > 1 ? parts.slice(0, -1).concat(clean).join('.') : clean;
      lines[d.line] = lines[d.line].slice(0, d.s) + repl + lines[d.line].slice(d.e);
      touched = true;
    });
    if (touched) { o.body = lines.join('\n'); scanDiverts(o); }
  }

  // move the node itself
  const oldOrder = State.order.slice();
  n.name = clean;
  n.header = n.kind === 'stitch' ? '= ' + clean + (n.args || '') : '=== ' + (n.kind === 'function' ? 'function ' : '') + clean + (n.args || '') + ' ===';
  delete State.nodes[id];
  State.nodes[newId] = n;
  n.id = newId;
  State.layout[newId] = State.layout[id]; delete State.layout[id];
  State.order = oldOrder.map(x => x === id ? newId : x);
  // stitches carry the knot name in their id
  if (n.kind !== 'stitch') {
    for (const sid of State.order.slice()) {
      const s = State.nodes[sid];
      if (s.parent === id) {
        const nsid = stitchId(newId, s.name);
        renamed[sid] = nsid;
        s.parent = newId; s.id = nsid;
        delete State.nodes[sid]; State.nodes[nsid] = s;
        State.layout[nsid] = State.layout[sid]; delete State.layout[sid];
        State.order[State.order.indexOf(sid)] = nsid;
      }
    }
  }
  State.sel = newId;
  State.selection = State.selection.map(x => renamed[x] || x);
  for (const zone of State.organizer?.zones || []) zone.members = zone.members.map(x => renamed[x] || x);
  buildEdges(); render(); renderInspector(); setDirty(true);
}

function retarget(nodeId, idx, newTarget) {
  const n = State.nodes[nodeId];
  const d = n.diverts[idx];
  if (!d || d.s == null) return;
  pushHistory();
  const lines = n.body.split('\n');
  lines[d.line] = lines[d.line].slice(0, d.s) + newTarget + lines[d.line].slice(d.e);
  n.body = lines.join('\n');
  scanDiverts(n); buildEdges(); render();
  if (State.sel === nodeId) renderInspector();
  setDirty(true);
}

function addDivert(fromId, toId) {
  flushPendingEdit();
  const n = State.nodes[fromId];
  pushHistory();
  const target = divertName(n, toId);
  const hasChoices=window.inkChoiceView(n).rows.length>0;
  n.body = (n.body ? n.body.replace(/\s+$/, '') + '\n' : '') + (hasChoices ? '- ' : '') + '-> ' + target;
  scanDiverts(n); buildEdges(); render();
  if (State.sel === fromId) renderInspector();
  setDirty(true);
  toast('Added -> ' + target);
}

function updateBody(id,body,refresh=true) {
  const n=State.nodes[id];if(!n)return;
  n.body=body;scanDiverts(n);n.labels=[];
  State.globals=new Set(State.order.flatMap(k=>[...State.nodes[k].body.matchAll(/^\s*(?:VAR|CONST|LIST|~\s*temp)\s+([A-Za-z_]\w*)/gm)].map(m=>m[1])));
  body.split('\n').forEach(l=>{const m=l.match(RE_LABEL);if(m)n.labels.push(m[1]);});
  buildEdges();if(refresh)render();setDirty(true);
}

function addChoice(nodeId) {
  flushPendingEdit();
  const n=State.nodes[nodeId];if(!n)return;
  pushHistory();
  const lines=n.body.split('\n'), rows=window.inkChoiceView(n).rows;
  let at=lines.length;
  if(rows.length){
    const last=rows[rows.length-1].line;
    const gather=lines.findIndex((line,i)=>i>last && /^\s*-(?!-|>)(?:\s|$)/.test(line));
    if(gather>=0)at=gather;
  } else {
    // Keep the existing terminal flow separate from the new choice branch.
    while(at>0 && !lines[at-1].trim())at--;
    if(at>0 && /^\s*->/.test(lines[at-1])){at--;lines.splice(at,0,'-');}
  }
  const label=t('New choice');
  lines.splice(at,0,'+ ['+label+']','    -> DONE');n.body=lines.join('\n');
  scanDiverts(n);buildEdges();render();select(nodeId);setDirty(true);
  const editor=$('#side-body textarea'),start=lines.slice(0,at).join('\n').length+(at?1:0)+3;
  editor.focus();editor.setSelectionRange(start,start+label.length);
}

function divertName(fromNode, toId) {
  const to = State.nodes[toId];
  if (!to) return toId;
  if (to.kind === 'stitch') {
    const fromKnot = fromNode.kind === 'stitch' ? fromNode.parent : fromNode.id;
    return to.parent === fromKnot ? to.name : to.id;
  }
  return to.name;
}

/* --------------------------------------------------------------- layout */

function autoLayout(silent) {
  const depth = {};
  const roots = State.order.filter(id => !State.edges.some(e => e.to === id && e.from !== id));
  const queue = (roots.length ? roots : [State.order[0]]).slice();
  queue.forEach(id => depth[id] = 0);
  while (queue.length) {
    const id = queue.shift();
    for (const e of State.edges) {
      if (e.from !== id || e.to === id) continue;
      if (depth[e.to] == null) { depth[e.to] = depth[id] + 1; queue.push(e.to); }
    }
  }
  let maxD = 0;
  for (const k in depth) maxD = Math.max(maxD, depth[k]);
  State.order.forEach(id => { if (depth[id] == null) depth[id] = maxD + 1; });

  const cols = {};
  State.order.forEach(id => { (cols[depth[id]] = cols[depth[id]] || []).push(id); });
  Object.keys(cols).forEach(d => {
    let y = 40;
    cols[d].forEach(id => {
      const h = (State.nodes[id]._el && State.nodes[id]._el.offsetHeight) || 150;
      State.layout[id] = [80 + Number(d) * 330, y];
      y += h + 34;
    });
  });
  if (!silent) { render(); fitView(); setDirty(true); toast('Layout tidied'); }
}

function bbox() {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  nodesEl.querySelectorAll('.node').forEach(d => {
    const p = State.layout[d.dataset.id] || [0, 0];
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]);
    x1 = Math.max(x1, p[0] + d.offsetWidth); y1 = Math.max(y1, p[1] + d.offsetHeight);
  });
  for (const item of [...(State.organizer?.zones || []), ...(State.organizer?.notes || [])]) {
    if (![item.x,item.y,item.w,item.h].every(Number.isFinite)) continue;
    x0 = Math.min(x0,item.x); y0 = Math.min(y0,item.y);
    x1 = Math.max(x1,item.x+item.w); y1 = Math.max(y1,item.y+item.h);
  }
  document.querySelectorAll('.variable-card').forEach(d=>{const x=parseFloat(d.style.left),y=parseFloat(d.style.top);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+d.offsetWidth);y1=Math.max(y1,y+d.offsetHeight);});
  if (x0 === Infinity) return null;
  return { x0, y0, x1, y1 };
}

function fitView() {
  requestAnimationFrame(() => {
    const b = bbox();
    if (!b) return;
    const pad = 60;
    const kw = (canvas.clientWidth - pad * 2) / Math.max(1, b.x1 - b.x0);
    const kh = (canvas.clientHeight - pad * 2) / Math.max(1, b.y1 - b.y0);
    const k = Math.max(0.2, Math.min(1.1, Math.min(kw, kh)));
    State.view.k = k;
    State.view.x = pad - b.x0 * k + Math.max(0, (canvas.clientWidth - pad * 2 - (b.x1 - b.x0) * k) / 2);
    State.view.y = pad - b.y0 * k;
    applyTransform();
  });
}

function centerOn(id) {
  const p = State.layout[id]; if (!p) return;
  State.view.k = Math.max(State.view.k, 0.8);
  State.view.x = canvas.clientWidth / 2 - (p[0] + 120) * State.view.k;
  State.view.y = canvas.clientHeight / 2 - (p[1] + 60) * State.view.k;
  applyTransform();
}

function screenToWorld(sx, sy) {
  const r = canvas.getBoundingClientRect();
  return [(sx - r.left - State.view.x) / State.view.k, (sy - r.top - State.view.y) / State.view.k];
}

/* ---------------------------------------------------------- interactions */

function select(id) {
  State.sel = id;
  if (!State.selection.includes(id)) State.selection = id ? [id] : [];
  nodesEl.querySelectorAll('.node').forEach(d => d.classList.toggle('sel', State.selection.includes(d.dataset.id)));
  renderInspector();
  window.dispatchEvent(new Event('inkblots-selection'));
}

let drag = null, link = null, pan = null;

canvas.addEventListener('mousedown', (ev) => {
  if (!Tabs.length) return;
  if (ev.button !== 0 && ev.button !== 1) return;
  if (ev.target.closest('textarea,input,button,.choice-inlet,.variable-card,.addchoice, .zone, .sticky-note, #minimap, #quick-ink, #selection-actions, .comment-badge')) return;
  const pill = ev.target.closest('.pill[data-idx]');
  const add = ev.target.closest('.addout');
  const node = ev.target.closest('.node');

  if (add && node) { startLink(node.dataset.id, -1, ev); return; }
  if (pill && node) {
    if (pill.classList.contains('term') && (!pill.classList.contains('choice-port') || !State.nodes[node.dataset.id].diverts[Number(pill.dataset.idx)]?.target)) return;
    startLink(node.dataset.id, Number(pill.dataset.idx), ev);
    return;
  }
  if (node) {
    select(node.dataset.id);
    if (ev.target.closest('.head') || ev.target.closest('.prose')) {
      const p = State.layout[node.dataset.id] || [0, 0];
      const w = screenToWorld(ev.clientX, ev.clientY);
      drag = { id: node.dataset.id, dx: w[0] - p[0], dy: w[1] - p[1], moved: false };
      drag.start = w;
      drag.origins = State.selection.filter(id => State.layout[id]).map(id => [id, State.layout[id].slice()]);
      ev.preventDefault();
    }
    return;
  }
  if (ev.button === 0 || ev.button === 1) {
    select(null);
    pan = { x: ev.clientX, y: ev.clientY, vx: State.view.x, vy: State.view.y };
    canvas.classList.add('panning');
  }
});

window.addEventListener('mousemove', (ev) => {
  if (drag) {
    const w = screenToWorld(ev.clientX, ev.clientY);
    if (!drag.moved) pushHistory();
    for (const [id, origin] of drag.origins) {
      State.layout[id] = [Math.round(origin[0] + w[0] - drag.start[0]), Math.round(origin[1] + w[1] - drag.start[1])];
      const node = State.nodes[id]._el;
      if (node) { node.style.left = State.layout[id][0] + 'px'; node.style.top = State.layout[id][1] + 'px'; }
    }
    drag.moved = true;
    drawEdges();
    window.dispatchEvent(new Event('inkblots-view'));
  } else if (link) {
    const w = screenToWorld(ev.clientX, ev.clientY);
    link.path.setAttribute('d', path(link.a, w));
    const over = document.elementFromPoint(ev.clientX, ev.clientY);
    const node = over && over.closest ? over.closest('.node') : null;
    nodesEl.querySelectorAll('.node').forEach(d => d.classList.toggle('droptarget', d === node && d.dataset.id !== link.from));
  } else if (pan) {
    State.view.x = pan.vx + (ev.clientX - pan.x);
    State.view.y = pan.vy + (ev.clientY - pan.y);
    applyTransform();
  }
});

window.addEventListener('mouseup', (ev) => {
  if (drag) { if (drag.moved) setDirty(true); drag = null; }
  if (link) {
    const over = document.elementFromPoint(ev.clientX, ev.clientY);
    const node = over && over.closest ? over.closest('.node') : null;
    nodesEl.querySelectorAll('.node').forEach(d => d.classList.remove('droptarget'));
    link.path.remove();
    const target = node && node.dataset.id;
    if (target && target !== link.from) {
      const row=over.closest('.choice-row');
      if(row && window.InkblotsVariables){window.InkblotsVariables.connectFlow(link.from,link.idx,target,Number(row.dataset.line));}
      else if (link.idx >= 0) retarget(link.from, link.idx, divertName(State.nodes[link.from], target));
      else addDivert(link.from, target);
    } else if (!node) {
      const w = screenToWorld(ev.clientX, ev.clientY);
      const src = link;
      ask('New knot', 'Name the knot this divert points to.', 'new_knot', (name) => {
        if (!name) return;
        const id = addKnot(name, [Math.round(w[0]) - 120, Math.round(w[1]) - 40]);
        if (src.idx >= 0) retarget(src.from, src.idx, id); else addDivert(src.from, id);
      });
    }
    link = null;
  }
  if (pan) { pan = null; canvas.classList.remove('panning'); }
});

function startLink(from, idx, ev) {
  const a = anchorFor(from, idx);
  if (!a) return;
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('class', 'e-temp');
  egroup.appendChild(p);
  link = { from, idx, a, path: p };
  ev.preventDefault(); ev.stopPropagation();
}

canvas.addEventListener('click', (ev) => {
  const pill = ev.target.closest('.pill[data-idx]');
  if (pill && pill.classList.contains('broken')) {
    const node = pill.closest('.node');
    const raw = State.nodes[node.dataset.id].out.find(o=>o.idx===Number(pill.dataset.idx)).raw;
    ask('Create ' + raw + '?', 'No knot with that name exists yet.', raw, (name) => {
      if (!name) return;
      const p = State.layout[node.dataset.id] || [0, 0];
      addKnot(name, [p[0] + 330, p[1] + 40]);
    });
  }
});

canvas.addEventListener('dblclick', (ev) => {
  if (!Tabs.length) return;
  if (ev.target.closest('.node')) { return; }
  if (ev.target.closest('textarea,input,button,.choice-inlet,.variable-card,.addchoice, .zone, .sticky-note, #minimap, #quick-ink, #selection-actions')) return;
  const w = screenToWorld(ev.clientX, ev.clientY);
  ask('New knot', 'Knots are the chapters of an Ink script.', 'new_knot', (name) => {
    if (name) addKnot(name, [Math.round(w[0]) - 120, Math.round(w[1]) - 40]);
  });
});

canvas.addEventListener('wheel', (ev) => {
  if (ev.target.closest('.sticky-note, #quick-ink')) return;
  ev.preventDefault();
  const r = canvas.getBoundingClientRect();
  const mx = ev.clientX - r.left, my = ev.clientY - r.top;
  if (ev.shiftKey) { State.view.x -= ev.deltaY; applyTransform(); return; }
  zoomAt(mx, my, Math.exp(-ev.deltaY * 0.0016));
}, { passive: false });

function zoomAt(mx, my, factor) {
  const v = State.view;
  const k = Math.max(0.15, Math.min(2.4, v.k * factor));
  v.x = mx - (mx - v.x) * (k / v.k);
  v.y = my - (my - v.y) * (k / v.k);
  v.k = k;
  applyTransform();
}

/* ------------------------------------------------------------- modal/toast */

let modalCb = null;
function ask(title, desc, value, cb, confirmOnly, okLabel = 'OK') {
  if (typeof document !== 'undefined') document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  // Settle a replaced confirmation so its caller never waits indefinitely.
  if (modalCb) closeModal(false);
  uiText('#m-ok', okLabel);
  uiText('#m-title', title);
  uiText('#m-desc', desc || '');
  const input = $('#m-input');
  input.style.display = confirmOnly ? 'none' : '';
  input.value = value || '';
  modalCb = { cb, confirmOnly };
  $('#scrim').classList.add('open');
  if (!confirmOnly) setTimeout(() => { input.focus(); input.select(); }, 20);
}
function confirmWindowClose() {
  flushPendingEdit();
  const dirtyTabs = Tabs.filter(t => t.dirty);
  if (!dirtyTabs.length) return Promise.resolve(true);
  const title = dirtyTabs.length === 1 ? 'Close ' + dirtyTabs[0].fileName + '?' : 'Close Inkblots?';
  const desc = dirtyTabs.length === 1
    ? 'This file has unsaved changes that will be lost.'
    : 'These ' + dirtyTabs.length + ' files have unsaved changes that will be lost: ' + dirtyTabs.map(t => t.fileName).join(', ');
  return new Promise(resolve => {
    ask(title, desc, null, resolve, true, "Don't Save");
    $('#m-cancel').focus();
  });
}
function closeModal(send) {
  const m = modalCb; modalCb = null;
  $('#scrim').classList.remove('open');
  if (m && send) m.cb(m.confirmOnly ? true : $('#m-input').value.trim());
  else if (m && m.confirmOnly) m.cb(false);
}
$('#m-ok').onclick = () => closeModal(true);
$('#m-cancel').onclick = () => closeModal(false);
$('#m-input').addEventListener('keydown', e => { if (e.key === 'Enter') closeModal(true); if (e.key === 'Escape') closeModal(false); });

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  I.bind(t, msg); t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ------------------------------------------------------------- file I/O */

// "New" and "Open" now only ever ADD a tab, never discard one — the
// destructive confirm dialogs they used to need are gone along with the risk.
function newFile() {
  addTab(BLANK_DOC, { name: nextUntitledName() });
}

async function openFile() {
  if (NATIVE) {
    const files = await NATIVE.open();       // native dialog allows multi-select; returns an array or null
    if (!files || !files.length) return;
    openFilesInTabs(files);
  } else {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.ink,.txt,text/plain'; inp.multiple = true;
    inp.onchange = async () => {
      const list = Array.from(inp.files || []);
      if (!list.length) return;
      const files = await Promise.all(list.map(async f => ({ name: f.name, content: await f.text() })));
      openFilesInTabs(files);
    };
    inp.click();
  }
}

async function saveFile(forceDialog) {
  if (!Tabs.length) return;
  flushPendingEdit();
  const { text } = serialize(true);
  if (NATIVE) {
    let p = State.filePath;
    if (!p || forceDialog) p = await NATIVE.saveDialog(State.fileName);
    if (!p) return;
    await NATIVE.write(p, text);
    State.filePath = p;
    State.fileName = p.split(/[\\/]/).pop();
    setDirty(false);
    toast('Saved ' + State.fileName);
    return;
  }
  // browser build
  try {
    if (window.claude && window.claude.use) {
      const dl = await window.claude.use('downloads');
      if (dl) { await dl.save({ filename: State.fileName, data: text }); setDirty(false); toast('Saved'); return; }
    }
  } catch (e) {}
  if (window.showSaveFilePicker) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: State.fileName, types: [{ description: t('Ink script'), accept: { 'text/plain': ['.ink'] } }] });
      const w = await h.createWritable(); await w.write(text); await w.close();
      State.fileName = h.name; setDirty(false); toast('Saved ' + h.name); return;
    } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = State.fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  setDirty(false);
}

/* --------------------------------------------------------- compile & play */

function fileHandler() {
  if (!NATIVE || !State.filePath) return null;
  return {
    ResolveInkFilename: (f) => f,
    LoadInkFileContents: (f) => NATIVE.readRelative(State.filePath, f),
  };
}

function compile() {
  const { text, lineMap } = serialize(false);
  const problems = [];
  let story = null;
  if (!window.inkjs || !window.inkjs.Compiler) {
    problems.push({ msg: 'The Ink compiler did not load, so Play is unavailable.', type: 'ERROR' });
    return { story, problems, lineMap };
  }
  const handler = (msg, type) => problems.push({ msg: String(msg), type: String(type) });
  try {
    let c;
    try {
      const opts = new inkjs.CompilerOptions(null, [], false, handler, fileHandler());
      c = new inkjs.Compiler(text, opts);
    } catch (e) { c = new inkjs.Compiler(text); }
    story = c.Compile();
  } catch (e) {
    if (!problems.length) problems.push({ msg: String((e && e.message) || e), type: 'ERROR' });
  }
  State.problems = problems.map(p => {
    const m = p.msg.match(/line (\d+)/i);
    let nodeId = null;
    if (m) { const ln = Number(m[1]); const hit = lineMap.find(r => ln >= r.start && ln <= r.end); if (hit) nodeId = hit.id; }
    const warn = /warning|todo/i.test(p.msg) || /warning|todo/i.test(p.type);
    return { msg: p.msg, nodeId, warn };
  });
  return { story, problems: State.problems, lineMap };
}

function renderProblems() {
  const box = $('#err-list');
  box.textContent = '';
  if (!State.problems.length) { box.appendChild(ui('div', 'side-empty', 'No problems. The script compiles.')); return; }
  State.problems.forEach(p => {
    const d = el('div', 'err' + (p.warn ? ' warn' : ''));
    const message = p.msg.replace(/^(ERROR|WARNING|TODO):\s*/i, '');
    d.appendChild(message === 'The Ink compiler did not load, so Play is unavailable.' ? ui('div', null, message) : el('div', null, message));
    if (p.nodeId) {
      d.appendChild(ui('div', 'where', 'in ' + p.nodeId));
      d.onclick = () => { select(p.nodeId); centerOn(p.nodeId); };
    }
    box.appendChild(d);
  });
  $('#errors').classList.add('open');
}

let story = null;
function startPlay(fromId) {
  const r = compile();
  const hasError = State.problems.some(p => !p.warn);
  if (hasError || !r.story) { renderProblems(); $('#play').classList.remove('open'); return; }
  if (State.problems.length) renderProblems(); else $('#errors').classList.remove('open');
  story = r.story;
  $('#play').classList.add('open');
  $('#play-text').textContent = '';
  uiText('#play-from', fromId && fromId !== START_ID ? 'from ' + fromId : '');
  $('#play').dataset.from = fromId || '';
  if (fromId && fromId !== START_ID) {
    try { story.ChoosePathString(fromId); } catch (e) { toast('Cannot start at ' + fromId); }
  }
  step();
}

function step() {
  const out = $('#play-text'), ch = $('#play-choices'), endBox = $('#play-end');
  ch.textContent = ''; I.bind(endBox,'');
  try {
    while (story.canContinue) {
      const line = story.Continue();
      if (line.trim()) {
        const p = el('p', null, line.trim());
        const tags = story.currentTags;
        if (tags && tags.length) { const t = el('span', 'tags', '  #' + tags.join(' #')); p.appendChild(t); }
        out.appendChild(p);
      }
    }
    if (story.currentChoices.length) {
      story.currentChoices.forEach(c => {
        const b = el('button', null, c.text);
        b.onclick = () => {
          out.appendChild(el('p', null, '› ' + c.text)).style.opacity = .55;
          story.ChooseChoiceIndex(c.index);
          step();
        };
        ch.appendChild(b);
      });
    } else {
      I.bind(endBox, 'End of story.');
    }
  } catch (e) {
    I.bind(endBox, 'Runtime error: ' + ((e && e.message) || e));
  }
  out.scrollTop = out.scrollHeight;
}

/* ------------------------------------------------------------- source view */

function openSource() {
  $('#srctext').value = serialize(false).text;
  $('#source-view').classList.add('open');
  $('#b-source').setAttribute('aria-pressed', 'true');
}
function closeSource() {
  $('#source-view').classList.remove('open');
  $('#b-source').setAttribute('aria-pressed', 'false');
}


/* --------------------------------------------------- Ink menu & snippets */

const SNIPPETS = window.INK_SNIPPETS || [];
const KIND_HINT = { text: 'at cursor', globals: 'globals', nodes: 'new knots', stitch: 'new stitch', story: 'opens new tab' };

function snippetById(id) {
  for (const g of SNIPPETS) for (const it of g.items) if (it.id === id) return it;
  return null;
}

function buildInkMenu() {
  const root = $('#inkmenu');
  root.textContent = '';
  SNIPPETS.forEach((g) => {
    if (g.label === 'Full stories') root.appendChild(el('div', 'menu-sep'));
    const row = el('div', 'menu-row');
    row.appendChild(ui('span', null, g.label));
    row.appendChild(el('span', 'arrow', '\u25B6'));
    const sub = el('div', 'submenu');
    g.items.forEach(it => {
      const r = el('div', 'menu-row');
      r.appendChild(ui('span', null, it.label));
      if (KIND_HINT[it.kind]) r.appendChild(ui('span', 'hint', KIND_HINT[it.kind]));
      r.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); cancelInkTooltip(); closeInkMenu(); applySnippet(it); });
      r.addEventListener('mouseenter', (e) => scheduleInkTooltip(it, e.clientX, e.clientY));
      r.addEventListener('mousemove', (e) => { inkTipX = e.clientX; inkTipY = e.clientY; });
      r.addEventListener('mouseleave', cancelInkTooltip);
      r.addEventListener('focus', () => { const rect = r.getBoundingClientRect(); scheduleInkTooltip(it, rect.right, rect.top); });
      r.addEventListener('blur', cancelInkTooltip);
      sub.appendChild(r);
    });
    row.appendChild(sub);
    row.addEventListener('mouseenter', () => {
      cancelInkTooltip();
      root.querySelectorAll('.submenu').forEach(x => x.classList.remove('open'));
      root.querySelectorAll('.menu-row.on').forEach(x => x.classList.remove('on'));
      sub.classList.add('open'); row.classList.add('on');
      sub.style.top = '-5px';
      const r = sub.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 12) sub.style.top = Math.min(-5, -5 - (r.bottom - window.innerHeight + 12)) + 'px';
    });
    root.appendChild(row);
  });
}

// a short hover over a snippet shows what it does, positioned by the cursor
let inkTipTimer = null, inkTipX = 0, inkTipY = 0;
function scheduleInkTooltip(it, x, y) {
  inkTipX = x; inkTipY = y;
  clearTimeout(inkTipTimer);
  if (!it.desc) return;
  inkTipTimer = setTimeout(() => showInkTooltip(it.desc, inkTipX, inkTipY), 500);
}
function cancelInkTooltip() {
  clearTimeout(inkTipTimer);
  const tip = $('#ink-tooltip');
  if (tip) tip.classList.remove('show');
}
function showInkTooltip(text, x, y) {
  const tip = $('#ink-tooltip');
  if (!tip) return;
  I.bind(tip, text);
  tip.style.left = '-9999px'; tip.style.top = '-9999px';
  tip.classList.add('show');
  const pad = 12, w = tip.offsetWidth, h = tip.offsetHeight;
  let left = x + 16, top = y + 20;
  if (left + w > window.innerWidth - pad) left = x - w - 16;
  if (top + h > window.innerHeight - pad) top = y - h - 12;
  tip.style.left = Math.max(pad, left) + 'px';
  tip.style.top = Math.max(pad, top) + 'px';
}

function openInkMenu() { $('#inkmenu').classList.add('open'); $('#b-ink').setAttribute('aria-expanded', 'true'); }
function closeInkMenu() {
  const m = $('#inkmenu');
  m.classList.remove('open');
  m.querySelectorAll('.submenu').forEach(x => x.classList.remove('open'));
  m.querySelectorAll('.menu-row.on').forEach(x => x.classList.remove('on'));
  $('#b-ink').setAttribute('aria-expanded', 'false');
  cancelInkTooltip();
}

function applySnippet(it) {
  if (!it) return;
  if (it.kind === 'text') return insertSnippetText(it.text);
  if (it.kind === 'globals') return insertGlobals(it.text, true);
  if (it.kind === 'stitch') {
    const n = State.nodes[State.sel];
    if (!n) return toast('Select a knot first');
    return addStitch(n.kind === 'stitch' ? n.parent : n.id);
  }
  if (it.kind === 'nodes') return insertNodes(it);
  if (it.kind === 'story') {
    addTab(it.text, { name: nextUntitledName() });
    toast('Loaded ' + t(it.label));
    return;
  }
}

// $0placeholder$0 arrives selected, so the first thing typed replaces it
// @knot stands in for a real knot in this story, so declarations compile as inserted
function firstKnotName() {
  const id = State.order.find(i => State.nodes[i].kind === 'knot');
  return id || 'knot_name';
}

function markers(tpl) {
  tpl = tpl.split('@knot').join(firstKnotName());
  const parts = tpl.split('$0');
  const text = parts.join('');
  if (parts.length >= 3) return { text, start: parts[0].length, end: parts[0].length + parts[1].length };
  if (parts.length === 2) return { text, start: parts[0].length, end: parts[0].length };
  return { text, start: text.length, end: text.length };
}

// text goes in at the cursor, matching the indentation of the line it lands on
function insertSnippetText(tpl) {
  if (!State.sel || !State.nodes[State.sel]) {
    const id = State.order.find(i => State.nodes[i].kind !== 'start') || State.order[0];
    if (!id) return toast('Make a knot first');
    select(id);
  }
  const ta = $('#side textarea');
  if (!ta) return;
  const v = ta.value;
  const pos = ta.selectionStart == null ? v.length : ta.selectionStart;
  let at = v.indexOf('\n', pos);
  if (at < 0) at = v.length;
  const lineStart = v.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  const indent = (v.slice(lineStart).match(/^[ \t]*/) || [''])[0];
  const indented = tpl.split('\n').map((l, i) => (i === 0 || !l ? l : indent + l)).join('\n');
  const r = markers(indented);
  const pre = v.slice(0, at), post = v.slice(at);
  const nl = pre.trim() ? '\n' + indent : '';
  ta.value = pre + nl + r.text + post;
  const base = pre.length + nl.length;
  ta.focus();
  ta.setSelectionRange(base + r.start, base + r.end);
  ta.dispatchEvent(new Event('input'));
}

// declarations belong at the top of the file, under any that are already there
function insertGlobals(tpl, focus) {
  const g = State.nodes[START_ID];
  if (!g) return;
  const r = markers(tpl);
  const text = r.text;
  if (g.body.split('\n').some(l => l.trim() === text.trim())) { toast('That declaration is already there'); return; }
  pushHistory();
  const lines = g.body ? g.body.split('\n') : [];
  let idx = -1;
  lines.forEach((l, i) => { if (/^\s*(VAR|CONST|LIST|EXTERNAL|INCLUDE)\b/.test(l)) idx = i; });
  lines.splice(idx + 1, 0, text);
  g.body = lines.join('\n');
  g.labels = [];
  scanDiverts(g);
  if (!State.layout[START_ID]) placeNew([START_ID]);
  buildEdges();
  render();
  setDirty(true);
  if (focus) {
    select(START_ID);
    const ta = $('#side textarea');
    if (ta) {
      const i = ta.value.indexOf(text);
      ta.focus();
      if (i < 0) ta.setSelectionRange(ta.value.length, ta.value.length);
      else ta.setSelectionRange(i + r.start, i + r.end);
    }
    toast('Added to story globals');
  }
}

// structures arrive as real cards, already wired to the selected knot
function insertNodes(spec) {
  pushHistory();
  const from = State.sel && State.nodes[State.sel] ? State.nodes[State.sel] : null;
  const anchor = from && State.layout[from.id]
    ? State.layout[from.id]
    : screenToWorld(canvas.clientWidth / 2 - 180, canvas.clientHeight / 2 - 120).map(Math.round);

  const names = spec.nodes.map(nd => {
    const id = uniqueName(nd.name);
    State.nodes[id] = { id, name: id, kind: 'placeholder' };  // reserve the name
    return id;
  });

  spec.nodes.forEach((nd, i) => {
    const id = names[i];
    const body = String(nd.body || '').replace(/@(\d+)/g, (m, d) => names[Number(d)] || m).split('$0').join('');
    const kind = nd.kind === 'function' ? 'function' : 'knot';
    const n = {
      id, name: id, kind, args: nd.args || '', parent: null, body,
      header: '=== ' + (kind === 'function' ? 'function ' : '') + id + (nd.args || '') + ' ===',
      labels: [], diverts: [],
    };
    n.body.split('\n').forEach(l => { const m = l.match(RE_LABEL); if (m) n.labels.push(m[1]); });
    scanDiverts(n);
    State.nodes[id] = n;
    State.order.push(id);
    State.layout[id] = i === 0
      ? [anchor[0] + 330, anchor[1]]
      : [anchor[0] + 660, anchor[1] + (i - 1) * 200];
  });

  if (spec.globals) insertGlobals(spec.globals, false);

  if (from && spec.links && spec.links.length) {
    const added = spec.links.map(l => (l.choice ? '+ [' + l.label + '] -> ' : '-> ') + names[l.to]);
    from.body = (from.body ? from.body.replace(/\s+$/, '') + '\n' : '') + added.join('\n');
    scanDiverts(from);
  }

  buildEdges();
  render();
  select(names[0]);
  setDirty(true);
  toast(names.length > 1 ? 'Added ' + names.length + ' knots' : 'Added ' + names[0]);
}

/* ----------------------------------------------------------------- wiring */

buildInkMenu();
$('#b-ink').addEventListener('mousedown', (e) => {
  e.preventDefault(); e.stopPropagation();
  $('#inkmenu').classList.contains('open') ? closeInkMenu() : openInkMenu();
});
window.addEventListener('mousedown', (e) => { if (!e.target.closest('.menu-anchor')) closeInkMenu(); });

$('#b-open').onclick = openFile;
$('#empty-open').onclick = openFile;
$('#empty-new').onclick = newFile;
$('#empty-close').onclick = () => {
  if (NATIVE && NATIVE.closeWindow) NATIVE.closeWindow();
  else window.close();
};
$('#b-save').onclick = () => saveFile(false);
$('#b-new').onclick = newFile;
$('#b-addknot').onclick = () => ask('New knot', 'Knots are the chapters of an Ink script.', 'new_knot', n => { if (n) addKnot(n); });
$('#b-layout').onclick = () => { pushHistory(); autoLayout(false); };
$('#b-play').onclick = () => startPlay(null);
$('#b-restart').onclick = () => startPlay($('#play').dataset.from || null);
$('#b-playclose').onclick = () => $('#play').classList.remove('open');
$('#b-errclose').onclick = () => $('#errors').classList.remove('open');
$('#b-zoomin').onclick = () => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.2);
$('#b-zoomout').onclick = () => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1 / 1.2);
$('#b-zoomfit').onclick = fitView;
$('#b-source').onclick = () => $('#source-view').classList.contains('open') ? closeSource() : openSource();
$('#b-srcclose').onclick = closeSource;
$('#b-srcapply').onclick = () => { pushHistory(); load($('#srctext').value, { keepView: true, keepHistory: true, keepOrganizer: true, dirty: true }); closeSource(); toast('Graph rebuilt'); };
$('#search').addEventListener('input', e => { filterText = e.target.value; applyFilter(); });

$('#b-theme').onclick = () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('inkblots-theme', next); } catch (e) {}
};
try { const t = localStorage.getItem('inkblots-theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}

window.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
  const mod = e.metaKey || e.ctrlKey;
  if (!Tabs.length) {
    if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); openFile(); }
    else if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); newFile(); }
    return;
  }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(e.shiftKey); }
  else if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); openFile(); }
  else if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); $('#search').focus(); }
  else if (mod && e.key === 'Enter') { e.preventDefault(); startPlay(State.sel); }
  else if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey && !typing) { e.preventDefault(); undo(); }
  else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) && !typing) { e.preventDefault(); redo(); }
  else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && State.sel) { e.preventDefault(); deleteSelectedNodes(); }
  else if (e.key === 'Escape') { closeModal(false); closeSource(); closeInkMenu(); }
});

// dragging the strip at the sidebar's left edge resizes it; width persists
// across reloads, and gets re-clamped if the window becomes too narrow for it
function sideWidthBounds() {
  return { min: 280, max: Math.max(280, window.innerWidth - 360) };
}
function clampSideWidth() {
  const side = $('#side');
  if (!side) return;
  const { min, max } = sideWidthBounds();
  const cur = side.getBoundingClientRect().width;
  const clamped = Math.max(min, Math.min(max, cur));
  if (Math.abs(clamped - cur) > 1) side.style.width = clamped + 'px';
}
(function setupSideResize() {
  const handle = $('#side-resize'), side = $('#side');
  if (!handle || !side) return;
  try {
    const saved = localStorage.getItem('inkblots-side-width');
    if (saved) side.style.width = saved;
  } catch (e) {}
  clampSideWidth();

  let dragging = false, startX = 0, startW = 0;
  handle.addEventListener('mousedown', (e) => {
    dragging = true; startX = e.clientX; startW = side.getBoundingClientRect().width;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const { min, max } = sideWidthBounds();
    side.style.width = Math.max(min, Math.min(max, startW - (e.clientX - startX))) + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    try { localStorage.setItem('inkblots-side-width', side.style.width); } catch (e) {}
  });
})();

window.addEventListener('resize', () => { drawEdges(); clampSideWidth(); });
window.addEventListener('beforeunload', (e) => {
  flushPendingEdit();
  // A real browser shows its own "leave site?" dialog when preventDefault()
  // is called here. Electron does not — it just silently blocks the window
  // from closing, with nothing telling the person why the close button
  // stopped responding. main.js's own 'close' handler asks first and shows
  // an actual dialog, so this guard only needs to do anything in the plain
  // browser build, where that's the only mechanism available at all.
  if (NATIVE) return;
  if (Tabs.some(t => t.dirty)) { e.preventDefault(); e.returnValue = ''; }
});

// dropping .ink/.txt files onto the window opens each in its own tab,
// exactly like picking several files from the native Open dialog
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; canvas.classList.add('dropready'); });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) canvas.classList.remove('dropready');
});
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragDepth = 0;
  canvas.classList.remove('dropready');
  const dropped = Array.from((e.dataTransfer && e.dataTransfer.files) || []).filter(f => /\.(ink|txt)$/i.test(f.name));
  if (!dropped.length) return;
  // Electron gives dropped files a real .path, so they land with Save already wired to disk
  const files = await Promise.all(dropped.map(async f => ({ name: f.name, content: await f.text(), path: f.path || null })));
  openFilesInTabs(files);
});

if (NATIVE && NATIVE.onMenu) {
  NATIVE.onMenu((cmd, arg) => {
    if (!Tabs.length && !['new', 'open', 'openPaths'].includes(cmd)) return;
    if (cmd === 'new') newFile();
    else if (cmd === 'open') openFile();
    else if (cmd === 'save') saveFile(false);
    else if (cmd === 'saveAs') saveFile(true);
    else if (cmd === 'play') startPlay(null);
    else if (cmd === 'layout') { pushHistory(); autoLayout(false); }
    else if (cmd === 'source') openSource();
    else if (cmd === 'snippet') applySnippet(snippetById(arg));
    else if (cmd === 'closeTab') closeTab(activeTab);
    else if (cmd === 'nextTab') switchTab((activeTab + 1) % Tabs.length);
    else if (cmd === 'prevTab') switchTab((activeTab - 1 + Tabs.length) % Tabs.length);
    else if (cmd === 'openPaths' && Array.isArray(arg)) openFilesInTabs(arg);
  });
}

/* ------------------------------------------------------------------- boot */

// browser-build safety net only (Electron users have real files on disk).
// Saves every open tab, not just the active one, so a refresh doesn't cost
// you the other tabs you had open.
function autosaveTick() {
  if (NATIVE) return;
  if (!Tabs.some(t => t.dirty)) return;
  flushPendingEdit();
  try {
    localStorage.setItem('inkblots-autosave', JSON.stringify({
      active: activeTab,
      tabs: Tabs.map(t => ({ name: t.fileName, dirty: t.dirty, src: serialize(true, t).text })),
    }));
  } catch (e) {}
}

function boot() {
  let restored = false;
  try {
    const cached = !NATIVE && localStorage.getItem('inkblots-autosave');
    if (cached) {
      const o = JSON.parse(cached);
      if (o && Array.isArray(o.tabs) && o.tabs.length) {
        Tabs = [];
        o.tabs.forEach(t => addTab(t.src, { name: t.name, dirty: !!t.dirty }));
        activateTab(Math.min(o.active || 0, Tabs.length - 1));
        refreshChrome();
        restored = true;
      }
    }
  } catch (e) {}
  // `Tabs`/`State` already hold a placeholder tab from module init (so the
  // rest of the file always has a valid `State` to reference) — reuse it
  // here rather than adding a second one on top of it.
  if (!restored) { State.fileName = 'Untitled.ink'; load(STARTER, {}); }
  setInterval(autosaveTick, 4000);
}

// the compiler is optional: the editor works without it, Play does not
function loadInk() {
  const urls = ['../node_modules/inkjs/dist/ink-full.js', 'node_modules/inkjs/dist/ink-full.js', 'https://cdn.jsdelivr.net/npm/inkjs@2.3.2/dist/ink-full.js'];
  let i = 0;
  const tryNext = () => {
    if (i >= urls.length) return;
    const s = document.createElement('script');
    s.src = urls[i++];
    s.onerror = tryNext;
    document.head.appendChild(s);
  };
  tryNext();
}

// exposed for scripting / debugging from the devtools console
window.Inkblots = {
  get State() { return State; },
  get Tabs() { return Tabs; },
  get activeTab() { return activeTab; },
  parse, serialize, load, compile, autoLayout, render,
  saveFile, undo, redo, cancelInkTooltip,
  pushHistory, setDirty, select, ask, screenToWorld, applyTransform, drawEdges, applySnippet, addKnot, renameNode,
  deleteSelectedNodes, updateBody, retarget, divertName, addChoice, addDivert, addTab, switchTab, closeTab, newFile, openFilesInTabs, autosaveTick, flushPendingEdit, confirmWindowClose,
};

loadInk();
boot();

})();
