import {parseBoxShadows,shadowUnavailable} from '../../../packages/core/src/shadows';
import { cssColor, cssLength, emptyProperties, numberValue, stringValue, unavailable, type Properties, type Key } from '../../../packages/core/src/index';
import type { DOMSnapshot } from './collect';
export function normalizeDOM(snapshot: DOMSnapshot): Properties {
  const p = emptyProperties('DOM 수집 정보 없음');
  if (!snapshot.ok || !snapshot.computed || !snapshot.rect) return p;
  const s = snapshot.computed;
  for (const key of ['width', 'height'] as const) p[key] = snapshot.geometryIssue ? unavailable(snapshot.geometryIssue) : numberValue(snapshot.rect[key], 'px', `untransformed rect border-box. computed ${key}=${s[key]}, box-sizing=${s['box-sizing']}`);
  const mapping: Partial<Record<Key, string>> = { paddingTop: 'padding-top', paddingRight: 'padding-right', paddingBottom: 'padding-bottom', paddingLeft: 'padding-left', rowGap: 'row-gap', columnGap: 'column-gap', fontSize: 'font-size', lineHeight: 'line-height', letterSpacing: 'letter-spacing', borderTopWidth: 'border-top-width', borderRightWidth: 'border-right-width', borderBottomWidth: 'border-bottom-width', borderLeftWidth: 'border-left-width', radiusTopLeft: 'border-top-left-radius', radiusTopRight: 'border-top-right-radius', radiusBottomRight: 'border-bottom-right-radius', radiusBottomLeft: 'border-bottom-left-radius' };
  for (const [key, css] of Object.entries(mapping) as [Key, string][]) p[key] = cssLength(s[css] ?? 'unknown');
  if (!/^(inline-)?(flex|grid)$/.test(s.display)) { p.rowGap = unavailable('flex/grid 아닌 요소: gap 적용 비교 제외', 'unknown'); p.columnGap = unavailable('flex/grid 아닌 요소: gap 적용 비교 제외', 'unknown'); }
  for (const [key, css] of [['textColor', 'color'], ['backgroundColor', 'background-color'], ['borderTopColor', 'border-top-color'], ['borderRightColor', 'border-right-color'], ['borderBottomColor', 'border-bottom-color'], ['borderLeftColor', 'border-left-color']] as const) p[key] = cssColor(s[css] ?? 'unknown');
  if (s['background-image'] !== 'none') p.backgroundColor = unavailable('background-image/gradient 존재: 복합 배경 비교 불가');
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const style = s[`border-${side.toLowerCase()}-style`];
    if (style === 'none' || style === 'hidden' || s[`border-${side.toLowerCase()}-width`] === '0px') p[`border${side}Color`] = unavailable('보이는 border 없음: 색 비교 제외', 'unknown');
    else if (style !== 'solid') { p[`border${side}Width`] = unavailable(`border style ${style}: Figma solid stroke와 비교 불가`); p[`border${side}Color`] = unavailable(`border style ${style}`); }
  }
  const family = /^(?:"([^"]+)"|'([^']+)'|([^,]+))/.exec(s['font-family'] ?? '');
  p.fontFamily = family ? stringValue((family[1] ?? family[2] ?? family[3]).trim(), 'CSS 첫 요청 family. fallback 실제사용 폰트 미확인') : unavailable('font-family 확인 불가', 'unknown');
  const weight = s['font-weight']; p.fontWeight = /^\d+(?:\.\d+)?$/.test(weight) ? numberValue(Number(weight), 'number') : unavailable(`font-weight ${weight} numeric 아님`);
  const opacity = s.opacity; p.opacity = /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(opacity) ? numberValue(Number(opacity), 'number', '요소 자체 opacity. 조상 opacity 및 paint alpha와 합성 안 함') : unavailable('opacity numeric 확인 불가');
  if (snapshot.textIssue) for (const key of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textColor'] as const) p[key] = unavailable(snapshot.textIssue, 'unknown');
  return p;
}

export function normalizeShadows(snapshot:DOMSnapshot):import('../../../packages/core/src/shadows').Shadows {
 if(!snapshot.ok)return shadowUnavailable('DOM 그림자 미수집','unknown');
 if(snapshot.geometryIssue||snapshot.shadowIssue)return shadowUnavailable(snapshot.geometryIssue||snapshot.shadowIssue!);
 return parseBoxShadows(snapshot.computed?.['box-shadow']);
}
