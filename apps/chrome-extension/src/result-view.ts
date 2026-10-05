import { setAction } from '../../../packages/ui/action-icon';
import { viewIcon } from '../../../packages/ui/view-icon';
import { visualPreview } from '../../../packages/ui/visual-preview';
import { unavailable, type Properties, type Key } from '../../../packages/core/src/index';
import { colorValue, bindColor } from '../../../packages/ui/color-display';
import { categoryLabel } from '../../../packages/ui/category-icon';
import { propertyLabel } from '../../../packages/ui/property-icon';
import { valueText, deltaText, direction, exclusionLabel } from './format';
import type { Comparison, Value } from '../../../packages/core/src/index';
import type { DOMSnapshot } from './collect';
import { labels, categoryLabels } from '../../../packages/ui/properties';
export { labels } from '../../../packages/ui/properties';
let extraOpen=false, together=false;
export function resetComparisonView(){extraOpen=false;rememberedFocus='';}
let rememberedOpen: string[] = [], rememberedFocus = '', view: 'differences' | 'all' = 'differences';
function remember(target: HTMLElement) {
  if (target.querySelector('details')) rememberedOpen = Array.from(target.querySelectorAll<HTMLDetailsElement>('details[open]')).map(d => d.id);
  if (document.activeElement instanceof HTMLElement && target.contains(document.activeElement) && document.activeElement.id) rememberedFocus = document.activeElement.id;
}
export const element=(tag:string,text?:string,className?:string)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
function detail(id:string,title:string){const d=document.createElement('details');d.id=id;d.className='result-detail';const s=element('summary',title);s.id=id+'-summary';d.append(s);return d;}
export function emptyResult(target:HTMLElement,title:string,description:string,action:string,run:()=>void){
  remember(target);
  target.replaceChildren();const wrap=element('div',undefined,'empty');wrap.append(element('h2',title),element('p',description));
  const button=element('button',action) as HTMLButtonElement;button.id='next-action';setAction(button,action.includes('방법')?'help':action.includes('JSON')?'import':'refresh',action);button.onclick=run;wrap.append(button);target.append(wrap);
}
/** Web is always present; adding Figma changes only previews, never comparison values. */
function viewControls(parent:HTMLElement,canCompare:boolean,rerender:()=>void){
 const bar=element('div',undefined,'preview-toolbar');const note=element('p',canCompare?(together?'Figma·웹 함께 보기':'웹 미리보기')+' · 표와 점수는 디자인과 비교합니다.':'Figma 함께 보기는 디자인 JSON 적용 후 사용할 수 있습니다.','preview-note');note.id='preview-mode-note';note.setAttribute('role','status');
 for(const source of ['web','figma'] as const){const button=element('button',undefined,'view-icon-button') as HTMLButtonElement;button.id='preview-'+source;button.type='button';button.append(viewIcon(source));button.setAttribute('aria-label',source==='web'?'웹 보기 · 항상 표시':'Figma 함께 보기');button.setAttribute('aria-pressed',String(source==='web'||canCompare&&together));button.setAttribute('aria-controls',parent.id);if(source==='figma'&&!canCompare)button.setAttribute('aria-disabled','true');button.title=source==='web'?'웹만 보기':canCompare?(together?'Figma 함께 보기 해제':'Figma와 웹 함께 보기'):'디자인 JSON을 먼저 적용하세요';button.onclick=()=>{if(source==='figma'&&!canCompare){note.textContent='디자인 JSON을 먼저 적용하세요. 웹 미리보기는 계속 표시합니다.';return;}together=source==='figma'?!together:false;rerender();document.getElementById(button.id)?.focus();};bar.append(button);}
 parent.append(bar,note);
}
export function renderWebOnly(target:HTMLElement,actual?:Properties,css?:Record<string,string>){
 const preview=element('div');preview.id='web-preview';viewControls(preview,false,()=>{});
 if(actual){const note=element('p',undefined,'preview-note');note.id='web-value-note';note.setAttribute('role','status');for(const kind of ['structure','color','typography'] as const)preview.append(visualPreview('visual-'+kind,kind,[{title:'웹',source:'web',properties:actual,css}],()=>undefined,key=>{const v=actual[key];note.textContent=labels[key]+': '+(v.status==='supported'?valueText(v):v.reason);}));preview.append(note);}
 target.append(preview);
}
/** Safe text-only view. Comparison math and exclusions stay in the shared engine. */
export function renderComparison(target:HTMLElement,evidence:HTMLElement,c:Comparison,snapshot:DOMSnapshot,designName:string){
  remember(target);
  const openIds=rememberedOpen;
  const focused=document.activeElement instanceof HTMLElement&&target.contains(document.activeElement)?document.activeElement.id:document.activeElement===document.body?rememberedFocus:'';
  target.replaceChildren();evidence.replaceChildren();
  const main=element('div');main.id='comparison-main';const extra=element('section');extra.id='comparison-extra';extra.hidden=!extraOpen;main.hidden=extraOpen;target.append(main,extra);
  const differences=c.rows.filter(r=>r.status==='mismatch'),excluded=c.rows.filter(r=>r.status==='excluded' && r.exclusion!=='user'),userExcluded=c.rows.filter(r=>r.exclusion==='user');
  const heading=element('div',undefined,'result-heading');heading.append(element('div',c.total.score===null?'비교 가능한 속성이 없어요':`${c.total.score.toFixed(1)}% 일치`,'score'),element('span',differences.length?`${differences.length}개 속성에 차이`:'확인된 차이 없음',`result-count${differences.length?'':' good'}`));main.append(heading);
  const context=element('dl',undefined,'comparison-context');
  for(const [label,value] of [['디자인',designName],['웹 요소',snapshot.tag+(snapshot.id?'#'+snapshot.id:'')]]){const field=element('div');const valueNode=element('dd',value);valueNode.title=value;field.append(element('dt',label),valueNode);context.append(field);}main.append(context);
  const note=element('div',undefined,'result-note');
  for(const text of [`${c.total.supported}개 비교 중 ${c.total.matched}개 일치`,...(excluded.length+userExcluded.length?[`추가 정보 ${excluded.length+userExcluded.length}개`]:[])])note.append(element('span',text));main.append(note);
  if(c.total.score===null)main.append(element('p','이 두 대상에서는 비교할 수 있는 속성을 찾지 못했어요. 아래 제외 이유를 확인하거나 다른 요소를 선택해 주세요.','muted'));
  else if(!differences.length)main.append(element('p','비교할 수 있는 속성은 설정한 기준 안에서 모두 같아요. 다른 부분도 확인하려면 Elements에서 다시 선택하세요.','all-good'));
  const counts=element('div',undefined,'comparison-counts');
  for(const [number,label,kind] of [[differences.length,'차이','bad'],[c.total.supported,'비교 가능','supported'],[excluded.length,'비교 제외','excluded']] as [number,string,string][]){const box=element('div',undefined,kind);box.append(element('strong',String(number)),element('span',label));counts.append(box);}main.append(counts);
  const expected=Object.fromEntries(c.rows.map(r=>[r.key,r.exclusion==='user'?unavailable('사용자 제외: 자세히 보기에서 확인', 'unknown'):r.expected])) as Properties;
  const actual=Object.fromEntries(c.rows.map(r=>[r.key,r.exclusion==='user'?unavailable('사용자 제외: 자세히 보기에서 확인', 'unknown'):r.actual])) as Properties;
  function showProperty(key:Key){const row=c.rows.find(r=>r.key===key)!;
    if(row.status==='match'||row.status==='mismatch'){view='all';renderComparison(target,evidence,c,snapshot,designName);const tr=target.querySelector<HTMLElement>(`.visual-comparison tr[data-key=${key}]`);if(tr){tr.classList.add('preview-target');tr.tabIndex=-1;tr.focus();tr.scrollIntoView({block:'center'});}}
    else{document.getElementById('comparison-more')?.click();const reason=target.querySelector<HTMLElement>(`#comparison-extra [data-reason-key=${key}]`)??document.getElementById('user-excluded');if(reason){reason.tabIndex=-1;reason.focus();reason.scrollIntoView({block:'center'});}}
  }
  viewControls(main,true,()=>renderComparison(target,evidence,c,snapshot,designName));const sides=together?[{title:'Figma',source:'figma' as const,properties:expected},{title:'웹',source:'web' as const,properties:actual,css:snapshot.computed}]:[{title:'웹',source:'web' as const,properties:actual,css:snapshot.computed}];
  for(const kind of ['structure','color','typography'] as const)main.append(visualPreview('visual-'+kind,kind,sides,key=>c.rows.find(r=>r.key===key)?.status,showProperty));
  const toolbar=element('div',undefined,'table-toolbar');for(const [mode,title] of [['differences','차이만'],['all','전체 비교값']] as const){const b=element('button',title) as HTMLButtonElement;b.id='view-'+mode;b.setAttribute('aria-pressed',String(view===mode));b.onclick=()=>{view=mode;renderComparison(target,evidence,c,snapshot,designName);document.getElementById(b.id)?.focus();};toolbar.append(b);}if(c.total.supported)main.append(toolbar);
  const grid=element('table',undefined,'visual-comparison');grid.append(element('caption',view==='all'?'비교 가능한 전체 속성':'차이가 있는 속성'));
  const gridHead=element('thead'),gridHeadRow=element('tr');for(const title of ['속성','디자인','웹','차이 (웹 − 디자인)'])gridHeadRow.append(element('th',title));gridHead.append(gridHeadRow);grid.append(gridHead);
  let previousCategory='';
  const gridBody=element('tbody');
  for(const row of view==='differences'?differences:c.rows.filter(r=>r.status==='match'||r.status==='mismatch')){
    if(view==='all'&&row.category!==previousCategory){previousCategory=row.category;const section=element('tr',undefined,'table-group');const title=element('th');title.append(categoryLabel(row.category));title.setAttribute('colspan','4');title.setAttribute('scope','colgroup');section.append(title);gridBody.append(section);}
    const tr=element('tr',undefined,row.status==='mismatch'?'diff-card mismatch':row.status);tr.dataset.key=row.key;
    const property=element('th');property.append(propertyLabel(row.key));property.setAttribute('scope','row');if(view==='differences')property.append(element('small',categoryLabels[row.category],'property-category'));tr.append(property);
    for(const [index,v]of [row.expected,row.actual].entries()){
      const cell=element('td');cell.dataset.label=index===0?'디자인':'웹';if(v.status==='supported'&&typeof v.value==='number')cell.classList.add('numeric');const strong=element('strong');strong.append(v.status==='supported'&&v.kind==='rgba'?colorValue(v.value as number[]):document.createTextNode(valueText(v)));cell.append(strong);
      if(v.status==='supported'&&v.kind==='rgba') {const rgba=v.value as number[];const swatch=element('span',undefined,'color-swatch');bindColor(swatch,rgba);swatch.style.backgroundColor=`rgba(${rgba.join(',')})`;swatch.setAttribute('aria-hidden','true');cell.prepend(swatch);}
      tr.append(cell);
    }
    const delta=deltaText(row);
    const change=element('td',row.status==='match'?'일치':row.status==='excluded'?'비교 제외':delta,'delta');change.dataset.label='차이';if(row.status==='excluded')change.title=row.reason??'비교 제외';if(row.status==='mismatch')change.append(element('small',direction(row),'diff-direction'));tr.append(change);gridBody.append(tr);
  }
  grid.append(gridBody);if(gridBody.children.length)main.append(grid);
  const more=element('button',excluded.length+userExcluded.length?`자세히 보기 · 추가 정보 ${excluded.length+userExcluded.length}개`:'자세히 보기','secondary') as HTMLButtonElement;more.id='comparison-more';more.setAttribute('aria-expanded',String(extraOpen));more.setAttribute('aria-controls','comparison-extra');main.append(more);
  const back=element('button','비교 결과로 돌아가기','secondary') as HTMLButtonElement;back.id='comparison-back';extra.append(back,element('h2','추가 정보'),element('p','아래 항목은 기본 비교 표와 점수에서 제외됩니다. 포함 체크와 비교 가능 여부는 별개예요.','muted'));
  function switchExtra(open:boolean){extraOpen=open;main.hidden=open;extra.hidden=!open;more.setAttribute('aria-expanded',String(open));(open?back:more).focus();}
  more.onclick=()=>switchExtra(true);back.onclick=()=>switchExtra(false);
  for(const label of ['미지원','값 미확인','값 오류']){
    const rows=excluded.filter(row=>exclusionLabel(row)===label);if(!rows.length)continue;
    const section=element('section',undefined,'result-detail');section.append(element('h2',`${label} ${rows.length}개`));const reasons=element('ul',undefined,'reason-list');
    for(const row of rows){const item=element('li');item.dataset.reasonKey=row.key;const title=element('strong');title.append(propertyLabel(row.key));item.append(title);
      for(const [caption,v]of [['디자인',row.expected],['웹',row.actual]] as [string,Value][]){const line=element('p',caption+': ');line.append(v.status==='supported'&&v.kind==='rgba'?colorValue(v.value as number[]):document.createTextNode(valueText(v)));if(v.status!=='supported')line.append(document.createTextNode(' · '+v.reason));item.append(line);}
      if(row.expected.status==='supported'&&row.actual.status==='supported')item.append(element('p',`값 오류: ${row.reason??'유효한 정규화 값이 아니에요.'}`));reasons.append(item);
    }section.append(reasons);extra.append(section);
  }
  if(userExcluded.length){const omitted=element('section',undefined,'result-detail');omitted.id='user-excluded';omitted.append(element('h2',`사용자 제외 ${userExcluded.length}개`),element('p',userExcluded.map(r=>labels[r.key]).join(', '),'muted'),element('p','아래 포함 체크를 켜면 다시 비교를 요청할 수 있어요. 지원 여부에 따라 비교와 점수에 들어갑니다.','muted'));extra.append(omitted);}
  if(!excluded.length&&!userExcluded.length)extra.append(element('p','비교에서 제외된 항목이 없어요.','muted'));
  const categorySection=element('section',undefined,'result-detail');categorySection.id='category-results';categorySection.append(element('h2','항목 일치율'));const badges=element('div',undefined,'badges');for(const [category,score]of Object.entries(c.categories))badges.append(element('span',`${categoryLabels[category]}: ${score.score===null?'비교 불가':score.score.toFixed(0)+'%'} (${score.matched}/${score.supported})`,'badge'));categorySection.append(badges);extra.append(categorySection);
  const originals=element('section',undefined,'result-detail');originals.id='original-values';originals.append(element('h2','원본 값'),element('pre',JSON.stringify(c.rows.map(r=>({property:r.key,expected:r.expected,actual:r.actual,delta:r.delta,status:r.status,exclusion:r.exclusion})),null,2)));extra.append(originals);
  const partial=snapshot.evidenceLimits?.some(s=>/부분조회|접근불가/.test(s));evidence.append(element('p',`${partial?'일부 규칙만 확인했어요.':snapshot.candidates?.length?'관련된 CSS 규칙 후보를 찾았어요.':'확인할 수 있는 CSS 규칙을 찾지 못했어요.'} 값은 현재 스타일과 크기에서 읽었습니다. 후보만으로 실제 적용된 규칙이나 원인을 확정할 수는 없어요.`,'muted'));
  const raw=detail('dom-evidence','요소 정보와 측정값');raw.append(element('pre',JSON.stringify({classes:snapshot.classes,inline:snapshot.inline,rect:snapshot.rect,computed:snapshot.computed},null,2)));evidence.append(raw);
  for(const candidate of snapshot.candidates??[]){const d=document.createElement('details');d.append(element('summary',`${candidate.inherited?'부모 규칙 후보':'선택 요소 규칙 후보'}: ${candidate.selector}`),element('p',candidate.source),element('p',candidate.context.join(' → ')||'최상위 규칙'),element('pre',candidate.declarations));evidence.append(d);}
  const limits=element('ul');for(const limit of snapshot.evidenceLimits??[])limits.append(element('li',limit));evidence.append(limits);
  for(const id of openIds){const d=document.getElementById(id);if(d instanceof HTMLDetailsElement)d.open=true;}
  if(focused)document.getElementById(focused)?.focus({preventScroll:true});
  rememberedFocus = '';
  const announcement=document.getElementById('result-announcement')!;const text=`${differences.length}개 차이, ${c.total.matched}/${c.total.supported}개 일치, ${excluded.length}개 제외`;if(announcement.textContent!==text)announcement.textContent=text;
}
