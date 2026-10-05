/** Fixed, self-contained DevTools code. No imported JSON is executable input. */
export function pagePicker(op: 'start' | 'stop' | 'pulse' | 'clear', token: string, operationId = 0) {
  type State = { token: string; operationId: number; active: boolean; selected?: Element; sequence: number; message: string; lease: number; cleanup: () => void };
  const key = Symbol.for('figcheck.picker.v1');
  const host = window as unknown as Record<symbol, State | undefined>;
  let s = host[key];
  // DevTools eval replies are asynchronous; an older cancellation must not mutate a newer start.
  if (s?.token === token && operationId < s.operationId) return { active: s.active, sequence: s.sequence, message: s.message, selected: Boolean(s.selected?.isConnected) };
  if (s?.token === token) s.operationId = operationId;
  if (s && s.token !== token) { if (op !== 'start') return { active: false, sequence: 0, message: '선택 세션이 바뀌었어요.' }; s.cleanup(); s = undefined; }
  if (op === 'clear') { s?.cleanup(); delete host[key]; return { active: false, sequence: 0, message: '' }; }
  if (op === 'stop') { s?.cleanup(); if (s) s.message = '선택을 취소했어요. 기존 비교는 유지합니다.'; }
  if (op === 'start' && !s?.active) {
    if (document.hidden) return { active: false, sequence: 0, message: '검사 대상 탭을 먼저 화면에 표시하세요.' };
    s = { token, operationId, active: true, selected: s?.selected, sequence: s?.sequence ?? 0, message: '요소 위로 이동 → 클릭으로 선택 · Esc 취소', lease: Date.now(), cleanup: () => {} };
    host[key] = s;
    const state = s, overlay = document.createElement('div');
    overlay.setAttribute('data-figcheck-picker', '');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:auto;cursor:crosshair;contain:layout style;';
    const root = overlay.attachShadow({ mode: 'closed' }), box = document.createElement('div'), hint = document.createElement('div');
    box.style.cssText = 'position:fixed;border:2px solid #2463eb;background:rgba(36,99,235,.08);box-sizing:border-box;display:none;';
    hint.style.cssText = 'position:fixed;top:8px;left:8px;max-width:calc(100vw - 16px);padding:8px 12px;background:#172b49;color:white;font:12px/1.5 system-ui;border-radius:6px;';
    hint.textContent = state.message; root.append(box, hint); document.documentElement.append(overlay);
    let target: Element | undefined;
    const block = (e: Event) => { e.preventDefault(); e.stopImmediatePropagation(); };
    const move = (e: MouseEvent) => {
      overlay.style.pointerEvents = 'none';
      let first = document.elementFromPoint(e.clientX, e.clientY);
      if (first?.shadowRoot) first = first.shadowRoot.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = 'auto';
      target = first instanceof Element ? first : undefined;
      if (!target || target.getRootNode() !== document || target.tagName === 'IFRAME' || target.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
        target = undefined; box.style.display = 'none'; hint.textContent = '지원하지 않는 대상: iframe 내부·Shadow DOM 내부·SVG · Elements에서 직접 선택하세요.'; state.message = hint.textContent; return;
      }
      const r = target.getBoundingClientRect(); box.style.display = 'block'; box.style.left = r.left + 'px'; box.style.top = r.top + 'px'; box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
      state.message = `${target.tagName.toLowerCase()}${target.id ? '#' + target.id : ''} · 클릭 선택 / Esc 취소`; hint.textContent = state.message;
    };
    // Cancel down/up as well as click, so links/forms do not receive the choosing click.
    const choose = (e: MouseEvent) => { block(e); move(e); if (!target?.isConnected) return; state.selected = target; ++state.sequence; state.message = '요소를 선택했어요.'; state.cleanup(); };
    const keydown = (e: KeyboardEvent) => { if (e.key === 'Escape') { block(e); state.message = '선택을 취소했어요. 기존 비교는 유지합니다.'; state.cleanup(); } };
    const hide = () => { if (document.hidden) { state.message = '탭 이동으로 선택을 취소했어요.'; state.cleanup(); } };
    const timers = setInterval(() => { if (Date.now() - state.lease > 1500) { state.message = '패널 연결이 끝나 선택을 취소했어요.'; state.cleanup(); if (host[key] === state) delete host[key]; } }, 250);
    state.cleanup = () => {
      state.active = false; clearInterval(timers); overlay.remove();
      window.removeEventListener('mousemove', move, true); window.removeEventListener('click', choose, true);
      for (const event of ['pointerdown','pointerup','mousedown','mouseup','contextmenu']) window.removeEventListener(event, block, true);
      window.removeEventListener('keydown', keydown, true); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', state.cleanup);
    };
    window.addEventListener('mousemove', move, true); window.addEventListener('click', choose, true);
    for (const event of ['pointerdown','pointerup','mousedown','mouseup','contextmenu']) window.addEventListener(event, block, true);
    window.addEventListener('keydown', keydown, true); document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', state.cleanup);
  }
  if (s && op === 'pulse') s.lease = Date.now();
  return { active: s?.active ?? false, sequence: s?.sequence ?? 0, message: s?.message ?? '', selected: Boolean(s?.selected?.isConnected) };
}
