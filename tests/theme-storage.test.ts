import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { PROTOCOL } from '../apps/figma-plugin/src/protocol';
interface Message { type: string; theme?: string; themeRevision?: number; themeError?: boolean }
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function setup(clientStorage: {getAsync(key: string): Promise<unknown>;setAsync(key: string, value: string): Promise<void>}) {
  const messages: Message[] = [];
  const host = {clientStorage, root:{documentColorProfile:'SRGB'},currentPage:{selection:[]},on(){},showUI(){},ui:{postMessage:(m: Message)=>messages.push(m),onmessage:undefined as ((m:unknown)=>void)|undefined}};
  runInNewContext(readFileSync('apps/figma-plugin/dist/code.js','utf8'),{figma:host,__html__:'',console:{error(){}}});
  const request=(type:string, theme?: string, themeRevision?: number)=>host.ui.onmessage!({protocol:PROTOCOL,session:'theme-test',requestId:1,type,theme,themeRevision});
  request('ready'); return {messages,request};
}
test('Figma stored theme validates values, serializes last-choice writes and rejects replayed revisions',async()=>{
  let saved: unknown = 'dark'; const writes: string[] = [];
  const h=setup({async getAsync(){return saved;},async setAsync(_key,value){await tick();writes.push(value);saved=value;}});
  await tick();assert.equal(h.messages.find(m=>m.type==='theme')?.theme,'dark');
  h.request('theme-set','light',1);h.request('theme-set','dark',2);h.request('theme-set','light',1);h.request('theme-set','invalid',3);
  for(let i=0;i<6;i++)await tick();
  assert.deepEqual(writes,['light','dark']);assert.equal(saved,'dark');assert.equal(h.messages.at(-1)?.themeRevision,2);
});
test('late Figma storage read cannot overwrite a new choice; storage rejection is separate from extraction',async()=>{
  let release!: (value: unknown)=>void;
  const h=setup({getAsync(key){return key==='figcheck.theme.v1'?new Promise(resolve=>{release=resolve;}):Promise.resolve(undefined);},async setAsync(){throw new Error('storage unavailable');}});
  h.request('theme-set','light',1);release('dark');await tick();
  assert.equal(h.messages.some(m=>m.type==='theme'&&m.themeRevision===0),false);
  assert.equal(h.messages.at(-1)?.themeError,true);assert.equal(h.messages.at(-1)?.theme,'light');
  assert.equal(h.messages.some(m=>m.type==='state'),true);
});
