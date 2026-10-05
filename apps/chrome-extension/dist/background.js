"use strict";
(() => {
  // apps/chrome-extension/src/command.ts
  async function handleCommand(command, tab) {
    if (command !== "figcheck-pick") return;
    let tabId = tab?.id;
    if (tabId === void 0 || tabId < 0) {
      const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      tabId = active?.id;
    }
    let handled = false;
    try {
      handled = (await chrome.runtime.sendMessage({ type: "figcheck-pick", tabId, issuedAt: Date.now() }))?.handled === true;
    } catch {
    }
    if (tabId !== void 0 && tabId >= 0) {
      await chrome.action.setBadgeText({ tabId, text: handled ? "" : "F12" });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: "#304d99" });
      await chrome.action.setTitle({ tabId, title: handled ? "FigCheck \xB7 \uC694\uC18C \uC120\uD0DD" : "FigCheck \xB7 F12\uB85C \uC774 \uD0ED\uC758 DevTools\uB97C \uC5F4\uACE0 \uB2E4\uC2DC Ctrl+Shift+X\uB97C \uB204\uB974\uC138\uC694." });
    }
  }

  // apps/chrome-extension/src/background.ts
  chrome.commands.onCommand.addListener((command, tab) => {
    return handleCommand(command, tab).catch(() => {
    });
  });
})();
