/** Lightweight probe: no stylesheet rule scan; only the selected element and bounded ancestors. */
export function selectionFingerprint(selected:unknown):string {
 if(!selected||typeof selected!=='object'||!('nodeType' in selected)||selected.nodeType!==1)return 'missing';
 const node=selected as Element;if(!node.isConnected)return 'missing';const win=node.ownerDocument.defaultView;if(!win)return 'missing';
 const s=win.getComputedStyle(node),r=node.getBoundingClientRect();
 const properties=Array.from(s).filter(k=>/^(width|height|box-|overflow|scrollbar|padding|row-gap|column-gap|display|font-|line-height|letter-spacing|color|background|border|opacity|transform|zoom|text-shadow|filter|backdrop-filter|mix-blend-mode)$|^(box-|overflow-|scrollbar-|padding-|border-|font-|background-)/.test(k));
 const values=properties.map(k=>s.getPropertyValue(k));
 const ancestry=[];for(let n:Element|null=node,depth=0;n&&depth<64;n=n.parentElement??(n.getRootNode() instanceof win.ShadowRoot?(n.getRootNode() as ShadowRoot).host:null),depth++){const c=win.getComputedStyle(n);ancestry.push([c.transform,c.rotate,c.scale,c.translate,c.zoom,c.filter,c.backdropFilter,c.mixBlendMode]);}
 return JSON.stringify([node.tagName,node.id,node.className,node.getAttribute('style'),node.childElementCount,Array.from(node.childNodes).some(n=>n.nodeType===3&&n.textContent?.trim()),win.getComputedStyle(node,'::before').content,win.getComputedStyle(node,'::after').content,r.width,r.height,node.getClientRects().length,values,ancestry]);
}
