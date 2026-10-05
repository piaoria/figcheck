import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compare, colorValue, numberValue, emptyProperties, strictTolerance, normalTolerance, numericalEpsilon, cssColor, cssLength, validateProperties, type Properties, type Key, type RGBA } from '../packages/core/src/index';
import { formatNumber, deltaText, direction } from '../apps/chrome-extension/src/format';
import { extractNode } from '../apps/figma-plugin/src/extract';
const report = JSON.parse(readFileSync('fixtures/precision-regression.json','utf8')) as { expected: Properties; actual: Properties };
const row = (e: Properties, a: Properties, k: Key, t = strictTolerance) => compare(e,a,t).rows.find(r=>r.key===k)!;
test('reported four borders match including strict; width and height +138 remain actual differences',()=>{
  for(const t of [strictTolerance,normalTolerance,{...strictTolerance}]) {
    const result=compare(report.expected,report.actual,t);
    assert.deepEqual(result.rows.filter(r=>r.status==='mismatch').map(r=>[r.key,r.delta]),[['width',138],['height',138]]);
    assert.equal(result.total.supported,10);assert.equal(result.total.matched,8);assert.equal(result.total.score,80);
  }
});
test('float32 Figma sRGB conversion is numeric component comparison, preserved raw and shared CSS units',()=>{
  const c=[222,226,230].map(v=>Math.fround(v/255));
  const node={id:'p',name:'precision',type:'RECTANGLE',width:282,height:450.5,parent:null,relativeTransform:[[1,0,0],[0,1,0]],opacity:1,fills:[],strokes:[{type:'SOLID',color:{r:c[0],g:c[1],b:c[2]},opacity:1}],strokeWeight:.6666669845581055,strokeAlign:'INSIDE',cornerRadius:0,cornerSmoothing:0} as unknown as SceneNode;
  const figma=extractNode(node,Symbol('mixed'),'SRGB').properties;
  const expected=colorValue([...c.map(v=>v*255),1] as RGBA);assert.deepEqual(figma.borderTopColor,expected);
  const before=JSON.stringify(figma);const actual={...figma,borderTopColor:cssColor('rgba(222, 226, 230, 1)'),borderTopWidth:cssLength('0.666667px')};
  for(const t of [strictTolerance,normalTolerance,{...strictTolerance}]) {assert.equal(row(figma,actual,'borderTopColor',t).status,'match');assert.equal(row(figma,actual,'borderTopWidth',t).status,'match');}
  assert.equal(JSON.stringify(figma),before);assert.notDeepEqual(expected,actual.borderTopColor);
});
test('absolute numerical epsilon never scales with magnitude or hides meaningful strict differences',()=>{
  const e=emptyProperties(),a=emptyProperties();
  for(const n of [0,1,1000000]){e.width=numberValue(n);a.width=numberValue(n+numericalEpsilon.px*2);assert.equal(row(e,a,'width').status,'mismatch');}
  e.textColor=colorValue([222,226,230,1]);a.textColor=colorValue([222+numericalEpsilon.colorChannel*2,226,230,1]);assert.equal(row(e,a,'textColor').status,'mismatch');
  a.textColor=colorValue([222,226,230,1-numericalEpsilon.alpha*2]);assert.equal(row(e,a,'textColor').status,'mismatch');
  e.opacity=numberValue(1,'number');a.opacity=numberValue(1-numericalEpsilon.opacity*2,'number');assert.equal(row(e,a,'opacity').status,'mismatch');
});
test('tolerance boundary includes representation epsilon but excludes meaningful excess in every preset',()=>{
  const e=emptyProperties(),a=emptyProperties();e.width=numberValue(10);e.textColor=colorValue([10,20,30,.5]);
  for(const t of [strictTolerance,normalTolerance,{px:.01,typographyPx:.02,colorChannel:.2,alpha:.005,opacity:.002}]) {
    a.width=numberValue(10+t.px);assert.equal(row(e,a,'width',t).status,'match');a.width=numberValue(10+t.px+2*numericalEpsilon.px);assert.equal(row(e,a,'width',t).status,'mismatch');
    a.textColor=colorValue([10+t.colorChannel,20,30,.5+t.alpha]);assert.equal(row(e,a,'textColor',t).status,'match');a.textColor=colorValue([10+t.colorChannel+2*numericalEpsilon.colorChannel,20,30,.5]);assert.equal(row(e,a,'textColor',t).status,'mismatch');
  }
});
test('invalid/nonfinite colors/numbers stay unavailable and defensive engine excludes malformed supported values',()=>{
  for(const n of [NaN,Infinity,-Infinity]) {assert.equal(numberValue(n).status,'unknown');assert.equal(colorValue([n,0,0,1]).status,'unknown');const e=emptyProperties(),a=emptyProperties();e.width=numberValue(1);a.width={status:'supported',kind:'px',value:n};assert.equal(row(e,a,'width').status,'excluded');assert.throws(()=>validateProperties(a));}
  assert.equal(cssColor('rgb(999,0,0)').status,'unsupported');assert.equal(cssLength('auto').status,'unsupported');
});
test('user exclusions are separate from unsupported, excluded from category/score and all-off score is null',()=>{
  const result=compare(report.expected,report.actual,normalTolerance,['borderTopWidth']);assert.equal(result.total.supported,1);assert.equal(result.total.score,100);assert.equal(result.rows.find(r=>r.key==='width')!.exclusion,'user');
  const all=compare(report.expected,report.actual,normalTolerance,[]);assert.equal(all.total.score,null);assert.equal(all.total.supported,0);assert.equal(all.rows.filter(r=>r.exclusion==='user').length,28);
});
test('nonzero numeric and RGBA mismatch display never collapses to plus-zero; raw values remain available',()=>{
  const e=emptyProperties(),a=emptyProperties();e.width=numberValue(1);a.width=numberValue(1.000002);const r=row(e,a,'width');assert.equal(r.status,'mismatch');assert.match(deltaText(r),/\+0\.000002px/);assert.doesNotMatch(direction(r),/ 0px/);
  e.textColor=colorValue([222,226,230,1]);a.textColor=colorValue([222.00004,226,230,1]);const c=row(e,a,'textColor');assert.equal(c.status,'mismatch');assert.match(deltaText(c),/R \+0\.00004/);assert.notEqual(formatNumber(1e-12),'0');assert.equal(formatNumber(.6666669845581055),'0.667');assert.equal(formatNumber(-0),'0');
});
