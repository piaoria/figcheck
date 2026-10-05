import { formatColor, isColorFormat, type ColorFormat } from './color';
let current: ColorFormat='rgb';
export const currentColorFormat=()=>current;
function update(node: HTMLElement, rgba: readonly number[]) {
  const text=formatColor(rgba,current);
  if(node.classList.contains('color-value'))node.textContent=text;
  node.title=text+' · 원본 RGBA '+JSON.stringify(rgba);
}
export function bindColor(node: HTMLElement, rgba: readonly number[]) { node.dataset.rgba=JSON.stringify(rgba);update(node,rgba); }
export function colorValue(rgba: readonly number[]) { const span=document.createElement('span');span.className='color-value';bindColor(span,rgba);return span; }
export function initializeColorFormat(save: (format: ColorFormat, revision: number)=>void) {
  let revision=0;const select=document.getElementById('color-format') as HTMLSelectElement;const feedback=document.getElementById('color-feedback')!;
  function apply(format: ColorFormat) {
    current=format;select.value=format;
    // Replace only color text/tooltips; focus, table nodes, groups and drafts remain intact.
    for(const node of Array.from(document.querySelectorAll<HTMLElement>('[data-rgba]'))){
      const value: unknown=JSON.parse(node.dataset.rgba!);if(Array.isArray(value)&&value.every(v=>typeof v==='number'))update(node,value);
    }
  }
  apply('rgb');select.onchange=()=>{if(!isColorFormat(select.value))return;apply(select.value);feedback.textContent='';save(select.value,++revision);};
  return {restore(value:unknown){if(revision===0&&isColorFormat(value))apply(value);},saved(savedRevision:number,failed:boolean){if(savedRevision===revision)feedback.textContent=failed?'색상 표기를 저장하지 못했어요. 이번 창에는 적용돼요.':'';}};
}
