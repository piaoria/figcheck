import { chromium } from 'playwright';
import { readFile,writeFile,mkdir,access } from 'node:fs/promises';
export async function generateBrandIcons(){
 const mark=(await readFile('packages/ui/brand/mark.svg','utf8')).trim();
 const body=mark.slice(mark.indexOf('>')+1,mark.lastIndexOf('</svg>'));
 const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x=".5" y=".5" width="39" height="39" rx="10" fill="#272c33" stroke="#89919c"/><g transform="translate(4 4)" fill="none" stroke="#f6f7f9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
 const dir='apps/chrome-extension/dist/icons';await mkdir(dir,{recursive:true});await mkdir('packages/ui/brand/generated',{recursive:true});
 await writeFile('packages/ui/brand/generated/app-icon.svg',icon);
 let executablePath=process.env.FIGCHECK_BROWSER_PATH;
 if(!executablePath&&process.platform==='win32'){const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';try{await access(edge);executablePath=edge;}catch{/* Use existing Playwright browser. */}}
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 try{
  const page=await browser.newPage({deviceScaleFactor:1});
  for(const size of [16,32,48,128,512]){
   await page.setViewportSize({width:size,height:size});await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${icon}`);
   const png=await page.screenshot({omitBackground:true});
   await writeFile(`packages/ui/brand/generated/icon-${size}.png`,png);
   if(size<=128)await writeFile(`${dir}/icon-${size}.png`,png);
  }
 }finally{await browser.close();}
 return mark.replace('<svg ','<svg class="brand-mark" aria-hidden="true" focusable="false" ');
}
