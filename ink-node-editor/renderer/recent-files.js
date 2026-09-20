/* Recent paths only: reopening reads the current file rather than a cached copy. */
(() => {
 const A=window.Inkblots,I=window.InkblotsI18n,N=window.inkNative,key='inkblots-recent-files';
 const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!=null)e.textContent=text;return e;},ui=(tag,cls,text)=>I.bind(make(tag,cls),text);
 function entries(){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(v=>v&&typeof v.path==='string'&&typeof v.name==='string').slice(0,12):[];}catch{return [];}}
 const identity=p=>N?.platform==='win32'?p.replace(/\//g,'\\').toLowerCase():p;
 function record(files){let recent=entries();for(const file of files){if(!file.path)continue;recent=recent.filter(v=>identity(v.path)!==identity(file.path));recent.unshift({path:file.path,name:file.name||file.path.split(/[\\/]/).pop()});}try{localStorage.setItem(key,JSON.stringify(recent.slice(0,12)));}catch{}}
 const dialog=make('dialog','help-guide');dialog.id='recent-dialog';const header=make('header'),close=ui('button','btn','Close'),clear=ui('button','btn','Clear recent files'),list=make('div'),error=make('p','global-error');error.setAttribute('role','status');header.append(ui('h2','','Open Recent'),close);dialog.append(header,error,list,clear);document.body.append(dialog);close.onclick=()=>dialog.close();dialog.addEventListener('keydown',e=>e.stopPropagation());
 async function reopen(file){
  const found=A.Tabs.findIndex(t=>t.filePath&&identity(t.filePath)===identity(file.path));if(found>=0){A.switchTab(found);record([file]);dialog.close();return true;}
  try{if(!N?.read)throw Error('unavailable');const content=await N.read(file.path);A.openFilesInTabs([{...file,content}]);dialog.close();return true;}catch{I.bind(error,'Unable to open this file. It may have been moved or deleted.');return false;}
 }
 function forget(file){localStorage.setItem(key,JSON.stringify(entries().filter(v=>identity(v.path)!==identity(file.path))));render();}
 function render(){list.textContent='';I.bind(error,'');const recent=entries();clear.disabled=!recent.length;if(!recent.length)list.append(ui('p','','No recent files.'));for(const file of recent){const row=make('div','recent-row'),button=make('button','btn recent-file'),remove=ui('button','btn','Remove'),locate=ui('button','btn','Locate…');button.append(make('strong','',file.name),make('small','',file.path));button.onclick=()=>reopen(file);remove.onclick=()=>forget(file);locate.disabled=!N?.open;locate.onclick=async()=>{try{const files=await N.open();if(!files?.length)return;A.openFilesInTabs(files);forget(file);record(files);dialog.close();}catch{I.bind(error,'Unable to open this file. It may have been moved or deleted.');}};row.append(button,locate,remove);list.append(row);}}
 clear.onclick=()=>{localStorage.removeItem(key);render();};
 function open(){render();if(!dialog.open)dialog.showModal();}
 window.InkblotsRecent={record,entries,reopen,open,clear:()=>{localStorage.removeItem(key);render();}};record(A.Tabs.filter(t=>t.filePath).map(t=>({path:t.filePath,name:t.fileName})));
})();
