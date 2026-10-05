import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare, emptyProperties, numberValue, unavailable, normalTolerance, strictTolerance, colorValue, cssColor, cssLength, parseDesign, flattenNodes, type DesignDocument } from '../packages/core/src/index';
const document = (): DesignDocument => ({ schemaVersion: '1.0', source: 'figma', colorProfile: 'SRGB', exportedAt: '2026-10-04T00:00:00Z', nodes: [{ id: '1', name: '<script>alert(1)</script>', type: 'FRAME', properties: emptyProperties() }] });
test('unknown/unsupported not equal to zero; zero denominator returns null', () => {
  const e = emptyProperties(), a = emptyProperties(); a.width = numberValue(0); e.height = unavailable('AUTO');
  assert.deepEqual(compare(e,a).total, { supported: 0, matched: 0, score: null });
});
test('score only supported: 8 of 10 match = 80%, not diluted by excluded', () => {
  const e = emptyProperties(), a = emptyProperties();
  const list = ['width','height','paddingTop','paddingRight','paddingBottom','paddingLeft','rowGap','columnGap','radiusTopLeft','radiusTopRight'] as const;
  list.forEach((k,i) => { e[k]=numberValue(10); a[k]=numberValue(i<8?10:12); });
  assert.deepEqual(compare(e,a).total, { supported: 10, matched: 8, score: 80 });
});
test('normal boundary subpixels, strict, custom and actual minus expected', () => {
  const e=emptyProperties(), a=emptyProperties(); e.width=numberValue(100);a.width=numberValue(101);
  assert.equal(compare(e,a).rows[0].status,'match'); assert.equal(compare(e,a,strictTolerance).rows[0].status,'mismatch');
  a.width=numberValue(98.75); assert.equal(compare(e,a).rows[0].delta,-1.25);
  assert.equal(compare(e,a,{...normalTolerance,px:1.25}).rows[0].status,'match');
  assert.throws(()=>compare(e,a,{...normalTolerance,px:NaN}));
});
test('typography/color have explicit independent tolerance',()=>{
  const e=emptyProperties(),a=emptyProperties();e.fontSize=numberValue(16);a.fontSize=numberValue(16.6);
  e.fontWeight=numberValue(600,'number');a.fontWeight=numberValue(601,'number');
  e.textColor=colorValue([20,30,40,1]);a.textColor=colorValue([21,29,40,.99]);
  const c=compare(e,a);assert.equal(c.rows.find(r=>r.key==='fontSize')?.status,'mismatch');assert.equal(c.rows.find(r=>r.key==='fontWeight')?.status,'mismatch');assert.equal(c.rows.find(r=>r.key==='textColor')?.status,'match');
});
test('CSS unresolved auto/normal/percent/calc/complex units explicitly excluded',()=>{
  for(const raw of ['normal','auto','10%','calc(1px + 2px)','1rem','10px 20px',''])assert.equal(cssLength(raw).status,'unsupported');
  assert.deepEqual(cssLength('-.5px'),numberValue(-.5));assert.equal(cssColor('color(display-p3 1 0 0)').status,'unsupported');
  assert.deepEqual(cssColor('rgba(10, 20, 30, 0.5)'),colorValue([10,20,30,.5]));
});
test('single root and nested schema 1.0 manually selectable, no matching',()=>{
  const d=document();d.nodes[0].children=[{...d.nodes[0],id:'2',children:undefined}];
  const parsed=parseDesign(JSON.stringify(d));assert.equal(flattenNodes(parsed).length,2);assert.equal(parsed.nodes[0].name,'<script>alert(1)</script>');
});
test('schema rejects malformed JSON/version/null/missing/nonfinite/incompatible kind/prototype keys',()=>{
  assert.throws(()=>parseDesign('{'));const d=document();
  assert.throws(()=>parseDesign(JSON.stringify({...d,schemaVersion:'0.0'})));
  assert.throws(()=>parseDesign(JSON.stringify({...d,nodes:[]})));
  for(const value of [null,{status:'supported',kind:'px',value:null},{status:'supported',kind:'px',value:'0'},{status:'supported',kind:'number',value:10}]){const x=document();x.nodes[0].properties.width=value as never;assert.throws(()=>parseDesign(JSON.stringify(x)));}
  assert.throws(()=>parseDesign(JSON.stringify(d).replace('"properties":{','"properties":{"__proto__":{},')));
  assert.throws(()=>parseDesign(JSON.stringify({...d,extra:1}))); assert.throws(()=>parseDesign(' '.repeat(1024*1024+1)));
});
test('duplicate/deep/excessive nested IDs rejected and P3 excluded',()=>{
  const d=document();d.nodes.push({...d.nodes[0]});assert.throws(()=>parseDesign(JSON.stringify(d)));
  const deep=document();let n=deep.nodes[0];for(let i=0;i<18;i++){n.children=[{...deep.nodes[0],id:String(i+2),children:undefined}];n=n.children[0];}assert.throws(()=>parseDesign(JSON.stringify(deep)));
  const p3=document();p3.colorProfile='DISPLAY_P3';p3.nodes[0].properties.backgroundColor=colorValue([255,0,0,1]);assert.equal(parseDesign(JSON.stringify(p3)).nodes[0].properties.backgroundColor.status,'unsupported');
});
