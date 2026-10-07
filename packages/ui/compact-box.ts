import type { icons } from './property-icon';
/** Self-contained compact rendering of the shared Border > Padding > dimensions diagram. */
export function compactBox(element:Element,shapes:typeof icons,previousKey=''){
 const s=getComputedStyle(element),r=element.getBoundingClientRect(),round=(n:number)=>String(Math.round(n*1000)/1000);
 const names=['border-top-width','border-right-width','border-bottom-width','border-left-width','padding-top','padding-right','padding-bottom','padding-left','border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius'];
 const values=names.map(n=>s.getPropertyValue(n)),key=JSON.stringify([values,r.width,r.height,s.width,s.height,s.boxSizing]);
 if(key===previousKey)return {key,view:undefined};
 const el=(tag:string,text='',style='')=>{const e=document.createElement(tag);e.textContent=text;e.style.cssText=style;return e;};
 const wrap=el('div','','margin-top:6px;');wrap.dataset.compactBox='';
 const metric=(index:number,icon:keyof typeof shapes)=>{const raw=values[index],valid=/^-?(?:\d+(?:\.\d+)?|\.\d+)px$/.test(raw);const e=el('span',valid?round(parseFloat(raw)):'N/A','display:inline-flex;align-items:center;justify-content:center;gap:2px;min-width:0;overflow:hidden;font:10px/14px system-ui;font-variant-numeric:tabular-nums;');e.dataset.css=names[index];e.title=names[index]+': '+raw+(valid?'':' · 단일 px 미지원');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [k,v]of Object.entries({viewBox:'0 0 16 16',width:'11',height:'11',fill:'none',stroke:'currentColor','stroke-width':'1.5','aria-hidden':'true'}))svg.setAttribute(k,v);svg.style.flex='none';
  for(const shape of shapes[icon]){const n=document.createElementNS('http://www.w3.org/2000/svg',shape.tag);for(const [k,v]of Object.entries(shape.attrs))n.setAttribute(k,v);if(shape.muted)n.setAttribute('opacity','.3');svg.append(n);}e.prepend(svg);return e;};
 const border=el('div','','border:1px solid #8793a3;border-radius:4px;position:relative;padding:18px 3px 3px;display:grid;grid-template-columns:minmax(30px,1fr) minmax(110px,3fr) minmax(30px,1fr);gap:2px;align-items:center;');border.dataset.region='border-region';
 const corners=[metric(8,'radiusTopLeft'),metric(9,'radiusTopRight'),metric(11,'radiusBottomLeft'),metric(10,'radiusBottomRight')];
 const regionLabel=(name:string)=>{const e=el('span',name,'position:absolute;left:4px;top:1px;font:10px/14px system-ui;color:#c0cad7;white-space:nowrap;');e.dataset.regionLabel=name;return e;};
 border.append(regionLabel('Border'),corners[0],el('span'),corners[1]);
 const top=metric(0,'borderTopWidth');top.style.gridColumn='1/-1';border.append(top,metric(3,'borderLeftWidth'));
 const padding=el('div','','border:1px dashed #778596;position:relative;padding:18px 3px 3px;display:grid;grid-template-columns:minmax(20px,1fr) minmax(54px,2fr) minmax(20px,1fr);gap:2px;align-items:center;');padding.dataset.region='padding-region';
 const title=regionLabel('Padding'),pt=metric(4,'paddingTop');pt.style.gridColumn='1/-1';
 padding.append(title,pt,metric(7,'paddingLeft'),el('span',`${round(r.width)} × ${round(r.height)} px`,'font:10px/14px system-ui;text-align:center;overflow-wrap:anywhere;'),metric(5,'paddingRight'));const pb=metric(6,'paddingBottom');pb.style.gridColumn='1/-1';padding.append(pb);border.append(padding,metric(1,'borderRightWidth'));const bottom=metric(2,'borderBottomWidth');bottom.style.gridColumn='1/-1';border.append(bottom,corners[2],el('span'),corners[3]);wrap.append(border);return {key,view:wrap};
}
