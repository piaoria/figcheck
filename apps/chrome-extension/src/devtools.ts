import { createPickerController } from './picker-controller';
import type { PickerState } from './picker-controller';
chrome.devtools.panels.create('FigCheck ⇄', 'icons/icon-32.png', 'panel.html', panel => {
  type PanelWindow = Window & { figcheckRefresh?: () => void; figcheckPickerState?: (state: PickerState) => void };
  let target: PanelWindow | undefined;
  const controller = createPickerController(state => target?.figcheckPickerState?.(state));
  panel.onShown.addListener(win => { target = win as PanelWindow; target.figcheckRefresh?.(); controller.refresh(); });
  panel.onHidden.addListener(() => controller.hide());
  chrome.devtools.network.onNavigated.addListener(() => { void controller.clear('페이지 이동으로 선택 모드를 종료했어요.'); });
  chrome.devtools.panels.elements.onSelectionChanged.addListener(() => { void controller.clear(); });
  window.addEventListener('unload', controller.dispose);
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.tabId !== chrome.devtools.inspectedWindow.tabId) return;
    if (message.type === 'figcheck-panel-ready') { controller.refresh(); return; }
    if (!['figcheck-pick','figcheck-picker-action'].includes(message.type)) return;
    if (typeof message.issuedAt === 'number' && (Date.now() - message.issuedAt > 5000 || message.issuedAt > Date.now() + 1000)) return;
    if (message.type === 'figcheck-picker-action' && message.op === 'cancel') { void controller.cancel().then(() => respond({handled:true})); return true; }
    // Selection starts immediately; panel.show() cannot be used from runtime-message callbacks.
    void controller.toggle(message.type === 'figcheck-pick' || message.shortcut ? 'command' : 'button', message.type === 'figcheck-pick' || message.shortcut === true).then(state => {
      respond({handled:true,active:state.active});
    });
    return true;
  });
});
