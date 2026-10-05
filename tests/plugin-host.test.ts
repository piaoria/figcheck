import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';import {createRequire} from 'node:module';
import {parseDesign} from '../packages/core/src/index';
import {BUILD,PROTOCOL} from '../apps/figma-plugin/src/protocol';
const node={id:'1',name:'Rectangle',type:'RECTANGLE',width:120,height:60,parent:null,relativeTransform:[[1,0,0],[0,1,0]],opacity:1,fills:[],strokes:[],strokeWeight:0,strokeAlign:'INSIDE',cornerRadius:8,cornerSmoothing:0};
type Message={type:string;state?:string;error?:string;message?:string;document?:unknown;requestId?:number};
function setup(code='apps/figma-plugin/dist/code.js',earlyReady=false){
 const messages:Message[]=[];const handlers=new Map<string,()=>void>();let closed=false;
 const host={mixed:Symbol('mixed'),root:{documentColorProfile:'SRGB'},currentPage:{selection:[] as object[]},showUI:()=>{if(earlyReady)host.ui.onmessage?.({protocol:PROTOCOL,type:'ready',session:'test',requestId:1});},on:(name:string,fn:()=>void)=>handlers.set(name,fn),closePlugin:()=>closed=true,ui:{postMessage:(m:Message)=>messages.push(m),onmessage:undefined as ((m:unknown)=>void)|undefined}};
 runInNewContext(readFileSync(code,'utf8'),{figma:host,__html__:'',console:{error:()=>{}}});
 return {host,messages,handlers,closed:()=>closed,request:(type:string,id:number)=>host.ui.onmessage!({protocol:PROTOCOL,session:'test',requestId:id,type})};
}
const last=(messages:Message[])=>messages[messages.length-1];
test('regression: old showUI-before-handler loses an immediately arriving UI request',()=>{
 const old=setup('tests/fixtures/figma-code-before.js',true);
 assert.equal(old.messages.length,1);assert.equal(old.messages[0].type,'selection'); // only unsolicited early snapshot, no ready acknowledgement
 const fixed=setup(undefined,true);assert.equal(fixed.messages[0].type,'ready');assert.equal(last(fixed.messages).state,'empty-selection');
});
test('host waits for explicit UI readiness, then exact-one selection, refresh, selectionchange and close',()=>{
 const s=setup();assert.equal(s.messages.length,0);s.request('ready',1);assert.equal(s.messages[0].type,'ready');assert.equal(last(s.messages).state,'empty-selection');
 s.host.currentPage.selection=[node];s.handlers.get('selectionchange')!();assert.equal(last(s.messages).state,'complete');assert.equal(parseDesign(JSON.stringify(last(s.messages).document)).nodes[0].id,'1');
 s.host.currentPage.selection=[node,{...node,id:'2'}];s.handlers.get('selectionchange')!();assert.equal(last(s.messages).state,'multiple-selection');
 s.host.currentPage.selection=[node];s.request('refresh',2);assert.equal(last(s.messages).state,'complete');assert.equal(last(s.messages).requestId,2);
 s.request('close',2);assert.equal(s.closed(),true);
});
test('selection getter errors become terminal error replies instead of silent/unhandled host exceptions',()=>{
 const s=setup();s.request('ready',1);Object.defineProperty(s.host.currentPage,'selection',{get(){throw new Error('selection access failed');}});
 assert.doesNotThrow(()=>s.request('refresh',2));assert.equal(last(s.messages).state,'error');assert.ok(last(s.messages).message?.includes('selection access failed'));
});
test('invalid/stale session requests ignored; fresh UI ready reconnects host',()=>{
 const s=setup();s.request('ready',3);const count=s.messages.length;s.request('refresh',2);s.host.ui.onmessage!({protocol:PROTOCOL,type:'refresh',session:'other',requestId:5});s.host.ui.onmessage!({type:'refresh'});assert.equal(s.messages.length,count);
 s.host.ui.onmessage!({protocol:PROTOCOL,type:'ready',session:'new-ui',requestId:1});assert.equal(last(s.messages).state,'empty-selection');
});
test('selectionchange registration error is reported after handshake',()=>{
 const messages:Message[]=[];const host={ui:{postMessage:(m:Message)=>messages.push(m),onmessage:undefined as ((m:unknown)=>void)|undefined},on(){throw new Error('selection listener failed');},showUI(){},closePlugin(){}};
 runInNewContext(readFileSync('apps/figma-plugin/dist/code.js','utf8'),{figma:host,__html__:'',console:{error:()=>{}}});host.ui.onmessage!({protocol:PROTOCOL,type:'ready',session:'test',requestId:1});assert.equal(last(messages).state,'error');assert.ok(last(messages).message?.includes('listener failed'));
});
test('actual host bundle parses at documented ES2020 and requires no DOM/browser APIs',()=>{
 const parse=createRequire(import.meta.url)('espree').parse as (source:string,options:{ecmaVersion:number})=>unknown;
 assert.doesNotThrow(()=>parse(readFileSync('apps/figma-plugin/dist/code.js','utf8'),{ecmaVersion:2020}));assert.equal(BUILD,'0.3.7');
 const s=setup();s.host.currentPage.selection=[node];s.request('ready',1);assert.equal(last(s.messages).state,'complete');
});
