/** One native modal per flow; preserve application nodes and return focus to its trigger. */
function initializeDialog(name: 'help' | 'settings') {
  const trigger=document.getElementById(name+'-button') as HTMLButtonElement;
  const dialog=document.getElementById(name+'-dialog') as HTMLDialogElement;
  const close=document.getElementById(name+'-close') as HTMLButtonElement;
  function restore(){trigger.setAttribute('aria-expanded','false');trigger.focus();}
  function dismiss(){dialog.close();restore();}
  dialog.addEventListener('close',()=>trigger.setAttribute('aria-expanded','false')); // Never steal later input focus from a queued close event.
  trigger.onclick=()=>{
    for(const other of Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')))if(other!==dialog)other.close();
    if(!dialog.open)dialog.showModal();dialog.scrollTop=0;trigger.setAttribute('aria-expanded','true');close.focus();
  };
  close.onclick=dismiss;
  if(name==='settings'){
    let startedOutside=false;
    const outside=(e:PointerEvent)=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
    dialog.addEventListener('pointerdown',e=>{startedOutside=outside(e);});
    dialog.addEventListener('pointerup',e=>{if(startedOutside&&outside(e))dismiss();startedOutside=false;});
  }
  dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});
  dialog.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();dismiss();}
    if(e.key==='Tab'){
      const items=Array.from(dialog.querySelectorAll<HTMLElement>('button,a[href],input,textarea,select,summary')).filter(el=>el.getClientRects().length>0&&!(el as HTMLButtonElement).disabled);
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  },true);
}
export function initializeHelp(){initializeDialog('help');}
export function initializeSettings(){initializeDialog('settings');}
