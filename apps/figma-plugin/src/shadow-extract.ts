import { parseBoxShadows, shadowUnavailable, type Shadows, type EffectEvidence, type ShadowLayer } from '../../../packages/core/src/shadows';
import { numericalEpsilon } from '../../../packages/core/src/index';

/** Raw Figma effects and Inspect CSS are separate evidence; radius is never converted by guess. */
export function extractShadows(node:SceneNode,profile:string,css?:Record<string,string>,cssError?:string):Shadows {
 if(!('effects'in node)||!Array.isArray(node.effects))return shadowUnavailable('effects 미수집','unknown');
 if(node.effects.length>64)return shadowUnavailable('효과 64개 초과');
 const effects:EffectEvidence[]=node.effects.map((effect,index)=>{
  const e:EffectEvidence={index,type:effect.type,visible:effect.visible!==false};
  if(effect.type==='DROP_SHADOW'||effect.type==='INNER_SHADOW')Object.assign(e,{x:effect.offset.x,y:effect.offset.y,radius:effect.radius,spread:effect.spread??0,color:[effect.color.r*255,effect.color.g*255,effect.color.b*255,effect.color.a],blendMode:effect.blendMode,...(effect.type==='DROP_SHADOW'?{showShadowBehindNode:effect.showShadowBehindNode??false}:{})});
  return e;
 });
 const fail=(reason:string,status:'unsupported'|'unknown'='unsupported'):Shadows=>({...shadowUnavailable(reason,status),effects});
 if(!['RECTANGLE','FRAME','COMPONENT','INSTANCE'].includes(node.type))return fail('단일 박스 노드만 지원: TEXT/벡터/그룹합성 제외');
 if(profile!=='SRGB')return fail('그림자 sRGB 색공간만 지원');
 for(let n:BaseNode|null=node;n&&n.type!=='PAGE'&&n.type!=='DOCUMENT';n=n.parent){
  if('relativeTransform'in n){const t=n.relativeTransform;if(Math.abs(t[0][0]-1)>1e-6||Math.abs(t[1][1]-1)>1e-6||Math.abs(t[0][1])>1e-6||Math.abs(t[1][0])>1e-6)return fail('자기/조상 transform 그림자 대응 제외');}
  if('blendMode'in n&&!['NORMAL','PASS_THROUGH'].includes(n.blendMode))return fail('노드/조상 blend 합성 제외');
  if(n!==node&&'effects'in n&&n.effects.some(e=>e.visible!==false))return fail('조상 effects 합성 제외');
 }
 if('cornerSmoothing'in node&&node.cornerSmoothing>0)return fail('cornerSmoothing 박스 형태 대응 제외');
 const visible=effects.filter(e=>e.visible);
 if(visible.some(e=>!['DROP_SHADOW','INNER_SHADOW'].includes(e.type)))return fail('그림자 외 visible effect 포함: blur/noise/texture/glass/새 효과는 비교 제외');
 if(visible.some(e=>e.blendMode!=='NORMAL'))return fail('NORMAL 그림자 blend만 지원');
 if(visible.some(e=>e.showShadowBehindNode))return fail('showShadowBehindNode는 CSS 외부 그림자 절단과 다름');
 if(!visible.length)return {version:1,status:'supported',layers:[],effects};
 // clipsContent controls descendants, not the node's own CSS box shadow.
 // Require an opaque box surface; transparent/alpha silhouettes remain uncertain.
 if(node.type!=='RECTANGLE'){
  if(!('fills'in node)||typeof node.fills==='symbol')return fail('프레임 채우기 미수집: 박스 형상 확인 불가');
  const fills=node.fills.filter(p=>p.visible!==false);
  if(fills.length!==1||fills[0].type!=='SOLID'||(fills[0].opacity??1)!==1)return fail('투명/복합 채우기의 알파 형상·자식 합성은 CSS 박스 대응 확인 불가');
 }
 if(!css)return fail(cssError??'getCSSAsync box-shadow 근거 미수집','unknown');
 if((css.filter&&css.filter!=='none')||(css['text-shadow']&&css['text-shadow']!=='none'))return fail('Figma CSS filter/text-shadow 대응 제외');
 const parsed=parseBoxShadows(css['box-shadow']);
 if(parsed.status!=='supported'||parsed.layers.length!==visible.length)return fail('getCSSAsync box-shadow 레이어 수/값 확인 불가');
 const used=new Set<number>();const layers:ShadowLayer[]=[];
 for(const layer of parsed.layers){
  // Blur is supplied by Inspect CSS, not equated with raw effect.radius.
  const matches=visible.filter(e=>!used.has(e.index)&&(e.type==='INNER_SHADOW')===layer.inset&&Math.abs(e.x!-layer.x)<=1e-4&&Math.abs(e.y!-layer.y)<=1e-4&&Math.abs(e.spread!-layer.spread)<=1e-4&&e.color!.every((v,i)=>Math.abs(v-layer.color[i])<=(i===3?.005+numericalEpsilon.alpha:1+numericalEpsilon.colorChannel)));
  if(matches.length!==1)return fail('raw effect와 Inspect CSS 대응이 모호함: 순서/blur 변환 추정 안 함');
  used.add(matches[0].index);layers.push({...layer,effectIndex:matches[0].index});
 }
 return {...parsed,layers,effects,mapping:'getCSSAsync'};
}
