import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBoxShadows,compareShadows,validateShadows,missingShadows,type Shadows} from '../packages/core/src/shadows';
import {normalTolerance,strictTolerance,parseDesign,emptyProperties} from '../packages/core/src/index';
import {extractShadows} from '../apps/figma-plugin/src/shadow-extract';
import {normalizeShadows} from '../apps/chrome-extension/src/normalize';
const effect=(extra:object={})=>({type:'DROP_SHADOW',visible:true,offset:{x:0,y:4},radius:12,blendMode:'NORMAL',color:{r:0,g:0,b:0,a:.25},...extra});
const node=(effects:object[]=[],extra:object={})=>({id:'box',name:'Box',type:'RECTANGLE',parent:null,relativeTransform:[[1,0,0],[0,1,0]],effects,...extra}) as unknown as SceneNode;
const css='rgba(0, 0, 0, 0.25) 0px 4px 6px 0px';
test('shadow parser respects functional commas and preserves multiple outer/inset painting order',()=>{
 const p=parseBoxShadows(css+', inset 1px -2px 3px -4px rgb(255 0 0 / 50%)');assert.equal(p.status,'supported');assert.equal(p.layers.length,2);assert.equal(p.layers[1].inset,true);assert.equal(p.layers[1].spread,-4);assert.deepEqual(p.layers[1].color,[255,0,0,.5]);validateShadows(p);
});
test('HEX RGB HSL equivalent values, transparent alpha and fractional channels are normalized',()=>{
 const h=parseBoxShadows('0 0 4px #ff000080'),r=parseBoxShadows('rgb(255 0 0 / 0.5019607843137255) 0px 0px 4px'),s=parseBoxShadows('0 0 4px hsla(0, 100%, 50%, 0.5019607843137255)');assert.equal(compareShadows(h,r,strictTolerance).total.score,100);assert.equal(compareShadows(h,s,strictTolerance).total.score,100);assert.equal(parseBoxShadows('0 0 transparent').layers[0].color[3],0);
});
test('none is collected absence; old JSON/missing CSS stays unknown; extra and missing score separately',()=>{
 assert.equal(compareShadows(parseBoxShadows('none'),parseBoxShadows('none')).total.score,100);assert.equal(compareShadows(undefined,parseBoxShadows('none')).status,'excluded');assert.equal(compareShadows(parseBoxShadows('none'),parseBoxShadows(css)).rows[0].status,'added');assert.equal(compareShadows(parseBoxShadows(css),parseBoxShadows('none')).rows[0].status,'missing');assert.equal(parseBoxShadows(undefined).status,'unknown');
});
test('sequence alignment preserves later exact layers after insertion without sorting reorders away',()=>{
 const first='0px 1px 2px #000',last='inset 0px 8px 9px #fff',insert='9px 9px 9px #f00';const r=compareShadows(parseBoxShadows(first+','+last),parseBoxShadows(first+','+insert+','+last),strictTolerance);assert.deepEqual(r.rows.map(x=>x.status),['match','added','match']);assert.equal(r.rows[2].actual?.index,2);const reordered=compareShadows(parseBoxShadows(first+','+last),parseBoxShadows(last+','+first),strictTolerance);assert.notEqual(reordered.total.score,100);
});
test('shadow epsilon and configured tolerances include blur/spread/color/alpha; user exclusion removes score',()=>{
 const a=parseBoxShadows(css),b=structuredClone(a);b.layers[0].x=1+5e-7;b.layers[0].color[3]+=.01+5e-8;assert.equal(compareShadows(a,b).total.score,100);b.layers[0].x=1.0001;assert.equal(compareShadows(a,b).total.score,0);assert.equal(compareShadows(a,a,normalTolerance,false).total.score,null);const noisy=structuredClone(a);noisy.layers[0].color[0]=1e-5;assert.equal(compareShadows(a,noisy,strictTolerance).total.score,100);
});
test('invalid lengths, non-sRGB functions, variable CSS and malformed stack reject instead of guessing',()=>{
 for(const s of ['0 0 -1px #000','0 0 3em #000','0 0 color(display-p3 1 0 0)','0 0 var(--shadow)','0 0 rgba(0,0,0,.5),','0 0 #000,,0 0 #fff'])assert.equal(parseBoxShadows(s).status,'unsupported',s);
});
test('Figma raw radius and CSS blur remain distinct; raw visible/index/blend/spread/default/behind survive',()=>{
 const s=extractShadows(node([effect({visible:false}),effect()]),'SRGB',{'box-shadow':css});assert.equal(s.status,'supported');assert.equal(s.effects?.[1].radius,12);assert.equal(s.layers[0].blur,6);assert.equal(s.layers[0].effectIndex,1);assert.equal(s.effects?.[1].spread,0);assert.equal(s.effects?.[1].showShadowBehindNode,false);assert.equal(s.mapping,'getCSSAsync');validateShadows(s);
});
test('Figma getCSS evidence required; unsupported blend/new effect/shape/composition never become none',()=>{
 assert.equal(extractShadows(node([effect()]),'SRGB').status,'unknown');assert.equal(extractShadows(node([]),'SRGB').status,'supported');
 for(const n of [node([effect({blendMode:'MULTIPLY'})]),node([effect({showShadowBehindNode:true})]),node([{type:'NEW_EFFECT',visible:true}]),node([{type:'LAYER_BLUR',visible:true,radius:4}]),node([effect()],{type:'TEXT'}),node([effect()],{type:'GROUP'}),node([effect()],{type:'FRAME',clipsContent:false})])assert.equal(extractShadows(n,'SRGB',{'box-shadow':css}).status,'unsupported');
 assert.equal(extractShadows(node([effect()]),'DISPLAY_P3',{'box-shadow':css}).status,'unsupported');assert.equal(extractShadows(node([effect()]),'SRGB',{'box-shadow':css,filter:'drop-shadow(0 0 4px #000)'}).status,'unsupported');
});
test('Figma CSS order maps by raw evidence, never blindly reverses; duplicate identities are excluded',()=>{
 const s=extractShadows(node([effect(),effect({type:'INNER_SHADOW',offset:{x:2,y:3},color:{r:1,g:0,b:0,a:1}})]),'SRGB',{'box-shadow':'inset 2px 3px 7px red, '+css});assert.equal(s.status,'unsupported'); // unsupported named color is honest, not silently dropped
 const mapped=extractShadows(node([effect(),effect({type:'INNER_SHADOW',offset:{x:2,y:3},color:{r:1,g:0,b:0,a:1}})]),'SRGB',{'box-shadow':'inset 2px 3px 7px #f00, '+css});assert.equal(mapped.status,'supported');assert.deepEqual(mapped.layers.map(l=>l.effectIndex),[1,0]);
 assert.equal(extractShadows(node([effect(),effect()]),'SRGB',{'box-shadow':css+','+css}).status,'unsupported');
});
test('DOM filter/text-shadow/geometry exclusion applies before box-shadow parsing',()=>{
 for(const shadowIssue of ['filter drop-shadow','text-shadow','ancestor blend'])assert.equal(normalizeShadows({ok:true,computed:{'box-shadow':css},shadowIssue}).status,'unsupported');assert.equal(normalizeShadows({ok:true,geometryIssue:'SVG',computed:{'box-shadow':css}}).status,'unsupported');assert.equal(normalizeShadows({ok:true,computed:{'box-shadow':css}}).status,'supported');
});
test('optional versioned shadow schema accepts old exchange JSON and validates hostile/new versions strictly',()=>{
 const doc={schemaVersion:'1.0',source:'figma',exportedAt:new Date().toISOString(),nodes:[{id:'1',name:'Old',type:'RECTANGLE',properties:emptyProperties()}]};assert.equal(parseDesign(JSON.stringify(doc)).nodes[0].shadows,undefined);
 const modern=JSON.parse(JSON.stringify(doc));modern.nodes[0].shadows=parseBoxShadows(css);assert.equal(parseDesign(JSON.stringify(modern)).nodes[0].shadows?.layers.length,1);
 for(const change of [{version:2},{layers:[{...parseBoxShadows(css).layers[0],blur:-1}]},{layers:[{...parseBoxShadows(css).layers[0],color:[256,0,0,1]}]},{surprise:1}]){modern.nodes[0].shadows={...parseBoxShadows(css),...change};assert.throws(()=>parseDesign(JSON.stringify(modern)));}
 const malformed={...missingShadows(),status:'supported',layers:[{index:0}]} as unknown as Shadows;assert.equal(compareShadows(malformed,parseBoxShadows(css)).status,'excluded');
 const schema=JSON.parse(readFileSync('schemas/figcheck-shadows-1.schema.json','utf8'));assert.equal(schema.properties.version.const,1);assert.equal(schema.additionalProperties,false);assert.equal(schema.properties.layers.maxItems,32);
});


