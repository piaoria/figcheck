import { propertyIcon } from './property-icon';
import { type Properties, type Key, type Diff } from '../core/src/index';
import { labels } from './properties';
import { colorValue, bindColor } from './color-display';
import { valueText } from './format';
import { px, rgba, contentSize, structureKeys } from './visual-model';
export interface VisualSide{title:string;source:'figma'|'web';properties:Properties;css?:Record<string,string>}
const state=new Map<string,boolean>();
const el=(tag:string,text?:string,cls?:string)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};

function na(v:Properties[Key]){return v.status==='supported'?'유효한 지원 값이 아님':v.reason;}
function shown(v:Properties[Key]){return v.status==='supported'?valueText(v):'N/A';}
/** Static SVG/CSS and text nodes only; no imported markup, font loading, or comparison math. */
export function visualPreview(id:string,kind:'structure'|'color'|'typography',sides:VisualSide[],status:(key:Key)=>Diff['status']|undefined,onProperty:(key:Key)=>void):HTMLDetailsElement {
 const details=document.createElement('details');details.id=id;details.className='property-preview';details.open=state.get(id)??(kind==='structure');
 const summary=el('summary',kind==='structure'?'구조':kind==='color'?'색상 미리보기':'글꼴 미리보기');summary.id=id+'-summary';details.append(summary);summary.addEventListener('click',()=>state.set(id,!details.open));details.addEventListener('toggle',()=>{if(details.isConnected)state.set(id,details.open);});
 const note=el('p',kind==='structure'?'실제 크기는 수치로 표시합니다. 중첩 영역은 기호이며 크기·두께·내부 여백은 비례하지 않습니다. margin은 생략, gap은 별도 값입니다.':'원본 값 요약 · 비교에서 확인된 차이만 강조','preview-note');details.append(note);
 const wrap=el('div',undefined,'preview-sides');details.append(wrap);
 function metric(key:Key,v:Properties[Key],source:'figma'|'web',compact=false){const b=el('button',undefined,'preview-metric') as HTMLButtonElement;b.type='button';b.id=id+'-'+source+'-'+key;b.dataset.previewKey=key;const name=labels[key]+': '+shown(v);b.setAttribute('aria-label',name);b.append(propertyIcon(key),el('span',compact?shown(v):name,'preview-value'));b.title=name+' · '+(v.status==='supported'?(v.note??'속성 행으로 이동'):na(v));if(status(key)==='mismatch')b.classList.add('preview-difference');if(v.status!=='supported')b.classList.add('preview-na');b.onclick=()=>onProperty(key);return b;}
 for(const side of sides){const p=side.properties,card=el('section',undefined,'preview-side');card.dataset.source=side.source;card.append(el('h3',side.title));wrap.append(card);
  if(kind==='structure'){
   const w=px(p.width),h=px(p.height);
   const map=el('div',undefined,'box-map');map.setAttribute('aria-label',side.title+' 테두리·내부 여백·모서리 속성');
   function corners(keys:Key[]){const row=el('div',undefined,'corner-row');for(const key of keys)row.append(metric(key,p[key],side.source,true));return row;}
   function region(name:string,cls:string,keys:Key[],center:HTMLElement){const box=el('div',undefined,'box-region '+cls);box.dataset.region=cls;box.append(el('span',name,'region-label'));for(const [i,key]of keys.entries()){const button=metric(key,p[key],side.source,true);button.dataset.position=['top','right','bottom','left'][i];box.append(button);}box.append(center);return box;}
   const center=el('div',undefined,'box-center');const dimensions=el('div',undefined,'box-dimensions');dimensions.dataset.layoutWidth=w===undefined?'N/A':String(w);dimensions.dataset.layoutHeight=h===undefined?'N/A':String(h);dimensions.dataset.geometry=w===undefined||h===undefined?'unknown':'known';for(const key of ['width','height'] as Key[])dimensions.append(metric(key,p[key],side.source,true));center.append(dimensions);
   const padding=region('Padding','padding-region',['paddingTop','paddingRight','paddingBottom','paddingLeft'],center);
   const border=region('Border','border-region',['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'],padding);
   border.prepend(corners(['radiusTopLeft','radiusTopRight']));border.append(corners(['radiusBottomLeft','radiusBottomRight']));map.append(border);card.append(map);
   card.append(el('p','Radius는 Border의 네 모서리 값 · 실제 곡선 렌더링 없음','preview-note'));
   const metrics=el('div',undefined,'preview-metrics');for(const key of structureKeys.filter(k=>k==='rowGap'||k==='columnGap'))metrics.append(metric(key,p[key],side.source));card.append(metrics);
   const inner=contentSize(p,side.source,side.css);const content=el('p','content '+shown(inner.width)+' × '+shown(inner.height),'preview-content');content.title=inner.width.status==='supported'?'웹 확인된 border-box − padding − border':inner.width.reason;content.dataset.status=inner.width.status;card.append(content);if(inner.width.status!=='supported')card.append(el('p',inner.width.reason,'preview-note'));
  }else if(kind==='color'){
   const colorKeys=(sides.length===1&&side.source==='figma'?['textColor','backgroundColor']:['backgroundColor','textColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor']) as Key[];for(const key of colorKeys){if(sides.length===1&&side.source==='figma'&&p[key].status!=='supported')continue;const row=el('div',undefined,'preview-color-row');const label=metric(key,p[key],side.source);label.replaceChildren(propertyIcon(key),el('span',labels[key],'preview-value'));row.append(label);const value=rgba(p[key]);if(value){const checker=el('span',undefined,'preview-checker');const paint=el('span',undefined,'preview-paint');paint.style.backgroundColor=`rgba(${value.join(',')})`;bindColor(paint,value);paint.setAttribute('aria-hidden','true');checker.append(paint);const text=colorValue(value);if(sides.length===1&&side.source==='figma'){const pair=el('span',undefined,'preview-color-value');pair.append(checker,text);row.append(pair);}else row.append(checker,text);}else row.append(el('span','N/A','preview-na'));card.append(row);}
  }else{
   const list=el('div',undefined,'preview-fonts');for(const key of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing'] as Key[])list.append(metric(key,p[key],side.source));card.append(list,el('p','요청된 font-family 요약 · 실제 사용 font/fallback은 확인하지 않음','preview-note'));
  }
 }
 return details;
}
