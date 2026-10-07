import {chromium} from 'playwright';
import {startFixture} from './fixture-server.mjs';
import {writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const extension=path.resolve('apps/chrome-extension/dist');
const servers=await startFixture();
const profile=await mkdtemp(path.join(tmpdir(),'figcheck-depth-'));
let context;
const targetSessions=new Map();
async function attach(parent, targetId) {
  if(targetSessions.has(targetId))return targetSessions.get(targetId);
  const original=(await parent.send('Target.getTargetInfo',{targetId})).targetInfo;
  let {sessionId}=await parent.send('Target.attachToTarget',{targetId,flatten:false});
  let id=0;const pending=new Map();
  parent.on('Target.receivedMessageFromTarget',event=>{
    if(event.sessionId!==sessionId)return;const data=JSON.parse(event.message);
    if(data.id&&pending.has(data.id)){const {resolve,reject,timer}=pending.get(data.id);pending.delete(data.id);clearTimeout(timer);if(data.error)reject(new Error(JSON.stringify(data.error)));else resolve(data.result);}
  });
  const attached={
    async send(method,params={}){
      for(let attempt=0;attempt<2;attempt++){
        try{return await new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(new Error('CDP timed out: '+method+' '+String(params.expression??'').slice(0,180)));},10000);pending.set(n,{resolve,reject,timer});parent.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:n,method,params})}).catch(error=>{clearTimeout(timer);pending.delete(n);reject(error);});});}
        catch(error){
          if(attempt||!String(error).includes('No session with given id'))throw error;
          // DevTools may replace its automation session during navigation/viewport changes.
          // Reconnect only to this known URL/type; normal assertion failures are never retried.
          const current=(await parent.send('Target.getTargets')).targetInfos.filter(t=>t.url===original.url&&t.type===original.type).at(-1);if(!current)throw error;
          targetId=current.targetId;({sessionId}=await parent.send('Target.attachToTarget',{targetId,flatten:false}));
        }
      }
      throw new Error('DevTools session reconnection failed');
    },
    async evaluate(expression){const result=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
  };
  targetSessions.set(targetId,attached);return attached;
}
async function until(fn,label){for(let i=0;i<80;i++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out: '+label);}
const report={success:false,checks:[],browser:null};
const pass=name=>{report.checks.push(name);console.log('PASS',name)};
try {
 context=await chromium.launchPersistentContext(profile,{...(process.env.FIGCHECK_BROWSER_PATH?{executablePath:process.env.FIGCHECK_BROWSER_PATH}:{channel:'chromium'}),headless:true,args:[`--load-extension=${extension}`,`--disable-extensions-except=${extension}`,'--auto-open-devtools-for-tabs'],viewport:{width:1100,height:820}});
 report.browser=context.browser().version();
 const page=context.pages()[0];await page.goto('http://127.0.0.1:4173');
 await page.evaluate(()=>{
  document.body.innerHTML=`<style>body{margin:0;background:#f5f7fa;color:#272c33;font:16px/1.6 system-ui}main{padding:100px 60px;min-height:1600px}h1{font-size:26px;margin:0 0 6px}p{color:#596372}section{margin-top:28px;padding:36px;border:1px solid #b4bbc5;background:white;border-radius:12px}article{padding:28px;background:#eef0f3;display:flex;gap:28px}button{padding:24px;background:#272c33;color:white;border:0;border-radius:6px;font:inherit}span{display:block;padding:12px}input{margin-top:28px;padding:12px}iframe{margin-top:40px;width:200px;height:70px}</style><main id="stage"><h1>FigCheck · DOM 깊이 탐색</h1><p>같은 포인터 위치에서 부모로 올라가고, 이전 자식으로 돌아갑니다.</p><section id="outer"><article id="branch"><button id="sibling">다른 자식</button><button id="chosen"><span id="leaf">이 텍스트에서 시작</span></button></article><input id="typing" value="입력 필드 보호"></section><iframe id="frame" srcdoc="<button>iframe 내부</button>"></iframe><div id="shadow"></div></main>`;
  document.querySelector('#shadow').attachShadow({mode:'open'}).innerHTML='<button style="width:200px;height:70px">Shadow 내부</button>';
  window.clicks=0;document.querySelector('#chosen').onclick=()=>window.clicks++;
 });
 const cdp=await context.newCDPSession(page);
 const receiverTarget=await until(async()=>(await cdp.send('Target.getTargets')).targetInfos.find(t=>t.url.startsWith('chrome-extension://')&&t.url.endsWith('/devtools.html')),'real extension DevTools receiver');
 const receiver=await attach(cdp,receiverTarget.targetId);
 const tabId=await receiver.evaluate('chrome.devtools.inspectedWindow.tabId');
 const workerTarget=await until(async()=>(await cdp.send('Target.getTargets')).targetInfos.find(t=>t.type==='service_worker'&&t.url.endsWith('/background.js')),'real MV3 worker');
 const worker=await attach(cdp,workerTarget.targetId);
 await until(()=>worker.evaluate(`chrome.runtime.sendMessage({type:'figcheck-picker-action',tabId:${tabId},op:'cancel'}).then(r=>r?.handled===true).catch(()=>false)`),'DevTools receiver listener ready');
 const state=()=>page.evaluate(()=>{const s=window[Symbol.for('figcheck.picker.v1')];return {active:s?.active,message:s?.message,selected:s?.selected?.id,sequence:s?.sequence}});
 const message=async text=>assert.ok((await state()).message.includes(text),JSON.stringify(await state()));
 const start=async()=>{await page.bringToFront();await worker.evaluate(`chrome.runtime.sendMessage({type:'figcheck-pick',tabId:${tabId},issuedAt:Date.now()})`);await until(async()=>(await state()).active,'picker active');};
 const cancel=async()=>{await page.keyboard.press('Escape');await until(async()=>!(await state()).active,'picker inactive');await new Promise(r=>setTimeout(r,320));};
 const point=async selector=>{const b=await page.locator(selector).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2}};
 const move=async selector=>{const p=await point(selector);await page.mouse.move(p.x,p.y);return p};
 const selected=async id=>{await until(async()=>!(await state()).active,'selection ends picker');assert.equal((await state()).selected,id);await new Promise(r=>setTimeout(r,320));};
 const wheel=async(deltaY,options={})=>page.evaluate(({deltaY,options})=>{const e=new WheelEvent('wheel',{deltaY,altKey:true,bubbles:true,cancelable:true,...options});window.dispatchEvent(e);return e.defaultPrevented},{deltaY,options});
 await start();const p=await move('#leaf');await page.keyboard.press('ArrowUp');await message('↑ 부모');
 await page.mouse.move(p.x+1,p.y+1);await page.keyboard.press('ArrowDown');await message('span#leaf · ↓ 자식');
 await page.keyboard.press('ArrowUp');await page.screenshot({path:'artifacts/picker-depth-parent.png'});await page.mouse.click(p.x+1,p.y+1);await selected('chosen');assert.equal(await page.evaluate(()=>window.clicks),0);
 pass('actual extension worker starts picker; parent survives jitter and click confirms preview without activating page');
 await start();await move('#leaf');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowDown');await message('button#chosen · ↓ 자식');await page.keyboard.press('ArrowDown');await page.screenshot({path:'artifacts/picker-depth-child.png'});await page.keyboard.press('Enter');await selected('leaf');
 pass('down retraces second-child path instead of first sibling; Enter confirms leaf');
 await start();await move('#leaf');await page.keyboard.press('ArrowDown');await message('더 깊은 자식 없음');for(let i=0;i<8;i++)await page.keyboard.press('ArrowUp');await message('최상위 요소');await page.keyboard.press('ArrowDown');await message('body · ↓ 자식');await cancel();
 pass('root and leaf boundaries are stable with a deterministic return path');
 await start();await move('#leaf');const beforeWheel=(await state()).message;
 for(const options of [{},{deltaMode:1},{deltaMode:2},{altKey:false},{ctrlKey:true},{shiftKey:true}])assert.equal(await wheel(120,options),false);
 assert.equal((await state()).message,beforeWheel);await page.keyboard.down('Alt');await page.mouse.wheel(0,120);await until(()=>page.evaluate(()=>scrollY>0),'native Alt wheel while selecting');assert.ok((await state()).message.includes('span#leaf'));await page.keyboard.up('Alt');await cancel();await page.evaluate(()=>scrollTo(0,0));
 pass('Alt wheel never changes depth or prevents native scrolling; Ctrl zoom and Shift wheel remain untouched');
 await page.evaluate(()=>{const e=document.createElement('div');e.id='native-scroll';e.style.cssText='position:fixed;left:300px;top:200px;width:180px;height:100px;overflow:auto;z-index:100;background:white';e.innerHTML='<div style="height:600px">nested scroll</div>';document.body.append(e);});await start();await move('#native-scroll');await page.waitForTimeout(250);await page.keyboard.down('Alt');await page.mouse.wheel(0,100);await until(()=>page.evaluate(()=>document.querySelector('#native-scroll').scrollTop>0),'native nested scrolling');await page.keyboard.up('Alt');await cancel();await page.evaluate(()=>document.querySelector('#native-scroll').remove());
 pass('native Alt wheel reaches the actual nested scroll container during selection');

 await start();await move('#leaf');await page.evaluate(()=>document.querySelector('#typing').focus());const before=(await state()).message;await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');assert.equal((await state()).active,true);assert.equal((await state()).message,before);await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('ArrowUp');await message('button#chosen');await cancel();
 pass('focused input arrows and Enter remain editing actions; Escape still cancels');
 await start();await move('#leaf');await page.keyboard.press('ArrowUp');await page.evaluate(()=>document.querySelector('#leaf').remove());await page.keyboard.press('ArrowDown');await message('더 깊은 자식 없음');await page.evaluate(()=>document.querySelector('#chosen').remove());await page.keyboard.press('Enter');await message('사라졌어요');assert.equal((await state()).active,true);await move('#sibling');await page.keyboard.press('Enter');await selected('sibling');
 pass('removed child/preview never selects stale DOM or unrelated first child; pointer recovers');
 await start();await move('#frame');await message('지원하지 않는');await page.keyboard.press('Enter');assert.equal((await state()).active,true);await move('#shadow button');await message('지원하지 않는');await cancel();
 pass('iframe and open Shadow internal hit remain explicit unsupported boundaries');
 for(let i=0;i<3;i++){await start();await move('#sibling');await page.keyboard.press('ArrowUp');await message('article#branch · ↑ 부모');await cancel();}
 assert.equal(await wheel(-120),false);assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-figcheck-picker]').length),0);
 assert.equal(await page.evaluate(()=>{const e=new KeyboardEvent('keydown',{key:'ArrowUp',cancelable:true,bubbles:true});window.dispatchEvent(e);return e.defaultPrevented}),false);
 pass('cancel/restart removes wheel and keyboard interception without duplicate depth steps or overlays');
 await page.evaluate(()=>{const original=Element.prototype.attachShadow;Element.prototype.attachShadow=function(options){const root=original.call(this,options);if(this.hasAttribute('data-figcheck-picker'))window.testPickerRoot=root;return root;};});
 await page.evaluate(()=>{
  document.body.insertAdjacentHTML('beforeend','<div id="measure-fixture" style="position:absolute;left:40px;top:100px;width:600px;height:400px;background:#f7f8fa;border:0;z-index:10"><div id="measure-a" style="position:absolute;left:20px;top:40px;width:80px;height:50px;background:#4b83c3">A</div><div id="measure-b" style="position:absolute;left:140px;top:40px;width:100px;height:50px;background:#cb6557">B</div><iframe id="measure-frame" style="position:absolute;left:300px;top:180px;width:100px;height:60px;margin:0" srcdoc="<p>frame</p>"></iframe><div id="measure-shadow" style="position:absolute;left:420px;top:180px"></div><svg id="measure-svg" style="position:absolute;left:420px;top:280px;width:60px;height:30px"><rect width="60" height="30" fill="gray"/></svg></div>');
  document.querySelector('#measure-shadow').attachShadow({mode:'open'}).innerHTML='<button style="width:80px;height:60px">Shadow</button>';
  window.measureClicks=0;document.querySelector('#measure-b').onclick=()=>window.measureClicks++;window.scrollTo(0,0);
 });
 const distance=()=>page.evaluate(()=>window[Symbol.for('figcheck.picker.v1')]?.measurement);
 const pinned=()=>page.evaluate(()=>Boolean(window[Symbol.for('figcheck.picker.v1')]?.pinned));
 const alter=async css=>{await page.evaluate(css=>Object.assign(document.querySelector('#measure-b').style,css),css);await move('#measure-b');};
 const pin=async()=>{await start();const at=await move('#measure-a');await page.mouse.click(at.x,at.y);await selected('measure-a');assert.equal(await pinned(),true);};
 await pin();await until(()=>page.evaluate(()=>Boolean(window.testPickerRoot?.querySelector('[data-compact-box]'))),'pinned structure');
 await page.evaluate(()=>{const e=document.querySelector('#measure-a');e.style.boxSizing='border-box';e.style.border='2px solid black';e.style.padding='3px 4px 5px 6px';e.style.borderRadius='7px 8px 9px 10px';});
 await until(()=>page.evaluate(()=>window.testPickerRoot.querySelector('[data-css="padding-left"]')?.textContent==='6'),'live overlay padding');
 assert.equal(await page.evaluate(()=>window.testPickerRoot.querySelectorAll('[data-css]').length),12);assert.equal(await page.evaluate(()=>{const e=window.testPickerRoot.querySelector('[data-compact-box]');return getComputedStyle(e).borderTopWidth==='0px'&&!e.textContent.includes('중첩은')&&!e.textContent.includes('box-sizing')&&e.children.length===1}),true);assert.equal(await page.evaluate(()=>window.testPickerRoot.querySelector('[data-css="border-top-right-radius"]').textContent),'8');await page.screenshot({path:'artifacts/explore-overlay-structure.png'});
 await page.evaluate(()=>document.querySelector('#measure-a').style.borderTopLeftRadius='50%');await until(()=>page.evaluate(()=>window.testPickerRoot.querySelector('[data-css="border-top-left-radius"]')?.textContent==='N/A'),'percent radius remains unsupported');
 const regionLabels=await page.evaluate(()=>{const root=window.testPickerRoot.querySelector('[data-compact-box]');return {text:root.textContent,labels:[...root.querySelectorAll('[data-region-label]')].map(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();const values=[...e.parentElement.querySelectorAll('[data-css]')].map(n=>n.getBoundingClientRect());return {name:e.textContent,left:r.left-p.left,top:r.top-p.top,overlap:values.some(v=>Math.min(v.right,r.right)>Math.max(v.left,r.left)&&Math.min(v.bottom,r.bottom)>Math.max(v.top,r.top))}})}});
 assert.deepEqual(regionLabels.labels.map(e=>e.name),['Border','Padding']);assert.ok(regionLabels.labels.every(e=>e.left<=6&&e.top<=3&&!e.overlap));assert.ok(!/Radius|렌더 경계|CSS px/.test(regionLabels.text));assert.ok(regionLabels.text.includes('80 × 50 px'));
 pass('Border and Padding appear once at their region top-left, without separate Radius/unit headings or value overlap');
 await page.setViewportSize({width:320,height:220});await page.waitForTimeout(1000);
 const infoBounds=await page.evaluate(()=>{const e=window.testPickerRoot.querySelector('[data-compact-box]').parentElement,r=e.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom,clipped:e.scrollHeight>e.clientHeight+1};});assert.ok(infoBounds.right<=320&&infoBounds.bottom<=220&&!infoBounds.clipped,JSON.stringify(infoBounds));await page.screenshot({path:'artifacts/explore-overlay-small.png'});await page.setViewportSize({width:1100,height:820});
 await page.evaluate(()=>{const e=document.querySelector('#measure-a');e.style.border='';e.style.padding='';e.style.borderRadius='';});
 pass('pinned structure reuses all twelve edge/corner icons, updates live CSS and keeps percentage radius N/A');
 const sequence=(await state()).sequence;
 assert.equal(await page.locator('[data-figcheck-pin]').count(),1);assert.equal(await page.locator('[data-figcheck-pin]').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
 await page.keyboard.down('Alt');await move('#measure-b');await until(async()=>(await distance())?.horizontal===40,'Alt horizontal gap');
 assert.equal((await distance()).vertical,0);assert.equal((await state()).selected,'measure-a');assert.equal((await state()).sequence,sequence);
 await page.evaluate(()=>{const b=document.createElement('div');b.id='measure-scroll-peer';b.style.cssText='position:absolute;left:140px;top:140px;width:100px;height:50px;background:#999';document.querySelector('#measure-fixture').append(b);});
 await page.mouse.wheel(0,100);await until(()=>page.evaluate(()=>scrollY>=100),'native pinned Alt wheel');await until(async()=>(await state()).message.includes('measure-scroll-peer'),'new B after scroll without mouse movement');assert.equal((await state()).selected,'measure-a');assert.equal((await state()).sequence,sequence);
 await page.keyboard.up('Alt');await page.evaluate(()=>{document.querySelector('#measure-scroll-peer').remove();scrollTo(0,0)});await move('#measure-b');await page.keyboard.down('Alt');await until(async()=>(await distance())?.horizontal===40,'original B after native scroll');
 pass('native Alt scroll refreshes B under stationary pointer and preserves pinned A and comparison sequence');
 await page.screenshot({path:'artifacts/measurement-gap.png'});await page.keyboard.up('Alt');assert.equal(await distance(),undefined);assert.equal(await pinned(),true);
 pass('click pins A; Alt hover measures B in CSS px without changing selection/sequence; keyup leaves A visible');
 await page.evaluate(()=>{window.altTrace=[];for(const name of ['keydown','keyup','blur','focus'])window.addEventListener(name,e=>{window.altTrace.push({type:e.type,key:e.key,alt:e.altKey,trusted:e.isTrusted,focused:document.hasFocus()});});});
 for(let i=0;i<4;i++){await page.keyboard.down('Alt');await until(async()=>Boolean(await distance()),'stationary Alt reentry '+i);await page.keyboard.up('Alt');await until(async()=>!(await distance()),'Alt exit '+i);assert.equal((await state()).selected,'measure-a');}
 await page.mouse.move(185,165);await page.keyboard.down('Alt');await until(async()=>Boolean(await distance()),'moved Alt reentry');await page.keyboard.up('Alt');
 await page.evaluate(()=>scrollBy(0,10));await page.keyboard.down('Alt');await until(async()=>Boolean(await distance()),'scrolled Alt reentry');await page.keyboard.up('Alt');await page.evaluate(()=>scrollTo(0,0));
 report.altReentry={scope:'Playwright keyboard via browser input; trusted DOM events, not physical Windows keys',events:await page.evaluate(()=>window.altTrace)};
 pass('browser keyboard Alt reentry works repeatedly with stationary/moved pointer and after scroll');
 // Deterministic reproduction of a key event delivered while the document is restoring focus.
 await page.evaluate(()=>{window.savedHasFocus=document.hasFocus;document.hasFocus=()=>false;window.dispatchEvent(new KeyboardEvent('keydown',{key:'Alt',code:'AltLeft',altKey:true,bubbles:true}));document.hasFocus=window.savedHasFocus;window.dispatchEvent(new Event('focus'));});
 await until(async()=>Boolean(await distance()),'Alt focus-restoration race');
 await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keyup',{key:'Alt',code:'AltLeft',altKey:false,bubbles:true})));
 assert.equal(await distance(),undefined);assert.equal((await state()).selected,'measure-a');
 pass('synthetic focus-restoration race preserves newly pressed Alt intent and coordinates until fresh hit-test');
 const protection=await page.evaluate(()=>{
  const fire=(type,key,options={})=>{const e=new KeyboardEvent(type,{key,code:key==='Alt'?'AltLeft':'KeyD',bubbles:true,cancelable:true,...options});(document.activeElement||window).dispatchEvent(e);return e.defaultPrevented;};
  const out={};fire('keydown','Alt',{altKey:true});out.measurementUsed=Boolean(window[Symbol.for('figcheck.picker.v1')].measurement);out.usedAltRelease=fire('keyup','Alt');
  for(const [name,options]of Object.entries({ctrl:{altKey:true,ctrlKey:true},shift:{altKey:true,shiftKey:true},altGraph:{altKey:true,modifierAltGraph:true}})){out[name]=fire('keydown','Alt',options)||fire('keyup','Alt',{...options,altKey:false});}
  fire('keydown','Alt',{altKey:true});out.shortcut=fire('keydown','d',{altKey:true})||fire('keyup','Alt');
  const input=document.createElement('input');document.body.append(input);input.focus({preventScroll:true});out.editing=fire('keydown','Alt',{altKey:true})||fire('keyup','Alt');out.editingMeasured=Boolean(window[Symbol.for('figcheck.picker.v1')].measurement);input.remove();
  return out;
 });
 assert.equal(protection.measurementUsed,true);assert.equal(protection.usedAltRelease,true);for(const key of ['ctrl','shift','altGraph','shortcut','editing','editingMeasured'])assert.equal(protection[key],false,key);
 report.altProtection={scope:'synthetic cancelable DOM keyboard events; browser/OS shortcut dispatch is not simulated',...protection};
 await page.keyboard.down('Alt');await until(async()=>Boolean(await distance()),'before blur recovery');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await distance(),undefined);await page.keyboard.up('Alt');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));assert.equal(await distance(),undefined);await page.keyboard.down('Alt');await until(async()=>Boolean(await distance()),'fresh Alt after blur');await page.keyboard.up('Alt');
 pass('only a used bare-Alt release is consumed; shortcuts, Ctrl/Shift/AltGraph and editing remain untouched; fresh Alt recovers after blur');


 await page.keyboard.down('Alt');await alter({left:'140px',top:'130px'});await until(async()=>(await distance())?.vertical===40,'diagonal gap');assert.equal((await distance()).horizontal,40);
 await alter({left:'0px',top:'0px',width:'240px',height:'140px'});await page.mouse.move(45,105);await until(async()=>(await distance())?.kind==='contains','contained box');assert.equal((await distance()).container,'B');assert.deepEqual((await distance()).insets,{top:40,right:140,bottom:50,left:20});await page.screenshot({path:'artifacts/measurement-contained.png'});
 await alter({left:'100px',top:'40px',width:'100px',height:'50px'});await until(async()=>(await distance())?.kind==='touching','touching');
 await alter({left:'70px',top:'50px'});await until(async()=>(await distance())?.kind==='overlap','overlap');await page.screenshot({path:'artifacts/measurement-overlap.png'});await page.keyboard.up('Alt');
 pass('diagonal, four-sided containment, touching and overlap are distinct from authored margin/padding');
 await alter({left:'140px',top:'40px'});await page.keyboard.down('Alt');await move('#measure-b');await until(async()=>Boolean(await distance()),'measurement before modifiers');
 assert.equal(await wheel(120),false);assert.equal((await state()).selected,'measure-a');
 await page.keyboard.down('Shift');assert.equal(await distance(),undefined);await page.keyboard.up('Shift');await page.keyboard.up('Alt');
 await page.mouse.click((await point('#measure-b')).x,(await point('#measure-b')).y);assert.equal(await page.evaluate(()=>window.measureClicks),1);assert.equal((await state()).selected,'measure-a');
 await page.keyboard.down('Alt');await move('#measure-b');await until(async()=>Boolean(await distance()),'measurement before blur');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await distance(),undefined);assert.equal(await pinned(),true);await page.keyboard.up('Alt');
 pass('pinned overlay preserves page clicks and Alt-wheel; combined modifiers and blur clear only B');
 await page.keyboard.down('Alt');await move('#measure-b');await until(async()=>Boolean(await distance()),'measurement before scroll');
 await page.evaluate(()=>window.scrollBy(0,20));await move('#measure-b');await until(async()=>(await distance())?.horizontal===40,'scroll updated');
 await page.setViewportSize({width:1000,height:780});await move('#measure-b');await until(async()=>(await distance())?.horizontal===40,'resize updated');
 await page.evaluate(()=>document.querySelector('#measure-b').style.left='160px');await move('#measure-b');await until(async()=>(await distance())?.horizontal===60,'layout updated');
 await page.evaluate(()=>document.querySelector('#measure-b').style.transform='translateX(10px)');await move('#measure-b');await until(async()=>(await distance())?.horizontal===70,'translated rectangle');await page.keyboard.up('Alt');
 pass('scroll, resize and transformed rendered border-box positions refresh without changing fixed A');
 await page.keyboard.down('Alt');for(const selector of ['#measure-frame','#measure-shadow button','#measure-svg']){await move(selector);await until(async()=>!(await distance()),'unsupported '+selector);assert.equal((await state()).selected,'measure-a');}await page.keyboard.up('Alt');
 pass('iframe, open Shadow internals and SVG cannot become measurement targets');
 const visual=()=>page.evaluate(()=>{const root=window.testPickerRoot;const labels=[...root.querySelectorAll('[data-measure-label]')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,text:e.textContent}});const hint=root.querySelector('[data-role]')?.parentElement.parentElement.getBoundingClientRect();const overlap=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);return {labels,inside:labels.every(r=>r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight),separate:labels.every((r,i)=>labels.slice(i+1).every(b=>!overlap(r,b))),clearInfo:labels.every(r=>!hint||!overlap(r,hint))}});
 const saved=await page.evaluate(()=>['measure-a','measure-b'].map(id=>document.getElementById(id).style.cssText));
 await page.keyboard.press('Escape');await page.setViewportSize({width:320,height:260});
 for(const corner of ['top-left','top-right','bottom-left','bottom-right']){
  await page.evaluate(corner=>{const right=corner.endsWith('right'),bottom=corner.startsWith('bottom');document.body.style.background=bottom?'#171a1f':'#f7f8fa';const x=right?292:4,y=bottom?232:4;document.querySelector('#measure-a').style.cssText=`position:fixed;left:${x+7}px;top:${y+7}px;width:6px;height:6px;background:#75859a`;document.querySelector('#measure-b').style.cssText=`position:fixed;left:${x}px;top:${y}px;width:24px;height:24px;background:#aab4c2;display:none;`;},corner);
  await pin();await page.evaluate(()=>document.querySelector('#measure-b').style.display='block');await page.keyboard.down('Alt');const at=await page.locator('#measure-b').boundingBox();await page.mouse.move(at.x+2,at.y+2);await until(async()=>(await distance())?.kind==='contains','small edge containment');
  const layout=await visual();assert.equal(layout.labels.length,4);assert.ok(layout.inside&&layout.separate&&layout.clearInfo,JSON.stringify({corner,layout}));await page.waitForTimeout(1000);await page.screenshot({path:`artifacts/measurement-edge-${corner}.png`});await page.keyboard.up('Alt');await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1000,height:780});await page.evaluate(saved=>{['measure-a','measure-b'].forEach((id,i)=>document.getElementById(id).style.cssText=saved[i]);document.body.style.background='';},saved);await pin();
 pass('four tiny contained edge cases at 320px keep all labels in viewport, mutually separate and clear of information in light/dark content');
 await page.keyboard.down('Alt');await move('#measure-b');await until(async()=>Boolean(await distance()),'before peer removal');await page.evaluate(()=>document.querySelector('#measure-b').remove());await until(async()=>!(await distance()),'removed peer clears');assert.equal(await pinned(),true);await page.keyboard.up('Alt');
 await page.keyboard.press('Escape');assert.equal(await pinned(),false);assert.equal((await state()).selected,'measure-a');assert.equal(await page.locator('[data-figcheck-pin]').count(),0);
 for(let i=0;i<3;i++){await pin();await page.keyboard.press('Escape');assert.equal(await page.locator('[data-figcheck-pin]').count(),0);}
 await pin();await page.evaluate(()=>document.querySelector('#measure-a').remove());await until(async()=>!(await pinned()),'removed anchor closes pin');assert.equal(await page.locator('[data-figcheck-pin]').count(),0);
 pass('removed B, Escape, repeated pin/exit and removed A clean up overlays while Escape retains selected data');
 await page.evaluate(()=>document.querySelector('#measure-fixture').insertAdjacentHTML('beforeend','<div id="measure-a" style="position:absolute;left:20px;top:40px;width:80px;height:50px;background:#4b83c3">A</div>'));await pin();
 await page.reload();await until(()=>page.evaluate(()=>!document.querySelector('[data-figcheck-pin]')),'navigation removes pinned overlay');
 pass('navigation clears pinned UI and page-owned measurement listeners');

 report.success=true;
}catch(e){report.failure=String(e.stack||e);console.error(e);process.exitCode=1}
finally{await writeFile('artifacts/picker-depth-results.json',JSON.stringify(report,null,2));await context?.close();for(const s of Object.values(servers))s.close()}
