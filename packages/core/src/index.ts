/** Shared, host-independent data contract. Missing/unknown values never equal zero. */
export const VERSION = '1.0' as const;
export const categories = {
  size: ['width', 'height'],
  spacing: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'rowGap', 'columnGap'],
  typography: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'],
  color: ['textColor', 'backgroundColor'],
  border: ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'radiusTopLeft', 'radiusTopRight', 'radiusBottomRight', 'radiusBottomLeft'],
  appearance: ['opacity'],
} as const;
export type Category = keyof typeof categories;
export type Key = (typeof categories)[Category][number];
export const keys = Object.values(categories).flat() as Key[];
export type RGBA = [number, number, number, number];
export type Value = { status: 'supported'; kind: 'px' | 'number' | 'string' | 'rgba'; value: number | string | RGBA; note?: string }
  | { status: 'unsupported' | 'unknown'; reason: string };
export type Properties = Record<Key, Value>;
export interface DesignNode { id: string; name: string; type: string; properties: Properties; children?: DesignNode[] }
export interface DesignDocument { schemaVersion: typeof VERSION; source: 'figma'; exportedAt: string; colorProfile?: 'SRGB' | 'DISPLAY_P3' | 'UNKNOWN'; nodes: DesignNode[] }
export const unavailable = (reason: string, status: 'unsupported' | 'unknown' = 'unsupported'): Value => ({ status, reason });
export const numberValue = (value: number, kind: 'px' | 'number' = 'px', note?: string): Value => Number.isFinite(value) ? ({ status: 'supported', kind, value, ...(note ? { note } : {}) }) : unavailable('유한한 숫자가 아님', 'unknown');
export const stringValue = (value: string, note?: string): Value => ({ status: 'supported', kind: 'string', value, ...(note ? { note } : {}) });
// Preserve fractional sRGB channels; validity and numerical precision are separate concerns.
export const colorValue = (value: RGBA): Value => value.length === 4 && value.every((v, i) => Number.isFinite(v) && v >= 0 && v <= (i === 3 ? 1 : 255)) ? ({ status: 'supported', kind: 'rgba', value }) : unavailable('유한한 sRGB RGBA 범위를 벗어남', 'unknown');
export function emptyProperties(reason = '이 노드에서 속성을 확인할 수 없음'): Properties {
  return Object.fromEntries(keys.map(k => [k, unavailable(reason, 'unknown')])) as Properties;
}
export function kindFor(key: Key): 'px' | 'number' | 'string' | 'rgba' {
  if (key.endsWith('Color')) return 'rgba';
  if (key === 'fontFamily') return 'string';
  if (key === 'fontWeight' || key === 'opacity') return 'number';
  return 'px';
}
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function boundedText(v: unknown, name: string): asserts v is string { assert(typeof v === 'string' && v.length > 0 && v.length <= 2048, `${name}: 1~2048자 문자열 필요`); }
function exactKeys(v: Record<string, unknown>, allowed: string[], path: string) {
  assert(Object.keys(v).every(k => allowed.includes(k)), `${path}: 알 수 없는 키 또는 위험한 키`);
}
export function validateProperties(v: unknown): asserts v is Properties {
  assert(record(v), 'properties 객체 필요'); exactKeys(v, keys, 'properties');
  for (const key of keys) {
    const p = v[key]; assert(record(p), `${key}: 명시적 status 필요`);
    if (p.status === 'supported') {
      exactKeys(p, ['status', 'kind', 'value', 'note'], key);
      assert(p.kind === kindFor(key), `${key}: 속성에 맞는 kind 필요`);
      if (p.kind === 'rgba') assert(Array.isArray(p.value) && p.value.length === 4 && p.value.every((n, i) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= (i === 3 ? 1 : 255)), `${key}: RGBA 범위 오류`);
      else if (p.kind === 'string') boundedText(p.value, key);
      else {
        assert(typeof p.value === 'number' && Number.isFinite(p.value) && Math.abs(p.value) <= 1e7, `${key}: 유한한 숫자 필요`);
        assert(key === 'letterSpacing' || p.value >= 0, `${key}: 음수 불가`);
        if (key === 'opacity') assert(p.value <= 1, 'opacity 범위 0~1');
        if (key === 'fontWeight') assert(p.value >= 1 && p.value <= 1000, 'fontWeight 범위 1~1000');
      }
      if ('note' in p) boundedText(p.note, `${key}.note`);
    } else {
      exactKeys(p, ['status', 'reason'], key);
      assert(p.status === 'unknown' || p.status === 'unsupported', `${key}: 잘못된 status`); boundedText(p.reason, key);
    }
  }
}
export function parseDesign(text: string): DesignDocument {
  assert(text.length <= 1024 * 1024, 'JSON 최대 1 MiB');
  const doc: unknown = JSON.parse(text);
  assert(record(doc), '문서 객체 필요'); exactKeys(doc, ['schemaVersion', 'source', 'exportedAt', 'colorProfile', 'nodes'], 'document');
  assert(doc.schemaVersion === VERSION, '지원 schemaVersion은 1.0입니다. 임의의 구형 JSON은 자동 변환하지 않습니다.');
  assert(doc.source === 'figma', 'source는 figma여야 합니다');
  if ('colorProfile' in doc) assert(['SRGB', 'DISPLAY_P3', 'UNKNOWN'].includes(String(doc.colorProfile)), 'colorProfile 오류');
  boundedText(doc.exportedAt, 'exportedAt'); assert(Number.isFinite(Date.parse(doc.exportedAt)), 'exportedAt 날짜 오류');
  assert(Array.isArray(doc.nodes) && doc.nodes.length > 0, 'nodes 배열이 비어 있습니다');
  let count = 0; const ids = new Set<string>();
  function node(v: unknown, depth: number) {
    assert(++count <= 256 && depth <= 16, '노드 최대 256개 / 깊이 최대 16'); assert(record(v), 'node 객체 필요');
    exactKeys(v, ['id', 'name', 'type', 'properties', 'children'], 'node');
    boundedText(v.id, 'id'); boundedText(v.name, 'name'); boundedText(v.type, 'type');
    assert(!ids.has(v.id), '중복 node id'); ids.add(v.id); validateProperties(v.properties);
    if ('children' in v) { assert(Array.isArray(v.children), 'children 배열 필요'); v.children.forEach(c => node(c, depth + 1)); }
  }
  doc.nodes.forEach(n => node(n, 0));
  if (doc.colorProfile === 'DISPLAY_P3' || doc.colorProfile === 'UNKNOWN') {
    const excludeColors = (n: DesignNode) => { for (const k of keys.filter(k => k.endsWith('Color'))) n.properties[k] = unavailable(`Figma ${doc.colorProfile} 색공간: sRGB 변환 미지원`); n.children?.forEach(excludeColors); };
    (doc.nodes as DesignNode[]).forEach(excludeColors);
  }
  return doc as unknown as DesignDocument;
}
export function flattenNodes(doc: DesignDocument): DesignNode[] {
  const out: DesignNode[] = []; const walk = (n: DesignNode) => { out.push(n); n.children?.forEach(walk); }; doc.nodes.forEach(walk); return out;
}
export interface Tolerance { px: number; typographyPx: number; colorChannel: number; alpha: number; opacity: number }
export const strictTolerance: Tolerance = { px: 0, typographyPx: 0, colorChannel: 0, alpha: 0, opacity: 0 };
export const normalTolerance: Tolerance = { px: 1, typographyPx: 0.5, colorChannel: 1, alpha: 0.01, opacity: 0.01 };
/** Absolute representation noise, NOT a user tolerance or relative error that grows with size.
 * CSS px serialization / Figma float32: 1e-6px; float32 sRGB *255: 2e-5 channel;
 * normalized alpha/opacity: 1e-7. Raw values and deltas are retained for inspection. */
