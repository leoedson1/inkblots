/* Canvas-only organization. Metadata is stored in compiler-safe Ink comments. */
(() => {
  'use strict';
  const A = window.Inkblots, $ = s => document.querySelector(s);
  const canvas = $('#canvas'), zones = $('#zones'), notes = $('#notes');
  const make = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls || ''; if (text != null) e.textContent = text; return e; };
  const button = (text, title, fn) => { const e = make('button', 'btn', text); e.title = title; e.setAttribute('aria-label', title); e.onclick = fn; return e; };
  const state = () => A.State;
  const world = e => A.screenToWorld(e.clientX, e.clientY);
  const center = () => { const r = canvas.getBoundingClientRect(); return A.screenToWorld(r.left + r.width / 2, r.top + r.height / 2); };
  const uid = () => crypto.randomUUID();
  const finite = (x, fallback) => Number.isFinite(x) ? Math.max(-1000000, Math.min(1000000, x)) : fallback;
  const colors = ['blue', 'green', 'amber', 'rose'];
  let drag = null, box = null, popupPoint = null, pointer = null;
  let normalizedState = null, normalizedObject = null;
  function data() {
    const s = state();
    if (s !== normalizedState || s.organizer !== normalizedObject) {
      const raw = s.organizer || {};
      const clean = (items, type) => (Array.isArray(items) ? items : []).filter(x => x && typeof x === 'object').map(x => ({
        id: typeof x.id === 'string' ? x.id : uid(), x: finite(x.x, 60), y: finite(x.y, 60),
        w: Math.max(type === 'zones' ? 280 : 180, Math.min(5000, finite(x.w, type === 'zones' ? 420 : 250))),
        h: Math.max(type === 'zones' ? 160 : 120, Math.min(5000, finite(x.h, type === 'zones' ? 280 : 190))),
        color: colors.includes(x.color) ? x.color : type === 'zones' ? 'blue' : 'amber',
        ...(type === 'zones' ? { name: String(x.name || 'Zone'), members: Array.isArray(x.members) ? x.members.filter(id => typeof id === 'string') : [] } : { text: String(x.text || '') }),
      }));
      s.organizer = { zones: clean(raw.zones, 'zones'), notes: clean(raw.notes, 'notes') };
      normalizedState = s; normalizedObject = s.organizer;
    }
    return s.organizer;
  }
  function mutate(fn) { A.flushPendingEdit(); A.pushHistory(); fn(); A.setDirty(true); render(); }
  function position(el, item) { Object.assign(el.style, {left:item.x+'px',top:item.y+'px',width:item.w+'px',height:item.h+'px'}); }
  function nodeBounds(ids) {
    const rects = ids.filter(id => state().nodes[id]?._el).map(id => { const p = state().layout[id], el = state().nodes[id]._el; return {x:p[0],y:p[1],w:el.offsetWidth,h:el.offsetHeight}; });
    if (!rects.length) return null;
    const x = Math.min(...rects.map(r=>r.x)), y = Math.min(...rects.map(r=>r.y));
    return {x,y,w:Math.max(...rects.map(r=>r.x+r.w))-x,h:Math.max(...rects.map(r=>r.y+r.h))-y};
  }
  function addZone(point = center()) {
    if (!A.Tabs.length) return;
    const s = state(), ids = s.selection.slice(), b = nodeBounds(ids);
    A.ask('New zone', 'A named area for organizing your story. Drag its header to move its member nodes.', 'New zone', name => {
      if (!name || state() !== s) return;
      mutate(() => data().zones.push({id:uid(),name,members:ids,x:b ? b.x-30 : point[0],y:b ? b.y-58 : point[1],w:b ? b.w+60 : 420,h:b ? b.h+88 : 280,color:'blue'}));
    });
  }
  function addNote(point = center()) {
    if (!A.Tabs.length) return;
    const id = uid();
    mutate(() => data().notes.push({id,x:point[0],y:point[1],w:250,h:190,text:'',color:'amber'}));
    notes.querySelector(`[data-id="${id}"] textarea`)?.focus();
  }
  function selectMany(ids) {
    state().selection = ids.filter(id=>state().nodes[id]);
    A.select(state().selection[0] || null);
    updateSelection();
  }
  const actions = make('div', '', ''); actions.id = 'selection-actions';
  const count = make('span'); actions.append(count, button('Group into zone', 'Group selected nodes into a zone', () => addZone()), button('Clear', 'Clear selection', () => selectMany([])));
  canvas.appendChild(actions);
  function updateSelection() {
    state().selection = state().selection.filter(id=>state().nodes[id]);
    const ids = state().selection;
    $('#nodes').querySelectorAll('.node').forEach(n=>n.classList.toggle('sel', ids.includes(n.dataset.id)));
    actions.hidden = !A.Tabs.length || ids.length < 2;
    count.textContent = ids.length + ' selected'; drawMap();
  }
  const marquee = make('div'); marquee.id = 'selection-box'; marquee.hidden = true; canvas.appendChild(marquee);
  canvas.addEventListener('mousedown', e => {
    if (!A.Tabs.length || e.button !== 0 || !e.shiftKey || e.target.closest('button,input,textarea,.sticky-note,.zone,#minimap,#quick-ink,.drawer')) return;
    e.preventDefault(); e.stopImmediatePropagation(); A.flushPendingEdit();
    box = {start:world(e),s:state()}; marquee.hidden = false;
    updateBox(e);
  }, true);
  function updateBox(e) {
    const p = world(e), v = state().view, x = Math.min(p[0],box.start[0]), y = Math.min(p[1],box.start[1]);
    box.bounds = {x,y,w:Math.abs(p[0]-box.start[0]),h:Math.abs(p[1]-box.start[1])};
    Object.assign(marquee.style,{left:(x*v.k+v.x)+'px',top:(y*v.k+v.y)+'px',width:(box.bounds.w*v.k)+'px',height:(box.bounds.h*v.k)+'px'});
  }
  function startDrag(e, item, element, resize, type) {
    if (e.button !== 0 || e.target.closest('button,textarea,input')) return;
    e.preventDefault(); e.stopPropagation(); A.flushPendingEdit();
    drag = {s:state(),item,element,resize,type,start:world(e),original:{...item},moved:false,
      members: type === 'zones' ? item.members.filter(id=>state().layout[id]).map(id=>[id,state().layout[id].slice()]) : []};
  }
  function renderItems(type, container) {
    container.textContent = '';
    for (const item of data()[type]) {
      if (type === 'zones') item.members = item.members.filter(id=>state().nodes[id]);
      const card = make('div', type === 'zones' ? 'zone' : 'sticky-note'); card.dataset.id = item.id; card.dataset.color = item.color; position(card,item);
      const head = make('div', 'organizer-head');
      const title = make('span', 'organizer-title', type === 'zones' ? item.name : 'Note'); head.appendChild(title);
      if (type === 'zones') {
        head.appendChild(button('＋', 'Add selected nodes to this zone', () => mutate(() => { item.members = [...new Set([...item.members,...state().selection])]; })));
        head.appendChild(button('−', 'Remove selected nodes from this zone', () => mutate(() => { item.members = item.members.filter(id=>!state().selection.includes(id)); })));
        title.title = 'Double-click to rename';
        title.tabIndex=0; title.setAttribute('role','button'); title.setAttribute('aria-label','Rename zone '+item.name);
        const rename = () => A.ask('Rename zone','',item.name,name=>{if(name && data().zones.includes(item)) mutate(()=>{item.name=name;});});
        title.ondblclick = e => { e.stopPropagation(); rename(); };
        title.onkeydown = e => {if(e.key==='Enter'){e.preventDefault();rename();}};
      }
      head.appendChild(button('●', 'Change color', () => mutate(() => {item.color=colors[(colors.indexOf(item.color)+1)%colors.length];})));
      head.appendChild(button('×', type === 'zones' ? 'Remove zone (keep its nodes)' : 'Delete note', () => mutate(() => {data()[type]=data()[type].filter(x=>x!==item);})));
      head.onmousedown = e => startDrag(e,item,card,false,type); card.appendChild(head);
      if (type === 'notes') {
        const text = make('textarea'); text.value = item.text; text.placeholder = 'Write a note…'; text.setAttribute('aria-label','Sticky note');
        let recorded = false;
        text.onfocus = () => { recorded=false; };
        text.oninput = () => { if(!recorded){A.pushHistory();recorded=true;} item.text=text.value; A.setDirty(true); };
        card.appendChild(text);
      } else {
        const label = make('span','zone-members',item.members.length+' nodes'); card.appendChild(label);
      }
      const handle = make('div','organizer-resize'); handle.title='Drag to resize'; handle.onmousedown=e=>startDrag(e,item,card,true,type); card.appendChild(handle);
      container.appendChild(card);
    }
  }
  window.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect(); if(e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom) pointer=[e.clientX,e.clientY];
    if(box){updateBox(e);return;}
    if(!drag || drag.s!==state()) return;
    const p=world(e), dx=p[0]-drag.start[0], dy=p[1]-drag.start[1];
    if(!drag.moved && Math.abs(dx)+Math.abs(dy)<2)return;
    if(!drag.moved)A.pushHistory(); drag.moved=true;
    if(drag.resize){drag.item.w=Math.max(drag.type==='zones'?280:180,drag.original.w+dx);drag.item.h=Math.max(drag.type==='zones'?160:120,drag.original.h+dy);}
    else {
      drag.item.x=drag.original.x+dx;drag.item.y=drag.original.y+dy;
      for(const [id,origin] of drag.members){state().layout[id]=[origin[0]+dx,origin[1]+dy];const el=state().nodes[id]._el;if(el){el.style.left=state().layout[id][0]+'px';el.style.top=state().layout[id][1]+'px';}}
      A.drawEdges();
    }
    position(drag.element,drag.item);drawMap();
  });
  window.addEventListener('mouseup', () => {
    if(box){const b=box.bounds;if(box.s===state())selectMany(state().order.filter(id=>{const n=state().nodes[id],p=state().layout[id];return n._el && p[0]<b.x+b.w && p[0]+n._el.offsetWidth>b.x && p[1]<b.y+b.h && p[1]+n._el.offsetHeight>b.y;}));box=null;marquee.hidden=true;}
    if(drag){if(drag.moved && drag.s===state()) A.setDirty(true);drag=null;}
  });
  // Comment text is always inserted as textContent, including user-written HTML.
  function comments(body) {
    return [...body.matchAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g)].map(m=>({text:(m[0].startsWith('/*')?m[0].slice(2,-2):m[0].slice(2)).trim(),line:body.slice(0,m.index).split('\n').length-1})).filter(c=>c.text);
  }
  const tip=make('div','comments-tooltip');tip.id='comments-tooltip';tip.hidden=true;tip.setAttribute('role','tooltip');document.body.appendChild(tip);
  let tipTimer;
  function hideComments(){clearTimeout(tipTimer);tip.hidden=true;}
  function showComments(list,target){
    clearTimeout(tipTimer);tip.textContent='';tip.appendChild(make('div','comments-title','Comments'));
    list.forEach((c,i)=>{if(i)tip.appendChild(document.createElement('hr'));tip.appendChild(make('p','',c.text));});
    tip.hidden=false;const r=target.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,r.right+8))+'px';tip.style.top=Math.max(8,Math.min(innerHeight-tip.offsetHeight-8,r.top))+'px';
  }
  const delayedHide=()=>{tipTimer=setTimeout(hideComments,130);};tip.onmouseenter=()=>clearTimeout(tipTimer);tip.onmouseleave=hideComments;
  function attachComments(){
    $('#nodes').querySelectorAll('.comment-badge').forEach(el=>el.remove());
    $('#nodes').querySelectorAll('.pill[data-idx]').forEach(el=>{el.onmouseenter=null;el.onmouseleave=null;});
    for(const id of state().order){const n=state().nodes[id];if(!n._el)continue;const list=comments(n.body);if(!list.length)continue;
      const badge=button('▱',list.length+' comment'+(list.length===1?'':'s'),()=>showComments(list,badge));badge.className='comment-badge';badge.setAttribute('aria-describedby','comments-tooltip');
      badge.onmouseenter=badge.onfocus=()=>showComments(list,badge);badge.onmouseleave=badge.onblur=delayedHide;n._el.querySelector('.head').appendChild(badge);
      n._el.querySelectorAll('.pill[data-idx]').forEach(p=>{const line=n.diverts[Number(p.dataset.idx)]?.line;const inline=list.filter(c=>c.line===line);if(inline.length){p.onmouseenter=()=>showComments(inline,p);p.onmouseleave=delayedHide;}});
    }
  }
  // Searchable cursor menu, also exposes organization tools without extra toolbar clutter.
  const popup=make('div');popup.id='quick-ink';popup.hidden=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Insert Ink or canvas item');
  const search=make('input');search.type='search';search.placeholder='Search Ink, zones, notes…';search.setAttribute('aria-label','Search Ink options');
  const results=make('div','quick-results');results.id='quick-results';results.setAttribute('role','listbox');search.setAttribute('aria-controls',results.id);
  popup.append(search,results);document.body.appendChild(popup);
  const entries=(window.INK_SNIPPETS||[]).flatMap(g=>g.items.map(it=>({label:it.label,desc:it.desc||'',group:g.label,it})));
  entries.unshift({label:'Sticky note',desc:'Add an editable note to the canvas.',action:()=>addNote(popupPoint)},{label:'Zone / group',desc:'Organize selected nodes in a named area.',action:()=>addZone(popupPoint)});
  let filtered=[],active=0,returnFocus=null;
  function closeQuick(restore=false){popup.hidden=true;if(restore && returnFocus?.isConnected)returnFocus.focus();}
  function markActive(){[...results.children].forEach((row,i)=>{row.classList.toggle('active',i===active);row.setAttribute('aria-selected',String(i===active));});search.setAttribute('aria-activedescendant','quick-option-'+active);results.children[active]?.scrollIntoView({block:'nearest'});}
  function insert(entry){
    if(!entry)return;closeQuick(true);A.flushPendingEdit();
    if(entry.action){entry.action();return;}
    const s=state(),before=new Set(s.order);A.applySnippet(entry.it);
    const added=state().order.filter(id=>!before.has(id));
    if(state()===s && added.length){const first=s.layout[added[0]];const dx=popupPoint[0]-first[0],dy=popupPoint[1]-first[1];added.forEach(id=>{s.layout[id]=[s.layout[id][0]+dx,s.layout[id][1]+dy];});A.render();}
  }
  function filter(){const terms=search.value.toLowerCase().trim().split(/\s+/);filtered=entries.filter(e=>terms.every(t=>(e.label+' '+e.desc+' '+(e.group||'')).toLowerCase().includes(t)));active=0;results.textContent='';
    filtered.forEach((entry,i)=>{const row=make('div','quick-option');row.id='quick-option-'+i;row.setAttribute('role','option');row.append(make('strong','',entry.label),make('small','',entry.desc));row.onmousedown=e=>e.preventDefault();row.onmouseenter=()=>{active=i;markActive();};row.onclick=()=>insert(entry);results.appendChild(row);});
    if(!filtered.length)results.appendChild(make('p','quick-empty','No matching options'));markActive();
  }
  function openQuick(clientX,clientY){if(!A.Tabs.length)return;returnFocus=document.activeElement;A.flushPendingEdit();popupPoint=A.screenToWorld(clientX,clientY);popup.hidden=false;search.value='';filter();popup.style.left=Math.max(8,Math.min(clientX,innerWidth-popup.offsetWidth-8))+'px';popup.style.top=Math.max(8,Math.min(clientY,innerHeight-popup.offsetHeight-8))+'px';search.focus();}
  search.oninput=filter;
  popup.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closeQuick(true);}else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();active=(active+(e.key==='ArrowDown'?1:filtered.length-1))%Math.max(1,filtered.length);markActive();}else if(e.key==='Enter'){e.preventDefault();insert(filtered[active]);}};
  document.addEventListener('mousedown',e=>{if(!popup.contains(e.target))closeQuick();});
  canvas.addEventListener('contextmenu',e=>{if(e.target.closest('.node,.sticky-note,.zone,#minimap,.drawer,#source-view,#selection-actions'))return;e.preventDefault();openQuick(e.clientX,e.clientY);});
  window.addEventListener('keydown',e=>{
    if(e.shiftKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase()==='a' && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName) && !e.target.isContentEditable && !$('#scrim').classList.contains('open')){e.preventDefault();e.stopImmediatePropagation();const r=canvas.getBoundingClientRect();const p=pointer||[r.left+r.width/2,r.top+r.height/2];openQuick(...p);}
    if(e.key==='Escape'){hideComments();closeQuick();box=null;marquee.hidden=true;}
  });
  // Minimap includes nodes, zones, notes, and the current viewport.
  const mini=make('div');mini.id='minimap';mini.tabIndex=0;mini.setAttribute('aria-label','Minimap. Click to navigate, or use arrow keys.');
  mini.appendChild(make('span','minimap-title','Overview'));
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 200 120');mini.appendChild(svg);canvas.appendChild(mini);
  let map=null,miniDrag=false;
  function drawMap(){
    mini.hidden=!A.Tabs.length;if(mini.hidden)return;
    const s=state(),v=s.view,items=[];
    data().zones.forEach(z=>items.push({...z,type:'zone'}));data().notes.forEach(n=>items.push({...n,type:'note'}));
    s.order.forEach(id=>{const n=s.nodes[id],p=s.layout[id];if(n._el && p)items.push({x:p[0],y:p[1],w:n._el.offsetWidth,h:n._el.offsetHeight,type:s.selection.includes(id)?'selected':'node'});});
    const viewport={x:-v.x/v.k,y:-v.y/v.k,w:canvas.clientWidth/v.k,h:canvas.clientHeight/v.k};
    const all=[...items,viewport],x=Math.min(...all.map(r=>r.x))-40,y=Math.min(...all.map(r=>r.y))-40;
    const w=Math.max(...all.map(r=>r.x+r.w))-x+40,h=Math.max(...all.map(r=>r.y+r.h))-y+40,k=Math.min(188/w,108/h);
    map={x,y,k,ox:(200-w*k)/2,oy:(120-h*k)/2};svg.textContent='';
    const rect=(item,type)=>{const e=document.createElementNS(ns,'rect');e.setAttribute('x',map.ox+(item.x-x)*k);e.setAttribute('y',map.oy+(item.y-y)*k);e.setAttribute('width',Math.max(1,item.w*k));e.setAttribute('height',Math.max(1,item.h*k));e.setAttribute('class','map-'+type);svg.appendChild(e);};
    items.forEach(i=>rect(i,i.type));rect(viewport,'viewport');
  }
  function navigate(e){if(!map)return;const r=svg.getBoundingClientRect(),x=map.x+((e.clientX-r.left)*200/r.width-map.ox)/map.k,y=map.y+((e.clientY-r.top)*120/r.height-map.oy)/map.k;state().view.x=canvas.clientWidth/2-x*state().view.k;state().view.y=canvas.clientHeight/2-y*state().view.k;A.applyTransform();}
  svg.onpointerdown=e=>{e.preventDefault();e.stopPropagation();miniDrag=true;svg.setPointerCapture(e.pointerId);navigate(e);};svg.onpointermove=e=>{if(miniDrag)navigate(e);};svg.onpointerup=()=>{miniDrag=false;};svg.onpointercancel=()=>{miniDrag=false;};
  mini.onkeydown=e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();const v=state().view;if(e.key==='ArrowLeft')v.x+=80;if(e.key==='ArrowRight')v.x-=80;if(e.key==='ArrowUp')v.y+=80;if(e.key==='ArrowDown')v.y-=80;A.applyTransform();};
  function render(){
    if(drag?.s!==state())drag=null;
    if(box?.s!==state()){box=null;marquee.hidden=true;}
    closeQuick();hideComments();data();renderItems('zones',zones);renderItems('notes',notes);attachComments();updateSelection();drawMap();
  }
  window.addEventListener('inkblots-render',render);
  window.addEventListener('inkblots-view',()=>{hideComments();drawMap();});
  window.addEventListener('inkblots-selection',updateSelection);
  window.addEventListener('resize',()=>{closeQuick();drawMap();});
  window.addEventListener('blur',()=>{closeQuick();hideComments();box=null;marquee.hidden=true;if(drag?.moved)A.setDirty(true);drag=null;miniDrag=false;});
  window.InkblotsCanvas={addZone,addNote,selectMany,openQuick,comments,render,drawMap};
  render();
})();
