/* In-place story text editing and source-backed global variable management. */
(() => {
  const A=window.Inkblots,I=window.InkblotsI18n,$=s=>document.querySelector(s);
  const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!=null)e.textContent=text;return e;};
  const ui=(tag,cls,text)=>I.bind(make(tag,cls),text);
  function clean(body){return body.replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,m=>m.startsWith('"')?m:m.replace(/[^\n]/g,' '));}
  function declarations(){return A.State.order.flatMap(id=>clean(A.State.nodes[id].body).split('\n').flatMap((line,i)=>{const m=line.match(/^\s*(VAR|CONST|LIST)\s+([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/);return m?[{id,line:i,kind:m[1],name:m[2],value:m[3]}]:[];}));}
  const panel=make('section');panel.id='global-manager';const heading=make('div','global-heading'),list=make('div','global-list'),error=make('p','global-error');error.setAttribute('role','status');
  heading.append(ui('h3','','Global variables'));const add=ui('button','btn','Add variable');heading.append(add);panel.append(heading,error,list);$('#side').append(panel);
  const category=make('select','global-category');for(const [value,text]of [['VAR','Variables'],['CONST','Constants'],['LIST','Lists']]){const option=ui('option','',text);option.value=value;category.append(option);}I.bind(category,'Declaration type','aria-label');heading.insertBefore(category,add);category.onchange=manager;
  const suggestions=make('datalist');suggestions.id='ink-value-suggestions';for(const text of ['true','false','0','"text"']){const option=make('option');option.value=text;suggestions.append(option);}panel.append(suggestions);
  function fail(message){I.bind(error,message);return false;}
  const validName=name=>/^[A-Za-z_]\w*$/.test(name)&&!['true','false','not','and','or','mod','VAR','CONST','LIST','temp','return'].includes(name);
  function refresh(){A.render();if(A.State.sel)A.select(A.State.sel);}
  function addVariable(name,value='false',kind='VAR'){
    A.flushPendingEdit();if(!A.Tabs.length)return false;
    if(!validName(name)||A.State.globals.has(name)||A.State.nodes[name])return fail('Use a unique Ink identifier.');
    if(!['VAR','CONST','LIST'].includes(kind))return false;
    A.pushHistory();const id=A.State.order[0];A.updateBody(id,kind+' '+name+' = '+value+'\n'+A.State.nodes[id].body);return true;
  }
  add.onclick=()=>{let i=1,name='new_variable';while(A.State.globals.has(name)||A.State.nodes[name])name='new_variable_'+i++;addVariable(name,category.value==='LIST'?'item_one, item_two':category.value==='CONST'?'0':'false',category.value);const input=[...list.querySelectorAll('[data-name]')].find(e=>e.dataset.name===name)?.querySelector('.global-name');input?.focus();input?.select();};
  function removeVariable(name){const v=declarations().find(v=>v.name===name);if(!v)return;A.flushPendingEdit();A.pushHistory();const lines=A.State.nodes[v.id].body.split('\n');lines.splice(v.line,1);A.updateBody(v.id,lines.join('\n'));if(A.State.sel===v.id)A.select(v.id);}
  function renameVariable(old,name){
    if(name===old)return true;
    if(!validName(name)||A.State.globals.has(name)||A.State.nodes[name])return fail('Use a unique Ink identifier.');
    const re=new RegExp('\\b'+old+'\\b','g');
    const replace=code=>code.replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*|[A-Za-z_]\w*/g,m=>m===old?name:m);
    A.flushPendingEdit();A.pushHistory();
    for(const id of A.State.order){const body=A.State.nodes[id].body,masked=clean(body).split('\n');
      const next=body.split('\n').map((line,i)=>{
        if(!masked[i].trim())return line;
        if(/^\s*(?:VAR|CONST|LIST|EXTERNAL|~)\b/.test(masked[i]) || /^\s*~/.test(masked[i]))return replace(line);
        return line.replace(/\/\/[^\n]*|\{[^{}]*\}|(?:->|<-)\s*[A-Za-z_]\w*/g,m=>m.startsWith('//')?m:replace(m));
      }).join('\n');if(next!==body)A.updateBody(id,next,false);
    }
    refresh();return true;
  }
  function manager(){
    list.textContent='';I.bind(error,'');add.disabled=!A.Tabs.length;
    if(!A.Tabs.length)return;
    I.bind(add,category.value==='VAR'?'Add variable':category.value==='CONST'?'Add constant':'Add list');
    const vars=declarations().filter(v=>v.kind===category.value);if(!vars.length){list.append(ui('p','side-empty','No declarations in this section.'));return;}
    const labels=make('div','global-row global-labels');labels.append(ui('span','','Name'),ui('span','','Initial value'));list.append(labels);
    for(const v of vars){const row=make('div','global-row');row.dataset.name=v.name;const name=make('input','global-name'),value=make('input','global-value'),remove=ui('button','','×');name.value=v.name;value.value=v.value;name.spellcheck=value.spellcheck=false;
      const message=make('span','field-error');message.id='declaration-error-'+v.name;message.setAttribute('role','status');name.setAttribute('aria-describedby',message.id);value.setAttribute('aria-describedby',message.id);
      if(/^-?\d+(\.\d+)?$/.test(v.value))value.inputMode='decimal';
      if(v.kind!=='LIST')value.setAttribute('list','ink-value-suggestions');
      if(v.kind==='LIST')I.bind(value,'Comma-separated items; parentheses mark initially selected items','title');
      else I.bind(value,'Ink value: number, true/false, quoted text, or expression','title');
      I.bind(name,'Variable name','aria-label');I.bind(value,'Initial value','aria-label');I.bind(remove,'Delete variable','title');I.bind(remove,'Delete variable','aria-label');
      name.onchange=()=>{const proposed=name.value.trim();if(!renameVariable(v.name,proposed)){I.bind(error,'');name.setAttribute('aria-invalid','true');I.bind(message,validName(proposed)?'That name is already in use.':'Use letters, digits and underscores; start with a letter or underscore.');}};
      name.onkeydown=e=>{if(e.key==='Enter')name.blur();if(e.key==='Escape'){e.stopPropagation();name.value=v.name;name.removeAttribute('aria-invalid');message.textContent='';name.blur();}};
      let original=v.value,originalBody=A.State.nodes[v.id].body,recorded=false;value.onfocus=()=>{original=value.value;originalBody=A.State.nodes[v.id].body;recorded=false;};
      value.oninput=()=>{if(!recorded){A.flushPendingEdit();A.pushHistory();recorded=true;}const lines=A.State.nodes[v.id].body.split('\n'),old=lines[v.line],comment=old.slice(clean(old).trimEnd().length);lines[v.line]=v.kind+' '+v.name+' = '+value.value+comment;A.updateBody(v.id,lines.join('\n'),false);};
      value.onblur=()=>{if(recorded){recorded=false;setTimeout(refresh,0);}};
      value.onkeydown=e=>{if(e.key==='Enter')value.blur();if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(recorded)A.updateBody(v.id,originalBody,false);value.value=original;value.blur();}};
      remove.onclick=()=>{const state=A.State;const refs=A.State.order.reduce((count,id)=>count+clean(A.State.nodes[id].body).split('\n').filter((line,i)=>!(id===v.id&&i===v.line)&&new RegExp('\\b'+v.name+'\\b').test(line)).length,0);A.ask('Delete '+v.name+'?',refs?I.t('This name appears on {count} other lines. Removing it may break the story.',{count:refs}):I.t('Remove this declaration?'),null,ok=>{if(ok&&state===A.State){removeVariable(v.name);A.toast('Declaration deleted · Ctrl+Z to undo');}},true);};row.append(name,value,remove,message);
      if(v.kind==='LIST'){
        const items=v.value.split(',').map(text=>text.trim()),checks=make('div','list-initial');checks.append(ui('span','','Initially selected items'));
        items.forEach((item,index)=>{const parsed=item.match(/^(\()?\s*([A-Za-z_]\w*(?:\s*=\s*-?\d+)?)\s*(\))?$/);if(!parsed)return;const label=make('label'),box=make('input');box.type='checkbox';box.checked=!!parsed[1];label.append(box,make('span','',parsed[2]));checks.append(label);box.onchange=()=>{value.focus();items[index]=box.checked?'('+parsed[2]+')':parsed[2];value.value=items.join(', ');value.dispatchEvent(new Event('input'));value.blur();};});row.append(checks);
      }
      list.append(row);
    }
  }
  // Editable spans map only literal story text back to source offsets.
  const unescape=text=>text.replace(/\\(.)/g,'$1');
  const literal=text=>text.replace(/\\/g,'\\\\').replace(/[\[\]{}#]/g,'\\$&').replace(/->|<-|<>/g,'\\$&').replace(/^([*+~\-])/,'\\$1');
  function bindText(container,id,line,start,end,raw){
    const token=/\\.|\{[^{}]*\}/g;let at=start,m;
    function part(a,b){if(a>=b)return;const span=make('span','story-text',unescape(raw.slice(a,b)));span.contentEditable='plaintext-only';span.spellcheck=true;span.dataset.line=line;span.dataset.start=a;span.dataset.end=b;span.setAttribute('role','textbox');I.bind(span,'Edit story text','aria-label');
      let original=A.State.nodes[id].body,originalText=span.textContent,recorded=false;
      span.onfocus=()=>{A.flushPendingEdit();A.select(id);original=A.State.nodes[id].body;originalText=span.textContent;recorded=false;};
      span.onmousedown=e=>e.stopPropagation();
      span.onpaste=e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain').replace(/[\r\n]+/g,' '));};
      span.oninput=()=>{if(!recorded){A.pushHistory();recorded=true;}const lines=A.State.nodes[id].body.split('\n'),a=Number(span.dataset.start),b=Number(span.dataset.end);const text=literal(span.textContent.replace(/[\r\n]+/g,' ')),delta=text.length-(b-a);lines[line]=lines[line].slice(0,a)+text+lines[line].slice(b);span.dataset.end=a+text.length;
        A.State.nodes[id]._el.querySelectorAll('.story-text').forEach(other=>{if(other!==span&&Number(other.dataset.line)===line&&Number(other.dataset.start)>=b){other.dataset.start=Number(other.dataset.start)+delta;other.dataset.end=Number(other.dataset.end)+delta;}});A.updateBody(id,lines.join('\n'),false);A.drawEdges();};
      span.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();span.blur();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(recorded)A.updateBody(id,original,false);span.textContent=originalText;span.blur();A.render();}else if(e.key==='Tab'){span.blur();}};
      span.onblur=()=>{if(A.State.sel===id)A.select(id);A.drawEdges();};container.append(span);
    }
    token.lastIndex=start;while((m=token.exec(raw))&&m.index<end){if(m[0].startsWith('\\'))continue;part(at,m.index);container.append(make('span','story-expression',m[0]));at=m.index+m[0].length;}part(at,end);
  }
  function range(raw,choice){
    let start=(raw.match(/^\s*(?:[*+\-](?:\s*[*+\-])*\s*)?(?:\(\s*\w+\s*\)\s*)?(?:\{[^{}]*\}\s*)*/)||[''])[0].length;
    if(/^\s*(?:~|#|VAR\b|CONST\b|LIST\b|EXTERNAL\b|INCLUDE\b)/.test(raw))return [];
    let end=raw.length;const re=/\\.|\{[^{}]*\}|->|<-|\/\/|#/g;let m;while((m=re.exec(raw))){if(m[0].startsWith('\\')||m[0].startsWith('{'))continue;end=m.index;break;}
    while(end>start&&/\s/.test(raw[end-1]))end--;
    if(choice){let open=-1,close=-1;for(let i=start;i<end;i++){if(raw[i]==='\\'){i++;continue;}if(raw[i]==='['&&open<0)open=i;else if(raw[i]===']'&&open>=0){close=i;break;}}if(open>=start&&close>=0)return [[start,open],[open+1,close]];}
    return end>start?[[start,end]]:[];
  }
  function emptyText(container,id){
    const span=make('span','story-text empty-story');span.contentEditable='plaintext-only';I.bind(span,'no text yet','data-placeholder');I.bind(span,'Edit story text','aria-label');span.setAttribute('role','textbox');let original=A.State.nodes[id].body,recorded=false;
    span.onfocus=()=>{A.flushPendingEdit();A.select(id);original=A.State.nodes[id].body;recorded=false;};span.onmousedown=e=>e.stopPropagation();
    span.oninput=()=>{if(!recorded){A.pushHistory();recorded=true;}A.updateBody(id,literal(span.textContent.replace(/[\r\n]+/g,' '))+'\n'+original,false);};
    span.onkeydown=e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();e.stopPropagation();if(e.key==='Escape'&&recorded)A.updateBody(id,original,false);span.blur();}};
    span.onblur=()=>{if(recorded){A.render();A.select(id);}};container.append(span);
  }
  function attachNodes(){
    for(const id of A.State.order){const n=A.State.nodes[id],card=n._el;if(!card)continue;const lines=clean(n.body).split('\n'),original=n.body.split('\n');
      const rows=new Map([...card.querySelectorAll('.choice-row')].map(row=>[Number(row.dataset.line),row]));
      if(card.dataset.flowReady)return;card.dataset.flowReady='true';
      const intro=card.querySelector('.prose'),ports=intro?.querySelector('.body-exits');if(!intro)continue;intro.textContent='';card.querySelector('.choice-continuation')?.remove();
      const flow=make('div','story-flow');intro.after(flow);let destination=intro,stack=[],blockDepth=0;const activeGroups=new WeakSet();
      const response=row=>{let details=row.querySelector('.choice-response');if(!details){details=make('details','choice-response');details.append(ui('summary','','Response text and effects'));details.addEventListener('mousedown',e=>e.stopPropagation());details.addEventListener('toggle',()=>{A.drawEdges();window.InkblotsCanvas?.render();});row.append(details);}return details;};
      function targets(container,line){for(const out of n.out||[]){if(n.diverts[out.idx]?.line!==line)continue;const target=make('div','response-target');target.append(ui('span','','Continues to'),make('span','',out.raw));container.append(target);}}
      function textLine(container,i,ranges=range(lines[i],false)){if(!ranges.length)return;const text=make('div','story-line');for(const [a,b]of ranges)bindText(text,id,i,a,b,original[i]);container.append(text);}
      for(let i=0;i<lines.length;i++){
        const raw=lines[i],row=rows.get(i),choice=raw.match(/^\s*([*+](?:\s*[*+])*)/),gather=blockDepth===0&&raw.match(/^\s*(-(?:\s*-)*)(?![>\-])(?:\s|$)/);
        if(row&&choice){const depth=choice[1].replace(/\s/g,'').length;while(stack.length&&stack.at(-1).depth>=depth)stack.pop();
          const host=stack.length?response(stack.at(-1).row):flow;
          if(stack.length)host.open=true;
          if(!activeGroups.has(host)){host.append(ui('div','flow-heading',depth>1?'Nested choices':'Choices'));activeGroups.add(host);}host.append(row);
          const label=row.querySelector('.choice-label');label.textContent='';for(const [a,b]of range(raw,true))bindText(label,id,i,a,b,original[i]);if(!label.textContent)I.bind(label,'Automatic choice');
          const ranges=range(raw,true),shared=ranges.length===2?raw.slice(ranges[0][0],ranges[0][1]):ranges.length?raw.slice(ranges[0][0],ranges[0][1]):'';
          I.bind(label,'Choice text','aria-label');
          const details=response(row);if(shared.trim()){const note=make('div','shared-text-note'),caption=ui('span','','Shared text also appears after choosing:');note.append(caption,make('span','',unescape(shared)));details.append(note);}
          if(ranges.length===2){const close=ranges[1][1],all=range(raw,false);if(all.length&&close+1<all[0][1])textLine(details,i,[[close+1,all[0][1]]]);}
          const prefix=raw.replace(/^\s*[*+](?:\s*[*+])*\s*(?:\(\w+\)\s*)?/,'').match(/^(?:\{[^{}]*\}\s*)*/)?.[0]||'';const tags=make('div','condition-tags');for(const m of prefix.matchAll(/\{([^{}]*)\}/g))tags.append(make('span','pill condition-tag','? '+m[1]));if(tags.childElementCount)row.append(tags);
          targets(details,i);
          stack.push({depth,row});destination=details;continue;
        }
        if(gather){const depth=gather[1].replace(/\s/g,'').length;while(stack.length&&stack.at(-1).depth>=depth)stack.pop();const host=stack.length?response(stack.at(-1).row):flow;destination=make('section','choice-continuation');host.append(destination);destination.append(ui('div','flow-heading','Rejoin / continue'));activeGroups.delete(host);}
        if(/^\s*~/.test(raw)){destination.append(make('div','pill variable-change',raw.trim().replace(/^~\s*/,'')));continue;}
        // Keep control blocks explicit so effects are never presented as unconditional.
        const structural=raw.replace(/"(?:\\.|[^"\\])*"/g,'');const opens=(structural.match(/\{/g)||[]).length,closes=(structural.match(/\}/g)||[]).length;
        if(opens!==closes || (blockDepth>0 && /^\s*-\s*[^:]*:\s*$/.test(raw))){
          const control=make('div','logic-context');
          if(/^\s*}\s*$/.test(raw))I.bind(control,'End block');
          else if(/^\s*-\s*else\s*:/.test(raw))I.bind(control,'Otherwise');
          else {const caption=ui('span','',opens>closes?'Logic:':'When:');control.append(caption,make('span','',raw.trim().replace(/^\{\s*|^-\s*/,'').replace(/:\s*$/,'')));}
          destination.append(control);blockDepth=Math.max(0,blockDepth+opens-closes);continue;
        }
        textLine(destination,i);
        if(stack.length)targets(destination,i);
      }
      if(!intro.childElementCount)emptyText(intro,id);if(ports?.childElementCount){const hint=ui('span','body-exit-hint','Continue after choices');intro.append(hint,ports);I.bind(ports,'Continue after choices','title');}
      if(!flow.childElementCount)flow.remove();
      if(card.classList.contains('has-choices')){const prose=card.querySelector('.prose');card.querySelector('.addout').style.top=(prose.offsetTop+prose.offsetHeight/2-9)+'px';}
    }
  }
  function render(){manager();attachNodes();A.drawEdges();window.InkblotsCanvas?.render();}
  window.addEventListener('inkblots-render',render);window.InkblotsGlobals={declarations,add:addVariable,remove:removeVariable,rename:renameVariable,render,clean};render();
})();
