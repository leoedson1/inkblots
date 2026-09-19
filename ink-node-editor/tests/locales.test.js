const {test}=require('node:test');
const assert=require('node:assert/strict');
const messages=require('../renderer/locales');
const snippets=require('../renderer/snippets');
const placeholders=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
for(const [language,entries] of Object.entries(messages)) {
  test(language+' has complete messages and preserves interpolation fields',()=>{
    assert.deepEqual(Object.keys(entries).sort(),Object.keys(messages.ja).sort());
    for(const [key,value] of Object.entries(entries)) {
      assert.ok(value.trim(),key);
      assert.deepEqual(placeholders(value),placeholders(key),key);
    }
    for(const group of snippets){assert.ok(entries[group.label],group.label);for(const item of group.items){assert.ok(entries[item.label],item.label);assert.ok(entries[item.desc],item.desc);}}
  });
}