export const numericalEpsilon = { px: 1e-6, colorChannel: 2e-5, alpha: 1e-7, opacity: 1e-7, fontWeight: 1e-9 } as const;
function validSupported(v: Value, key: Key): boolean {
  if (v.status !== 'supported' || v.kind !== kindFor(key)) return false;
  if (v.kind === 'rgba') return Array.isArray(v.value) && v.value.length === 4 && v.value.every((n, i) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= (i === 3 ? 1 : 255));
  if (v.kind === 'string') return typeof v.value === 'string' && v.value.trim().length > 0;
  return typeof v.value === 'number' && Number.isFinite(v.value) && Math.abs(v.value) <= 1e7 && (key === 'letterSpacing' || v.value >= 0) && (key !== 'opacity' || v.value <= 1) && (key !== 'fontWeight' || v.value >= 1 && v.value <= 1000);
}
function within(delta: number, limit: number, epsilon: number): boolean {
  return Math.abs(delta) <= limit || Math.abs(delta) - limit <= epsilon;
}
export interface Diff { key: Key; category: Category; expected: Value; actual: Value; status: 'match' | 'mismatch' | 'excluded'; exclusion?: 'user' | 'unsupported'; delta?: number | RGBA; reason?: string }
export interface Summary { supported: number; matched: number; score: number | null }
export interface Comparison { rows: Diff[]; total: Summary; categories: Record<Category, Summary> }
export function compare(expected: Properties, actual: Properties, tolerance: Tolerance = normalTolerance, included: readonly Key[] = keys): Comparison {
  for (const key of Object.keys(normalTolerance) as (keyof Tolerance)[]) {
    const value = tolerance[key], max = key === 'alpha' || key === 'opacity' ? 1 : key === 'colorChannel' ? 255 : 1e4;
    if (!Number.isFinite(value) || value < 0 || value > max) throw new Error(`허용오차 ${key}는 0~${max}의 유한한 숫자여야 합니다`);
  }
  const rows: Diff[] = [];
  for (const [category, list] of Object.entries(categories) as [Category, readonly Key[]][]) for (const key of list) {
    const e = expected[key], a = actual[key]; const row: Diff = { key, category, expected: e, actual: a, status: 'excluded' };
    if (!included.includes(key)) { row.exclusion = 'user'; row.reason = '사용자가 비교에서 제외'; }
    else if (e.status !== 'supported' || a.status !== 'supported') {
      row.reason = `expected: ${e.status === 'supported' ? 'supported' : `${e.status} — ${e.reason}`} / actual: ${a.status === 'supported' ? 'supported' : `${a.status} — ${a.reason}`}`;
    } else if (!validSupported(e, key) || !validSupported(a, key)) row.reason = '정규화 kind/값이 유효하지 않음 (범위 또는 비유한 값)';
    else if (e.kind === 'string') row.status = String(e.value).trim().toLowerCase() === String(a.value).trim().toLowerCase() ? 'match' : 'mismatch';
    else if (e.kind === 'rgba') {
      const ev = e.value as RGBA, av = a.value as RGBA; row.delta = av.map((v, i) => v - ev[i]) as RGBA;
      row.status = row.delta.every((d, i) => within(d, i === 3 ? tolerance.alpha : tolerance.colorChannel, i === 3 ? numericalEpsilon.alpha : numericalEpsilon.colorChannel)) ? 'match' : 'mismatch';
    } else {
      row.delta = (a.value as number) - (e.value as number);
      const limit = key === 'opacity' ? tolerance.opacity : key === 'fontWeight' ? 0 : category === 'typography' ? tolerance.typographyPx : tolerance.px;
      const epsilon = key === 'opacity' ? numericalEpsilon.opacity : key === 'fontWeight' ? numericalEpsilon.fontWeight : numericalEpsilon.px;
      row.status = within(row.delta, limit, epsilon) ? 'match' : 'mismatch';
    }
    if (row.status === 'excluded' && !row.exclusion) row.exclusion = 'unsupported';
    rows.push(row);
  }
  const summarize = (list: Diff[]): Summary => { const supported = list.filter(r => r.status !== 'excluded').length, matched = list.filter(r => r.status === 'match').length; return { supported, matched, score: supported ? matched / supported * 100 : null }; };
  return { rows, total: summarize(rows), categories: Object.fromEntries(Object.keys(categories).map(c => [c, summarize(rows.filter(r => r.category === c))])) as Record<Category, Summary> };
}
export function cssLength(raw: string): Value {
  const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/.exec(raw.trim());
  return m ? numberValue(Number(m[1])) : unavailable(`CSS '${raw}'는 단일 px로 확정 불가 (normal/auto/%/calc/복합값 등)`);
}
export function cssColor(raw: string): Value {
  if (raw === 'transparent') return colorValue([0, 0, 0, 0]);
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(raw);
  if (!m) return unavailable(`CSS 색 '${raw}'는 sRGB rgb/rgba 단색 아님`);
  const rgba: RGBA = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  return rgba.every((v, i) => Number.isFinite(v) && v >= 0 && v <= (i === 3 ? 1 : 255)) ? colorValue(rgba) : unavailable('색 범위 오류');
}
