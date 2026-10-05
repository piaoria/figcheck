import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPickerController } from '../apps/chrome-extension/src/picker-controller';
test('page selection completion is not controller readiness; wait for inactive acknowledgement before expecting a fresh start',async()=>{
  const globals=globalThis as unknown as Record<string,unknown>;
  const originalChrome=globals.chrome,originalInterval=setInterval,originalClear=clearInterval;
  const requests:{expression:string;reply:(value:unknown)=>void}[]=[];
  let tick=()=>{};
  const published:{active:boolean}[]=[];
  globals.chrome={devtools:{inspectedWindow:{eval:(expression:string,reply:(value:unknown)=>void)=>requests.push({expression,reply})}}};
  globalThis.setInterval=((fn:()=>void)=>{tick=fn;return 1;}) as unknown as typeof setInterval;
  globalThis.clearInterval=(()=>{}) as typeof clearInterval;
  const respond=(active:boolean,selected=false)=>{const request=requests.shift()!;request.reply({active,sequence:selected?1:0,selected,message:''});return request.expression;};
  try{
    const controller=createPickerController(state=>published.push(state));
    const first=controller.toggle('button');assert.match(respond(true),/\)\("start",/);await first;
    // Page click has completed, but the next controller heartbeat hasn't acknowledged it.
    controller.refresh();assert.equal(published.at(-1)!.active,true);
    const premature=controller.toggle('button');assert.match(respond(false,true),/\)\("stop",/);assert.equal((await premature).active,false);
    const next=controller.toggle('button');assert.match(respond(true),/\)\("start",/);await next;
    tick();assert.match(respond(false,true),/\)\("pulse",/);assert.equal(published.at(-1)!.active,false);
    const acknowledged=controller.toggle('button');assert.match(respond(true,true),/\)\("start",/);assert.equal((await acknowledged).active,true);
    controller.dispose();respond(false);
  }finally{globals.chrome=originalChrome;globalThis.setInterval=originalInterval;globalThis.clearInterval=originalClear;}
});
