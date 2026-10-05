/** Browser-side evidence for readable typography and semantic status contrast. */
export function inspectControl(target) {
  const e=typeof target==='string'?document.querySelector(target):target,s=getComputedStyle(e),body=getComputedStyle(document.body);
  const lum=color=>{const c=color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  return {background:s.backgroundColor,color:s.color,contrast:ratio(s.color,s.backgroundColor),outlineContrast:ratio(s.outlineColor,body.backgroundColor),outlineWidth:parseFloat(s.outlineWidth),disabled:e.disabled,accent:getComputedStyle(document.querySelector('.property-icon[data-key=width]')??e).color};
}
export function inspectPropertyIcons() {
  const table=document.querySelector('.property-table,.visual-comparison');
  const tableIcons=Array.from(document.querySelectorAll('.property-table .property-icon,.visual-comparison .property-icon'));
  const geometry={};
  for(const key of ['width','height','paddingTop','paddingRight','paddingBottom','paddingLeft','rowGap','columnGap','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','radiusTopLeft','radiusTopRight','radiusBottomRight','radiusBottomLeft']){
    const icon=document.querySelector(`.property-table .property-icon[data-key=${key}],.visual-comparison .property-icon[data-key=${key}]`);const box=icon.querySelector('path[data-emphasis]').getBBox();geometry[key]={x:box.x,y:box.y,width:box.width,height:box.height};
  }
  return {count:tableIcons.length,hiddenFromAccessibility:tableIcons.every(i=>i.getAttribute('aria-hidden')==='true'&&i.getAttribute('focusable')==='false'),labelsRetained:tableIcons.every(i=>Boolean(i.parentElement.querySelector('.property-label-text')?.textContent)),visibleSizes:tableIcons.filter(i=>i.getClientRects().length).map(i=>({width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height})),unsafeElements:table.querySelectorAll('svg script,svg foreignObject,svg use,svg image,svg a').length,geometry};
}
export function assertIconDirections(report,assert,expectedCount=28) {
  assert.equal(report.count,expectedCount);assert.equal(report.hiddenFromAccessibility,true);assert.equal(report.labelsRetained,true);assert.equal(report.unsafeElements,0);
  assert.ok(report.visibleSizes.every(s=>s.width===16&&s.height===16));
  const g=report.geometry;
  for(const suffix of ['Width','Color']){
    assert.ok(g['borderTop'+suffix].y<8&&g['borderTop'+suffix].height===0);
    assert.ok(g['borderRight'+suffix].x>8&&g['borderRight'+suffix].width===0);
    assert.ok(g['borderBottom'+suffix].y>8&&g['borderBottom'+suffix].height===0);
    assert.ok(g['borderLeft'+suffix].x<8&&g['borderLeft'+suffix].width===0);
  }
  for(const [key,right,bottom] of [['radiusTopLeft',false,false],['radiusTopRight',true,false],['radiusBottomRight',true,true],['radiusBottomLeft',false,true]]){
    const b=g[key];assert.equal(b.x+b.width/2>8,right,key+' horizontal corner');assert.equal(b.y+b.height/2>8,bottom,key+' vertical corner');
  }
  assert.ok(g.paddingTop.y+g.paddingTop.height<8);assert.ok(g.paddingBottom.y>8);assert.ok(g.paddingLeft.x+g.paddingLeft.width<8);assert.ok(g.paddingRight.x>8);
  assert.ok(g.width.width>g.width.height&&g.height.height>g.height.width);
  assert.ok(g.rowGap.height<g.rowGap.width&&g.columnGap.width<g.columnGap.height);
}
export function inspectPresentation() {
  const luminance = color => {
    const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
    return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  };
  const body=getComputedStyle(document.body),bg=luminance(body.backgroundColor);
  const contrast=(color,background=bg)=>{const fg=luminance(color);return (Math.max(fg,background)+.05)/(Math.min(fg,background)+.05);};
  const table=document.querySelector('.property-table,.visual-comparison');
  const label=getComputedStyle(table.querySelector('tbody th'));
  const number=getComputedStyle(table.querySelector('td.numeric'));
  const checks=Array.from(document.querySelectorAll('.support,.delta,.result-count,#state-title,.property-category,.result-note,.property-group>summary span')).filter(e=>e.getClientRects().length).map(e=>({text:e.textContent.slice(0,60),contrast:contrast(getComputedStyle(e).color)}));
  const primary=getComputedStyle(document.querySelector('.primary:not(:disabled)'));
  return {fontFamily:label.fontFamily,labelFontSize:parseFloat(label.fontSize),numberFontFamily:number.fontFamily,numberFontVariant:number.fontVariantNumeric,primaryContrast:contrast(primary.color,luminance(primary.backgroundColor)),statusContrasts:checks,minStatusContrast:Math.min(...checks.map(c=>c.contrast)),background:body.backgroundColor,hasGradient:Array.from(document.querySelectorAll('body *')).some(e=>getComputedStyle(e).backgroundImage.includes('gradient')),horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};
}

/** Actual rendered cool-neutral tokens: reversed luminance actions and restrained semantic colors. */
export function inspectNeutralTheme() {
 const root=getComputedStyle(document.documentElement),body=getComputedStyle(document.body);
 const rgb=h=>h.startsWith('#')?'rgb('+[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(', ')+')':h;
 const lum=c=>{const v=rgb(c).match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const token=k=>root.getPropertyValue('--'+k).trim();
 const disabled=document.createElement('button');disabled.className='primary';disabled.disabled=true;disabled.textContent='test';document.body.append(disabled);const st=getComputedStyle(disabled);const neutralDisabled={background:st.backgroundColor,color:st.color,contrast:ratio(st.color,st.backgroundColor)};disabled.remove();
 return {accent:token('accent'),theme:document.documentElement.dataset.theme,neutralTokens:['bg','surface-raised','hover','text','muted','quiet','accent','accent-hover','accent-active','on-accent','selected-bg','icon','link','check','focus','good'].map(name=>({name,color:token(name),chroma:(()=>{const c=[1,3,5].map(i=>parseInt(token(name).slice(i,i+2),16));return Math.max(...c)-Math.min(...c);})()})),states:['accent','accent-hover','accent-active'].map(k=>({state:k,background:token(k),contrast:ratio(token('on-accent'),token(k))})),linkContrast:ratio(token('link'),body.backgroundColor),iconContrast:ratio(token('icon'),body.backgroundColor),focusContrast:ratio(token('focus'),body.backgroundColor),neutralDisabled,semanticColors:['good','bad','danger'].map(k=>({kind:k,color:token(k),contrast:ratio(token(k),body.backgroundColor)}))};
}

export function inspectBoxRegions(){
 return Array.from(document.querySelectorAll('.box-map')).map(map=>{
  const buttons=Array.from(map.querySelectorAll('button'));const rect=map.getBoundingClientRect();
  const bounds=buttons.map(b=>b.getBoundingClientRect());
  const iconReuse=buttons.every(b=>{const key=b.dataset.previewKey;const table=document.querySelector('.property-table .property-icon[data-key='+key+'],.visual-comparison .property-icon[data-key='+key+']');const icon=b.querySelector('.property-icon');return icon&&(!table||icon.outerHTML===table.outerHTML)&&icon.getAttribute('aria-hidden')==='true'&&b.getAttribute('aria-label');});
  const overlap=bounds.some((a,i)=>bounds.some((b,j)=>j>i&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));
  const nested=Boolean(map.querySelector('.border-region>.padding-region>.box-center'));
  const keys=buttons.map(b=>b.dataset.previewKey);
  return {nested,iconReuse,overlap,within:bounds.every(b=>b.left>=rect.left-1&&b.right<=rect.right+1),count:buttons.length,keys,geometryWidth:map.querySelector('.box-dimensions').getBoundingClientRect().width,previewRemoved:map.querySelector('.structure-diagram')===null,cornersInside:map.querySelectorAll('.border-region>.corner-row').length===2,cornerRows:Array.from(map.querySelectorAll('.corner-row')).map(r=>Array.from(r.querySelectorAll('button')).map(b=>b.dataset.previewKey)),oldTerms:/위쪽|아래쪽|왼쪽|오른쪽|안쪽|바깥쪽/.test(map.textContent+' '+buttons.map(b=>b.getAttribute('aria-label')+' '+b.title).join(' '))};
 });
}


export function inspectFigmaColors(){
 const table=Array.from(document.querySelectorAll('.color-cell')).map(pair=>{const r=pair.getBoundingClientRect(),cell=pair.parentElement.getBoundingClientRect(),paint=pair.querySelector('.swatch').getBoundingClientRect(),value=pair.querySelector('.color-value');const t=value.getBoundingClientRect();return {right:Math.abs(r.right-(cell.right-12))<1,inside:r.left>=cell.left-1&&r.right<=cell.right+1,gap:Math.abs(paint.left-t.right-6)<1,centered:Math.abs((paint.top+paint.bottom-t.top-t.bottom)/2)<1,aligned:getComputedStyle(value).textAlign==='right'};});
 const previews=Array.from(document.querySelectorAll('.preview-color-value')).map(pair=>{const r=pair.getBoundingClientRect(),row=pair.parentElement.getBoundingClientRect(),label=pair.parentElement.querySelector('button').getBoundingClientRect(),paint=pair.querySelector('.preview-checker').getBoundingClientRect(),value=pair.querySelector('.color-value'),t=value.getBoundingClientRect();return {right:Math.abs(r.right-row.right)<1,inside:r.left>=row.left-1&&r.right<=row.right+1,gap:Math.abs(paint.left-t.right-6)<1,centered:Math.abs((paint.top+paint.bottom-t.top-t.bottom)/2)<1,aligned:getComputedStyle(value).textAlign==='right',noLabelOverlap:label.right<=r.left};});
 return {table,previews,noPageOverflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth};
}


export function inspectHeaderIcons(){
 const buttons=['settings-button','help-button'].map(id=>{const b=document.getElementById(id),s=getComputedStyle(b),r=b.getBoundingClientRect();return {color:s.color,background:s.backgroundColor,border:s.borderTopWidth,width:r.width,height:r.height,label:b.getAttribute('aria-label'),title:b.title,focus:getComputedStyle(b).outlineColor};});
 return {buttons,equal:buttons[0].color===buttons[1].color&&buttons[0].background===buttons[1].background&&buttons[0].width===buttons[1].width&&buttons[0].height===buttons[1].height,borderless:buttons.every(b=>b.border==='0px'),accessible:buttons.every(b=>b.label&&b.title&&b.width>=30&&b.height>=30)};
}


export function inspectActionControls(rootOrIds,selectedIds){
 const ids=Array.isArray(rootOrIds)?rootOrIds:selectedIds;
 const buttons=ids.map(id=>{const b=document.getElementById(id),icons=b.querySelectorAll('.action-icon'),svg=icons[0],r=b.getBoundingClientRect(),i=svg?.getBoundingClientRect(),s=svg&&getComputedStyle(svg);return{id,kind:svg?.dataset.actionIcon,count:icons.length,text:b.textContent.trim(),title:b.title,hidden:svg?.getAttribute('aria-hidden')==='true'&&svg?.getAttribute('focusable')==='false',size:s?.width==='16px'&&s?.height==='16px',stroke:s?.strokeWidth==='1.6px',centered:!!i&&Math.abs((i.top+i.bottom-r.top-r.bottom)/2)<1};});
 const footer=document.querySelector('.app-footer'),f=footer.getBoundingClientRect(),content=document.querySelector('main')??document.getElementById('properties');return{buttons,noHeaderBrand:!document.querySelector('header h1')&&!document.querySelector('header').textContent.includes('FigCheck'),footer:footer.textContent.trim(),inFlow:getComputedStyle(footer).position==='static',afterResults:f.top>=content.getBoundingClientRect().bottom-1};
}
