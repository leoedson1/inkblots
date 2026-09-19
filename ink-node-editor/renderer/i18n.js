/* Explicit UI bindings: never walk or translate authored story content. */
(() => {
  const messages = window.InkblotsMessages;
  const supported = ['en', 'ja', 'zh-CN', 'pt-BR'];
  function resolve(languages) {
    for (const value of Array.isArray(languages) ? languages : [languages]) {
      const lang = String(value || '').toLowerCase().replace('_','-');
      if (lang.startsWith('ja')) return 'ja';
      if (lang.startsWith('zh')) return 'zh-CN';
      if (lang.startsWith('pt')) return 'pt-BR';
      if (lang.startsWith('en')) return 'en';
    }
    return 'en';
  }
  let preference = 'auto';
  try { const saved = localStorage.getItem('inkblots-language'); if (saved === 'auto' || supported.includes(saved)) preference = saved; } catch (_) {}
  const systemLanguages = () => window.inkNative?.getSystemLanguages?.() || navigator.languages || [navigator.language];
  let language = preference === 'auto' ? resolve(systemLanguages()) : preference;
  const bindings = new Map();
  // Formatted English messages are accepted at UI boundaries, never in story fields.
  const patterns = Object.keys(messages.ja).filter(k => k.includes('{')).map(key => {
    const names = []; const escaped = key.split(/(\{\w+\})/).map(part => {
      if (/^\{/.test(part)) { names.push(part.slice(1,-1)); return '(.*?)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    return {key,names,regex:new RegExp('^'+escaped+'$', 's')};
  });
  function t(key, values = {}) {
    key = String(key ?? '');
    let template = key;
    if (!Object.hasOwn(messages.ja,key)) {
      for (const p of patterns) { const match = p.regex.exec(key); if (match) { template=p.key; values=Object.fromEntries(p.names.map((n,i)=>[n,match[i+1]])); break; } }
    }
    const text = messages[language]?.[template] ?? template;
    return text.replace(/\{(\w+)\}/g, (all,name) => Object.hasOwn(values,name) ? (typeof values[name]==='function' ? values[name]() : values[name]) : all);
  }
  let prunePending=false;
  function bind(element,key,attr,values) {
    if(!prunePending){prunePending=true;requestAnimationFrame(()=>{prunePending=false;for(const el of bindings.keys())if(!el.isConnected)bindings.delete(el);});}
    let entries=bindings.get(element); if(!entries){entries=new Map();bindings.set(element,entries);}
    entries.set(attr || 'textContent',{key,values});
    const result=t(key,values); if(attr)element.setAttribute(attr,result);else element.textContent=result;
    return element;
  }
  function translateMarkup(root=document) {
    root.querySelectorAll('[data-i18n]').forEach(el=>bind(el,el.dataset.i18n));
    for (const attr of ['title','placeholder','aria-label']) root.querySelectorAll('[data-i18n-'+attr+']').forEach(el=>bind(el,el.getAttribute('data-i18n-'+attr),attr));
  }
  function apply() {
    document.documentElement.lang=language;
    for (const [element,entries] of bindings) {
      if(!element.isConnected){bindings.delete(element);continue;}
      for(const [attr,{key,values}] of entries){const text=t(key,values);if(attr==='textContent')element.textContent=text;else element.setAttribute(attr,text);}
    }
    window.inkNative?.setLanguage?.(language);
    window.dispatchEvent(new Event('inkblots-language'));
  }
  function setLanguage(value) {
    if(value!=='auto' && !supported.includes(value))return;
    window.Inkblots?.flushPendingEdit();
    preference=value; language=value==='auto'?resolve(systemLanguages()):value;
    try {localStorage.setItem('inkblots-language',value);}catch(_){}
    apply();
  }
  window.InkblotsI18n={t,bind,translateMarkup,setLanguage,resolve,get language(){return language;},get preference(){return preference;}};
  document.documentElement.lang=language;
  translateMarkup();
  document.addEventListener('DOMContentLoaded',apply);
  window.addEventListener('languagechange',()=>{if(preference==='auto'){language=resolve(systemLanguages());apply();}});
})();
