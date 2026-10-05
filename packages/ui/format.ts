import { formatColor } from './color';
import { currentColorFormat } from './color-display';
import type { Diff, Value } from '../core/src/index';
/** Routine values stay short; a nonzero delta must never round to a displayed zero. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '값 미확인';
  if (value === 0) return '0';
  if (Math.abs(value) < .001) return String(Number(value.toPrecision(3)));
  return String(Number(value.toFixed(3)));
}
export function valueText(v: Value): string {
  if (v.status !== 'supported') return v.status==='unsupported'?'미지원':'값 미확인';
  if (v.kind === 'rgba') return formatColor(v.value as number[],currentColorFormat());
  return `${typeof v.value === 'number' ? formatNumber(v.value) : v.value}${v.kind === 'px' ? ' px' : ''}`;
}
const signed = (v: number) => `${v > 0 ? '+' : ''}${formatNumber(v)}`;
export function deltaText(row: Diff): string {
  if (row.delta === undefined) return '값 다름';
  if (Array.isArray(row.delta)) return row.delta.map((v,i)=>`${['R','G','B','α'][i]} ${signed(v)}`).join(', ');
  return `${signed(row.delta)}${row.actual.status === 'supported' && row.actual.kind === 'px' ? 'px' : ''}`;
}
export function direction(row: Diff): string {
  if (Array.isArray(row.delta)) return 'sRGB 채널별 차이 (웹 − 디자인)';
  if (typeof row.delta !== 'number' || row.delta === 0) return '디자인과 웹의 값이 다릅니다.';
  const unit = row.actual.status === 'supported' && row.actual.kind === 'px' ? 'px' : '';
  return `웹 값이 ${formatNumber(Math.abs(row.delta))}${unit} ${row.delta > 0 ? '더 큽니다' : '더 작습니다'}.`;
}

/** Display only: keep unknown, unsupported, invalid and user exclusions distinct without changing schema/math. */
export function exclusionLabel(row: Diff): string {
  if(row.exclusion==='user')return '사용자 제외';
  if(row.expected.status==='unsupported'||row.actual.status==='unsupported')return '미지원';
  if(row.expected.status==='unknown'||row.actual.status==='unknown')return '값 미확인';
  return '값 오류';
}
