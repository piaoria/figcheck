import {test} from 'node:test';import assert from 'node:assert/strict';
import {normalizeDOM} from '../apps/chrome-extension/src/normalize';
test('DOM border-box contract preserves subpixels; transform and mixed child exclusion',()=>{
  const snapshot={ok:true,rect:{width:124.25,height:64},computed:{width:'100.25px',height:'40px','box-sizing':'content-box','font-family':'"Arial", sans-serif','font-weight':'600','font-size':'16px','line-height':'normal','letter-spacing':'normal',opacity:'1','background-image':'none'}};
  const p=normalizeDOM(snapshot);assert.equal(p.width.status,'supported');if(p.width.status==='supported')assert.equal(p.width.value,124.25);assert.equal(p.lineHeight.status,'unsupported');
  const transformed=normalizeDOM({...snapshot,geometryIssue:'ancestor transform'});assert.equal(transformed.width.status,'unsupported');
  const child=normalizeDOM({...snapshot,textIssue:'mixed child'});assert.equal(child.fontSize.status,'unknown');assert.equal(child.textColor.status,'unknown');
});
