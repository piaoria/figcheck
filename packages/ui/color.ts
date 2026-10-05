export type ColorFormat = 'hex' | 'rgb' | 'hsl';
export function isColorFormat(value: unknown): value is ColorFormat { return value==='hex'||value==='rgb'||value==='hsl'; }
const decimal = (value: number, digits: number) => value!==0&&Math.abs(value)<10**-digits ? String(Number(value.toPrecision(3))) : String(Number(value.toFixed(digits)));
/** Display only: source channels stay untouched; invalid values are never clamped into a valid color. */
export function formatColor(rgba: readonly number[], format: ColorFormat): string {
  if(rgba.length!==4||rgba.some((v,i)=>!Number.isFinite(v)||v<0||v>(i===3?1:255)))return '값 오류';
  const [red,green,blue,alpha]=rgba;
  if(format==='hex'){
    const hex=(value:number)=>Math.round(value).toString(16).padStart(2,'0').toUpperCase();
    return '#'+[red,green,blue].map(hex).join('')+(alpha===1?'':hex(alpha*255));
  }
  if(format==='rgb')return `${alpha===1?'rgb':'rgba'}(${[red,green,blue].map(v=>decimal(v,3)).join(', ')}${alpha===1?'':', '+decimal(alpha,6)})`;
  const [r,g,b]=[red,green,blue].map(v=>v/255);const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,l=(max+min)/2;
  let h=0,s=0;
  if(delta!==0){s=delta/(l<=.5?max+min:(1-max)+(1-min));h=(max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4)*60;h=(h+360)%360;}
  const hue=(Math.round(h*1000)/1000)%360;
  return `${alpha===1?'hsl':'hsla'}(${decimal(hue,3)}, ${decimal(s*100,3)}%, ${decimal(l*100,3)}%${alpha===1?'':', '+decimal(alpha,6)})`;
}
