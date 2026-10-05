"use strict";
(() => {
  // apps/chrome-extension/src/picker.ts
  function pagePicker(op, token, operationId = 0) {
    const key = Symbol.for("figcheck.picker.v1");
    const host = window;
    let s = host[key];
    if (s?.token === token && operationId < s.operationId) return { active: s.active, sequence: s.sequence, message: s.message, selected: Boolean(s.selected?.isConnected) };
    if (s?.token === token) s.operationId = operationId;
    if (s && s.token !== token) {
      if (op !== "start") return { active: false, sequence: 0, message: "\uC120\uD0DD \uC138\uC158\uC774 \uBC14\uB00C\uC5C8\uC5B4\uC694." };
      s.cleanup();
      s = void 0;
    }
    if (op === "clear") {
      s?.cleanup();
      delete host[key];
      return { active: false, sequence: 0, message: "" };
    }
    if (op === "stop") {
      s?.cleanup();
      if (s) s.message = "\uC120\uD0DD\uC744 \uCDE8\uC18C\uD588\uC5B4\uC694. \uAE30\uC874 \uBE44\uAD50\uB294 \uC720\uC9C0\uD569\uB2C8\uB2E4.";
    }
    if (op === "start" && !s?.active) {
      if (document.hidden) return { active: false, sequence: 0, message: "\uAC80\uC0AC \uB300\uC0C1 \uD0ED\uC744 \uBA3C\uC800 \uD654\uBA74\uC5D0 \uD45C\uC2DC\uD558\uC138\uC694." };
      s = { token, operationId, active: true, selected: s?.selected, sequence: s?.sequence ?? 0, message: "\uC694\uC18C \uC704\uB85C \uC774\uB3D9 \u2192 \uD074\uB9AD\uC73C\uB85C \uC120\uD0DD \xB7 Esc \uCDE8\uC18C", lease: Date.now(), cleanup: () => {
      } };
      host[key] = s;
      const state = s, overlay = document.createElement("div");
      overlay.setAttribute("data-figcheck-picker", "");
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:auto;cursor:crosshair;contain:layout style;";
      const root = overlay.attachShadow({ mode: "closed" }), box = document.createElement("div"), hint = document.createElement("div");
      box.style.cssText = "position:fixed;border:2px solid #2463eb;background:rgba(36,99,235,.08);box-sizing:border-box;display:none;";
      hint.style.cssText = "position:fixed;top:8px;left:8px;max-width:calc(100vw - 16px);padding:8px 12px;background:#172b49;color:white;font:12px/1.5 system-ui;border-radius:6px;";
      hint.textContent = state.message;
      root.append(box, hint);
      document.documentElement.append(overlay);
      let target;
      const block = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      const move = (e) => {
        overlay.style.pointerEvents = "none";
        let first = document.elementFromPoint(e.clientX, e.clientY);
        if (first?.shadowRoot) first = first.shadowRoot.elementFromPoint(e.clientX, e.clientY);
        overlay.style.pointerEvents = "auto";
        target = first instanceof Element ? first : void 0;
        if (!target || target.getRootNode() !== document || target.tagName === "IFRAME" || target.namespaceURI !== "http://www.w3.org/1999/xhtml") {
          target = void 0;
          box.style.display = "none";
          hint.textContent = "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uB300\uC0C1: iframe \uB0B4\uBD80\xB7Shadow DOM \uB0B4\uBD80\xB7SVG \xB7 Elements\uC5D0\uC11C \uC9C1\uC811 \uC120\uD0DD\uD558\uC138\uC694.";
          state.message = hint.textContent;
          return;
        }
        const r = target.getBoundingClientRect();
        box.style.display = "block";
        box.style.left = r.left + "px";
        box.style.top = r.top + "px";
        box.style.width = r.width + "px";
        box.style.height = r.height + "px";
        state.message = `${target.tagName.toLowerCase()}${target.id ? "#" + target.id : ""} \xB7 \uD074\uB9AD \uC120\uD0DD / Esc \uCDE8\uC18C`;
        hint.textContent = state.message;
      };
      const choose = (e) => {
        block(e);
        move(e);
        if (!target?.isConnected) return;
        state.selected = target;
        ++state.sequence;
        state.message = "\uC694\uC18C\uB97C \uC120\uD0DD\uD588\uC5B4\uC694.";
        state.cleanup();
      };
      const keydown = (e) => {
        if (e.key === "Escape") {
          block(e);
          state.message = "\uC120\uD0DD\uC744 \uCDE8\uC18C\uD588\uC5B4\uC694. \uAE30\uC874 \uBE44\uAD50\uB294 \uC720\uC9C0\uD569\uB2C8\uB2E4.";
          state.cleanup();
        }
      };
      const hide = () => {
        if (document.hidden) {
          state.message = "\uD0ED \uC774\uB3D9\uC73C\uB85C \uC120\uD0DD\uC744 \uCDE8\uC18C\uD588\uC5B4\uC694.";
          state.cleanup();
        }
      };
      const timers = setInterval(() => {
        if (Date.now() - state.lease > 1500) {
          state.message = "\uD328\uB110 \uC5F0\uACB0\uC774 \uB05D\uB098 \uC120\uD0DD\uC744 \uCDE8\uC18C\uD588\uC5B4\uC694.";
          state.cleanup();
          if (host[key] === state) delete host[key];
        }
      }, 250);
      state.cleanup = () => {
        state.active = false;
        clearInterval(timers);
        overlay.remove();
        window.removeEventListener("mousemove", move, true);
        window.removeEventListener("click", choose, true);
        for (const event of ["pointerdown", "pointerup", "mousedown", "mouseup", "contextmenu"]) window.removeEventListener(event, block, true);
        window.removeEventListener("keydown", keydown, true);
        document.removeEventListener("visibilitychange", hide);
        window.removeEventListener("pagehide", state.cleanup);
      };
      window.addEventListener("mousemove", move, true);
      window.addEventListener("click", choose, true);
      for (const event of ["pointerdown", "pointerup", "mousedown", "mouseup", "contextmenu"]) window.addEventListener(event, block, true);
      window.addEventListener("keydown", keydown, true);
      document.addEventListener("visibilitychange", hide);
      window.addEventListener("pagehide", state.cleanup);
    }
    if (s && op === "pulse") s.lease = Date.now();
    return { active: s?.active ?? false, sequence: s?.sequence ?? 0, message: s?.message ?? "", selected: Boolean(s?.selected?.isConnected) };
  }

  // apps/chrome-extension/src/picker-controller.ts
  function createPickerController(publish) {
    const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
    let epoch = 0, origin, lastShortcut = 0;
    let state = { token, active: false, sequence: 0, selected: false, message: "" };
    function action(op, message) {
      const current = ++epoch;
      if (op === "start") state = { ...state, active: true };
      if (op === "stop" || op === "clear") {
        state = { ...state, active: false };
        origin = void 0;
      }
      return new Promise((resolve) => chrome.devtools.inspectedWindow.eval(`(${pagePicker.toString()})(${JSON.stringify(op)},${JSON.stringify(token)},${current})`, (value, error) => {
        if (current !== epoch) {
          resolve(state);
          return;
        }
        const v = value;
        if (error?.isException || error?.isError || !v || typeof v.active !== "boolean" || !Number.isSafeInteger(v.sequence) || typeof v.message !== "string") {
          state = { token, active: false, sequence: 0, selected: false, message: "\uC774 \uD398\uC774\uC9C0\uC5D0\uC11C \uC694\uC18C \uC120\uD0DD\uC744 \uC2E4\uD589\uD560 \uC218 \uC5C6\uC5B4\uC694. \uC77C\uBC18 \uC6F9\uD398\uC774\uC9C0\uC5D0\uC11C \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." };
        } else state = { token, active: v.active, sequence: v.sequence, selected: v.selected === true, message: message ?? v.message.slice(0, 500), forget: op === "clear" };
        if (!state.active) origin = void 0;
        publish(state);
        resolve(state);
      }));
    }
    const timer = setInterval(() => {
      if (state.active) void action("pulse");
    }, 250);
    return {
      async toggle(from, shortcut = false) {
        if (shortcut && Date.now() - lastShortcut < 250) return state;
        if (shortcut) lastShortcut = Date.now();
        if (state.active) return action("stop");
        origin = from;
        return action("start");
      },
      cancel: () => action("stop"),
      clear: (message) => action("clear", message),
      hide: () => {
        if (origin === "button") void action("stop");
      },
      refresh: () => publish(state),
      dispose: () => {
        clearInterval(timer);
        void action("clear");
      }
    };
  }

  // apps/chrome-extension/src/devtools.ts
  chrome.devtools.panels.create("FigCheck", "", "panel.html", (panel) => {
    let target;
    const controller = createPickerController((state) => target?.figcheckPickerState?.(state));
    panel.onShown.addListener((win) => {
      target = win;
      target.figcheckRefresh?.();
      controller.refresh();
    });
    panel.onHidden.addListener(() => controller.hide());
    chrome.devtools.network.onNavigated.addListener(() => {
      void controller.clear("\uD398\uC774\uC9C0 \uC774\uB3D9\uC73C\uB85C \uC120\uD0DD \uBAA8\uB4DC\uB97C \uC885\uB8CC\uD588\uC5B4\uC694.");
    });
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      void controller.clear();
    });
    window.addEventListener("unload", controller.dispose);
    chrome.runtime.onMessage.addListener((message, _sender, respond) => {
      if (message?.tabId !== chrome.devtools.inspectedWindow.tabId) return;
      if (message.type === "figcheck-panel-ready") {
        controller.refresh();
        return;
      }
      if (!["figcheck-pick", "figcheck-picker-action"].includes(message.type)) return;
      if (typeof message.issuedAt === "number" && (Date.now() - message.issuedAt > 5e3 || message.issuedAt > Date.now() + 1e3)) return;
      if (message.type === "figcheck-picker-action" && message.op === "cancel") {
        void controller.cancel().then(() => respond({ handled: true }));
        return true;
      }
      void controller.toggle(message.type === "figcheck-pick" || message.shortcut ? "command" : "button", message.type === "figcheck-pick" || message.shortcut === true).then((state) => {
        respond({ handled: true, active: state.active });
      });
      return true;
    });
  });
})();