test('reported component three effects: clipping independent, CSS evidence required, alpha composition excluded',()=>{
 const fixture=JSON.parse(readFileSync('fixtures/component-shadows.json','utf8'));
 const css={'box-shadow':'5px 5px 10px rgba(0,0,0,.15), -5px -5px 10px #fff, inset 1px 1px 0.5px #fff'}; // synthetic Inspect response, not raw radius conversion
 for(const type of ['COMPONENT','FRAME','INSTANCE'])for(const clipsContent of [true,false,undefined]){
  const n=node(fixture.effects,{...fixture,type,clipsContent});const result=extractShadows(n,'SRGB',css);
  assert.equal(result.status,'supported');assert.equal(result.layers.length,3);assert.equal(result.effects?.[0].radius,20);assert.equal(result.layers[0].blur,10);assert.equal(compareShadows(result,parseBoxShadows(css['box-shadow'])).total.score,100);
  const missing=extractShadows(n,'SRGB');assert.equal(missing.status,'unknown');assert.equal(missing.effects?.length,3);assert.equal(compareShadows(missing,parseBoxShadows(css['box-shadow'])).total.score,null);
  assert.equal(extractShadows(node([],{...fixture,type,clipsContent,effects:[]}),'SRGB').layers.length,0);
 }
 for(const fills of [[],[{type:'SOLID',opacity:.5,color:{r:1,g:1,b:1}}],[{type:'IMAGE',opacity:1}]]){const result=extractShadows(node(fixture.effects,{...fixture,fills}),'SRGB',css);assert.equal(result.status,'unsupported');assert.match(result.reason!,/알파 형상/);assert.equal(result.effects?.length,3);}
});
