import { visualPreview } from '../../../packages/ui/visual-preview';
import { colorValue, bindColor } from '../../../packages/ui/color-display';
import { categoryLabel, groupChevron } from '../../../packages/ui/category-icon';
import { propertyLabel } from '../../../packages/ui/property-icon';
import { categories, keys, type Properties, type Value, type Category, type Key } from '../../../packages/core/src/index';
import { categoryLabels } from '../../../packages/ui/properties';
import { valueText } from '../../../packages/ui/format';
const element = (tag: string, text?: string) => { const node=document.createElement(tag); if(text!==undefined)node.textContent=text; return node; };
const groupState=new Map<string,boolean>();let pendingFocus='';
export function clearProperties(target: HTMLElement) {
  const active=document.activeElement;if(active instanceof HTMLElement&&(active.id.startsWith('group-toggle-')||active.id.startsWith('figma-visual-')))pendingFocus=active.id;
  for(const d of Array.from(target.querySelectorAll<HTMLDetailsElement>('.property-group')))if(d.dataset.userToggle==='true')groupState.set(d.dataset.category!,d.open);
  target.replaceChildren();
}
function propertyRow(key: Key, value: Value, detail=false) {
  const row=element('tr');row.dataset.key=key;if(value.status!=='supported')row.className='unavailable';
  const name=element('th');name.append(propertyLabel(key));name.setAttribute('scope','row');
  const cell=element('td');cell.className='value';
  if(value.status==='supported'){
    if(typeof value.value==='number')cell.classList.add('numeric');cell.title=JSON.stringify(value.value);if(value.kind!=='rgba')cell.append(document.createTextNode(valueText(value)));
    if(value.kind==='rgba'){const swatch=element('span');swatch.className='swatch';swatch.setAttribute('aria-hidden','true');bindColor(swatch,value.value as number[]);swatch.style.backgroundColor=`rgba(${(value.value as number[]).join(',')})`;const pair=element('span');pair.className='color-cell';pair.append(swatch,colorValue(value.value as number[]));cell.append(pair);}
  }else cell.append(document.createTextNode('—'),element('small',value.reason));
  const status=element('td',value.status==='supported'?'추출됨':value.status==='unknown'?'추출 안 됨':'미지원');status.className='support';row.append(name,cell);if(detail)row.append(status);return row;
}
function tableFor(name: string, className='property-table', detail=false) {
  const table=element('table');table.className=className;table.setAttribute('aria-label',name);
  const head=element('thead'),headers=element('tr');for(const label of detail?['속성','값','상태']:['속성','값'])headers.append(element('th',label));head.append(headers);table.append(head);return table;
}
/** Keep the exchange document complete; only the default presentation is supported-only. */
export function renderProperties(target: HTMLElement, properties: Properties) {
  clearProperties(target);
  const main=element('div');main.id='property-main';
  const available=keys.filter(key=>properties[key].status==='supported');
  const missing=keys.filter(key=>properties[key].status!=='supported');
  if(!available.length)main.append(element('p','지금 표시할 추출 값이 없어요. 자세히 보기에서 이유를 확인하거나 다른 노드를 선택하세요.'));
  for(const [category,categoryKeys] of Object.entries(categories)) {
    const selected=categoryKeys.filter(key=>properties[key].status==='supported');if(!selected.length)continue;
    const group=document.createElement('details');group.className='property-group';group.dataset.category=category;group.open=groupState.get(category)??true;
    if(groupState.has(category))group.dataset.userToggle='true';const summary=element('summary');summary.addEventListener('click',()=>{group.dataset.userToggle='true';});summary.id='group-toggle-'+category;summary.setAttribute('aria-expanded',String(group.open));summary.setAttribute('aria-controls','group-content-'+category);
    summary.append(categoryLabel(category as Category));summary.append(groupChevron());group.append(summary);
    group.addEventListener('toggle',()=>{if(!target.contains(group))return;if(group.dataset.userToggle==='true')groupState.set(category,group.open);summary.setAttribute('aria-expanded',String(group.open));});
    const kind=category==='size'?'structure':category==='color'?'color':category==='typography'?'typography':undefined;
    if(kind)group.append(visualPreview('figma-visual-'+kind,kind,[{title:'Figma',source:'figma',properties}],()=>undefined,key=>{
      let row=target.querySelector<HTMLElement>(`#property-main .property-table tr[data-key=${key}]`);
      if(row){const parent=row.closest('details');if(parent instanceof HTMLDetailsElement)parent.open=true;}
      else{document.getElementById('property-more')?.click();row=target.querySelector<HTMLElement>(`#property-extra tr[data-key=${key}]`);}
      if(row){row.classList.add('preview-target');row.tabIndex=-1;row.focus();row.scrollIntoView({block:'center'});}
    }));
    const table=tableFor(categoryLabels[category]);table.id='group-content-'+category;
    const body=element('tbody');for(const key of selected)body.append(propertyRow(key,properties[key]));table.append(body);group.append(table);main.append(group);
  }
  target.append(main);
  if(missing.length){
    const more=element('button',`자세히 보기 · 추가 정보 ${missing.length}개`) as HTMLButtonElement;more.id='property-more';more.className='secondary';more.setAttribute('aria-controls','property-extra');more.setAttribute('aria-expanded','false');main.append(more);
    const extra=element('section');extra.id='property-extra';extra.hidden=true;extra.setAttribute('aria-label','추출되지 않은 속성의 추가 정보');
    const back=element('button','추출된 값으로 돌아가기') as HTMLButtonElement;back.id='property-back';back.className='secondary';extra.append(back,element('h2','추가 정보'),element('p','추출 안 됨과 미지원의 이유입니다. JSON에는 이 항목도 남아 있어요.'));
    const table=tableFor('추가 정보','property-table property-extra-table');const body=element('tbody');for(const key of missing)body.append(propertyRow(key,properties[key],true));table.append(body);extra.append(table);target.append(extra);
    more.onclick=()=>{main.hidden=true;extra.hidden=false;more.setAttribute('aria-expanded','true');back.focus();};
    back.onclick=()=>{extra.hidden=true;main.hidden=false;more.setAttribute('aria-expanded','false');more.focus();};
  }
  if(pendingFocus&&document.activeElement===document.body)document.getElementById(pendingFocus)?.focus({preventScroll:true});pendingFocus='';
}
