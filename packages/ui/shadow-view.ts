import { type Shadows, type ShadowLayer, type ShadowComparison } from '../core/src/shadows';
import { colorValue,bindColor } from './color-display';
import { formatNumber } from './format';
const el=(tag:string,text?:string)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function heading(){const h=el('h3');const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.style.cssText='width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.5;vertical-align:middle;margin-right:6px';const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d','M4 4h12v12H4z M8 19h11V8');icon.append(p);h.append(icon,document.createTextNode('그림자'));return h;}
function layerCell(layer:ShadowLayer|undefined){const cell=el('td');cell.className='shadow-value';if(!layer){cell.textContent='없음';return cell;}cell.append(el('span',`${layer.inset?'내부':'외부'} ${layer.index+1}`),el('div',`X ${formatNumber(layer.x)} · Y ${formatNumber(layer.y)} · Blur ${formatNumber(layer.blur)} · Spread ${formatNumber(layer.spread)} px`));const pair=el('span');pair.className='color-cell';const swatch=el('span');swatch.className='swatch';swatch.setAttribute('aria-hidden','true');swatch.style.backgroundColor=`rgba(${layer.color.join(',')})`;bindColor(swatch,layer.color);pair.append(swatch,colorValue(layer.color));cell.append(pair);return cell;}
export function shadowValues(s?:Shadows){
 const section=el('section');section.className='shadow-section';section.append(heading());
 if(s?.status==='supported'){
  if(!s.layers.length)section.append(el('p','없음'));
  else{section.append(el('p','Figma Inspect CSS 비교값 · 자식 합성의 시각적 일치는 검증하지 않습니다.'));const table=el('table');table.className='property-table shadow-table';const body=el('tbody');for(const layer of s.layers){const row=el('tr');row.append(layerCell(layer));body.append(row);}table.append(body);section.append(table);}
 }else{
  section.append(el('p',s?.status==='unsupported'?'비교 불가':'미수집 · 비교값 확인 불가'),el('p',s?.reason??'그림자 데이터 미수집 (구버전 JSON 또는 effects 없음)'));
 }
 const raw=s?.effects?.filter(e=>e.type==='DROP_SHADOW'||e.type==='INNER_SHADOW')??[];
 if(raw.length&&s?.status!=='supported'){
  section.append(el('p','Figma 원본 effects · Radius는 CSS Blur 비교값이 아닙니다.'));
  const table=el('table');table.className='property-table shadow-raw-table';const body=el('tbody');
  for(const effect of raw){const row=el('tr'),cell=el('td');cell.append(el('div',`${effect.type==='INNER_SHADOW'?'내부':'외부'} ${effect.index+1}${effect.visible?'':' · 숨김'}`),el('div',`X ${effect.x} · Y ${effect.y} · Radius ${effect.radius} · Spread ${effect.spread} px`));if(effect.color)cell.append(el('div',`RGBA [${effect.color.join(', ')}]`));cell.append(el('div',`Blend ${effect.blendMode??'미수집'}`));row.append(cell);body.append(row);}table.append(body);section.append(table);
 }
 return section;
}
export function shadowDetails(s:Shadows){const d=el('details');d.className='shadow-details';d.append(el('summary','그림자 · 추가 정보'),el('p',s.reason??'Figma 원본 effects 및 CSS 대응 근거'),el('pre',JSON.stringify({effects:s.effects,css:s.css,mapping:s.mapping},null,2)));return d;}
export function shadowComparison(c:ShadowComparison){const section=el('section');section.className='shadow-section';section.id='shadow-comparison';section.append(heading());if(c.status==='excluded'){section.append(el('p',c.reason));return section;}
 section.append(el('p',`${c.total.score?.toFixed(1)}% · 그림자 규격 일치`));if(!c.rows.length)section.append(el('p','디자인·웹 모두 없음'));
 for(const r of c.rows){const table=el('table');table.className='shadow-table property-table';const caption=el('caption',r.status==='match'?'일치':r.status==='added'?'웹에 추가':r.status==='missing'?'웹에서 누락':'값 차이');const head=el('tr');head.append(el('th','디자인'),el('th','웹'));const row=el('tr'),expected=layerCell(r.expected),actual=layerCell(r.actual);expected.dataset.label='디자인';actual.dataset.label='웹';row.append(expected,actual);for(const th of Array.from(head.children))th.setAttribute('scope','col');const thead=el('thead'),tbody=el('tbody');thead.append(head);tbody.append(row);table.append(caption,thead,tbody);section.append(table);if(r.delta&&r.status==='mismatch')section.append(el('p',`웹 − 디자인: X ${formatNumber(r.delta.x)} · Y ${formatNumber(r.delta.y)} · Blur ${formatNumber(r.delta.blur)} · Spread ${formatNumber(r.delta.spread)} px · RGBA ${r.delta.color.map(formatNumber).join(', ')}`));}
 section.append(el('p',c.note));return section;
}
