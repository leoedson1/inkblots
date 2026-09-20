/* Source-backed node editing and variable cards. Wires are derived from Ink source. */
(() => {
  const A=window.Inkblots,I=window.InkblotsI18n,$=s=>document.querySelector(s);
  const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!=null)e.textContent=text;return e;};
  const ui=(tag,cls,text)=>I.bind(make(tag,cls),text);
  const canvas=$('#canvas'),layer=make('div');layer.id='variables';$('#world').append(layer);
  let gesture=null,editing=null;
  const positions=()=>A.State.organizer.variablePositions ||= {};
  // Keep offsets while excluding comments; quoted // is part of a string value.
  function clean(body){return body.replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,m=>m.startsWith('"')?m:m.replace(/[^\n]/g,' '));}
  function declarations(){return A.State.order.flatMap(id=>clean(A.State.nodes[id].body).split('\n').flatMap((line,i)=>{const m=line.match(/^\s*VAR\s+([A-Za-z_]\w*)\s*=\s*(.+?)\s*$/);return m?[{id,line:i,name:m[1],value:m[2]}]:[];}));}
  const center=()=>{const r=canvas.getBoundingClientRect();return A.screenToWorld(r.left+r.width/2,r.top+r.height/2);};
  function editSource(id,fn){A.flushPendingEdit();A.pushHistory();A.updateBody(id,fn(A.State.nodes[id].body));if(A.State.sel===id)A.select(id);}
  function add(point=center()){
    if(!A.Tabs.length)return;
    A.ask('Variable name','', 'new_variable',name=>{
      if(!name)return;name=name.trim();
      if(!/^[A-Za-z_]\w*$/.test(name) || new RegExp('\\b'+name+'\\b').test(A.serialize(false).text)){A.ask('Variable name','Use a unique Ink identifier.','new_variable',n=>{if(n)addNamed(n,point);});return;}
      addNamed(name,point);
    });
  }
  function addNamed(name,point){
    if(!/^[A-Za-z_]\w*$/.test(name)||new RegExp('\\b'+name+'\\b').test(A.serialize(false).text))return false;
    A.flushPendingEdit();A.pushHistory();positions()[name]=point.slice();
    const id=A.State.order[0];A.updateBody(id,'VAR '+name+' = false\n'+A.State.nodes[id].body);return true;
  }
  function connect(name,id,line=null,expression){
    const variable=declarations().find(v=>v.name===name);if(!variable||!A.State.nodes[id])return false;
    if(line==null){
      if(A.State.nodes[id].kind==='start')return false;
      const value=expression??variable.value;
      if(!value.trim()||/[\r\n]/.test(value))return false;
      editSource(id,body=>'~ '+name+' = '+value+'\n'+body);
    }else{
      const condition=expression??(['true','false'].includes(variable.value)?name:name+' == '+variable.value);
      if(!condition.trim()||/[{}\r\n]/.test(condition))return false;
      const lines=A.State.nodes[id].body.split('\n');
      if(!/^\s*[*+]/.test(lines[line]||''))return false;
      editSource(id,body=>{const lines=body.split('\n');lines[line]=lines[line].replace(/^(\s*[*+](?:\s*[*+])*\s*(?:\([\w]+\)\s*)?)/,'$1{'+condition+'} ');return lines.join('\n');});
    }
    return true;
  }
  function connectFlow(from,idx,id,line){
    A.flushPendingEdit();const node=A.State.nodes[id],lines=node.body.split('\n');
    const match=lines[line]?.match(/^(\s*[*+](?:\s*[*+])*\s*)(?:\((\w+)\)\s*)?/);if(!match)return false;
    let label=match[2];if(!label){let count=1;label='choice_'+count;while(A.State.order.some(k=>A.State.nodes[k].labels.includes(label)))label='choice_'+(++count);}
    A.pushHistory();if(!match[2]){lines[line]=lines[line].replace(match[1],match[1]+'('+label+') ');A.updateBody(id,lines.join('\n'),false);}
    const source=A.State.nodes[from],target=id+'.'+label,ls=source.body.split('\n');
    if(idx>=0){const d=source.diverts[idx];ls[d.line]=ls[d.line].slice(0,d.s)+target+ls[d.line].slice(d.e);}
    else ls.push((window.inkChoiceView(source).rows.length?'- ':'')+'-> '+target);
    A.updateBody(from,ls.join('\n'));return true;
  }
  function requestConnection(name,id,line){
    const v=declarations().find(v=>v.name===name);if(!v)return;
    A.ask(line==null?'Assign on entry':'Choice condition',line==null?'Ink value or expression':'Ink condition (for example, score >= 3)',line==null?v.value:(['true','false'].includes(v.value)?name:name+' == '+v.value),expression=>{if(expression)connect(name,id,line,expression);});
  }
  function commitInline(){if(!editing)return;const {id,element}=editing;editing=null;if(element.isConnected){A.render();if(A.State.sel===id)A.select(id);}}
  function beginEdit(id){
    if(editing?.id===id)return;commitInline();A.flushPendingEdit();A.select(id);
    const n=A.State.nodes[id],card=n._el,original=n.body;
    const area=make('textarea','node-editor');area.value=n.body;area.spellcheck=false;I.bind(area,'Edit node Ink','aria-label');
    let recorded=false;
    editing={id,element:area};card.classList.add('editing');card.append(area);
    area.oninput=()=>{if(!recorded){A.pushHistory();recorded=true;}A.updateBody(id,area.value,false);};
    area.onmousedown=e=>e.stopPropagation();area.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();if(recorded)A.updateBody(id,original,false);commitInline();}else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.stopPropagation();e.preventDefault();commitInline();}else if(e.key==='Tab'){e.preventDefault();area.setRangeText('  ',area.selectionStart,area.selectionEnd,'end');area.dispatchEvent(new Event('input'));}};
    area.onblur=commitInline;area.focus();
  }
  function attachNodes(){
    for(const id of A.State.order){const n=A.State.nodes[id],card=n._el;if(!card)continue;
      card.querySelectorAll('.variable-changes,.choice-inlet,.condition-tags').forEach(e=>e.remove());
      I.bind(card.querySelector('.prose'),'Double-click to edit node text','title');
      card.ondblclick=e=>{if(e.target.closest('button,.pill,.choice-inlet,.addout,input,textarea'))return;e.stopPropagation();beginEdit(id);};
      const lines=clean(n.body).split('\n');
      const changes=make('div','variable-changes');
      lines.forEach((line,i)=>{const m=line.match(/^\s*~\s*(?:temp\s+)?([A-Za-z_]\w*)\s*(?:[+\-*/%]?=(?!=)|\+\+|--)/);if(!m)return;
        const tag=make('span','pill variable-change',line.trim().replace(/^~\s*/,''));tag.dataset.variable=m[1];tag.dataset.line=i;I.bind(tag,'Variable assignment','title');const remove=ui('button','','×');I.bind(remove,'Remove assignment','title');remove.onclick=e=>{e.stopPropagation();editSource(id,body=>{const ls=body.split('\n');ls.splice(i,1);return ls.join('\n');});};tag.append(remove);changes.append(tag);
      });
      if(changes.childElementCount)card.insertBefore(changes,card.querySelector('.prose'));
      for(const row of card.querySelectorAll('.choice-row')){
        const line=Number(row.dataset.line),raw=lines[line]||'';
        const inlet=ui('button','choice-inlet','');inlet.dataset.line=line;I.bind(inlet,'Connect a divert or variable condition','title');I.bind(inlet,'Choice input','aria-label');row.append(inlet);
        inlet.onmousedown=e=>{e.preventDefault();e.stopPropagation();startWire(e,{id,line,reverse:true});};
        const conditions=make('div','condition-tags');
        const prefix=raw.replace(/^\s*[*+](?:\s*[*+])*\s*(?:\(\w+\)\s*)?/,'').match(/^(?:\{[^{}]*\}\s*)*/)?.[0]||'';
        for(const match of prefix.matchAll(/\{([^{}]*)\}/g)){
          const tag=make('span','pill condition-tag','? '+match[1]);tag.dataset.expression=match[1];tag.dataset.line=line;
          const remove=ui('button','','×');I.bind(remove,'Remove condition','title');remove.onclick=e=>{e.stopPropagation();editSource(id,body=>{const ls=body.split('\n');ls[line]=ls[line].replace(match[0],'');return ls.join('\n');});};tag.append(remove);conditions.append(tag);
        }
        if(conditions.childElementCount)row.append(conditions);
      }
    }
  }
  function render(){
    if(editing&&!editing.element.isConnected)editing=null;
    layer.textContent='';if(!A.Tabs.length)return;
    const vars=declarations();
    vars.forEach((v,index)=>{
      const stored=positions()[v.name],p=Array.isArray(stored)&&stored.length===2&&stored.every(Number.isFinite)?stored:[-320,index*150],card=make('div','variable-card');card.dataset.variable=v.name;card.style.left=p[0]+'px';card.style.top=p[1]+'px';
      const head=make('div','head'),title=make('strong','',v.name);head.append(ui('span','variable-kind','Variable'),title);card.append(head);
      const label=make('label'),value=make('input');label.append(ui('span','','Initial value'));value.value=v.value;value.spellcheck=false;label.append(value);card.append(label);
      let recorded=false;
      value.oninput=()=>{if(!recorded){A.flushPendingEdit();A.pushHistory();recorded=true;}const ls=A.State.nodes[v.id].body.split('\n');const old=ls[v.line],comment=old.slice(clean(old).trimEnd().length);ls[v.line]='VAR '+v.name+' = '+value.value+comment;A.updateBody(v.id,ls.join('\n'),false);};
      value.onblur=()=>{if(recorded){A.render();if(A.State.sel===v.id)A.select(v.id);}};
      value.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();value.blur();}};
      const port=ui('button','variable-out','');I.bind(port,'Drag to assign a node or condition a choice','title');I.bind(port,'Variable output','aria-label');card.append(port);port.onmousedown=e=>{e.preventDefault();e.stopPropagation();startWire(e,{name:v.name});};
      head.onmousedown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();A.flushPendingEdit();gesture={type:'move',state:A.State,name:v.name,card,p:p.slice(),start:A.screenToWorld(e.clientX,e.clientY),moved:false};};
      card.onmousedown=e=>e.stopPropagation();layer.append(card);
    });
    attachNodes();window.InkblotsCanvas.drawMap();A.drawEdges();
  }
  const point=e=>{const r=e.getBoundingClientRect();return A.screenToWorld(r.left+r.width/2,r.top+r.height/2);};
  function curve(a,b){return `M${a[0]},${a[1]} C${a[0]+90},${a[1]} ${b[0]-90},${b[1]} ${b[0]},${b[1]}`;}
  function wire(a,b,cls){const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('class',cls);p.setAttribute('d',curve(a,b));$('#egroup').append(p);return p;}
  function draw(){
    document.querySelectorAll('.variable-wire').forEach(e=>e.remove());
    const vars=declarations();for(const v of vars){const card=[...layer.children].find(e=>e.dataset.variable===v.name);if(!card)continue;const a=point(card.querySelector('.variable-out'));
      for(const id of A.State.order){const node=A.State.nodes[id]._el;if(!node)continue;
        for(const tag of node.querySelectorAll('.variable-change,.condition-tag')){
          if(tag.classList.contains('variable-change')?tag.dataset.variable!==v.name:!new RegExp('\\b'+v.name+'\\b').test(tag.dataset.expression))continue;
          const inlet=tag.closest('.choice-row')?.querySelector('.choice-inlet');const b=point(inlet||tag);if(!inlet){const r=node.getBoundingClientRect();b[0]=A.screenToWorld(r.left,r.top)[0];}
          wire(a,b,'variable-wire');
        }
      }
    }
  }
  function startWire(e,source){gesture={type:'wire',state:A.State,...source,start:A.screenToWorld(e.clientX,e.clientY)};}
  window.addEventListener('mousemove',e=>{
    if(!gesture||gesture.state!==A.State)return;const p=A.screenToWorld(e.clientX,e.clientY);
    if(gesture.type==='move'){
      const dx=p[0]-gesture.start[0],dy=p[1]-gesture.start[1];if(!gesture.moved&&Math.abs(dx)+Math.abs(dy)<3)return;
      if(!gesture.moved)A.pushHistory();gesture.moved=true;positions()[gesture.name]=[gesture.p[0]+dx,gesture.p[1]+dy];gesture.card.style.left=positions()[gesture.name][0]+'px';gesture.card.style.top=positions()[gesture.name][1]+'px';A.setDirty(true);draw();window.InkblotsCanvas.drawMap();
    }else{gesture.path?.remove();gesture.path=wire(gesture.reverse?p:gesture.start,gesture.reverse?gesture.start:p,'variable-wire variable-preview');}
  });
  window.addEventListener('mouseup',e=>{
    if(!gesture)return;const g=gesture;gesture=null;g.path?.remove();if(g.state!==A.State||g.type!=='wire')return;
    const target=document.elementFromPoint(e.clientX,e.clientY);
    if(g.reverse){const card=target?.closest('.variable-card');if(card)requestConnection(card.dataset.variable,g.id,g.line);else{const node=target?.closest('.node');if(node)connectFlow(node.dataset.id,-1,g.id,g.line);}}
    else{const node=target?.closest('.node');if(node){const row=target.closest('.choice-row');requestConnection(g.name,node.dataset.id,row?Number(row.dataset.line):null);}}
  });
  window.addEventListener('blur',()=>{gesture?.path?.remove();gesture=null;});
  window.addEventListener('inkblots-render',render);window.addEventListener('inkblots-edges',draw);window.addEventListener('inkblots-view',draw);
  window.InkblotsVariables={add,addNamed,connect,connectFlow,declarations,beginEdit,commitInline,render,draw,clean};render();
})();
