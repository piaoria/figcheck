/** The real commands listener and tests use this same path; no host/debugger access. */
export async function handleCommand(command: string, tab?: { id?: number }) {
  if (command !== 'figcheck-pick') return;
  let tabId = tab?.id;
  if (tabId === undefined || tabId < 0) {
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tabId = active?.id; // IDs only; no URL/title or "tabs" permission.
  }
  let handled = false;
  try { handled = (await chrome.runtime.sendMessage({ type: 'figcheck-pick', tabId, issuedAt: Date.now() }))?.handled === true; } catch { /* No DevTools receiver. */ }
  if (tabId !== undefined && tabId >= 0) {
    await chrome.action.setBadgeText({ tabId, text: handled ? '' : 'F12' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#304d99' });
    await chrome.action.setTitle({ tabId, title: handled ? 'FigCheck · 요소 선택' : 'FigCheck · F12로 이 탭의 DevTools를 열고 다시 Ctrl+Shift+X를 누르세요.' });
  }
}
