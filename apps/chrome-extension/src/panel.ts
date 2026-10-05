import { setAction } from '../../../packages/ui/action-icon';
import { initializeColorFormat } from '../../../packages/ui/color-display';
import { isColorFormat } from '../../../packages/ui/color';
import { initializeTheme, isTheme } from '../../../packages/ui/theme';
import { categoryLabels } from '../../../packages/ui/properties';
import { initializeHelp, initializeSettings } from '../../../packages/ui/help';
import { emptyResult, renderComparison, resetComparisonView, renderWebOnly, labels } from './result-view';
import { compare, flattenNodes, normalTolerance, parseDesign, categories, keys, validateProperties, type DesignDocument, type Key } from '../../../packages/core/src/index';
import { collectSelected, type DOMSnapshot } from './collect';
import { normalizeDOM } from './normalize';
import type { PickerState } from './picker-controller';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $('status'), results = $('results'), evidence = $('evidence'), domLabel = $('dom-label');
for(const [id,action,title] of [['paste-toggle','clipboard','Figma 디자인 JSON 붙여넣기'],['import-button','import','Figma 디자인 JSON 파일 가져오기'],['paste-import','check','입력한 디자인 JSON 검사 및 적용'],['paste-cancel','cancel','입력 초안 취소'],['clear','clear','저장한 디자인 JSON 비우기'],['pick','select','웹 요소 선택'],['capture','refresh','선택한 웹 요소 값 다시 확인']] as const)setAction($(id),action,undefined,title);
const picker = $<HTMLSelectElement>('node'), fileInput = $<HTMLInputElement>('file');
let design: DesignDocument | undefined, snapshot: DOMSnapshot | undefined;
let epoch = 0, importing = 0;
let selectionConfirmed = false;
const hasWebSelection = () => Boolean(snapshot?.ok && (selectionConfirmed || !['BODY', 'HTML'].includes(snapshot.tag ?? '')));
const storageKey = 'figcheck.design.v1';
let ownSelection = false, pickerSequence = 0, pickerToken = '';
const code = () => `(${collectSelected.toString()})(${ownSelection ? `window[Symbol.for('figcheck.picker.v1')]?.token===${JSON.stringify(pickerToken)}?window[Symbol.for('figcheck.picker.v1')].selected:undefined` : '$0'})`;
function pickerRequest(op: 'toggle' | 'cancel', shortcut = false) {
  chrome.runtime.sendMessage({type:'figcheck-picker-action',tabId:chrome.devtools.inspectedWindow.tabId,op,shortcut,issuedAt:Date.now()}).catch(() => { $('picker-status').textContent='DevTools 연결이 끝났어요. DevTools를 다시 열어주세요.'; });
}
const pickerWindow = window as Window & { figcheckPickerState?: (state: PickerState) => void };
pickerWindow.figcheckPickerState = s => {
  pickerToken = s.token; $('picker-status').textContent = s.message;
  setAction($('pick'),s.active?'cancel':'select',s.active?'요소 선택 취소 (Esc)':'요소 선택'); $('pick').setAttribute('aria-pressed', String(s.active));
  if (s.forget) { ownSelection = false; pickerSequence = 0; }
  if (s.selected && s.sequence > pickerSequence) { resetComparisonView(); pickerSequence = s.sequence; ownSelection = true; selectionConfirmed = true; capture(); }
};
$('pick').onclick = () => pickerRequest('toggle');
window.addEventListener('keydown', e => { if (($('help-dialog') as HTMLDialogElement).open || ($('settings-dialog') as HTMLDialogElement).open) return; if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyX') { e.preventDefault(); pickerRequest('toggle',true); } else if (e.key === 'Escape' && $('pick').getAttribute('aria-pressed')==='true') pickerRequest('cancel'); });
chrome.commands.getAll(commands => { const shortcut=commands.find(c=>c.name==='figcheck-pick')?.shortcut; $('shortcut').textContent=shortcut?`${shortcut}: 페이지에 포커스를 두고 선택`:'단축키 미할당. chrome://extensions/shortcuts에서 설정'; });
chrome.runtime.sendMessage({type:'figcheck-panel-ready',tabId:chrome.devtools.inspectedWindow.tabId}).catch(()=>{});
const writeStatus = (text: string, error = false) => { status.textContent = text; status.classList.toggle('error', error); };
function updateFlow() {
  const node = design && flattenNodes(design).find(n => n.id === picker.value);
  const ready = Boolean(node && hasWebSelection()); $('design-summary').title = node ? `${node.name} (${node.type})` : ''; 
  $('design-state').textContent = node ? '' : '아직 없음'; $('design-state').hidden=Boolean(node);
  $('design-state').classList.toggle('ready', Boolean(node));
  $('design-summary').textContent = node ? node.name : 'JSON 입력 대기';
  $('web-state').textContent = hasWebSelection() ? '' : '선택 대기'; $('web-state').hidden=hasWebSelection();
  $('web-state').classList.toggle('ready', hasWebSelection());
  $('clear').hidden = !design; $('capture').hidden = !hasWebSelection(); $('paste-toggle').hidden = ($('paste-details') as HTMLDetailsElement).open; setAction($('paste-toggle'),'clipboard',design?'디자인 변경':'JSON 붙여넣기','Figma 디자인 JSON 붙여넣기'); $('node-label').hidden = !design || flattenNodes(design).length < 2;
  setAction($('import-button'),'import','파일 가져오기','Figma 디자인 JSON 파일 가져오기');
  $('css-details').hidden = !ready;
  for (const [id, done, current] of [['step-design', Boolean(node), !node], ['step-web', hasWebSelection(), Boolean(node) && !hasWebSelection()], ['step-result', false, ready]] as [string, boolean, boolean][]) {
    const step = $(id); step.classList.toggle('done', done); if (current) step.setAttribute('aria-current','step'); else step.removeAttribute('aria-current');
  }
}
function showSelectionGuide() { $('help-button').click(); }

const included = new Set<Key>(keys);
const categoryNames = categoryLabels;
try { const saved = JSON.parse(localStorage.getItem('figcheck.included.v1') ?? 'null'); if (Array.isArray(saved) && saved.every(k => keys.includes(k))) { included.clear(); saved.forEach(k => included.add(k)); } } catch { /* Invalid preferences retain the safe all-properties default. */ }
function updateGroups() {
  for (const [group, list] of Object.entries(categories)) {
    const input = $<HTMLInputElement>('group-'+group), count = list.filter(k => included.has(k)).length;
    input.checked = count === list.length; input.indeterminate = count > 0 && count < list.length;
  }
  $('included-count').textContent = `${included.size}/${keys.length}개 포함`;
}
function changeIncluded() { updateGroups(); try { localStorage.setItem('figcheck.included.v1',JSON.stringify([...included])); } catch { /* Session selection still works. */ } render(); }
for (const [group,list] of Object.entries(categories)) {
  const field=document.createElement('fieldset'), legend=document.createElement('legend'), label=document.createElement('label'), all=document.createElement('input');
  all.type='checkbox';all.id='group-'+group;label.append(all,document.createTextNode(' '+categoryNames[group as keyof typeof categoryNames]));legend.append(label);field.append(legend);
  for (const key of list) { const l=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.id='include-'+key;input.checked=included.has(key);input.onchange=()=>{if(input.checked)included.add(key);else included.delete(key);changeIncluded();};l.append(input,document.createTextNode(' '+labels[key]));field.append(l); }
  all.onchange=()=>{for(const key of list){if(all.checked)included.add(key);else included.delete(key);$<HTMLInputElement>('include-'+key).checked=all.checked;}changeIncluded();};$('property-groups').append(field);
}
updateGroups();
function render() {
  updateFlow();
  if (!design) { evidence.replaceChildren(); emptyResult(results, '디자인 파일부터 가져와 볼까요?', 'JSON을 붙여넣거나 파일을 선택하세요.', '디자인 JSON 가져오기', openPaste);$('next-action').remove();try{const actual=hasWebSelection()&&snapshot?.ok?normalizeDOM(snapshot):undefined;if(actual)validateProperties(actual);renderWebOnly(results,actual,snapshot?.computed);}catch{renderWebOnly(results);writeStatus('웹 값을 확인할 수 없습니다. 요소를 다시 선택하세요.',true);}return; }
  if (!snapshot?.ok || !hasWebSelection()) { evidence.replaceChildren(); emptyResult(results, '이제 웹에서 비교할 부분을 골라주세요', 'Elements 탭에서 웹 요소를 선택하고 돌아오세요. 선택이 바뀌면 결과도 갱신됩니다.', '웹 요소 선택 방법 보기', showSelectionGuide); return; }
  try {
    const node = flattenNodes(design).find(n => n.id === picker.value);
    if (!node) throw new Error('비교할 디자인을 목록에서 선택해주세요.');
    const actual = normalizeDOM(snapshot); validateProperties(actual);
    renderComparison(results, evidence, compare(node.properties, actual, normalTolerance, [...included]), snapshot, node.name);
    if (status.classList.contains('error')) writeStatus('비교 기준을 적용했어요.');
  } catch (e) {
    const message = e instanceof Error ? e.message : '비교 기준을 확인해주세요.';
    writeStatus(message, true); emptyResult(results,'비교 값을 확인해주세요',message,'다시 확인',capture);
  }
}
function setDesign(doc: DesignDocument) {
  resetComparisonView(); design = doc; picker.replaceChildren();
  for (const node of flattenNodes(doc)) { const option = document.createElement('option'); option.value = node.id; option.textContent = `${node.name} (${node.type}, ${node.id})`; picker.append(option); }
  picker.disabled = false; ($('paste-details') as HTMLDetailsElement).open = false; render();
}
// File and pasted text share the exact schema validator and persistence path.
function importText(text: string) {
  const doc = parseDesign(text); setDesign(doc);
  try { localStorage.setItem(storageKey, JSON.stringify(doc)); writeStatus(''); }
  catch { writeStatus('가져오기 완료. 저장 공간이 부족해 패널을 닫으면 다시 가져와야 합니다.'); }
}
const pasteInput = $<HTMLTextAreaElement>('paste-json');
const pasteError = $('paste-error');
function resetPaste() { pasteInput.value = ''; pasteError.textContent = ''; pasteError.hidden = true;pasteInput.setAttribute('aria-invalid','false'); }
function openPaste(){($('paste-details') as HTMLDetailsElement).open=true;updateFlow();pasteInput.focus();}
$('paste-toggle').onclick=openPaste;
($('paste-details') as HTMLDetailsElement).addEventListener('toggle', () => { $('paste-toggle').setAttribute('aria-expanded', String(($('paste-details') as HTMLDetailsElement).open)); $('paste-toggle').hidden = ($('paste-details') as HTMLDetailsElement).open; setAction($('paste-toggle'),'clipboard',design?'디자인 변경':'JSON 붙여넣기','Figma 디자인 JSON 붙여넣기'); });
$('paste-import').onclick = () => {
  ++importing; // Supersede a file read still in flight, including on invalid pasted input.
  fileInput.value = ''; // Permit selecting the same file again after a superseded read.
  pasteError.hidden = true;
  try {
    if (!pasteInput.value.trim()) throw new Error('붙여넣을 JSON이 비어 있어요. Figma에서 JSON을 복사해 주세요.');
    importText(pasteInput.value);
    resetPaste(); ($('paste-details') as HTMLDetailsElement).open = false;updateFlow();$('design-summary').focus();writeStatus('디자인을 적용했습니다.');
  } catch (e) {
    // The draft is uncommitted: invalid paste keeps the existing comparison and stored JSON.
    pasteError.textContent = `${e instanceof Error ? e.message : 'JSON 오류'} 기존 비교 대상은 유지했어요.`;
    pasteError.hidden = false;pasteInput.setAttribute('aria-invalid','true');pasteInput.focus();
  }
};
$('paste-cancel').onclick = () => { resetPaste(); ($('paste-details') as HTMLDetailsElement).open = false;updateFlow(); writeStatus('붙여넣기를 취소했습니다. 기존 JSON을 유지합니다.'); $('paste-toggle').focus(); };
pasteInput.addEventListener('input', () => { pasteError.hidden = true;pasteInput.setAttribute('aria-invalid','false'); });
pasteInput.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('paste-import').click();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();$('paste-cancel').click();}});
/** Inspected-page data is untrusted; check its shape before normalization or display. */
function safeSnapshot(value: unknown): DOMSnapshot {
  if (JSON.stringify(value)?.length > 512 * 1024 || !value || typeof value !== 'object') throw new Error('DOM snapshot 크기/형식 오류');
  const v = value as DOMSnapshot;
  if (typeof v.ok !== 'boolean') throw new Error('DOM snapshot status 오류');
  if (!v.ok) { if (typeof v.error !== 'string') throw new Error('DOM 오류 메시지 누락'); return { ok: false, error: v.error.slice(0, 2048) }; }
  if (!v.computed || typeof v.computed !== 'object' || Object.values(v.computed).some(s => typeof s !== 'string' || s.length > 4096)) throw new Error('computedStyle 형식 오류');
  if (!v.rect || !Number.isFinite(v.rect.width) || !Number.isFinite(v.rect.height) || v.rect.width < 0 || v.rect.height < 0) throw new Error('rect 형식 오류');
  for (const key of ['capturedAt', 'tag', 'id', 'inline', 'geometryIssue', 'textIssue'] as const) if (v[key] !== undefined && (typeof v[key] !== 'string' || v[key]!.length > 4096)) throw new Error('DOM 문자열 형식 오류');
  for (const list of [v.classes, v.evidenceLimits]) if (!Array.isArray(list) || list.length > 100 || list.some(s => typeof s !== 'string' || s.length > 4096)) throw new Error('DOM 목록 형식 오류');
  if (!Array.isArray(v.candidates) || v.candidates.length > 100 || v.candidates.some(c => !c || typeof c.selector !== 'string' || typeof c.source !== 'string' || typeof c.declarations !== 'string' || typeof c.inherited !== 'boolean' || !Array.isArray(c.context) || c.context.some(s => typeof s !== 'string'))) throw new Error('CSS 후보 형식 오류');
  return v;
}
function capture(quiet = false) {
  const previous = snapshot;
  const token = ++epoch;
  if (!quiet) { snapshot = undefined; domLabel.textContent = '선택한 웹 요소 확인 중…'; $('web-meta').textContent=''; render(); }
  chrome.devtools.inspectedWindow.eval(code(), (value, error) => {
    if (token !== epoch) return; // Ignore callbacks for superseded selection/navigation.
    try {
      if (error?.isException || error?.isError) throw new Error('현재 탭 수집 불가. 일반 웹페이지에서 Elements 선택을 확인해주세요.');
      snapshot = safeSnapshot(value);if(!snapshot.ok)resetComparisonView();
      domLabel.textContent = snapshot.ok ? `${snapshot.tag}${snapshot.id ? '#' + snapshot.id : ''}` : '선택한 웹 요소를 읽지 못했어요.';
      $('web-meta').textContent = snapshot.ok ? `${snapshot.rect?.width.toFixed(1)} × ${snapshot.rect?.height.toFixed(1)}px. 현재 선택을 확인했어요${['BODY','HTML'].includes(snapshot.tag ?? '') ? ' 페이지 전체가 선택됐어요. 원하는 부분인지 확인하세요.' : ''}` : `${snapshot.error ?? '요소가 없습니다.'} Elements에서 다시 선택하고 돌아오세요.`;
      if (snapshot.ok && !hasWebSelection()) { domLabel.textContent = '웹 요소 선택 대기'; $('web-meta').textContent = '페이지 전체가 기본 선택되어 있어요. 아래 안내에서 요소 선택 방법을 확인하세요.'; }
      // Keep open evidence details stable when only the capture timestamp changed.
      if (quiet && previous && JSON.stringify({ ...previous, capturedAt: undefined }) === JSON.stringify({ ...snapshot, capturedAt: undefined })) return;
      render();
    } catch (e) { resetComparisonView();snapshot = undefined; domLabel.textContent = '웹 요소를 확인하지 못했어요.'; $('web-meta').textContent = (e instanceof Error ? e.message : '수집 오류') + ' Elements에서 다시 선택하고 확인 버튼을 눌러주세요.'; render(); }
  });
}
fileInput.onchange = async () => {
  const file = fileInput.files?.[0]; if (!file) { writeStatus('파일 선택을 취소했습니다. 현재 JSON을 유지합니다.'); return; }
  const token = ++importing;
  try {
    if (file.size > 1024 * 1024) throw new Error('JSON 최대 1 MiB');
    const text = await file.text(); if (token !== importing) return;
    importText(text);
  } catch (e) {
    if(token!==importing)return;render();
    writeStatus(`가져오기 실패: ${e instanceof Error ? e.message : '오류'} Figma에서 다시 내보낸 JSON 파일을 가져와 주세요.`, true);
  } finally { if (token === importing) fileInput.value = ''; }
};
fileInput.addEventListener('cancel', () => writeStatus('파일 선택을 취소했습니다. 현재 JSON을 유지합니다.'));
$('clear').onclick = () => { resetComparisonView(); ++importing; design = undefined; picker.replaceChildren(); picker.disabled = true; fileInput.value = ''; localStorage.removeItem(storageKey); writeStatus('Figma JSON과 로컬 저장을 지웠습니다.'); render(); };
$('capture').onclick = () => { selectionConfirmed = true; capture(); };
$('import-button').onclick = () => fileInput.click();
picker.onchange = ()=>{resetComparisonView();render();};
chrome.devtools.panels.elements.onSelectionChanged.addListener(() => { resetComparisonView(); ownSelection = false; selectionConfirmed = true; capture(); });
chrome.devtools.network.onNavigated.addListener(() => { resetComparisonView(); ownSelection = false; pickerSequence = 0; $('pick').textContent = '요소 선택'; $('pick').setAttribute('aria-pressed','false'); $('picker-status').textContent = '페이지 이동으로 선택 모드를 종료했어요.'; selectionConfirmed = false; ++epoch; snapshot = undefined; domLabel.textContent = '페이지가 바뀌었어요. 웹 요소를 다시 선택하세요.'; $('web-meta').textContent='이전 선택의 결과는 지웠어요.'; render(); });
(window as Window & { figcheckRefresh?: () => void }).figcheckRefresh = capture;
try { const saved = localStorage.getItem(storageKey); if (saved) { setDesign(parseDesign(saved)); writeStatus('이전에 가져온 디자인을 열었어요. 디자인을 수정했다면 새 JSON을 가져오세요.'); } }
catch { localStorage.removeItem(storageKey); writeStatus('저장 데이터가 유효하지 않아 삭제했습니다.'); }
initializeHelp(); initializeSettings();
capture();
// Refresh current manually selected node for disconnect/style changes; never discover/match nodes.
const timer = setInterval(() => { if (!document.hidden) capture(true); }, 2500);
window.addEventListener('unload', () => { clearInterval(timer); ++epoch; });

const themeKey = 'figcheck.theme.v1';
const theme = initializeTheme(chrome.devtools.panels.themeName === 'dark' ? 'dark' : 'light', (value, revision) => {
  try { localStorage.setItem(themeKey, value); theme.saved(revision, false); }
  catch { theme.saved(revision, true); }
});
try { const saved = localStorage.getItem(themeKey); if (isTheme(saved)) theme.restore(saved); }
catch { /* Unavailable local storage does not block comparison. */ }

const colorKey='figcheck.color-format.v1';const colorSettings=initializeColorFormat((value,revision)=>{try{localStorage.setItem(colorKey,value);colorSettings.saved(revision,false);}catch{colorSettings.saved(revision,true);}});
try{const saved=localStorage.getItem(colorKey);if(isColorFormat(saved))colorSettings.restore(saved);}catch{/* RGB remains usable if storage is blocked. */}
