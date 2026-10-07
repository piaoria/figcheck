import { actionIcon, setAction } from '../../../packages/ui/action-icon';
import { initializeColorFormat } from '../../../packages/ui/color-display';
import { isColorFormat } from '../../../packages/ui/color';
import { initializeTheme, isTheme } from '../../../packages/ui/theme';
import { renderProperties, clearProperties } from './property-view';
import { initializeHelp, initializeSettings } from '../../../packages/ui/help';
import { parseDesign, type DesignDocument } from '../../../packages/core/src/index';
import { BUILD, PROTOCOL, RESPONSE_TIMEOUT_MS, type Request, type HostMessage } from './protocol';
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const title = document.querySelector<HTMLElement>('#state-title')!;
const preview = document.querySelector<HTMLTextAreaElement>('#preview')!;
const copy = document.querySelector<HTMLButtonElement>('#copy')!;
const copyStatus = document.querySelector<HTMLElement>('#copy-status')!;
let revision = 0;
const copyLabel=copy.textContent!;
const copyText=document.createElement('span');copyText.className='copy-label';copyText.append(actionIcon('copy'),document.createTextNode(copyLabel));copy.replaceChildren(copyText);copy.classList.add('action-control');copy.title='선택한 디자인 JSON 복사';
let copyFeedbackAnimation:Animation|undefined;
/** Animate only the label; one live text node and a fixed button keep focus and layout stable. */
function setCopyLabel(text:string,animate=false){copyFeedbackAnimation?.cancel();copyFeedbackAnimation=undefined;if(copyText.textContent!==text)copyText.replaceChildren(actionIcon(text==='복사 완료'?'check':'copy'),document.createTextNode(text));if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)copyFeedbackAnimation=copyText.animate([{opacity:.2,transform:'translateY(1px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'ease-out'});}
let copyNoticeTimer:ReturnType<typeof setTimeout>|undefined;
/** Reset feedback when the selection or UI lifetime ends; old completions use revision guards. */
function clearCopyNotice(){if(copyNoticeTimer!==undefined)clearTimeout(copyNoticeTimer);copyNoticeTimer=undefined;copyFeedbackAnimation?.cancel();copyFeedbackAnimation=undefined;copyStatus.textContent='';}
function resetCopyFeedback(){clearCopyNotice();setCopyLabel(copyLabel);}
const diagnostics = document.querySelector<HTMLPreElement>('#details-text')!;
const download = document.querySelector<HTMLButtonElement>('#download')!;
const refresh = document.querySelector<HTMLButtonElement>('#refresh')!;
setAction(download,'save','','디자인 JSON 파일 저장');download.setAttribute('aria-label','디자인 JSON 파일 저장');setAction(document.getElementById('manual-copy')!,'copy',undefined,'선택한 JSON 다시 복사');setAction(document.getElementById('json-toggle')!,'json',undefined,'JSON 원문 보기');setAction(refresh,'refresh');
const session = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
let doc: DesignDocument | undefined, requestId = 0, lastSequence = 0, connected = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let expired = false;
let state = 'connecting', hostBuild = '응답 전', lastError = '';
const history: string[] = [];
function record(label: string) {
  history.push(new Date().toISOString() + ' ' + label); if (history.length > 12) history.shift();
  diagnostics.textContent = `UI: ${BUILD}\nHost: ${hostBuild}\n연결 응답: ${connected ? '있음' : '없음'}\n상태: ${state}\n요청: ${requestId}\n` + (lastError ? `오류: ${lastError}\n` : '') + history.join('\n');
}
function invalidate() { ++revision; resetCopyFeedback(); doc = undefined; clearProperties(document.getElementById('properties')!); (document.getElementById('json-toggle') as HTMLButtonElement).disabled=true;document.getElementById('json-toggle')!.setAttribute('aria-expanded','false');setAction(document.getElementById('json-toggle')!,'json','JSON 보기'); download.disabled = true; copy.disabled = true; preview.value = ''; copyStatus.textContent = ''; document.querySelector<HTMLElement>('#json-preview')!.hidden = true; document.querySelector<HTMLElement>('#manual-copy')!.hidden = true; document.querySelector<HTMLElement>('#property-summary')!.textContent = ''; }
function clearDeadline() { if (timer !== undefined) clearTimeout(timer); timer = undefined; }
function show(next: string, heading: string, message: string) {
  state = next; title.textContent = heading; title.title=heading; status.textContent = message; status.title=message;
  document.body.dataset.state = next;
  refresh.disabled = false;
  setAction(refresh,'refresh',connected?'새로 추출':'다시 연결');
  record(next);
}
function fail(message: string, detail = '') {
  clearDeadline(); invalidate(); lastError = (detail || message).slice(0, 4000);
  show('error', '오류가 발생했어요', message);
}
function waitForResponse() {
  clearDeadline(); timer = setTimeout(() => {
    expired = true; invalidate();
    show('no-response', connected ? '추출 응답이 없어요' : '플러그인 연결 응답이 없어요', '8초 동안 응답을 받지 못했어요. 다시 시도하거나 플러그인을 닫고 올바른 dist manifest로 다시 실행해주세요.');
  }, RESPONSE_TIMEOUT_MS);
}
function request(type: 'ready' | 'refresh') {
  ++requestId; expired = false; lastSequence = 0; lastError = ''; invalidate();
  if (type === 'ready') connected = false;
  show(type === 'ready' ? 'connecting' : 'extracting', type === 'ready' ? '플러그인 연결 확인 중' : '선택한 노드 추출 중', 'Figma의 응답을 기다리고 있어요. 이전 JSON은 지금 내보낼 수 없습니다.');
  refresh.disabled = true; waitForResponse();
  const message: Request = { protocol: PROTOCOL, type, session, requestId };
  try { parent.postMessage({ pluginMessage: message }, '*'); }
  catch (error) { fail('Figma에 요청을 보내지 못했어요.', error instanceof Error ? error.message : String(error)); }
}
const theme = initializeTheme(document.documentElement.classList.contains('figma-dark') ? 'dark' : 'light', (value, themeRevision) => {
  const message: Request = { protocol: PROTOCOL, session, requestId, type: 'theme-set', theme: value, themeRevision };
  parent.postMessage({ pluginMessage: message }, '*');
});
const colorSettings = initializeColorFormat((colorFormat,colorRevision)=>{
  const message: Request={protocol:PROTOCOL,session,requestId,type:'color-set',colorFormat,colorRevision};parent.postMessage({pluginMessage:message},'*');
});
// Figma's documented pluginMessage envelope is validated. A relay may have a null/different
// MessageEvent.source; do not reject a valid correlated reply by assuming source === parent.
window.addEventListener('message', event => {
  const m: Partial<HostMessage> = event.data?.pluginMessage;
  if (!m || typeof m !== 'object') return;
  if ((m as { type?: string }).type === 'selection' && !m.protocol) { fail('UI와 실행 코드의 버전이 다릅니다. dist manifest를 다시 가져와 실행해주세요.'); return; }
  if(m.type==='color-format'&&m.protocol===PROTOCOL&&m.session===session&&m.build===BUILD){
    if(m.colorRevision===0)colorSettings.restore(m.colorFormat);
    else if(Number.isSafeInteger(m.colorRevision)&&m.colorRevision!>0&&isColorFormat(m.colorFormat))colorSettings.saved(m.colorRevision!,m.colorError===true);
    return;
  }
  if (m.type === 'theme' && m.protocol === PROTOCOL && m.session === session && m.build === BUILD) {
    if (m.themeRevision === 0) theme.restore(m.theme);
    else if (Number.isSafeInteger(m.themeRevision) && m.themeRevision! > 0 && isTheme(m.theme)) theme.saved(m.themeRevision!, m.themeError === true);
    return;
  }
  if (expired || m.protocol !== PROTOCOL || m.session !== session || m.requestId !== requestId || !Number.isSafeInteger(m.sequence) || !m.sequence || m.sequence <= lastSequence) return;
  if (typeof m.build !== 'string' || m.build.length > 80) return;
  lastSequence = m.sequence; hostBuild = m.build;
  if (hostBuild !== BUILD) { fail(`UI ${BUILD}와 실행 코드 ${hostBuild}의 버전이 다릅니다. 설치 경로를 확인해주세요.`); return; }
  if (m.type === 'ready') {
    connected = true; show('checking-selection', '선택 확인 중', '노드 하나를 선택하면 JSON으로 추출합니다.'); refresh.disabled = true; waitForResponse(); return;
  }
  if (m.type !== 'state') return;
  connected = true;
  if (m.state === 'extracting') { invalidate(); show('extracting', '선택한 노드 추출 중', '현재 선택을 읽고 있어요. 잠시만 기다려주세요.'); refresh.disabled = true; waitForResponse(); return; }
  clearDeadline(); invalidate();
  if (m.state === 'empty-selection') { show('empty-selection', '선택한 노드가 없어요', 'Figma 캔버스나 레이어 목록에서 비교할 요소 하나를 선택하세요. 선택하면 속성을 자동으로 가져옵니다.'); return; }
  if (m.state === 'multiple-selection') { show('multiple-selection', '노드 하나만 선택해주세요', `${m.selectionCount ?? '여러'}개가 선택되어 있어요. 비교할 요소 하나만 선택하면 자동으로 가져옵니다.`); return; }
  if (m.state === 'error') { fail(typeof m.message === 'string' ? m.message : 'Figma에서 추출에 실패했어요.', typeof m.detail === 'string' ? m.detail : ''); return; }
  if (m.state === 'complete') {
    try {
      doc = parseDesign(JSON.stringify(m.document)); download.disabled = false; copy.disabled = false;
      show('complete', '선택한 노드', doc.nodes[0].name);
      preview.value = JSON.stringify(doc, null, 2); preview.setSelectionRange(0,0); preview.scrollTop = 0; renderProperties(document.getElementById('properties')!,doc.nodes[0].properties,doc.nodes[0].shadows); (document.getElementById('json-toggle') as HTMLButtonElement).disabled=false; const values = Object.values(doc.nodes[0].properties);if(!values.some(v=>v.status==='supported')){title.textContent='비교할 수 있는 속성이 없어요';status.textContent='다른 프레임이나 텍스트 요소를 선택하세요. 현재 요소의 미지원 이유는 추가 정보에서 확인할 수 있어요.';} document.getElementById('property-summary')!.textContent='';
    } catch (error) { fail('추출된 JSON이 올바르지 않아요.', error instanceof Error ? error.message : String(error)); }
    return;
  }
  fail('알 수 없는 응답을 받았어요. 설치 파일을 다시 확인해주세요.');
});
// Keep successful copies in the current view; show raw JSON only if recovery is necessary.
let copyingRevision:number|undefined,copyTask:Promise<void>|undefined;
function announceCopied(current:number){if(current!==revision)return;clearCopyNotice();setCopyLabel('복사 완료',true);copyNoticeTimer=setTimeout(()=>{if(current===revision){setCopyLabel(copyLabel,true);copyNoticeTimer=undefined;}},2500);}
copy.onclick = async () => {
 if(!doc||state!=='complete'||copyingRevision===revision)return;
 const current=revision,text=JSON.stringify(doc,null,2),previous=copyTask;const focusedCopy=document.activeElement===copy;let release!:()=>void;copyTask=new Promise<void>(resolve=>{release=resolve;});copyingRevision=current;copy.disabled=true;let restoreFocus:HTMLElement|undefined;clearCopyNotice();setCopyLabel('복사 중…');
 try{await previous;if(current!==revision)return;if(!navigator.clipboard?.writeText)throw new Error('Clipboard API unavailable');await navigator.clipboard.writeText(text);announceCopied(current);}
 catch{
  if(current!==revision||!doc||state!=='complete')return;
  const active=document.activeElement as HTMLElement|null,scroll=window.scrollY;const helper=document.createElement('textarea');helper.value=text;helper.readOnly=true;helper.setAttribute('aria-hidden','true');helper.tabIndex=-1;helper.style.cssText='position:fixed;left:-10000px;top:0;width:1px;height:1px';document.body.append(helper);helper.focus({preventScroll:true});helper.select();let recovered=false;
  try{recovered=document.execCommand('copy');}catch{/* Actual clipboard denial enters manual recovery. */}finally{helper.remove();active?.focus({preventScroll:true});window.scrollTo(0,scroll);}
  if(recovered){restoreFocus=active??undefined;announceCopied(current);return;}
  document.querySelector<HTMLElement>('#json-preview')!.hidden=false;document.querySelector<HTMLElement>('#manual-copy')!.hidden=false;document.getElementById('json-toggle')!.setAttribute('aria-expanded','true');setAction(document.getElementById('json-toggle')!,'json','JSON 닫기');preview.focus();preview.select();copyStatus.textContent='자동 복사가 차단됐습니다. 선택된 JSON을 Ctrl+C (Mac: ⌘C)로 복사하세요.';
 }finally{if(current===revision&&copy.textContent==='복사 중…')setCopyLabel(copyLabel);release();if(copyingRevision===current)copyingRevision=undefined;if(current===revision&&doc&&state==='complete'){copy.disabled=false;if(focusedCopy&&copy.textContent==='복사 완료')restoreFocus=copy;restoreFocus?.focus({preventScroll:true});}}
};

document.querySelector<HTMLButtonElement>('#manual-copy')!.onclick = () => {
  if (!doc || state !== 'complete') return;
  preview.focus(); preview.select();
  let copied = false; try { copied = document.execCommand('copy'); } catch { /* Keep the manual field selected. */ }
  if(copied)announceCopied(revision);else copyStatus.textContent='선택된 JSON을 Ctrl+C (Mac: ⌘C)로 복사하세요. 자동 복사는 사용할 수 없어요.';
};
download.onclick = () => {
  if (!doc || state !== 'complete') return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'figcheck-selection.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.getElementById('json-toggle')!.onclick=()=>{if(!doc || state!=='complete')return;const section=document.getElementById('json-preview')!;section.hidden=!section.hidden;document.getElementById('json-toggle')!.setAttribute('aria-expanded',String(!section.hidden));setAction(document.getElementById('json-toggle')!,'json',section.hidden?'JSON 보기':'JSON 닫기');if(!section.hidden)preview.focus();};
refresh.onclick = () => request(connected ? 'refresh' : 'ready');
document.querySelector<HTMLButtonElement>('#close')!.onclick = () => {
  clearDeadline(); invalidate();
  const message: Request = { protocol: PROTOCOL, session, requestId, type: 'close' };
  parent.postMessage({ pluginMessage: message }, '*');
};
window.addEventListener('error', event => fail('UI 실행 오류가 발생했어요.', event.error instanceof Error ? event.error.stack : event.message));
window.addEventListener('unhandledrejection', event => fail('UI 요청 처리 중 오류가 발생했어요.', String(event.reason)));
window.addEventListener('unload', clearDeadline);
initializeHelp(); initializeSettings();
request('ready');

window.addEventListener('pagehide',()=>{clearDeadline();invalidate();});
