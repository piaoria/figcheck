import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const palette=['#cb6557','#4b83c3','#278d79','#9a73b5'];
const luminance=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrasts=palette.map(color=>({color,ratios:['#f6f7f9','#171a1f','#272c33'].map(bg=>{const a=luminance(color),b=luminance(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);})}));
assert.ok(contrasts.every(c=>c.ratios.every(r=>r>=3)),JSON.stringify(contrasts));
const source=await readFile('packages/ui/brand/mark.svg','utf8');assert.ok(palette.every(color=>source.includes(color)));assert.ok(!source.includes('Gradient'));
const sizes=[16,32,48,128];
const manifest=JSON.parse(await readFile('apps/chrome-extension/dist/manifest.json','utf8'));
const tiles=[];
for(const size of sizes){
 const file=`icons/icon-${size}.png`;assert.equal(manifest.icons[size],file);assert.equal(manifest.action.default_icon[size],file);
 const png=await readFile(`apps/chrome-extension/dist/${file}`);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 tiles.push(`<figure><img width="${size}" height="${size}" src="data:image/png;base64,${png.toString('base64')}"/><figcaption>${size} px</figcaption></figure>`);
}
assert.ok((await readFile('apps/chrome-extension/dist/devtools.js','utf8')).includes('icons/icon-32.png'));
const figmaManifest=JSON.parse(await readFile('apps/figma-plugin/dist/manifest.json','utf8'));assert.equal(figmaManifest.icon,undefined);assert.equal(figmaManifest.icons,undefined);
const figma=await readFile('apps/figma-plugin/dist/ui.html','utf8'),chrome=await readFile('apps/chrome-extension/dist/panel.html','utf8');
const footer=figma.match(/<div class="app-brand">([\s\S]*?)<\/div>/)[1];assert.equal(footer,chrome.match(/<div class="app-brand">([\s\S]*?)<\/div>/)[1]);assert.ok(footer.includes('aria-hidden="true"'));assert.ok(!figma.includes('<!--BRAND_MARK-->'));assert.ok(!chrome.includes('<!--BRAND_MARK-->'));
const browser=await chromium.launch({headless:true,...(process.env.FIGCHECK_BROWSER_PATH?{executablePath:process.env.FIGCHECK_BROWSER_PATH}:{})});
try{const page=await browser.newPage({viewport:{width:760,height:370},deviceScaleFactor:1});
 for(const theme of ['light','dark']){
 await page.setContent(`<style>body{margin:0;padding:28px;font:14px system-ui;background:${theme==='light'?'#f6f7f9':'#171a1f'};color:${theme==='light'?'#4d5765':'#c0c7d0'}}h1{font-size:18px;font-weight:500;margin:0 0 24px}.icons{display:flex;align-items:center;gap:32px;height:180px}figure{margin:0;width:128px;text-align:center}img{display:block;margin:0 auto 12px}figcaption{font-size:12px}footer{border-top:1px solid #89919c55;padding-top:20px;display:flex;align-items:center;gap:7px;font-size:12px}footer svg{width:20px;height:20px}</style><h1>FigCheck · ${theme} · native pixel sizes</h1><div class="icons">${tiles.join('')}</div><footer>${footer}</footer>`);
 await page.screenshot({path:`artifacts/brand-icons-${theme}.png`});
 }
}finally{await browser.close();}
await writeFile('artifacts/brand-results.json',JSON.stringify({success:true,sizes,contrasts,matchingFooters:true,manifestReferences:true,figmaCustomIconField:false,completedAt:new Date().toISOString()},null,2));
console.log('PASS generated PNG dimensions, manifest/action/DevTools refs, shared accessible footer and light/dark contact sheets');
