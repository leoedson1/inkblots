const path=require('node:path');
if(!process.versions.electron){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(require('electron'),[__filename],{env,stdio:'inherit',timeout:90000});if(r.error)throw r.error;process.exit(r.status??1);}
const {app,BrowserWindow,ipcMain}=require('electron'),fs=require('node:fs');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'inkblots-choices-')));
ipcMain.on('system-languages',e=>{e.returnValue=['en-US'];});
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{preload:path.join(__dirname,'../preload.js'),sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',(_e,level,msg)=>{if(level===3)errors.push(msg);});
 try{
  await win.loadFile(path.join(__dirname,'../renderer/index.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const A=Inkblots,C=InkblotsCanvas,$=s=>document.querySelector(s),checks=[];
   const check=(ok,msg)=>{if(!ok)throw Error(msg);checks.push(msg);};
   const mouse=(target,type,x,y)=>target.dispatchEvent(new MouseEvent(type,{clientX:x,clientY:y,button:0,bubbles:true,cancelable:true}));
   const source='VAR met_cat = true\\n-> platform\\n=== platform ===\\nThe board clatters. Two trains, no announcements.\\n+ [Take the northbound train] -> north_train\\n+ [Wait, and watch the cat] -> the_cat // A patient choice\\n+ {met_cat} [Ask the cat which train] -> cat_advice\\n=== north_train ===\\nYou board the train.\\n-> END\\n=== the_cat ===\\nThe cat waits.\\n-> END\\n=== cat_advice ===\\nTake the warmer train.\\n-> END';
   A.openFilesInTabs([{name:'Choice layout.ink',content:source}]);
   A.State.layout={'::start':[-320,80],platform:[80,80],north_train:[480,50],the_cat:[480,250],cat_advice:[480,450]};A.State.view={x:0,y:0,k:1};A.render();A.applyTransform();A.drawEdges();
   const card=()=>A.State.nodes.platform._el;
   check(card().querySelectorAll('.choice-row').length===3,'Three separated choice rows');
   check(card().querySelector('.prose').textContent==='The board clatters. Two trains, no announcements.','Scene prose excludes duplicated choice text');
   check([...card().querySelectorAll('.choice-label')].map(e=>e.textContent).join('|')==='Take the northbound train|Wait, and watch the cat|Ask the cat which train','Choice labels omit Ink markers, conditions and brackets');
   check(!card().querySelector('.pills'),'Choice targets are not repeated in footer pills');
   for(const zoom of [0.7,1,1.5]){
    A.State.view.k=zoom;A.applyTransform();A.drawEdges();
    for(const port of card().querySelectorAll('.choice-port')){
     const r=port.getBoundingClientRect(),p=A.screenToWorld(r.left+r.width/2,r.top+r.height/2),edge=$('#egroup path[data-from="platform"][data-idx="'+port.dataset.idx+'"]');
     const m=edge.getAttribute('d').match(/^M([^,]+),([^ ]+)/);
     check(Math.abs(Number(m[1])-p[0])<=1 && Math.abs(Number(m[2])-p[1])<=1,'Edge starts at choice connector '+port.dataset.idx+' at zoom '+zoom);
    }
   }
   A.State.view.k=1;A.applyTransform();
   const port=card().querySelector('[data-idx="0"]'),r=port.getBoundingClientRect(),target=A.State.nodes.cat_advice._el.getBoundingClientRect();
   mouse(port,'mousedown',r.left+6,r.top+6);mouse(window,'mousemove',target.left+40,target.top+20);mouse(window,'mouseup',target.left+40,target.top+20);
   check(A.State.nodes.platform.body.includes('[Take the northbound train] -> cat_advice'),'Dragging a choice connector rewires the right divert');A.undo();
   check(A.State.nodes.platform.body.includes('[Take the northbound train] -> north_train'),'Choice rewiring supports undo');
   const commentPort=card().querySelector('[data-idx="1"]');commentPort.dispatchEvent(new MouseEvent('mouseenter'));
   check($('#comments-tooltip').textContent.includes('A patient choice'),'Choice connector retains inline comment tooltip');
   C.selectMany(['platform']);C.addZone();
   check(A.State.organizer.zones[0].h===card().offsetHeight+88,'Zones fit the taller choice card');
   check(A.compile().story,'Choice-card source still compiles');
   const saved=A.serialize(true).text;A.load(saved,{keepView:true});
   check(card().querySelectorAll('.choice-row').length===3,'Choice rows survive save and reload');
   A.openFilesInTabs([{name:'many.ink',content:'-> many\\n=== many ===\\n'+Array.from({length:12},(_,i)=>'+ [Choice '+i+'] -> END').join('\\n')}]);
   check(A.State.nodes.many._el.querySelectorAll('.choice-row').length===12,'All twelve choices remain visible');
   A.openFilesInTabs([{name:'local.ink',content:'-> local\\n=== local ===\\n* [<img src=x>]\\n    Local prose.\\n* [Branch]\\n    -> ending\\n- Shared prose.\\n-> ending\\n=== ending ===\\n-> END'}]);
   const local=A.State.nodes.local._el;
   check(local.querySelectorAll('.choice-row').length===2 && local.querySelector('.choice-port.local'),'Inline choices use a local continuation indicator');
   check(!local.querySelector('img') && local.textContent.includes('<img src=x>'),'Choice text is rendered safely as text');
   check(local.querySelectorAll('.choice-port[data-idx]').length===1,'Multiline choice exit belongs to its row');
   check(local.querySelector('.choice-continuation').previousElementSibling.classList.contains('choice-row'),'Shared continuation stays after the choice rows');
   check(local.querySelector('.pills .pill'),'Shared gather exit keeps a separate connection');
   A.load(source,{});A.State.fileName='Choice layout.ink';A.State.layout={'::start':[-320,80],platform:[80,80],north_train:[480,50],the_cat:[480,250],cat_advice:[480,450]};A.State.view={x:0,y:0,k:1};A.render();A.applyTransform();A.drawEdges();
   return checks;
  })()`);
  console.log(result.map(m=>'PASS '+m).join('\n'));
  const out=path.join(__dirname,'../dist/qa');fs.mkdirSync(out,{recursive:true});
  for(const theme of ['dark','light']){
   await win.webContents.executeJavaScript(`document.documentElement.setAttribute('data-theme','${theme}');`);await win.webContents.capturePage();await new Promise(r=>setTimeout(r,150));
   fs.writeFileSync(path.join(out,'choice-cards-'+theme+'.png'),(await win.webContents.capturePage()).toPNG());
  }
  if(errors.length)throw Error(errors.join('\n'));app.exit(0);
 }catch(error){console.error(error);app.exit(1);}
});
