import { colorValue, emptyProperties, numberValue, stringValue, unavailable, type DesignNode, type Value } from '../../../packages/core/src/index';

/** Read-only adapter: never mutate document or infer weight from a font style name. */
export function extractNode(node: SceneNode, mixed: symbol, colorProfile: string): DesignNode {
  const p = emptyProperties();
  const numeric = (v: number | symbol | undefined, label: string, kind: 'px' | 'number' = 'px'): Value => typeof v === 'number' ? numberValue(v, kind) : unavailable(v === mixed ? `Figma mixed ${label}` : `Figma ${label} 없음`, v === mixed ? 'unsupported' : 'unknown');
  const paint = (paints: readonly Paint[] | symbol | undefined): Value => {
    if (colorProfile !== 'SRGB') return unavailable(`Figma ${colorProfile} 색공간: sRGB 변환 미지원`);
    if (typeof paints === 'symbol') return unavailable('Figma mixed paint');
    if (!paints) return unavailable('paint 속성 없음', 'unknown');
    const visible = paints.filter(v => v.visible !== false);
    if (visible.length === 0) return colorValue([0, 0, 0, 0]);
    if (visible.length !== 1 || visible[0].type !== 'SOLID' || (visible[0].blendMode && visible[0].blendMode !== 'NORMAL')) return unavailable('gradient/image/복수 paint/blend는 단색 비교 불가');
    const c = visible[0]; return colorValue([c.color.r * 255, c.color.g * 255, c.color.b * 255, c.opacity ?? 1]);
  };
  // Figma width/height are local layout dimensions; transformed geometry is ambiguous.
  let transformed = false;
  for (let n: BaseNode | null = node; n && n.type !== 'DOCUMENT' && n.type !== 'PAGE'; n = n.parent) {
    if ('relativeTransform' in n) { const t = n.relativeTransform; if (Math.abs(t[0][0] - 1) > 1e-6 || Math.abs(t[1][1] - 1) > 1e-6 || Math.abs(t[0][1]) > 1e-6 || Math.abs(t[1][0]) > 1e-6) transformed = true; }
  }
  p.width = transformed ? unavailable('자기/조상 Figma transform: 경계상자 비교 제외') : numeric(node.width, 'width');
  p.height = transformed ? unavailable('자기/조상 Figma transform: 경계상자 비교 제외') : numeric(node.height, 'height');
  if ('opacity' in node) p.opacity = numeric(node.opacity, 'opacity', 'number');
  if ('layoutMode' in node && (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL')) {
    for (const key of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const) p[key] = numeric(node[key], key);
    const primary = node.primaryAxisAlignItems === 'SPACE_BETWEEN' ? unavailable('Figma SPACE_BETWEEN: 고정 gap 아님') : numeric(node.itemSpacing, 'itemSpacing');
    const cross = node.layoutWrap === 'WRAP' ? node.counterAxisAlignContent === 'SPACE_BETWEEN' ? unavailable('Figma cross-axis SPACE_BETWEEN: 고정 gap 아님') : numeric(node.counterAxisSpacing ?? undefined, 'counterAxisSpacing') : unavailable('Figma 비-wrap: 교차축 gap 정의 없음', 'unknown');
    p.columnGap = node.layoutMode === 'HORIZONTAL' ? primary : cross;
    p.rowGap = node.layoutMode === 'VERTICAL' ? primary : cross;
  } else for (const key of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'rowGap', 'columnGap'] as const) p[key] = unavailable('Figma Auto Layout HORIZONTAL/VERTICAL 필요', 'unknown');
  p.backgroundColor = node.type === 'TEXT' ? colorValue([0, 0, 0, 0]) : paint('fills' in node ? node.fills : undefined);
  p.textColor = node.type === 'TEXT' ? paint(node.fills) : unavailable('TEXT 노드가 아니므로 자식 텍스트 색 추정 안 함', 'unknown');
  if (node.type === 'TEXT') {
    p.fontFamily = typeof node.fontName === 'symbol' ? unavailable('Figma mixed fontName') : stringValue(node.fontName.family, 'CSS 첫 요청 font-family와 비교. 실제 렌더 폰트 감지 아님');
    p.fontSize = numeric(node.fontSize, 'fontSize'); p.fontWeight = numeric(node.fontWeight, 'fontWeight', 'number');
    const resolve = (v: TextNode['lineHeight'] | TextNode['letterSpacing'], label: string): Value => {
      if (typeof v === 'symbol') return unavailable(`Figma mixed ${label}`);
      if (v.unit === 'AUTO') return unavailable('Figma AUTO lineHeight: 고정 px 없음');
      if (v.unit === 'PIXELS') return numberValue(v.value);
      return typeof node.fontSize === 'number' ? numberValue(v.value / 100 * node.fontSize, 'px', 'Figma percent × 단일 fontSize') : unavailable('percent 기준 fontSize가 mixed');
    };
    p.lineHeight = resolve(node.lineHeight, 'lineHeight'); p.letterSpacing = resolve(node.letterSpacing, 'letterSpacing');
  }
  if ('strokes' in node) {
    const strokes = typeof node.strokes === 'symbol' ? null : node.strokes.filter(s => s.visible !== false);
    const noStroke = strokes?.length === 0;
    const borderShape = ['FRAME', 'RECTANGLE', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'].includes(node.type);
    const supported = noStroke || (borderShape && strokes?.length === 1 && strokes[0].type === 'SOLID' && node.strokeAlign === 'INSIDE');
    const widths = ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'] as const;
    const widthKeys = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'] as const;
    const colorKeys = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'] as const;
    widthKeys.forEach((key, i) => p[key] = supported ? noStroke ? numberValue(0) : numeric(widths[i] in node ? (node as SceneNode & Record<typeof widths[number], number>)[widths[i]] : node.strokeWeight, key) : unavailable('복수/mixed/gradient 또는 CENTER/OUTSIDE stroke: CSS border 매핑 불가'));
    colorKeys.forEach(key => p[key] = supported && !noStroke ? paint(node.strokes) : unavailable(noStroke ? 'stroke 없음: border 색 비교 제외' : 'stroke 매핑 불가', noStroke ? 'unknown' : 'unsupported'));
    if (!noStroke && node.strokeAlign !== 'INSIDE') { p.width = unavailable('CENTER/OUTSIDE stroke의 CSS border-box 매핑 불가'); p.height = unavailable('CENTER/OUTSIDE stroke의 CSS border-box 매핑 불가'); }
  }
  if ('cornerRadius' in node) {
    for (const [key, source] of [['radiusTopLeft', 'topLeftRadius'], ['radiusTopRight', 'topRightRadius'], ['radiusBottomRight', 'bottomRightRadius'], ['radiusBottomLeft', 'bottomLeftRadius']] as const) {
      p[key] = 'cornerSmoothing' in node && node.cornerSmoothing > 0 ? unavailable('Figma cornerSmoothing: CSS radius와 형태 다름') : numeric(source in node ? (node as SceneNode & Record<typeof source, number>)[source] : node.cornerRadius, key);
    }
  }
  return { id: node.id, name: node.name || '(이름 없음)', type: node.type, properties: p };
}
