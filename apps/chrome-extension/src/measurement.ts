export interface MeasureRect { left:number; top:number; right:number; bottom:number }
export interface MeasureLine { x1:number; y1:number; x2:number; y2:number; value:number; label:string }
export interface BoxDistance { kind:'separated'|'touching'|'overlap'|'contains'|'coincident'|'invalid'; horizontal:number; vertical:number; container?:'A'|'B'; insets?:{top:number;right:number;bottom:number;left:number}; lines:MeasureLine[] }
/** Viewport border-box geometry, never authored margin/padding or painted-pixel distance. */
export function measureBoxes(a:MeasureRect,b:MeasureRect):BoxDistance {
 const lines:MeasureLine[]=[];
 const result:BoxDistance={kind:'invalid',horizontal:0,vertical:0,lines};
 if([a,b].some(r=>![r.left,r.top,r.right,r.bottom].every(Number.isFinite)||r.right<=r.left||r.bottom<=r.top))return result;
 const add=(x1:number,y1:number,x2:number,y2:number,value:number,label:string)=>lines.push({x1,y1,x2,y2,value,label});
 const contains=(o:MeasureRect,i:MeasureRect)=>o.left<=i.left&&o.top<=i.top&&o.right>=i.right&&o.bottom>=i.bottom;
 if(contains(a,b)||contains(b,a)){
  const outer=contains(a,b)?a:b,inner=outer===a?b:a;
  result.container=outer===a?'A':'B';result.insets={top:inner.top-outer.top,right:outer.right-inner.right,bottom:outer.bottom-inner.bottom,left:inner.left-outer.left};
  result.kind=Object.values(result.insets).every(v=>v===0)?'coincident':'contains';
  const x=(inner.left+inner.right)/2,y=(inner.top+inner.bottom)/2;
  add(x,outer.top,x,inner.top,result.insets.top,'위');add(inner.right,y,outer.right,y,result.insets.right,'오른쪽');add(x,inner.bottom,x,outer.bottom,result.insets.bottom,'아래');add(outer.left,y,inner.left,y,result.insets.left,'왼쪽');return result;
 }
 const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
 result.horizontal=Math.max(a.left-b.right,b.left-a.right,0);result.vertical=Math.max(a.top-b.bottom,b.top-a.bottom,0);
 if(ox>=0&&oy>=0){result.kind=ox===0||oy===0?'touching':'overlap';const x=Math.max(a.left,b.left),y=Math.max(a.top,b.top);add(x,y,x+ox,y,ox,'겹침 가로');add(x,y,x,y+oy,oy,'겹침 세로');return result;}
 result.kind='separated';
 if(result.horizontal){const left=a.right<=b.left?a:b,right=left===a?b:a;const y=oy>=0?(Math.max(a.top,b.top)+Math.min(a.bottom,b.bottom))/2:(left.top+left.bottom)/2;add(left.right,y,right.left,y,result.horizontal,'가로');}
 if(result.vertical){const top=a.bottom<=b.top?a:b,bottom=top===a?b:a;const x=ox>=0?(Math.max(a.left,b.left)+Math.min(a.right,b.right))/2:(bottom.left+bottom.right)/2;add(x,top.bottom,x,bottom.top,result.vertical,'세로');}
 return result;
}
