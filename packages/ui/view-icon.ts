/** Local monochrome view icons; visible focus and accessible names belong to their buttons. */
export function viewIcon(kind:'web'|'figma'):SVGSVGElement{
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');for(const[k,v]of Object.entries({viewBox:'0 0 24 24',width:'18',height:'18',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(k,v);
 const add=(tag:string,attrs:Record<string,string>)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);};
 if(kind==='web'){add('circle',{cx:'12',cy:'12',r:'9'});add('path',{d:'M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18'});}
 else{add('path',{d:'M9 3H6a3 3 0 0 0 0 6h3ZM9 3h3a3 3 0 1 1 0 6H9ZM9 9H6a3 3 0 1 0 0 6h3ZM9 15H6a3 3 0 1 0 3 3Z'});add('circle',{cx:'12',cy:'12',r:'3'});}
 return svg;
}

