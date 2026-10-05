import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
import {PROTOCOL} from '../apps/figma-plugin/src/protocol';
interface Message {type:string;colorFormat?:string;colorRevision?:number;colorError?:boolean}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('color preferences serialize latest valid request independently from theme and ignore stale revisions',async()=>{
  const store=new Map<string,string>([['figcheck.theme.v1','dark'],['figcheck.color-format.v1','rgb']]);const messages:Message[]=[];const writes:string[]=[];
  const host={root:{documentColorProfile:'SRGB'},currentPage:{selection:[]},showUI(){},on(){},clientStorage:{async getAsync(key:string){return store.get(key);},async setAsync(key:string,value:string){await tick();store.set(key,value);writes.push(value);}},ui:{onmessage:undefined as ((m:unknown)=>void)|undefined,postMessage:(m:Message)=>messages.push(m)}};
  runInNewContext(readFileSync('apps/figma-plugin/dist/code.js','utf8'),{figma:host,__html__:'',console:{error(){}}});
  const send=(type:string,colorFormat?:string,colorRevision?:number)=>host.ui.onmessage!({protocol:PROTOCOL,session:'colors',requestId:1,type,colorFormat,colorRevision});send('ready');await tick();assert.equal(messages.find(m=>m.type==='color-format')?.colorFormat,'rgb');
  send('color-set','hex',1);send('color-set','hsl',2);send('color-set','rgb',1);send('color-set','invalid',3);for(let i=0;i<7;i++)await tick();
  assert.deepEqual(writes,['hex','hsl']);assert.equal(store.get('figcheck.color-format.v1'),'hsl');assert.equal(store.get('figcheck.theme.v1'),'dark');
});
