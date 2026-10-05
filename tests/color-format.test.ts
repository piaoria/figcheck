import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatColor,isColorFormat} from '../packages/ui/color';
import {compare,emptyProperties,colorValue,strictTolerance,unavailable} from '../packages/core/src/index';
import {valueText} from '../packages/ui/format';
test('color notation black/white/achromatic hue is deterministic',()=>{
  assert.equal(formatColor([0,0,0,1],'hex'),'#000000');assert.equal(formatColor([255,255,255,1],'hex'),'#FFFFFF');
  assert.equal(formatColor([0,0,0,1],'hsl'),'hsl(0, 0%, 0%)');assert.equal(formatColor([255,255,255,1],'hsl'),'hsl(0, 0%, 100%)');
  assert.equal(formatColor([128,128,128,1],'hsl'),'hsl(0, 0%, 50.196%)');
});
test('RGB and HSL primary colors, alpha zero/one and transparent channels stay explicit',()=>{
  assert.equal(formatColor([255,0,0,1],'rgb'),'rgb(255, 0, 0)');assert.equal(formatColor([255,0,0,1],'hsl'),'hsl(0, 100%, 50%)');
  assert.equal(formatColor([0,255,0,1],'hsl'),'hsl(120, 100%, 50%)');assert.equal(formatColor([0,0,255,1],'hsl'),'hsl(240, 100%, 50%)');
  assert.equal(formatColor([255,0,0,0],'hex'),'#FF000000');assert.equal(formatColor([255,0,0,0],'rgb'),'rgba(255, 0, 0, 0)');assert.equal(formatColor([255,0,0,0],'hsl'),'hsla(0, 100%, 50%, 0)');
});
test('hex rounds channel/alpha once for display; RGB/HSL retain small alpha in text',()=>{
  assert.equal(formatColor([30,90,200,.5],'hex'),'#1E5AC880');assert.equal(formatColor([30,90,200,.9999],'hex'),'#1E5AC8FF');
  assert.equal(formatColor([30,90,200,.5],'rgb'),'rgba(30, 90, 200, 0.5)');assert.equal(formatColor([30.123456,90,200,.00000001],'rgb'),'rgba(30.123, 90, 200, 1e-8)');
  assert.ok(formatColor([30,90,200,.37],'hsl').endsWith(', 0.37)'));
  assert.ok(formatColor([1e-20,0,0,1],'hsl').startsWith('hsl(0, 100%'));assert.equal(formatColor([1e-20,0,0,1],'hsl').includes('Infinity'),false);
});
test('notation switching never mutates source RGBA or comparison/delta, even for nearby fractional colors',()=>{
  const source=Object.freeze([30.000001,90,200,.500001]);const before=JSON.stringify(source);
  const a=emptyProperties(),b=emptyProperties();a.backgroundColor=colorValue([...source] as [number,number,number,number]);b.backgroundColor=colorValue([30.000002,90,200,.500002]);
  const report=JSON.stringify(compare(a,b,strictTolerance));for(let i=0;i<10;i++)for(const format of ['hex','hsl','rgb'] as const)formatColor(source,format);
  assert.equal(JSON.stringify(source),before);assert.equal(JSON.stringify(compare(a,b,strictTolerance)),report);
});
test('invalid or outside-sRGB colors are not clamped or converted; unavailable statuses remain reasons',()=>{
  for(const value of [[-1,0,0,1],[256,0,0,1],[0,0,0,1.1],[NaN,0,0,1],[0,0,0], [Infinity,0,0,1]])for(const format of ['hex','rgb','hsl'] as const)assert.equal(formatColor(value,format),'값 오류');
  assert.equal(valueText(unavailable('gradient')),'미지원');assert.equal(valueText(unavailable('mixed','unknown')),'값 미확인');assert.equal(isColorFormat('HEX'),false);
});
