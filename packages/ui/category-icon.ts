import type { Category } from '../core/src/index';
import { categoryLabels } from './properties';
const paths: Record<Category,string>={
  size:'M3 3H13V13H3ZM5 8H11M8 5V11',
  spacing:'M2 4H5V12H2ZM11 4H14V12H11ZM6.5 8H9.5M7 6L5.5 8L7 10M9 6L10.5 8L9 10',
  typography:'M3 3H13M8 3V13M5 13H11',
  color:'M8 2C6 5 3 7 3 10A5 5 0 0 0 13 10C13 7 10 5 8 2Z',
  border:'M5 3H13V13H3V5A2 2 0 0 1 5 3ZM9 3V6H13',
  appearance:'M8 3A5 5 0 1 0 8 13A5 5 0 1 0 8 3ZM8 3V13M5 5V11',
};
function svg(path: string,className: string): SVGSVGElement {
  const ns='http://www.w3.org/2000/svg',icon=document.createElementNS(ns,'svg');icon.classList.add(className);
  for(const [key,value] of Object.entries({viewBox:'0 0 16 16',width:'16',height:'16',fill:'none',stroke:'currentColor','stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))icon.setAttribute(key,value);
  const p=document.createElementNS(ns,'path');p.setAttribute('d',path);icon.append(p);return icon;
}
export function categoryLabel(category: Category): HTMLSpanElement {
  const label=document.createElement('span');label.className='category-label';const text=document.createElement('span');text.className='category-label-text';text.textContent=categoryLabels[category];label.append(svg(paths[category],'category-icon'),text);return label;
}
export function groupChevron(): SVGSVGElement {return svg('M6 4L10 8L6 12','group-chevron');}
