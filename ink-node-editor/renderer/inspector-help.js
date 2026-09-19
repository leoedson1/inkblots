/* Hover descriptions over the highlight mirror, without intercepting text selection. */
(() => {
  const I=window.InkblotsI18n;
  function identify(text,cls,after='') {
    const s=text.trim();
    if(cls==='tok-comment')return s.startsWith('/*')?'block-comment':'comment';
    if(cls==='tok-decl')return {VAR:'var',CONST:'const',LIST:'list',EXTERNAL:'external',INCLUDE:'include-help'}[s.split(/\s/)[0]];
    if(cls==='tok-logic')return /\btemp\b/.test(s)?'temp':/\bRANDOM\s*\(/.test(s)?'random':/\bLIST_COUNT\s*\(/.test(s)?'list-count':/\+=/.test(s)?'incr':'set';
    if(cls==='tok-tag')return 'tag';
    if(cls==='tok-label')return 'label';
    if(cls==='tok-marker')return s[0]==='+'?'sticky':s[0]==='*'?'choice':'gather';
    if(cls==='tok-cond')return s.startsWith('{&')?'cycle':s.startsWith('{!')?'once':s.startsWith('{~')?'shuffle':s.includes(':')?'ifelse-inline':s.includes('|')?'seq':'if-inline';
    if(cls==='tok-divert')return s.startsWith('<-')?'thread':s.startsWith('->->')?'tunnel':/^->\s*END\b/.test(s)?'end':/^->\s*DONE\b/.test(s)?'done':/^\s*->(?!>)/.test(after)?'tunnel':'divert';
    return null;
  }
  const tip=document.createElement('div');tip.id='inspector-tooltip';tip.className='ink-tooltip';tip.setAttribute('role','tooltip');document.body.append(tip);
  let timer=null,hit=null;
  function hide(){clearTimeout(timer);timer=null;hit=null;tip.classList.remove('show');}
  function attach(editor,code){
    editor.addEventListener('mousemove',e=>{
      if(e.buttons){hide();return;}
      const bounds=editor.getBoundingClientRect();
      if(e.clientX>=bounds.right-12 || e.clientY<bounds.top || e.clientY>bounds.bottom){hide();return;}
      const token=[...code.querySelectorAll('[data-help]')].find(span=>[...span.getClientRects()].some(r=>e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom));
      if(!token){hide();return;}
      if(hit?.token===token && Math.hypot(e.clientX-hit.x,e.clientY-hit.y)<4)return;
      hide();hit={token,x:e.clientX,y:e.clientY};const current=hit;
      timer=setTimeout(()=>{
        if(hit!==current || !editor.isConnected || !token.isConnected)return;
        const snippet=window.INK_SNIPPETS.flatMap(g=>g.items).find(i=>i.id===token.dataset.help);
        const description=snippet?.desc || (token.dataset.help==='include-help'?'Include another Ink file in this story.':'');
        if(!description)return;
        I.bind(tip,description);tip.style.left='0px';tip.style.top='0px';tip.classList.add('show');
        tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,current.x+14))+'px';
        tip.style.top=Math.max(8,Math.min(innerHeight-tip.offsetHeight-8,current.y+18))+'px';
      },450);
    });
    for(const event of ['mouseleave','mousedown','keydown','input','scroll','blur'])editor.addEventListener(event,hide);
  }
  new MutationObserver(hide).observe(document.querySelector('#side-body'),{childList:true});
  for(const event of ['blur','resize','inkblots-language'])window.addEventListener(event,hide);
  window.InkblotsSyntaxHelp={identify,attach,hide};
})();
