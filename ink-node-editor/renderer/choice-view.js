/* Display-only choice extraction. Never rewrites Ink source or evaluates conditions. */
(function(root) {
  function choiceView(node) {
    const rows=[], prose=[], before=[], after=[], owners=new Map(), stack=[];let blockDepth=0;
    const lines=node.body.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' ')).split('\n');
    lines.forEach((raw,line)=>{
      const text=raw.replace(/\/\/.*$/,'');
      const choice=text.match(/^\s*([*+](?:\s*[*+])*)\s*(.*)$/);
      const gather=blockDepth===0 && text.match(/^\s*(-(?:\s*-)*)(?![>\-])(?:\s|$)/);
      if(choice) {
        const depth=choice[1].replace(/\s/g,'').length;
        while(stack.length && stack[stack.length-1].depth>=depth)stack.pop();
        let label=choice[2].replace(/^\([\w]+\)\s*/,'');
        while(/^\{[^{}:|]*\}\s*/.test(label))label=label.replace(/^\{[^{}:|]*\}\s*/,'');
        label=label.replace(/\s*(?:->|<-|#).*$/,'').trim();
        const bracket=label.indexOf('['), close=label.indexOf(']',bracket);
        if(bracket>=0 && close>=0)label=label.slice(0,bracket)+label.slice(bracket+1,close);
        const row={line,depth,sticky:choice[1].trim().endsWith('+'),conditions:[...choice[2].matchAll(/\{([^{}:|]*)\}/g)].map(m=>m[1]),label:label.trim(),exits:[]};rows.push(row);stack.push(row);
      } else if(gather) {
        while(stack.length && stack[stack.length-1].depth>=gather[1].replace(/\s/g,'').length)stack.pop();
      }
      if(stack.length)owners.set(line,stack[stack.length-1]);else {prose.push(raw);(rows.length?after:before).push(raw);}
      const structure=text.replace(/"(?:\\.|[^"\\])*"|\\./g,'');blockDepth=Math.max(0,blockDepth+(structure.match(/\{/g)||[]).length-(structure.match(/\}/g)||[]).length);
    });
    for(const out of node.out||[]) {
      const line=node.diverts[out.idx]?.line, owner=owners.get(line);
      if(owner)owner.exits.push(out);
    }
    return {rows,prose:prose.join('\n'),before:before.join('\n'),after:after.join('\n'),rowExits:new Set(rows.flatMap(r=>r.exits.map(o=>o.idx)))};
  }
  if(typeof module!=='undefined' && module.exports)module.exports=choiceView;
  else root.inkChoiceView=choiceView;
})(typeof window!=='undefined'?window:globalThis);
