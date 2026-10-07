/** This function is serialized as trusted fixed code for inspectedWindow.eval.
 * No imported JSON or selector is interpolated into executable code. No page mutation. */
export interface RuleCandidate { selector: string; source: string; declarations: string; context: string[]; inherited: boolean }
export interface DOMSnapshot {
  ok: boolean; error?: string; capturedAt?: string; tag?: string; id?: string; classes?: string[];
  inline?: string; computed?: Record<string, string>; rect?: { width: number; height: number };
  shadowIssue?: string; geometryIssue?: string; textIssue?: string; candidates?: RuleCandidate[]; evidenceLimits?: string[];
}
export function collectSelected(selected: unknown): DOMSnapshot {
  try {
    if (!selected || typeof selected !== 'object' || !('nodeType' in selected) || selected.nodeType !== 1) return { ok: false, error: 'Elements에서 DOM 요소 하나를 선택해주세요 ($0).' };
    const el = selected as Element;
    const overlayRoot=el.getRootNode();
    if(el.closest('[data-figcheck-picker],[data-figcheck-pin]')||('host' in overlayRoot&&(overlayRoot as ShadowRoot).host.closest('[data-figcheck-picker],[data-figcheck-pin]')))return {ok:false,error:'FigCheck 오버레이는 수집 대상이 아닙니다.'};
    if (!el.isConnected) return { ok: false, error: '선택 DOM이 제거되었습니다. Elements에서 다시 선택해주세요.' };
    const win = el.ownerDocument.defaultView;
    if (!win) return { ok: false, error: '선택 DOM의 window를 확인할 수 없습니다.' };
    const s = win.getComputedStyle(el), rect = el.getBoundingClientRect();
    const names = ['width', 'height', 'box-sizing', 'overflow-x', 'overflow-y', 'scrollbar-gutter', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'row-gap', 'column-gap', 'display', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'background-color', 'background-image', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', 'opacity', 'transform', 'zoom', 'box-shadow', 'text-shadow', 'filter', 'backdrop-filter', 'mix-blend-mode'];
    const computed: Record<string, string> = {}; names.forEach(name => computed[name] = s.getPropertyValue(name));
    let geometryIssue = '', shadowIssue = '';
    if (el.namespaceURI !== 'http://www.w3.org/1999/xhtml') geometryIssue = 'SVG 등 비-HTML 요소: CSS border-box 매핑 미지원';
    if (el.getClientRects().length !== 1 || s.display === 'inline' || s.display === 'contents') geometryIssue = 'inline/분절/비렌더 요소: 단일 border-box 크기 확정 불가';
    for (let n: Element | null = el, depth = 0; n && depth < 64; n = n.parentElement ?? (n.getRootNode() instanceof win.ShadowRoot ? (n.getRootNode() as ShadowRoot).host : null), depth++) {
      const cs = win.getComputedStyle(n);
      if((cs.filter&&cs.filter!=='none')||(cs.getPropertyValue('backdrop-filter')&&cs.getPropertyValue('backdrop-filter')!=='none')||(cs.mixBlendMode&&cs.mixBlendMode!=='normal'))shadowIssue='자기/조상 filter 또는 blend 합성: box-shadow 비교 제외';
      if(n===el&&cs.textShadow&&cs.textShadow!=='none')shadowIssue='text-shadow는 box-shadow 대응 범위 밖';
      if (cs.transform !== 'none' || ['rotate', 'scale', 'translate'].some(k => { const v = cs.getPropertyValue(k); return v && v !== 'none'; }) || (cs.getPropertyValue('zoom') && !['1', 'normal'].includes(cs.getPropertyValue('zoom')))) geometryIssue = '자기/조상 transform 또는 zoom: rect와 Figma local 크기 비교 제외';
      if (depth === 63) geometryIssue = '조상 검사 최대 64단계 초과';
    }
    const directText = Array.from(el.childNodes).some(n => n.nodeType === 3 && (n.textContent ?? '').trim());
    const pseudoText = ['::before', '::after'].some(pseudo => { const content = win.getComputedStyle(el, pseudo).content; return content && content !== 'none' && content !== 'normal' && content !== '""'; });
    const textIssue = el.children.length || pseudoText ? '자식 요소/생성 텍스트 포함: 부모 computedStyle로 전체 텍스트 대표 불가' : !directText ? '직접 텍스트 없음: typography/textColor 비교 제외' : '';
    const candidates: RuleCandidate[] = [], evidenceLimits: string[] = [];
    const subjects: Element[] = [el]; for (let n = el.parentElement; n && subjects.length < 9; n = n.parentElement) subjects.push(n);
    const root = el.getRootNode();
    const sheets = [...Array.from(el.ownerDocument.styleSheets), ...Array.from(el.ownerDocument.adoptedStyleSheets ?? [])];
    if (root instanceof win.ShadowRoot) sheets.push(...Array.from(root.styleSheets), ...Array.from(root.adoptedStyleSheets));
    let scanned = 0; const visited = new Set<CSSStyleSheet>();
    const relevant = /^(width|height|padding|gap|row-gap|column-gap|font|line-height|letter-spacing|color|background|border|box-shadow|text-shadow|filter|opacity|all|--)/;
    function visitSheet(sheet: CSSStyleSheet, context: string[]) {
      if (visited.has(sheet)) return; visited.add(sheet);
      const source = sheet.href ?? 'inline stylesheet (원본 줄 번호 없음)';
      if (sheet.disabled) { evidenceLimits.push(`${source}: disabled 제외`); return; }
      const media = sheet.media?.mediaText;
      if (media && !win!.matchMedia(media).matches) return;
      try { walk(sheet.cssRules, source, media ? [...context, `sheet media ${media}`] : context); }
      catch (e) { evidenceLimits.push(`${source}: ${e instanceof Error ? e.name : '오류'} — CSSOM 접근불가 (cross-origin 등)`); }
    }
    function walk(rules: CSSRuleList, source: string, context: string[]) {
      for (const rule of Array.from(rules)) {
        if (++scanned > 2000 || candidates.length >= 100) { if (!evidenceLimits.includes('CSSOM 최대 2000 rule / 100 후보에 도달: 부분조회')) evidenceLimits.push('CSSOM 최대 2000 rule / 100 후보에 도달: 부분조회'); return; }
        if (rule instanceof win!.CSSImportRule) { if (rule.styleSheet) visitSheet(rule.styleSheet, [...context, '@import']); continue; }
        if (rule instanceof win!.CSSStyleRule) {
          const declarations = Array.from(rule.style).filter(k => relevant.test(k)).map(k => `${k}: ${rule.style.getPropertyValue(k)}${rule.style.getPropertyPriority(k) ? ' !important' : ''}`).join('; ').slice(0, 4096);
          if (declarations) subjects.forEach((subject, i) => {
            try { if (subject.matches(rule.selectorText) && candidates.length < 100) candidates.push({ selector: rule.selectorText.slice(0, 2048), source: source.slice(0, 2048), declarations, context, inherited: i > 0 }); }
            catch { evidenceLimits.push('selector 매칭 불가 (pseudo/nesting 등): 부분조회'); }
          });
          if ('cssRules' in rule) walk((rule as CSSStyleRule & { cssRules: CSSRuleList }).cssRules, source, [...context, 'nested selector (승자 추적불가)']);
        } else if ('cssRules' in rule) {
          const grouping = rule as CSSGroupingRule;
          const header = rule.cssText.split('{')[0].slice(0, 512);
          if (rule instanceof win!.CSSMediaRule && !win!.matchMedia(rule.conditionText).matches) continue;
          if (rule instanceof win!.CSSSupportsRule && !win!.CSS.supports(rule.conditionText)) continue;
          walk(grouping.cssRules, source, [...context, header]);
        }
      }
    }
    sheets.forEach(sheet => visitSheet(sheet, []));
    evidenceLimits.push('후보만 표시: cascade 승자, inheritance, shorthand, layer/important, scope/container, animation, source map/원본 줄, authoring Tailwind는 추적불가.');
    if (root instanceof win.ShadowRoot) evidenceLimits.push('Shadow DOM scoped cascade/slot 상속은 부분조회');
    if (subjects.length === 9) evidenceLimits.push('상속 후보 조상은 최대 8단계');
    return { ok: true, capturedAt: new Date().toISOString(), tag: el.tagName.slice(0, 128), id: el.id.slice(0, 2048), classes: Array.from(el.classList).slice(0, 100).map(c => c.slice(0, 256)), inline: (el.getAttribute('style') ?? '').slice(0, 4096), computed, rect: { width: rect.width, height: rect.height }, geometryIssue, shadowIssue, textIssue, candidates, evidenceLimits: evidenceLimits.slice(0, 100) };
  } catch (e) { return { ok: false, error: `수집 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }; }
}
