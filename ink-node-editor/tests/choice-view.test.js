const {test}=require('node:test');
const assert=require('node:assert/strict');
const view=require('../renderer/choice-view');
test('Conditional block branches do not end the owning choice',()=>{
  const v=view(node('* [Enter]\n{ ready:\n- true:\n  -> room\n- else:\n  -> hall\n}\n* [Wait] -> outside',[3,5,7]));
  assert.deepEqual(v.rows.map(row=>row.exits.map(out=>out.idx)),[[0,1],[2]]);
});
test('Spaced nested gathers keep the outer choice owner',()=>{
  const v=view(node('* [Outer]\n* * [Inner] -> inner\n- - Rejoin inner\n-> outer\n- Rejoin all\n-> end',[1,3,5]));
  assert.deepEqual(v.rows.map(row=>row.exits.map(out=>out.idx)),[[1],[0]]);
  assert.equal(v.rowExits.has(2),false);
});
function node(body,lines=[]) {return {body,out:lines.map((line,idx)=>({idx,raw:'target'+idx})),diverts:lines.map(line=>({line}))};}
test('Separates scene prose and conditionally available choice labels without changing source',()=>{
  const n=node('The board clatters.\n+ [Train] -> train\n+ {met_cat} [Ask the cat] -> cat // note',[1,2]);const original=n.body;
  const v=view(n);assert.equal(v.prose,'The board clatters.');assert.deepEqual(v.rows.map(r=>r.label),['Train','Ask the cat']);assert.deepEqual([...v.rowExits],[0,1]);assert.equal(n.body,original);
});
test('Associates indented branch diverts and leaves shared gather exits separate',()=>{
  const v=view(node('Hello\n* [First]\n    Branch prose\n    -> first\n* [Second]\n    -> second\n- Shared ending\n-> after',[3,5,7]));
  assert.deepEqual(v.rows.map(r=>r.exits.map(o=>o.idx)),[[0],[1]]);assert.equal(v.prose,'Hello\n- Shared ending\n-> after');assert.equal(v.before,'Hello');assert.equal(v.after,'- Shared ending\n-> after');
});
test('Nested choices associate exits with the right row',()=>{
  const v=view(node('* [Outer]\n** [Inner] -> inner\n-- Inner gather\n-> outer\n* [Other] -> other',[1,3,4]));
  assert.deepEqual(v.rows.map(r=>[r.depth,r.exits.map(o=>o.idx)]),[[1,[1]],[2,[0]],[1,[2]]]);
});
test('Comments, output-only text, local choices and text variants are represented safely',()=>{
  const v=view(node('/*\n* [Not a choice]\n*/\n* You say [Hello] and smile.\n    Local output\n+ {mood:Smile|Wave} -> target\n* -> END',[5,6]));
  assert.deepEqual(v.rows.map(r=>r.label),['You say Hello','{mood:Smile|Wave}','']);assert.equal(v.rows[0].exits.length,0);
});
test('All choices and multiple exits remain accessible, including beyond nine choices',()=>{
  const body=Array.from({length:12},(_,i)=>'+ [Choice '+i+'] -> target').join('\n');
  const v=view(node(body,Array.from({length:12},(_,i)=>i)));assert.equal(v.rows.length,12);assert.equal(v.rowExits.size,12);
  assert.equal(view(node('+ [Tunnel] -> target ->',[0,0])).rows[0].exits.length,2);
});
