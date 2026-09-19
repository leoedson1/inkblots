const path = require('node:path');
if (!process.versions.electron) {
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const result=require('node:child_process').spawnSync(require('electron'),[__filename],{env,stdio:'inherit',timeout:90000});
  if(result.error)throw result.error;process.exit(result.status??1);
}
const {app,BrowserWindow,ipcMain}=require('electron'),fs=require('node:fs');
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'inkblots-language-test-')));
let system=['ja-JP'],nativeLanguage;
ipcMain.on('system-languages',e=>{e.returnValue=system;});
ipcMain.on('ui-language',(_e,language)=>{nativeLanguage=language;});
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,width:1440,height:1000,titleBarStyle:'hidden',titleBarOverlay:{height:48},webPreferences:{preload:path.join(__dirname,'../preload.js'),sandbox:true,contextIsolation:true,backgroundThrottling:false}});
  const errors=[];win.webContents.on('console-message',(_e,level,message)=>{if(level===3)errors.push(message);});
  const evaluate=code=>win.webContents.executeJavaScript(code);
  const settle=()=>evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const out=path.join(__dirname,'../dist/qa');fs.mkdirSync(out,{recursive:true});
  const timeout=setTimeout(()=>{console.error('Language checks timed out');app.exit(1);},60000);
  try {
    await win.loadFile(path.join(__dirname,'../renderer/index.html'));
    const report=await evaluate(`(async()=>{
      const I=InkblotsI18n,A=Inkblots,C=InkblotsCanvas,$=s=>document.querySelector(s),checks=[];
      const check=(ok,message)=>{if(!ok)throw Error(message);checks.push(message);};
      check(I.language==='ja' && document.documentElement.lang==='ja','First launch detects Japanese system language');
      check($('[data-menu="File"]').previousElementSibling.textContent==='ファイル','Initial menu is translated');
      check($('#st-state').textContent===I.t('Saved'),'Static translation does not overwrite dynamic startup status');
      check(I.resolve(['de-DE'])==='en' && I.resolve(['zh-Hans-CN'])==='zh-CN' && I.resolve(['pt-BR'])==='pt-BR','Locale mapping and unsupported-language fallback');
      I.setLanguage('en');
      A.openFilesInTabs([{name:'Saved.ink',content:'-> sample\\n=== sample ===\\n// Saved\\nSaved\\n+ [Save] -> END'}]);
      C.addNote([600,200]);A.State.organizer.notes[0].text='Save';C.selectMany(['sample']);C.addZone();A.State.organizer.zones[0].name='File';A.render();
      const source=A.serialize(false).text, names=A.Tabs.map(t=>t.fileName).join('|');
      const expected={ja:['ファイル','保存','ショートカット一覧'], 'zh-CN':['文件','保存','快捷键指南'], 'pt-BR':['Arquivo','Salvar','Guia de atalhos']};
      for(const [lang,words] of Object.entries(expected)) {
        document.querySelector('[data-language="'+lang+'"]').click();
        check(I.language===lang && localStorage.getItem('inkblots-language')===lang,'Language menu persists '+lang);
        check($('[data-menu="File"]').previousElementSibling.textContent===words[0] && $('#b-save').textContent===words[1],'Menus and static controls translate '+lang);
        check($('[data-menu="Help"]').textContent.includes(words[2]),'Hotkeys help translates '+lang);
        check(A.serialize(false).text===source && A.Tabs.map(t=>t.fileName).join('|')===names && A.State.organizer.notes[0].text==='Save' && A.State.organizer.zones[0].name==='File','Language switch preserves authored content '+lang);
        check(A.State.nodes.sample._el.querySelector('.prose').textContent.includes('Saved'),'Node prose is untouched '+lang);
        A.State.nodes.sample._el.querySelector('.comment-badge').dispatchEvent(new MouseEvent('mouseenter'));
        check($('#comments-tooltip p').textContent==='Saved' && !$('.comment-badge').hasAttribute('title'),'Authored comments stay unchanged '+lang);
        check($('#st-state').textContent===I.t('Unsaved changes'),'Dynamic status translates '+lang);
        window.showInkblotsGuide();A.ask('Close Saved.ink?','This file has unsaved changes that will be lost.',null,()=>{},true,"Don't Save");
        check(!$('#user-guide').open,'Close confirmation remains visible above help '+lang);
        check($('#m-title').textContent===I.t('Close {name}?',{name:'Saved.ink'}) && $('#m-ok').textContent===I.t("Don't Save"),'Formatted close prompt translates '+lang);$('#m-cancel').click();
        C.openQuick(260,240);const search=$('#quick-ink input');search.value=I.t('Knot');search.dispatchEvent(new Event('input'));
        check($('#quick-results').textContent.includes(I.t('Knot')),'Quick insertion searches localized terms '+lang);
        search.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        window.showInkblotsHotkeys();check($('#hotkeys-guide').open && $('#hotkeys-guide').textContent.includes('Ctrl+G'),'Hotkeys guide opens '+lang);
        $('#hotkeys-guide button').click();
        window.showInkblotsGuide();check($('#user-guide').textContent.includes(I.t('Start a story')),'User guide translates '+lang);$('#user-guide button').click();
        const catalog=window.INK_SNIPPETS;
        check(catalog.every(g=>InkblotsMessages[lang][g.label] && g.items.every(it=>InkblotsMessages[lang][it.label] && InkblotsMessages[lang][it.desc])),'Complete snippet labels and descriptions '+lang);
      }
      check(window.INK_SNIPPETS.flatMap(g=>g.items).find(i=>i.id==='story-inkblots-tour').label==='Full Feature Demo','Showcase has new name');
      I.setLanguage('en');check($('[data-menu="File"]').previousElementSibling.textContent==='File','English can be restored');
      I.setLanguage('auto');check(I.language==='ja' && I.preference==='auto','Automatic language can be restored');
      I.setLanguage('pt-BR');
      return checks;
    })()`);
    console.log(report.map(x=>'PASS '+x).join('\n'));
    if(nativeLanguage!=='pt-BR')throw Error('Native language bridge was not updated');
    await new Promise(r=>{win.webContents.once('did-finish-load',r);win.reload();});
    if(await evaluate('InkblotsI18n.language')!=='pt-BR')throw Error('Preference not restored after reload');
    console.log('PASS Manual choice survives restart');
    for(const lang of ['ja','zh-CN','pt-BR']) {
      await evaluate(`InkblotsI18n.setLanguage('${lang}');window.showInkblotsHotkeys();`);
      await settle();await new Promise(r=>setTimeout(r,150));
      fs.writeFileSync(path.join(out,'hotkeys-'+lang+'.png'),(await win.webContents.capturePage()).toPNG());
      await evaluate(`document.querySelector('#hotkeys-guide').close();window.showInkblotsGuide();`);
      await settle();await new Promise(r=>setTimeout(r,150));
      fs.writeFileSync(path.join(out,'guide-'+lang+'.png'),(await win.webContents.capturePage()).toPNG());
      await evaluate(`document.querySelector('#user-guide').close();`);
    }
    win.setSize(900,700);
    for(const language of ['en','ja','zh-CN','pt-BR']) {
      await evaluate(`InkblotsI18n.setLanguage('${language}');`);await settle();
      const layout=await evaluate(`(()=>{const b=document.querySelector('#b-play').getBoundingClientRect();return {right:b.right,width:innerWidth};})()`);
      if(layout.right>layout.width-130)throw Error('Translated toolbar overlaps native window controls ('+language+'): '+JSON.stringify(layout));
    }
    fs.writeFileSync(path.join(out,'portuguese-small-window.png'),(await win.webContents.capturePage()).toPNG());
    if(errors.length)throw Error(errors.join('\n'));
    console.log('PASS Localized toolbar fits minimum window width');
    clearTimeout(timeout);app.exit(0);
  } catch(error){console.error(error);clearTimeout(timeout);app.exit(1);}
});
