/** Local action symbols, with visible text supplying the accessible name. */
export type Action = 'copy'|'check'|'save'|'import'|'clipboard'|'select'|'refresh'|'cancel'|'clear'|'json'|'help';
const paths:Record<Action,string>={
 copy:'M9 9h11v12H9z M16 9V3H3v13h6',
 check:'M5 12l4 4L19 6',
 save:'M12 3v12m-5-5 5 5 5-5 M4 17v4h16v-4',
 import:'M14 3H5v18h14V8l-5-5 M14 3v5h5 M8 14h8m-3-3 3 3-3 3',
 clipboard:'M9 4H5v17h14V4h-4 M9 2h6v4H9z M8 11h8 M8 15h6',
 select:'M4 3l5 16 3-6 6-3-14-7 M17 3h4v4 M21 15v6h-6',
 refresh:'M20 7V3l-4 4 M20 7a8 8 0 1 0 0 10',
 cancel:'M5 5l14 14 M19 5 5 19',
 clear:'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
 json:'M8 5H5v14h3 M16 5h3v14h-3 M13 8l-2 8',
 help:'M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
};
export function actionIcon(action:Action):SVGSVGElement{
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('class','action-icon');svg.dataset.actionIcon=action;
 const path=document.createElementNS(ns,'path');path.setAttribute('d',paths[action]);svg.append(path);return svg;
}
export function setAction(button:HTMLElement,action:Action,text=button.textContent!,title=text){
 button.classList.add('action-control');button.title=title;button.replaceChildren(actionIcon(action),document.createTextNode(text));
}
