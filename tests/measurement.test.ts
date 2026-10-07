import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureBoxes } from '../apps/chrome-extension/src/measurement';
const rect=(x:number,y:number,w:number,h:number)=>({left:x,top:y,right:x+w,bottom:y+h});
test('border-box gaps use both axes and preserve fractional CSS pixels independent of ordering',()=>{
 const a=rect(10,20,40,30),b=rect(70.25,90.5,20,20);
 for(const [x,y] of [[a,b],[b,a]]){const d=measureBoxes(x,y);assert.equal(d.kind,'separated');assert.equal(d.horizontal,20.25);assert.equal(d.vertical,40.5);assert.equal(d.lines.length,2);}
 const d=measureBoxes(a,rect(70,25,10,10));assert.equal(d.horizontal,20);assert.equal(d.vertical,0);assert.equal(d.lines.length,1);
});
test('contained boxes report four internal edge gaps and identify which box contains the other',()=>{
 const a=rect(10,20,100,90),b=rect(20,40,50,30);
 const d=measureBoxes(a,b);assert.equal(d.kind,'contains');assert.equal(d.container,'A');assert.deepEqual(d.insets,{top:20,right:40,bottom:40,left:10});
 assert.equal(measureBoxes(b,a).container,'B');assert.equal(measureBoxes(a,a).kind,'coincident');
});
test('touching and overlapping boxes never invent negative margin gaps',()=>{
 const a=rect(0,0,20,20);assert.equal(measureBoxes(a,rect(20,0,20,20)).kind,'touching');assert.equal(measureBoxes(a,rect(20,20,20,20)).kind,'touching');
 const d=measureBoxes(a,rect(10,10,20,20));assert.equal(d.kind,'overlap');assert.equal(d.horizontal,0);assert.equal(d.vertical,0);assert.deepEqual(d.lines.map(l=>l.value),[10,10]);
});
test('invalid and zero-size boxes are not treated as valid zero-distance measurements',()=>{
 for(const b of [rect(0,0,0,10),rect(0,0,-1,10),rect(NaN,0,10,10)])assert.equal(measureBoxes(rect(0,0,20,20),b).kind,'invalid');
});
