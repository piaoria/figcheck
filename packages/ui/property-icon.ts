import type { Key } from '../core/src/index';
import { labels } from './properties';

type Shape = { tag: 'path' | 'rect' | 'circle'; attrs: Record<string,string>; muted?: boolean };
const path = (d: string, muted = false): Shape => ({ tag:'path', attrs:{d}, muted });
const box: Shape = {tag:'rect',attrs:{x:'3',y:'3',width:'10',height:'10'},muted:true};
const paddingBox: Shape[] = [{tag:'rect',attrs:{x:'2',y:'2',width:'12',height:'12'},muted:true},{tag:'rect',attrs:{x:'5',y:'5',width:'6',height:'6'},muted:true}];
const top=[box,path('M3 3H13')],right=[box,path('M13 3V13')],bottom=[box,path('M3 13H13')],left=[box,path('M3 3V13')];
/** Original geometric SVGs. Directions are screen coordinates; no Figma assets or imported markup. */
export const icons: Record<Key,Shape[]> = {
  width:[path('M2 5V11M14 5V11M2 8H14M4 6L2 8L4 10M12 6L14 8L12 10')],
  height:[path('M5 2H11M5 14H11M8 2V14M6 4L8 2L10 4M6 12L8 14L10 12')],
  paddingTop:[...paddingBox,path('M5 3H11M8 3V5M6 5H10')],
  paddingRight:[...paddingBox,path('M13 5V11M11 8H13M11 6V10')],
  paddingBottom:[...paddingBox,path('M5 13H11M8 11V13M6 11H10')],
  paddingLeft:[...paddingBox,path('M3 5V11M3 8H5M5 6V10')],
  rowGap:[path('M3 3H13M3 13H13',true),path('M5 6H11M5 10H11M8 6V10')],
  columnGap:[path('M3 3V13M13 3V13',true),path('M6 5V11M10 5V11M6 8H10')],
  fontFamily:[path('M3 13L8 3L13 13M5 9H11')],
  fontSize:[path('M2 12L5 4L8 12M3 9H7M11 3H14M11 13H14M12.5 3V13')],
  fontWeight:[path('M4 3V13H8A3 3 0 0 0 8 7H4M4 3H7A2 2 0 0 1 7 7H4')],
  lineHeight:[path('M7 3H14M7 8H12M7 13H14M3 3V13M1 5L3 3L5 5M1 11L3 13L5 11')],
  letterSpacing:[path('M2 3H6M4 3V9M10 3H14M12 3V9M5 13H11M6 12L5 13L6 14M10 12L11 13L10 14')],
  textColor:[path('M3 11L7 3L11 11M5 8H9M2 14H14')],
  backgroundColor:[{tag:'rect',attrs:{x:'3',y:'3',width:'10',height:'10',fill:'currentColor','fill-opacity':'.15'}},path('M3 13L13 3')],
  borderTopWidth:top,borderRightWidth:right,borderBottomWidth:bottom,borderLeftWidth:left,
  borderTopColor:top,borderRightColor:right,borderBottomColor:bottom,borderLeftColor:left,
  radiusTopLeft:[box,path('M3 9V7A4 4 0 0 1 7 3H9')],
  radiusTopRight:[box,path('M7 3H9A4 4 0 0 1 13 7V9')],
  radiusBottomRight:[box,path('M13 7V9A4 4 0 0 1 9 13H7')],
  radiusBottomLeft:[box,path('M9 13H7A4 4 0 0 1 3 9V7')],
  opacity:[{tag:'circle',attrs:{cx:'8',cy:'8',r:'5'}},{tag:'path',attrs:{d:'M8 3A5 5 0 0 0 8 13Z',fill:'currentColor','fill-opacity':'.35'}},path('M8 3V13')],
};
export function propertyIcon(key: Key): SVGSVGElement {
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.classList.add('property-icon');svg.dataset.key=key;
  for(const [name,value] of Object.entries({viewBox:'0 0 16 16',width:'16',height:'16',fill:'none',stroke:'currentColor','stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(name,value);
  for(const shape of icons[key]){const node=document.createElementNS(ns,shape.tag);for(const [name,value] of Object.entries(shape.attrs))node.setAttribute(name,value);if(shape.muted)node.setAttribute('opacity','.3');else node.setAttribute('data-emphasis','true');svg.append(node);}
  return svg;
}
/** Visible Korean text provides the accessible name; decorative SVG is never read twice. */
export function propertyLabel(key: Key): HTMLSpanElement {
  const wrap=document.createElement('span');wrap.className='property-label';
  const text=document.createElement('span');text.className='property-label-text';text.textContent=labels[key];
  wrap.append(propertyIcon(key),text);return wrap;
}
