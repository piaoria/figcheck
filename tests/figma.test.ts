import { test } from 'node:test';import assert from 'node:assert/strict';
import { extractNode } from '../apps/figma-plugin/src/extract';
import { parseDesign, type Value } from '../packages/core/src/index';
const mixed=Symbol('mixed');
const text = (extra: object = {}) => ({id:'1:1',name:'Text',type:'TEXT',width:100,height:24,parent:null,relativeTransform:[[1,0,0],[0,1,0]],opacity:1,fills:[{type:'SOLID',color:{r:1,g:0,b:0},opacity:.5}],strokes:[],strokeWeight:0,strokeAlign:'INSIDE',fontName:{family:'Arial',style:'invented style'},fontWeight:600,fontSize:16,lineHeight:{unit:'PERCENT',value:150},letterSpacing:{unit:'PERCENT',value:5},...extra}) as unknown as SceneNode;
const numeric=(v: Value)=>v.status==='supported'?v.value:undefined;
test('Figma percent typography / numeric weight / paint alpha separate node opacity',()=>{
  const n=extractNode(text(),mixed,'SRGB');assert.equal(numeric(n.properties.lineHeight),24);assert.equal(numeric(n.properties.letterSpacing),.8);assert.equal(numeric(n.properties.fontWeight),600);assert.deepEqual(numeric(n.properties.textColor),[255,0,0,.5]);assert.equal(numeric(n.properties.opacity),1);
  parseDesign(JSON.stringify({schemaVersion:'1.0',source:'figma',exportedAt:new Date().toISOString(),nodes:[n]}));
});
test('Figma mixed/auto/gradient/P3 and nontext unknown excluded',()=>{
  const n=extractNode(text({fontSize:mixed,fontName:mixed,fontWeight:mixed,lineHeight:{unit:'AUTO'},letterSpacing:mixed,fills:[{type:'GRADIENT_LINEAR'}]}),mixed,'SRGB');
  for(const key of ['fontSize','fontFamily','fontWeight','lineHeight','letterSpacing','textColor'] as const)assert.equal(n.properties[key].status,'unsupported');
  assert.equal(extractNode(text(),mixed,'DISPLAY_P3').properties.textColor.status,'unsupported');
});
test('Figma layout axis gaps, mixed radius, outside stroke and ancestor transform',()=>{
  const frame=({...text(),type:'FRAME',layoutMode:'VERTICAL',layoutWrap:'WRAP',primaryAxisAlignItems:'MIN',itemSpacing:8,counterAxisSpacing:12,paddingTop:1,paddingRight:2,paddingBottom:3,paddingLeft:4,cornerRadius:mixed,cornerSmoothing:0}) as unknown as SceneNode;
  const n=extractNode(frame,mixed,'SRGB');assert.equal(numeric(n.properties.rowGap),8);assert.equal(numeric(n.properties.columnGap),12);assert.equal(n.properties.radiusTopLeft.status,'unsupported');assert.equal(n.properties.textColor.status,'unknown');
  const outside=extractNode(text({strokes:[{type:'SOLID',color:{r:0,g:0,b:0}}],strokeAlign:'OUTSIDE'}),mixed,'SRGB');assert.equal(outside.properties.width.status,'unsupported');
  const transformed=extractNode(text({parent:{type:'FRAME',parent:null,relativeTransform:[[2,0,0],[0,2,0]]}}),mixed,'SRGB');assert.equal(transformed.properties.width.status,'unsupported');
});
