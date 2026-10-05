import { type Properties, type Key, type Value, type RGBA, unavailable, numberValue } from '../core/src/index';
export const structureKeys: Key[]=['width','height','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','radiusTopLeft','radiusTopRight','radiusBottomRight','radiusBottomLeft','rowGap','columnGap'];
export const radiusKeys: Key[]=['radiusTopLeft','radiusTopRight','radiusBottomRight','radiusBottomLeft'];
export function px(value:Value):number|undefined{return value.status==='supported'&&value.kind==='px'&&typeof value.value==='number'&&Number.isFinite(value.value)&&value.value>=0?value.value:undefined;}
export function rgba(value:Value):RGBA|undefined{return value.status==='supported'&&value.kind==='rgba'&&Array.isArray(value.value)&&value.value.length===4&&value.value.every((n,i)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=(i===3?1:255))?value.value as RGBA:undefined;}
/** One scale across both sides; unknown is never turned into zero. */
export function structureScale(sides:Properties[]):number {
 const widths=sides.map(p=>px(p.width)).filter((n):n is number=>n!==undefined&&n>0),heights=sides.map(p=>px(p.height)).filter((n):n is number=>n!==undefined&&n>0);
 return Math.min(widths.length?180/Math.max(...widths):1,heights.length?90/Math.max(...heights):1);
}
export function roundedShape(p:Properties):{radii?:number[];reason?:string} {
 const w=px(p.width),h=px(p.height),r=radiusKeys.map(k=>px(p[k]));
 if(w===undefined||h===undefined||r.some(n=>n===undefined))return{reason:'크기 또는 corner 값 N/A: 곡선 재현 안 함'};
 const [tl,tr,br,bl]=r as number[];
 if(tl+tr>w||bl+br>w||tl+bl>h||tr+br>h)return{reason:'corner 겹침: Figma/CSS 사용 radius 계산 안 함'};
 return{radii:r as number[]};
}
/** No schema metadata for Figma stroke/layout inclusion, so never derive its content box. */
export function contentSize(p:Properties,source:'figma'|'web',css?:Record<string,string>):{width:Value;height:Value} {
 const fail=(reason:string)=>({width:unavailable(reason,'unknown'),height:unavailable(reason,'unknown')});
 if(source==='figma')return fail('Figma stroke/layout 포함 정보 없음: content 역산 안 함');
 if(!css||!['content-box','border-box'].includes(css['box-sizing'])||!['visible','clip','hidden'].includes(css['overflow-x'])||!['visible','clip','hidden'].includes(css['overflow-y'])||css['scrollbar-gutter']!=='auto')return fail('웹 box-sizing/scrollbar 여부 불확실: content 역산 안 함');
 const list=['width','height','paddingLeft','paddingRight','paddingTop','paddingBottom','borderLeftWidth','borderRightWidth','borderTopWidth','borderBottomWidth'] as Key[];
 const v=list.map(k=>px(p[k]));if(v.some(n=>n===undefined))return fail('크기·padding·solid border N/A: content 역산 안 함');
 const [w,h,pl,pr,pt,pb,bl,br,bt,bb]=v as number[],cw=w-pl-pr-bl-br,ch=h-pt-pb-bt-bb;
 if(cw<0||ch<0)return fail('내부 크기가 음수: clamp하지 않고 계산 오류로 제외');
 return{width:numberValue(cw,'px','확인된 border-box − padding − border'),height:numberValue(ch,'px','확인된 border-box − padding − border')};
}
