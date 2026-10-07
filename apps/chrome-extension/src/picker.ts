import type { compactBox } from '../../../packages/ui/compact-box';
import type { icons } from '../../../packages/ui/property-icon';
import type { BoxDistance, measureBoxes } from './measurement';
/** Fixed, self-contained DevTools code. No imported JSON is executable input. */
export function pagePicker(op: 'start' | 'stop' | 'pulse' | 'clear', token: string, operationId = 0, measure?: typeof measureBoxes, structure?:typeof compactBox, shapes?:typeof icons) {
  type State = { token: string; operationId: number; active: boolean; pinned?:boolean; measurement?:BoxDistance; selected?: Element; sequence: number; message: string; lease: number; cleanup: () => void };
  const key = Symbol.for('figcheck.picker.v1');
  const host = window as unknown as Record<symbol, State | undefined>;
  let s = host[key];
  // DevTools eval replies are asynchronous; an older cancellation must not mutate a newer start.
  if (s?.token === token && operationId < s.operationId) return { pinned:s.pinned===true, active: s.active, sequence: s.sequence, message: s.message, selected: Boolean(s.selected?.isConnected) };
  if (s?.token === token) s.operationId = operationId;
  if (s && s.token !== token) { if (op !== 'start') return { active: false, sequence: 0, message: '선택 세션이 바뀌었어요.' }; s.cleanup(); s = undefined; }
  if (op === 'clear') { s?.cleanup(); delete host[key]; return { active: false, sequence: 0, message: '' }; }
  if (op === 'stop') { s?.cleanup(); if (s) s.message = '선택을 취소했어요. 기존 비교는 유지합니다.'; }
  if (op === 'start' && !s?.active) {
    s?.cleanup();
    if (document.hidden) return { active: false, sequence: 0, message: '검사 대상 탭을 먼저 화면에 표시하세요.' };
    s = { token, operationId, active: true, selected: s?.selected, sequence: s?.sequence ?? 0, message: '요소 위로 이동 · ↑ 부모 / ↓ 자식 · 클릭/Enter 선택 · Esc 취소', lease: Date.now(), cleanup: () => {} };
    host[key] = s;
    const state = s, overlay = document.createElement('div');
    overlay.setAttribute('data-figcheck-picker', '');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:auto;cursor:crosshair;contain:layout style;';
    const root = overlay.attachShadow({ mode: 'closed' }), box = document.createElement('div'), hint = document.createElement('div');
    box.style.cssText = 'position:fixed;border:1px solid #52677e;outline:1px solid #ffffffb3;background:rgba(82,103,126,.035);box-sizing:border-box;display:none;pointer-events:none;';
    hint.style.cssText = 'box-sizing:border-box;z-index:2;position:fixed;top:8px;left:8px;max-width:calc(100vw - 16px);padding:7px 9px;background:#272c33;color:#f5f7fa;font:11px/1.55 "Pretendard Variable",system-ui,sans-serif;border:1px solid #59616d;border-radius:5px;white-space:pre-line;overflow-wrap:anywhere;pointer-events:none;';
    hint.textContent = state.message; root.append(box, hint); document.documentElement.append(overlay);
    const peerBox=document.createElement('div'),guides=document.createElement('div');
    peerBox.style.cssText=box.style.cssText+'border-style:dashed;border-color:#7c8999;background:transparent;';
    guides.style.cssText='position:fixed;inset:0;pointer-events:none;';root.append(peerBox,guides);
    let peer:Element|undefined,altHeld=false,altGesture=false,usedAlt=false,frame=0,lastPaint='';
    const number=(v:number)=>String(Math.round(v*1000)/1000);
    const editable=(e:EventTarget|null)=>e instanceof HTMLElement&&(e.isContentEditable||Boolean(e.closest('input,textarea,select,[role="textbox"]')));
    const altOnly=(e:KeyboardEvent|MouseEvent)=>e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.getModifierState('AltGraph');
    const clearDistance=(resetKey=true)=>{if(resetKey)altHeld=false;peer=undefined;state.measurement=undefined;peerBox.style.display='none';guides.replaceChildren();lastPaint='';};
    const place=(node:HTMLElement,r:DOMRect)=>{node.style.display='block';node.style.left=r.left+'px';node.style.top=r.top+'px';node.style.width=r.width+'px';node.style.height=r.height+'px';};
    let infoKey='',structureKey='';let structureView:HTMLElement|undefined;
    const info=(anchor:Element,a:DOMRect,other?:Element,kind='')=>{
      const lines=[['A',label(anchor),`${number(a.width)} × ${number(a.height)}`],...(other?[['B',label(other),kind]]:[])];
      const updated=!other&&structure&&shapes?structure(anchor,shapes,structureKey):undefined;if(updated){structureKey=updated.key;if(updated.view)structureView=updated.view;}
      const diagram=updated&&structureView?{key:structureKey,view:structureView}:undefined;
      const key=JSON.stringify([lines,diagram?.key,innerWidth,innerHeight]);if(key!==infoKey||!hint.querySelector('[data-role]')){
        infoKey=key;hint.replaceChildren();hint.style.whiteSpace='normal';hint.style.width='max-content';hint.style.maxWidth='min(300px,calc(100vw - 16px))';
        for(const [role,name,detail] of lines){const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:7px;min-width:0;';
          const badge=document.createElement('span');badge.dataset.role=role;badge.textContent=role;badge.style.cssText=`flex:none;box-sizing:border-box;width:17px;height:17px;text-align:center;font:600 10px/15px system-ui;border:1px ${role==='A'?'solid':'dashed'} #9eabbc;border-radius:3px;color:${role==='A'?'#272c33':'#e7edf5'};background:${role==='A'?'#dce4ef':'transparent'};`;
          const nameNode=document.createElement('span');nameNode.textContent=name;nameNode.style.cssText='min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          const meta=document.createElement('span');meta.textContent=detail;meta.style.cssText='flex:none;margin-left:auto;color:#c0cad7;font-variant-numeric:tabular-nums;';row.append(badge,nameNode,meta);hint.append(row);
        }
        const foot=document.createElement('div');foot.textContent=other?'border-box · CSS px  /  Alt 해제 · Esc 종료':'Alt + hover 거리  ·  Esc 종료';foot.style.cssText='margin-top:4px;color:#b7c1ce;font-size:10px;';hint.append(foot);if(diagram){hint.append(diagram.view);hint.style.width='264px';}if(diagram)diagram.view.style.zoom=String(Math.min(1,Math.max(.45,(innerHeight-76)/184)));hint.style.maxHeight='calc(100vh - 16px)';hint.style.overflow='hidden';
      }
      const w=hint.offsetWidth,h=hint.offsetHeight,b=other?.getBoundingClientRect();
      const area=(x:number,y:number,rect:DOMRect)=>Math.max(0,Math.min(x+w,rect.right)-Math.max(x,rect.left))*Math.max(0,Math.min(y+h,rect.bottom)-Math.max(y,rect.top));
      const corners=[[8,8],[Math.max(8,innerWidth-w-8),8],[8,Math.max(8,innerHeight-h-8)],[Math.max(8,innerWidth-w-8),Math.max(8,innerHeight-h-8)]];
      corners.sort((c,d)=>(area(c[0],c[1],a)+(b?area(c[0],c[1],b):0))-(area(d[0],d[1],a)+(b?area(d[0],d[1],b):0)));
      hint.style.left=corners[0][0]+'px';hint.style.top=corners[0][1]+'px';
    };
    const pinPaint=()=>{
      if(!state.pinned)return;
      const anchor=state.selected;
      if(!supported(anchor)){state.message='고정한 요소가 제거되어 표시를 종료했어요.';state.cleanup();return;}
      if(peer&&!supported(peer))clearDistance();
      const rootStyle=getComputedStyle(document.documentElement);
      const unsafe=rootStyle.transform!=='none'||rootStyle.perspective!=='none'||rootStyle.filter!=='none'||!['','1','normal'].includes(rootStyle.zoom)||(window.visualViewport?.scale??1)!==1;
      const a=anchor.getBoundingClientRect();
      if(unsafe||!a.width||!a.height){clearDistance();box.style.display='none';state.message='고정 A · 현재 확대/루트 변형 또는 빈 박스는 측정하지 않습니다. Esc 종료';hint.textContent=state.message;return;}
      place(box,a);
      const base=`고정 A · ${label(anchor)} · ${number(a.width)} × ${number(a.height)} CSS px\nAlt+다른 요소 hover: 거리 · Esc: 고정 표시 종료`;
      if(!altHeld||!document.hasFocus()){clearDistance(false);state.message=base;info(anchor,a);return;}
      const candidate=hit();
      if(!candidate||candidate===anchor){peer=undefined;state.measurement=undefined;peerBox.style.display='none';guides.replaceChildren();lastPaint='';state.message=base+(candidate?'':'\n측정 미지원: iframe·Shadow DOM 내부·SVG');hint.textContent=state.message;return;}
      peer=candidate;const b=peer.getBoundingClientRect(),distance=measure?.(a,b);
      if(!distance||distance.kind==='invalid'){clearDistance();state.message=base+'\n빈 박스는 측정하지 않습니다.';hint.textContent=state.message;return;}
      state.measurement=distance;if(altGesture)usedAlt=true;place(peerBox,b);
      const kind=distance.kind==='contains'?`${distance.container}가 다른 박스를 포함`:distance.kind==='coincident'?'동일 경계':distance.kind==='touching'?'맞닿음':distance.kind==='overlap'?'박스 겹침':`가로 ${number(distance.horizontal)} · 세로 ${number(distance.vertical)} CSS px`;
      state.message=base+`\nB · ${label(peer)} · ${kind}\n축 정렬 border-box 경계 기준 · margin/padding 값 아님`;
      if(distance.insets)state.message+=`\n내부 경계: 위 ${number(distance.insets.top)} · 오른쪽 ${number(distance.insets.right)} · 아래 ${number(distance.insets.bottom)} · 왼쪽 ${number(distance.insets.left)} CSS px`;
      info(anchor,a,peer,distance.kind==='separated'?'거리':kind);
      const stamp=JSON.stringify([distance,innerWidth,innerHeight,hint.style.left,hint.style.top]);if(stamp===lastPaint)return;lastPaint=stamp;guides.replaceChildren();
      const occupied:DOMRect[]=[hint.getBoundingClientRect()];
      const tick=(x:number,y:number,vertical:boolean)=>{const e=document.createElement('div');e.style.cssText=`position:fixed;left:${x-(vertical?3:0)}px;top:${y-(vertical?0:3)}px;width:${vertical?7:1}px;height:${vertical?1:7}px;background:#60758d;outline:1px solid #ffffff90;`;guides.append(e);};
      for(const line of distance.lines){
        const vertical=line.x1===line.x2;
        const stroke=document.createElement('div');stroke.style.cssText=`position:fixed;left:${Math.min(line.x1,line.x2)}px;top:${Math.min(line.y1,line.y2)}px;width:${Math.max(1,Math.abs(line.x2-line.x1))}px;height:${Math.max(1,Math.abs(line.y2-line.y1))}px;background:#60758d;outline:1px solid #ffffff90;pointer-events:none;`;guides.append(stroke);tick(line.x1,line.y1,vertical);tick(line.x2,line.y2,vertical);
        const text=document.createElement('div');text.dataset.measureLabel='';
        const caption=distance.kind==='touching'?(vertical?'세로':'가로'):line.label;
        text.textContent=`${caption} ${number(line.value)}`;text.style.cssText='position:fixed;box-sizing:border-box;width:max-content;max-width:calc(100vw - 8px);padding:2px 5px;border:1px solid #aeb9c7;border-radius:3px;background:#f7f9fc;color:#263444;font:500 11px/16px "Pretendard Variable",system-ui,sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:none;';guides.append(text);
        const w=text.offsetWidth,h=text.offsetHeight,cx=(line.x1+line.x2)/2,cy=(line.y1+line.y2)/2;
        const positions=vertical?[[cx+7,cy-h/2],[cx-w-7,cy-h/2]]:[[cx-w/2,cy-h-6],[cx-w/2,cy+6]];
        for(let step=1;step<=8;step++)for(const side of [-1,1])positions.push([cx-w/2,cy+side*step*(h+4)]);
        let chosen=[4,4],best=Infinity;
        for(const pos of positions){const x=Math.max(4,Math.min(innerWidth-w-4,pos[0])),y=Math.max(4,Math.min(innerHeight-h-4,pos[1]));const overlap=occupied.reduce((n,r)=>n+Math.max(0,Math.min(x+w+3,r.right)-Math.max(x-3,r.left))*Math.max(0,Math.min(y+h+3,r.bottom)-Math.max(y-3,r.top)),0);if(overlap<best){best=overlap;chosen=[x,y];}if(!overlap)break;}
        text.style.left=chosen[0]+'px';text.style.top=chosen[1]+'px';occupied.push(text.getBoundingClientRect());
      }
    };
    let paintedAt=0;const animate=()=>{if(state.pinned){const now=performance.now();if(now-paintedAt>=100){pinPaint();paintedAt=now;}frame=requestAnimationFrame(animate);}};
    const keyup=(e:KeyboardEvent)=>{
      if(!state.pinned)return;
      if(e.key==='Alt'){
        // Consume only the completed measurement gesture, not Alt shortcuts or editing.
        if(altGesture&&usedAlt&&e.cancelable&&document.hasFocus()&&!editable(e.target)&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.getModifierState('AltGraph'))e.preventDefault();
        altGesture=usedAlt=false;
      }
      if(!altOnly(e)||e.key==='Alt'){clearDistance();pinPaint();}
    };
    const focus=()=>{if(state.pinned)pinPaint();};
    const blur=()=>{altGesture=usedAlt=false;clearDistance();if(state.pinned)pinPaint();};
    const leave=(e:MouseEvent)=>{if(e.relatedTarget instanceof Element&&e.relatedTarget.tagName==='IFRAME'){if(state.active){x=e.clientX;y=e.clientY;source=target=undefined;overlay.style.pointerEvents='auto';paint('지원하지 않는 대상: iframe 내부 · Elements에서 직접 선택하세요.');}else blur();}else if(!e.relatedTarget)blur();};
    let target: Element | undefined, source: Element | undefined;
    const children = new WeakMap<Element, Element>();
    let x = -1, y = -1;
    const block = (e: Event) => { e.preventDefault(); e.stopImmediatePropagation(); };
    const supported = (el: Element | null | undefined): el is Element => Boolean(el?.isConnected && el !== overlay && !el.closest('[data-figcheck-picker],[data-figcheck-pin]') && el.getRootNode() === document && el.tagName !== 'IFRAME' && el.namespaceURI === 'http://www.w3.org/1999/xhtml');
    const label = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id.slice(0,60) : ''}`;
    const paint = (note = '') => {
      if (!supported(target)) {
        target = undefined; box.style.display = 'none';
        state.message = note || '대상이 사라졌어요. 포인터를 다른 요소로 이동하세요.';
      } else {
        const r = target.getBoundingClientRect();
        box.style.display = 'block'; box.style.left = r.left + 'px'; box.style.top = r.top + 'px'; box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
        const path: string[] = []; let el: Element | null = target;
        for (let i = 0; el && i < 3; i++, el = el.parentElement) path.unshift(label(el));
        state.message = `${path.join(' › ')}${note ? ' · ' + note : ''}\n↑ 부모 / ↓ 이전 자식 · 클릭/Enter 선택 · Esc 취소`;
      }
      hint.textContent = state.message;
    };
    const hit = () => {
      overlay.style.pointerEvents = 'none';
      let first:Element|null=null;
      try {
        first = document.elementFromPoint(x, y);
        if (first?.shadowRoot) first = first.shadowRoot.elementFromPoint(x, y);
        return supported(first) ? first : undefined;
      } finally { overlay.style.pointerEvents = !state.pinned&&first?.tagName==='IFRAME'?'auto':'none'; }
    };
    const move = (e: MouseEvent) => {
      if(state.pinned){x=e.clientX;y=e.clientY;altHeld=altOnly(e)&&!editable(document.activeElement);pinPaint();return;}
      const moved = Math.hypot(e.clientX - x, e.clientY - y) >= 3;
      if (!moved && supported(target)) { paint(); return; }
      x = e.clientX; y = e.clientY;
      const first = hit();
      if (!first) {
        source = target = undefined;
        paint('지원하지 않는 대상: iframe 내부·Shadow DOM 내부·SVG · Elements에서 직접 선택하세요.'); return;
      }
      // Depth survives pointer jitter and movement within the same hit-test leaf.
      if (first !== source || !supported(target)) { source = target = first; }
      paint();
    };
    const depth = (up: boolean) => {
      if (!supported(target)) { paint(); return; }
      let next: Element | undefined;
      if (up) {
        const parent = target.parentElement;
        if (supported(parent)) { children.set(parent, target); next = parent; }
      } else {
        const remembered = children.get(target);
        if (supported(remembered) && remembered.parentElement === target) next = remembered;
        else {
          let child = hit();
          while (supported(child) && child !== target && child.parentElement !== target) child = child.parentElement ?? undefined;
          if (supported(child) && child.parentElement === target) next = child;
        }
      }
      if (next) { target = next; paint(up ? '↑ 부모' : '↓ 자식'); }
      else paint(up ? '최상위 요소' : '이 경로의 더 깊은 자식 없음');
    };
    const confirm = () => {
      if (!target) return; // Keep the unsupported/removed-target explanation after a blocked click.
      if (!supported(target)) { paint(); return; }
      state.selected = target; ++state.sequence;state.active=false;state.pinned=true;
      overlay.removeAttribute('data-figcheck-picker');overlay.setAttribute('data-figcheck-pin','');overlay.style.pointerEvents='none';overlay.style.cursor='default';
      window.removeEventListener('click',choose,true);for(const event of ['pointerdown','pointerup','mousedown','mouseup','contextmenu'])window.removeEventListener(event,block,true);
      clearDistance();pinPaint();frame=requestAnimationFrame(animate);
    };
    // Cancel down/up as well as click, so links/forms do not receive the choosing click.
    const choose = (e: MouseEvent) => { block(e); if (x < 0) move(e); confirm(); };
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { block(e); state.message = state.pinned?'고정 표시를 종료했어요. 기존 비교는 유지합니다.':'선택을 취소했어요. 기존 비교는 유지합니다.'; state.cleanup(); return; }
      if(state.pinned){
        if(e.isComposing||editable(e.target)){altGesture=usedAlt=false;clearDistance();return;}
        if(e.key==='Alt'&&altOnly(e)&&!e.repeat){altGesture=true;usedAlt=false;}else if(e.key!=='Alt')altGesture=usedAlt=false;
        altHeld=altOnly(e);pinPaint();return;
      }
      const el = e.target;
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || (el instanceof HTMLElement && (el.isContentEditable || el.closest('input,textarea,select,[role="textbox"]')))) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { block(e); if (!e.repeat) depth(e.key === 'ArrowUp'); }
      else if (e.key === 'Enter') { block(e); if (!e.repeat) confirm(); }
    };
    const viewport = () => { if(state.pinned)pinPaint();else if (target) paint(); };
    const hide = () => { if (document.hidden) { state.message = '탭 이동으로 선택을 취소했어요.'; state.cleanup(); } };
    const timers = setInterval(() => { if(state.pinned)pinPaint();else if (target && !supported(target)) paint(); if (Date.now() - state.lease > 1500) { state.message = '패널 연결이 끝나 선택을 취소했어요.'; state.cleanup(); if (host[key] === state) delete host[key]; } }, 250);
    state.cleanup = () => {
      state.active = false;state.pinned=false;clearDistance();cancelAnimationFrame(frame);clearInterval(timers);overlay.remove();window.removeEventListener('keyup',keyup,true);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);window.removeEventListener('mouseout',leave,true);
      window.removeEventListener('mousemove', move, true); window.removeEventListener('click', choose, true);
      for (const event of ['pointerdown','pointerup','mousedown','mouseup','contextmenu']) window.removeEventListener(event, block, true);
      window.removeEventListener('keydown', keydown, true); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', state.cleanup);
      window.removeEventListener('scroll', viewport, true); window.removeEventListener('resize', viewport);
    };
    window.addEventListener('keyup',keyup,true);window.addEventListener('blur',blur);window.addEventListener('focus',focus);window.addEventListener('mouseout',leave,true);
    window.addEventListener('mousemove', move, true); window.addEventListener('click', choose, true);
    for (const event of ['pointerdown','pointerup','mousedown','mouseup','contextmenu']) window.addEventListener(event, block, true);
    window.addEventListener('keydown', keydown, true); document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', state.cleanup);
    window.addEventListener('scroll', viewport, true); window.addEventListener('resize', viewport);
  }
  if (s && op === 'pulse') s.lease = Date.now();
  return { pinned:s?.pinned===true, active: s?.active ?? false, sequence: s?.sequence ?? 0, message: s?.message ?? '', selected: Boolean(s?.selected?.isConnected) };
}
