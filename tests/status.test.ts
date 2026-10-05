import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare, emptyProperties, normalTolerance, numberValue, stringValue, unavailable } from '../packages/core/src/index';
import { exclusionLabel } from '../packages/ui/format';
test('display separates missing/unread values, unsupported, invalid values and user exclusions without changing score',()=>{
  const expected=emptyProperties(),actual=emptyProperties();
  expected.width=unavailable('width 없음','unknown');actual.width=numberValue(0);
  expected.height=unavailable('gradient 단색 변환 미지원');actual.height=numberValue(10);
  expected.paddingTop=numberValue(1);actual.paddingTop=stringValue('invalid px kind');
  const report=compare(expected,actual,normalTolerance,['width','height','paddingTop']);
  assert.equal(exclusionLabel(report.rows.find(r=>r.key==='width')!),'값 미확인');
  assert.equal(exclusionLabel(report.rows.find(r=>r.key==='height')!),'미지원');
  assert.equal(exclusionLabel(report.rows.find(r=>r.key==='paddingTop')!),'값 오류');
  assert.equal(exclusionLabel(report.rows.find(r=>r.key==='opacity')!),'사용자 제외');
  assert.equal(report.total.supported,0);assert.equal(report.total.score,null);
  actual.width=unavailable('calc 표현식 미지원');const mixed=compare(expected,actual,normalTolerance,['width']);
  assert.equal(exclusionLabel(mixed.rows.find(r=>r.key==='width')!),'미지원');
  assert.ok(mixed.rows.find(r=>r.key==='width')!.reason?.includes('width 없음'));
});
