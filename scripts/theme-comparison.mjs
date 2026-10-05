import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({channel:'chromium',headless:true});
const evidence=[];
try {
  for (const [app,label] of [['figma','Figma mock'],['devtools','실제 Chrome DevTools']]) {
    const originals=await Promise.all(['light','dark'].map(theme=>readFile(`artifacts/${app}-theme-${theme}.png`)));
    const sizes=originals.map(buffer=>({width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)}));
    assert.equal(sizes[0].width,sizes[1].width);
    const page=await browser.newPage({viewport:{width:sizes[0].width*2+24,height:900},deviceScaleFactor:1});
    // Original captures are drawn at their native pixel size; only labels/gutter are added.
    await page.setContent(`<html lang="ko"><style>body{margin:0;background:#f2f2ef;color:#252722;font:14px/24px 'Malgun Gothic',sans-serif}.pair{display:flex;gap:24px;align-items:flex-start}.label{height:40px;box-sizing:border-box;padding:8px 12px;font-weight:600}img{display:block}</style><div class="pair">${originals.map((buffer,i)=>`<section><div class="label">${label} · ${i===0?'라이트':'다크'}</div><img width="${sizes[i].width}" height="${sizes[i].height}" src="data:image/png;base64,${buffer.toString('base64')}"></section>`).join('')}</div></html>`);
    await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete));
    const file=`artifacts/${app}-themes-comparison.png`;
    await page.screenshot({path:file,fullPage:true});
    const combined=(await readFile(file)).toString('base64');
    const unchangedPixels=await page.evaluate(async encoded=>{
      const composite=new Image();composite.src='data:image/png;base64,'+encoded;await composite.decode();
      return Array.from(document.images).every((original,index)=>{
        const canvas=document.createElement('canvas');canvas.width=original.width;canvas.height=original.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(original,0,0);const expected=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(composite,index*(original.width+24),40,original.width,original.height,0,0,original.width,original.height);
        const actual=ctx.getImageData(0,0,canvas.width,canvas.height).data;return expected.every((value,i)=>value===actual[i]);
      });
    },combined);
    assert.equal(unchangedPixels,true,'paired capture retains every original pixel');
    evidence.push({file,originals:sizes,scale:1,gutter:24,labelHeight:40,unchangedPixels});
    await page.close();
  }
  await writeFile('artifacts/theme-comparison-layout.json',JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
} finally {await browser.close();}
