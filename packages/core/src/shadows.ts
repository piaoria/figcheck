import { normalTolerance, numericalEpsilon, type RGBA, type Tolerance, type Summary } from './index';

export interface ShadowLayer { index: number; effectIndex?: number; inset: boolean; x: number; y: number; blur: number; spread: number; color: RGBA }
export interface EffectEvidence { index: number; type: string; visible: boolean; x?: number; y?: number; radius?: number; spread?: number; color?: RGBA; blendMode?: string; showShadowBehindNode?: boolean }
export interface Shadows { version: 1; status: 'supported' | 'unsupported' | 'unknown'; layers: ShadowLayer[]; reason?: string; css?: string; effects?: EffectEvidence[]; mapping?: 'getCSSAsync' | 'computed' }
export const shadowUnavailable = (reason: string, status: 'unsupported' | 'unknown' = 'unsupported'): Shadows => ({version:1,status,layers:[],reason});
export const missingShadows = (): Shadows => shadowUnavailable('그림자 미수집: 이전 JSON 또는 API 근거 없음','unknown');
const record=(x:unknown):x is Record<string,unknown>=>typeof x==='object'&&x!==null&&!Array.isArray(x);
const num=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e7;
const rgba=(x:unknown):x is RGBA=>Array.isArray(x)&&x.length===4&&x.every((n,i)=>num(n)&&n>=0&&n<=(i===3?1:255));
function requireValue(ok:unknown):asserts ok { if(!ok)throw new Error('그림자 스키마/값 오류'); }
function fields(x:Record<string,unknown>,allowed:string[]){requireValue(Object.keys(x).every(k=>allowed.includes(k)));}
const text=(x:unknown)=>typeof x==='string'&&x.length>0&&x.length<=8192;
export function validateShadows(value:unknown):asserts value is Shadows {
 requireValue(record(value));fields(value,['version','status','layers','reason','css','effects','mapping']);
 requireValue(value.version===1&&['supported','unsupported','unknown'].includes(String(value.status)));
 requireValue(Array.isArray(value.layers)&&value.layers.length<=32);
 if(value.status!=='supported')requireValue(text(value.reason));
 if('reason' in value)requireValue(text(value.reason));if('css'in value)requireValue(text(value.css));
 if('mapping'in value)requireValue(value.mapping==='computed'||value.mapping==='getCSSAsync');
 value.layers.forEach((l,i)=>{requireValue(record(l));fields(l,['index','effectIndex','inset','x','y','blur','spread','color']);requireValue(l.index===i&&typeof l.inset==='boolean'&&num(l.x)&&num(l.y)&&num(l.blur)&&Number(l.blur)>=0&&num(l.spread)&&rgba(l.color));if('effectIndex'in l)requireValue(Number.isInteger(l.effectIndex)&&Number(l.effectIndex)>=0&&Number(l.effectIndex)<64);});
 if('effects'in value){requireValue(Array.isArray(value.effects)&&value.effects.length<=64);value.effects.forEach((e,i)=>{requireValue(record(e));fields(e,['index','type','visible','x','y','radius','spread','color','blendMode','showShadowBehindNode']);requireValue(e.index===i&&text(e.type)&&typeof e.visible==='boolean');for(const k of ['x','y','radius','spread'])if(k in e)requireValue(num(e[k])&&(k!=='radius'||Number(e[k])>=0));if('color'in e)requireValue(rgba(e.color));if('blendMode'in e)requireValue(text(e.blendMode));if('showShadowBehindNode'in e)requireValue(typeof e.showShadowBehindNode==='boolean');});}
}
/** Split only at top-level delimiters; rgb()/hsl() commas stay inside their color. */
function split(input:string,space=false):string[]{let depth=0,current='';const result:string[]=[];for(const ch of input){if(ch==='(')depth++;if(ch===')'&&--depth<0)throw Error('괄호 오류');if(depth===0&&(space?/\s/.test(ch):ch===',')){if(current.trim())result.push(current.trim());else if(!space)throw Error('빈 레이어');current='';}else current+=ch;}if(depth!==0||(!space&&!current.trim()))throw Error('괄호/레이어 오류');if(current.trim())result.push(current.trim());return result;}
function color(input:string):RGBA|undefined {
 const s=input.toLowerCase();if(s==='transparent')return [0,0,0,0];if(s==='black')return [0,0,0,1];if(s==='white')return [255,255,255,1];
 if(/^#[\da-f]{3,8}$/.test(s)){let h=s.slice(1);if(h.length===3||h.length===4)h=[...h].map(c=>c+c).join('');if(h.length!==6&&h.length!==8)return;return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),h.length===8?parseInt(h.slice(6),16)/255:1];}
 const m=/^(rgb|rgba|hsl|hsla)\((.*)\)$/.exec(s);if(!m)return;const tokens=m[2].trim().split(/[\s,/]+/);if(tokens.length<3||tokens.length>4)return;
 const numeric=(v:string,max:number)=>v.endsWith('%')?Number(v.slice(0,-1))*max/100:Number(v);
 const a=tokens[3]===undefined?1:numeric(tokens[3],1);let c:RGBA;
 if(m[1].startsWith('rgb'))c=[numeric(tokens[0],255),numeric(tokens[1],255),numeric(tokens[2],255),a];
 else {if(!tokens[1].endsWith('%')||!tokens[2].endsWith('%')||!/^[-+\d.]+(?:deg)?$/.test(tokens[0]))return;const h=((Number(tokens[0].replace('deg',''))%360)+360)%360/60,sat=numeric(tokens[1],1),l=numeric(tokens[2],1);if(sat<0||sat>1||l<0||l>1)return;const chroma=(1-Math.abs(2*l-1))*sat,x=chroma*(1-Math.abs(h%2-1)),v=l-chroma/2;const rgb=h<1?[chroma,x,0]:h<2?[x,chroma,0]:h<3?[0,chroma,x]:h<4?[0,x,chroma]:h<5?[x,0,chroma]:[chroma,0,x];c=[(rgb[0]+v)*255,(rgb[1]+v)*255,(rgb[2]+v)*255,a];}
 return rgba(c)?c:undefined;
}
export function parseBoxShadows(css:string|undefined):Shadows {
 if(css===undefined||!css.trim())return missingShadows();
 if(css.length>8192)return shadowUnavailable('box-shadow 최대 길이 초과');
 if(css.trim()==='none')return {version:1,status:'supported',layers:[],css,mapping:'computed'};
 try {const parts=split(css);if(parts.length>32)throw Error('최대 32개 레이어');
  const layers=parts.map((part,index)=>{let inset=false,rgbaValue:RGBA|undefined;const lengths:number[]=[];for(const token of split(part,true)){if(token==='inset'){if(inset)throw Error('중복 inset');inset=true;continue;}const c=color(token);if(c){if(rgbaValue)throw Error('중복 색');rgbaValue=c;continue;}if(!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:px)?$/.test(token)||(!token.endsWith('px')&&Number(token)!==0))throw Error('px/rgb/hex/hsl로 확정 불가');lengths.push(Number(token.replace('px','')));}
   if(lengths.length<2||lengths.length>4||!rgbaValue)throw Error('명시적인 색과 2~4개 길이 필요');const [x,y,blur=0,spread=0]=lengths;if(blur<0||!lengths.every(num))throw Error('길이 범위');return {index,inset,x,y,blur,spread,color:rgbaValue};});
  const result:Shadows={version:1,status:'supported',layers,css,mapping:'computed'};validateShadows(result);return result;
 }catch(e){return {...shadowUnavailable(`box-shadow 해석 미지원: ${e instanceof Error?e.message:'값 오류'}`),css};}
}
export interface ShadowRow { expected?:ShadowLayer; actual?:ShadowLayer; status:'match'|'mismatch'|'missing'|'added'; delta?:{x:number;y:number;blur:number;spread:number;color:RGBA} }
export interface ShadowComparison { expected:Shadows; actual:Shadows; status:'supported'|'excluded'; reason?:string; rows:ShadowRow[]; total:Summary; note:string }
const within=(d:number,t:number,e:number)=>Math.abs(d)<=t+e;
function equal(a:ShadowLayer,b:ShadowLayer,t:Tolerance){return a.inset===b.inset&&(['x','y','blur','spread'] as const).every(k=>within(b[k]-a[k],t.px,numericalEpsilon.px))&&a.color.every((v,i)=>within(b.color[i]-v,i===3?t.alpha:t.colorChannel,i===3?numericalEpsilon.alpha:numericalEpsilon.colorChannel));}
/** Order-preserving edit alignment. Never sort painting layers; insertions get their own row. */
export function compareShadows(expected:Shadows|undefined,actual:Shadows|undefined,t:Tolerance=normalTolerance,included=true):ShadowComparison {
 const e=expected??missingShadows(),a=actual??missingShadows();
 const result:ShadowComparison={expected:e,actual:a,status:'excluded',rows:[],total:{supported:0,matched:0,score:null},note:'CSS 그림자 수치 비교 · 시각적 완전 일치를 보장하지 않습니다.'};
 try{validateShadows(e);validateShadows(a);for(const key of ['px','colorChannel','alpha'] as const)if(!Number.isFinite(t[key])||t[key]<0||t[key]>(key==='alpha'?1:key==='colorChannel'?255:1e4))throw Error();}catch{result.reason='그림자 값/허용오차 검증 실패';return result;}
 if(!included){result.reason='사용자가 그림자를 비교에서 제외';return result;}
 if(e.status!=='supported'||a.status!=='supported'){result.reason=`디자인: ${e.reason??'수집됨'} / 웹: ${a.reason??'수집됨'}`;return result;}
 result.status='supported';const n=e.layers.length,m=a.layers.length;
 const dp=Array.from({length:n+1},()=>Array<number>(m+1).fill(0));for(let i=0;i<=n;i++)dp[i][0]=i;for(let j=0;j<=m;j++)dp[0][j]=j;
 const cost=(i:number,j:number)=>e.layers[i].inset!==a.layers[j].inset?3:equal(e.layers[i],a.layers[j],t)?0:1.5;
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost(i-1,j-1));
 let i=n,j=m;while(i||j){if(i&&j&&dp[i][j]===dp[i-1][j-1]+cost(i-1,j-1)){const expected=e.layers[--i],actual=a.layers[--j];result.rows.unshift({expected,actual,status:equal(expected,actual,t)?'match':'mismatch',delta:{x:actual.x-expected.x,y:actual.y-expected.y,blur:actual.blur-expected.blur,spread:actual.spread-expected.spread,color:actual.color.map((c,k)=>c-expected.color[k]) as RGBA}});}else if(j&&dp[i][j]===dp[i][j-1]+1)result.rows.unshift({actual:a.layers[--j],status:'added'});else result.rows.unshift({expected:e.layers[--i],status:'missing'});}
 const supported=result.rows.length||1,matched=result.rows.length?result.rows.filter(r=>r.status==='match').length:1;result.total={supported,matched,score:matched/supported*100};
 if(result.rows.some(r=>r.status==='added'||r.status==='missing'))result.note+=' 순서를 보존한 대응이며 추가·누락 또는 재배치가 있을 수 있습니다.';
 return result;
}
