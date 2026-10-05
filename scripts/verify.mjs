import { spawnSync } from 'node:child_process';
import { readdirSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
mkdirSync('artifacts',{recursive:true});
const report={success:false,node:process.version,completedAt:null,steps:[],buildHashes:{}};
for (const [name,args] of [
  ['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],
  ['lint',['node_modules/eslint/bin/eslint.js','.']],
  ['build',['scripts/build.mjs']],
  ['tests',['node_modules/tsx/dist/cli.mjs','--test',...readdirSync('tests').filter(f=>f.endsWith('.test.ts')).map(f=>'tests/'+f)]],
]) {
  const r=spawnSync(process.execPath,args,{encoding:'utf8'});
  process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');
  const count=name==='tests'?Number(/# tests (\d+)/.exec(r.stdout??'')?.[1]??0):undefined;
  report.steps.push({name,exitCode:r.status,testCount:count});
  if(r.status!==0){report.completedAt=new Date().toISOString();writeFileSync('artifacts/verification-results.json',JSON.stringify(report,null,2));process.exit(r.status??1);}
}
for(const file of ['apps/figma-plugin/dist/code.js','apps/figma-plugin/dist/ui.html','apps/figma-plugin/dist/manifest.json','apps/chrome-extension/dist/panel.js','apps/chrome-extension/dist/devtools.js','apps/chrome-extension/dist/manifest.json']) report.buildHashes[file]=createHash('sha256').update(readFileSync(file)).digest('hex');
report.success=true;report.completedAt=new Date().toISOString();writeFileSync('artifacts/verification-results.json',JSON.stringify(report,null,2));
