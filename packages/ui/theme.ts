export type Theme = 'light' | 'dark';
export function isTheme(value: unknown): value is Theme { return value === 'light' || value === 'dark'; }
/** Changes only root color tokens and button state, never reconstructs application content. */
export function initializeTheme(initial: Theme, save: (theme: Theme, revision: number) => void) {
  let revision = 0;
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]'));
  const feedback = document.getElementById('theme-feedback')!;
  function apply(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    for (const button of buttons) {
      const dark=theme==='dark';
      // Only trusted static icon paths are rendered; imported JSON never enters this markup.
      button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="'+(dark?'moon':'sun')+'">'+(dark?'<path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5a8.5 8.5 0 1 0 9.7 9.7Z"/>':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>')+'</svg>';
      button.setAttribute('aria-pressed',String(dark));
      const description=dark?'현재 다크 · 라이트로 전환':'현재 라이트 · 다크로 전환';
      button.setAttribute('aria-label',description);button.title=description;
    }
  }
  apply(initial);
  for (const button of buttons) button.onclick = () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(theme); feedback.textContent = ''; save(theme, ++revision);
  };
  return {
    restore(value: unknown) { if (revision === 0 && isTheme(value)) apply(value); },
    saved(savedRevision: number, failed: boolean) {
      if (savedRevision === revision) feedback.textContent = failed ? '테마를 저장하지 못했어요. 이번 창에는 적용돼요.' : '';
    }
  };
}
