"use strict";
(() => {
  // packages/ui/compact-box.ts
  function compactBox(element, shapes, previousKey = "") {
    const s = getComputedStyle(element), r = element.getBoundingClientRect(), round = (n) => String(Math.round(n * 1e3) / 1e3);
    const names = ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width", "padding-top", "padding-right", "padding-bottom", "padding-left", "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"];
    const values = names.map((n) => s.getPropertyValue(n)), key = JSON.stringify([values, r.width, r.height, s.width, s.height, s.boxSizing]);
    if (key === previousKey) return { key, view: void 0 };
    const el = (tag, text = "", style = "") => {
      const e = document.createElement(tag);
      e.textContent = text;
      e.style.cssText = style;
      return e;
    };
    const wrap = el("div", "", "margin-top:6px;");
    wrap.dataset.compactBox = "";
    const metric = (index, icon) => {
      const raw = values[index], valid = /^-?(?:\d+(?:\.\d+)?|\.\d+)px$/.test(raw);
      const e = el("span", valid ? round(parseFloat(raw)) : "N/A", "display:inline-flex;align-items:center;justify-content:center;gap:2px;min-width:0;overflow:hidden;font:10px/14px system-ui;font-variant-numeric:tabular-nums;");
      e.dataset.css = names[index];
      e.title = names[index] + ": " + raw + (valid ? "" : " \xB7 \uB2E8\uC77C px \uBBF8\uC9C0\uC6D0");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      for (const [k, v] of Object.entries({ viewBox: "0 0 16 16", width: "11", height: "11", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "aria-hidden": "true" })) svg.setAttribute(k, v);
      svg.style.flex = "none";
      for (const shape of shapes[icon]) {
        const n = document.createElementNS("http://www.w3.org/2000/svg", shape.tag);
        for (const [k, v] of Object.entries(shape.attrs)) n.setAttribute(k, v);
        if (shape.muted) n.setAttribute("opacity", ".3");
        svg.append(n);
      }
      e.prepend(svg);
      return e;
    };
    const border = el("div", "", "border:1px solid #8793a3;border-radius:4px;position:relative;padding:18px 3px 3px;display:grid;grid-template-columns:minmax(30px,1fr) minmax(110px,3fr) minmax(30px,1fr);gap:2px;align-items:center;");
    border.dataset.region = "border-region";
    const corners = [metric(8, "radiusTopLeft"), metric(9, "radiusTopRight"), metric(11, "radiusBottomLeft"), metric(10, "radiusBottomRight")];
    const regionLabel = (name) => {
      const e = el("span", name, "position:absolute;left:4px;top:1px;font:10px/14px system-ui;color:#c0cad7;white-space:nowrap;");
      e.dataset.regionLabel = name;
      return e;
    };
    border.append(regionLabel("Border"), corners[0], el("span"), corners[1]);
    const top2 = metric(0, "borderTopWidth");
    top2.style.gridColumn = "1/-1";
    border.append(top2, metric(3, "borderLeftWidth"));
    const padding = el("div", "", "border:1px dashed #778596;position:relative;padding:18px 3px 3px;display:grid;grid-template-columns:minmax(20px,1fr) minmax(54px,2fr) minmax(20px,1fr);gap:2px;align-items:center;");
    padding.dataset.region = "padding-region";
    const title = regionLabel("Padding"), pt = metric(4, "paddingTop");
    pt.style.gridColumn = "1/-1";
    padding.append(title, pt, metric(7, "paddingLeft"), el("span", `${round(r.width)} \xD7 ${round(r.height)} px`, "font:10px/14px system-ui;text-align:center;overflow-wrap:anywhere;"), metric(5, "paddingRight"));
    const pb = metric(6, "paddingBottom");
    pb.style.gridColumn = "1/-1";
    padding.append(pb);
    border.append(padding, metric(1, "borderRightWidth"));
    const bottom2 = metric(2, "borderBottomWidth");
    bottom2.style.gridColumn = "1/-1";
    border.append(bottom2, corners[2], el("span"), corners[3]);
    wrap.append(border);
    return { key, view: wrap };
  }

  // packages/ui/property-icon.ts
  var path = (d, muted = false) => ({ tag: "path", attrs: { d }, muted });
  var box = { tag: "rect", attrs: { x: "3", y: "3", width: "10", height: "10" }, muted: true };
  var paddingBox = [{ tag: "rect", attrs: { x: "2", y: "2", width: "12", height: "12" }, muted: true }, { tag: "rect", attrs: { x: "5", y: "5", width: "6", height: "6" }, muted: true }];
  var top = [box, path("M3 3H13")];
  var right = [box, path("M13 3V13")];
  var bottom = [box, path("M3 13H13")];
  var left = [box, path("M3 3V13")];
  var icons = {
    width: [path("M2 5V11M14 5V11M2 8H14M4 6L2 8L4 10M12 6L14 8L12 10")],
    height: [path("M5 2H11M5 14H11M8 2V14M6 4L8 2L10 4M6 12L8 14L10 12")],
    paddingTop: [...paddingBox, path("M5 3H11M8 3V5M6 5H10")],
    paddingRight: [...paddingBox, path("M13 5V11M11 8H13M11 6V10")],
    paddingBottom: [...paddingBox, path("M5 13H11M8 11V13M6 11H10")],
    paddingLeft: [...paddingBox, path("M3 5V11M3 8H5M5 6V10")],
    rowGap: [path("M3 3H13M3 13H13", true), path("M5 6H11M5 10H11M8 6V10")],
    columnGap: [path("M3 3V13M13 3V13", true), path("M6 5V11M10 5V11M6 8H10")],
    fontFamily: [path("M3 13L8 3L13 13M5 9H11")],
    fontSize: [path("M2 12L5 4L8 12M3 9H7M11 3H14M11 13H14M12.5 3V13")],
    fontWeight: [path("M4 3V13H8A3 3 0 0 0 8 7H4M4 3H7A2 2 0 0 1 7 7H4")],
    lineHeight: [path("M7 3H14M7 8H12M7 13H14M3 3V13M1 5L3 3L5 5M1 11L3 13L5 11")],
    letterSpacing: [path("M2 3H6M4 3V9M10 3H14M12 3V9M5 13H11M6 12L5 13L6 14M10 12L11 13L10 14")],
    textColor: [path("M3 11L7 3L11 11M5 8H9M2 14H14")],
    backgroundColor: [{ tag: "rect", attrs: { x: "3", y: "3", width: "10", height: "10", fill: "currentColor", "fill-opacity": ".15" } }, path("M3 13L13 3")],
    borderTopWidth: top,
    borderRightWidth: right,
    borderBottomWidth: bottom,
    borderLeftWidth: left,
    borderTopColor: top,
    borderRightColor: right,
    borderBottomColor: bottom,
    borderLeftColor: left,
    radiusTopLeft: [box, path("M3 9V7A4 4 0 0 1 7 3H9")],
    radiusTopRight: [box, path("M7 3H9A4 4 0 0 1 13 7V9")],
    radiusBottomRight: [box, path("M13 7V9A4 4 0 0 1 9 13H7")],
    radiusBottomLeft: [box, path("M9 13H7A4 4 0 0 1 3 9V7")],
    opacity: [{ tag: "circle", attrs: { cx: "8", cy: "8", r: "5" } }, { tag: "path", attrs: { d: "M8 3A5 5 0 0 0 8 13Z", fill: "currentColor", "fill-opacity": ".35" } }, path("M8 3V13")]
  };

  // apps/chrome-extension/src/measurement.ts
  function measureBoxes(a, b) {
    const lines = [];
    const result = { kind: "invalid", horizontal: 0, vertical: 0, lines };
    if ([a, b].some((r) => ![r.left, r.top, r.right, r.bottom].every(Number.isFinite) || r.right <= r.left || r.bottom <= r.top)) return result;
    const add = (x1, y1, x2, y2, value, label) => lines.push({ x1, y1, x2, y2, value, label });
    const contains = (o, i) => o.left <= i.left && o.top <= i.top && o.right >= i.right && o.bottom >= i.bottom;
    if (contains(a, b) || contains(b, a)) {
      const outer = contains(a, b) ? a : b, inner = outer === a ? b : a;
      result.container = outer === a ? "A" : "B";
      result.insets = { top: inner.top - outer.top, right: outer.right - inner.right, bottom: outer.bottom - inner.bottom, left: inner.left - outer.left };
      result.kind = Object.values(result.insets).every((v) => v === 0) ? "coincident" : "contains";
      const x = (inner.left + inner.right) / 2, y = (inner.top + inner.bottom) / 2;
      add(x, outer.top, x, inner.top, result.insets.top, "\uC704");
      add(inner.right, y, outer.right, y, result.insets.right, "\uC624\uB978\uCABD");
      add(x, inner.bottom, x, outer.bottom, result.insets.bottom, "\uC544\uB798");
      add(outer.left, y, inner.left, y, result.insets.left, "\uC67C\uCABD");
      return result;
    }
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    result.horizontal = Math.max(a.left - b.right, b.left - a.right, 0);
    result.vertical = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
    if (ox >= 0 && oy >= 0) {
      result.kind = ox === 0 || oy === 0 ? "touching" : "overlap";
      const x = Math.max(a.left, b.left), y = Math.max(a.top, b.top);
      add(x, y, x + ox, y, ox, "\uACB9\uCE68 \uAC00\uB85C");
      add(x, y, x, y + oy, oy, "\uACB9\uCE68 \uC138\uB85C");
      return result;
    }
    result.kind = "separated";
    if (result.horizontal) {
      const left2 = a.right <= b.left ? a : b, right2 = left2 === a ? b : a;
      const y = oy >= 0 ? (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2 : (left2.top + left2.bottom) / 2;
      add(left2.right, y, right2.left, y, result.horizontal, "\uAC00\uB85C");
    }
    if (result.vertical) {
      const top2 = a.bottom <= b.top ? a : b, bottom2 = top2 === a ? b : a;
      const x = ox >= 0 ? (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2 : (bottom2.left + bottom2.right) / 2;
      add(x, top2.bottom, x, bottom2.top, result.vertical, "\uC138\uB85C");
    }
    return result;
  }

  // apps/chrome-extension/src/picker.ts
  function pagePicker(op, token, operationId = 0, measure, structure, shapes) {
    const key = Symbol.for("figcheck.picker.v1");
    const host = window;
    let s = host[key];
    if (s?.token === token && operationId < s.operationId) return { pinned: s.pinned === true, active: s.active, sequence: s.sequence, message: s.message, selected: Boolean(s.selected?.isConnected) };
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
      s?.cleanup();
      if (document.hidden) return { active: false, sequence: 0, message: "\uAC80\uC0AC \uB300\uC0C1 \uD0ED\uC744 \uBA3C\uC800 \uD654\uBA74\uC5D0 \uD45C\uC2DC\uD558\uC138\uC694." };
      s = { token, operationId, active: true, selected: s?.selected, sequence: s?.sequence ?? 0, message: "\uC694\uC18C \uC704\uB85C \uC774\uB3D9 \xB7 \u2191 \uBD80\uBAA8 / \u2193 \uC790\uC2DD \xB7 \uD074\uB9AD/Enter \uC120\uD0DD \xB7 Esc \uCDE8\uC18C", lease: Date.now(), cleanup: () => {
      } };
      host[key] = s;
      const state = s, overlay = document.createElement("div");
      overlay.setAttribute("data-figcheck-picker", "");
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:auto;cursor:crosshair;contain:layout style;";
      const root = overlay.attachShadow({ mode: "closed" }), box2 = document.createElement("div"), hint = document.createElement("div");
      box2.style.cssText = "position:fixed;border:1px solid #52677e;outline:1px solid #ffffffb3;background:rgba(82,103,126,.035);box-sizing:border-box;display:none;pointer-events:none;";
      hint.style.cssText = 'box-sizing:border-box;z-index:2;position:fixed;top:8px;left:8px;max-width:calc(100vw - 16px);padding:7px 9px;background:#272c33;color:#f5f7fa;font:11px/1.55 "Pretendard Variable",system-ui,sans-serif;border:1px solid #59616d;border-radius:5px;white-space:pre-line;overflow-wrap:anywhere;pointer-events:none;';
      hint.textContent = state.message;
      root.append(box2, hint);
      document.documentElement.append(overlay);
      const peerBox = document.createElement("div"), guides = document.createElement("div");
      peerBox.style.cssText = box2.style.cssText + "border-style:dashed;border-color:#7c8999;background:transparent;";
      guides.style.cssText = "position:fixed;inset:0;pointer-events:none;";
      root.append(peerBox, guides);
      let peer, altHeld = false, altGesture = false, usedAlt = false, frame = 0, lastPaint = "";
      const number = (v) => String(Math.round(v * 1e3) / 1e3);
      const editable = (e) => e instanceof HTMLElement && (e.isContentEditable || Boolean(e.closest('input,textarea,select,[role="textbox"]')));
      const altOnly = (e) => e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.getModifierState("AltGraph");
      const clearDistance = (resetKey = true) => {
        if (resetKey) altHeld = false;
        peer = void 0;
        state.measurement = void 0;
        peerBox.style.display = "none";
        guides.replaceChildren();
        lastPaint = "";
      };
      const place = (node, r) => {
        node.style.display = "block";
        node.style.left = r.left + "px";
        node.style.top = r.top + "px";
        node.style.width = r.width + "px";
        node.style.height = r.height + "px";
      };
      let infoKey = "", structureKey = "";
      let structureView;
      const info = (anchor, a, other, kind = "") => {
        const lines = [["A", label(anchor), `${number(a.width)} \xD7 ${number(a.height)}`], ...other ? [["B", label(other), kind]] : []];
        const updated = !other && structure && shapes ? structure(anchor, shapes, structureKey) : void 0;
        if (updated) {
          structureKey = updated.key;
          if (updated.view) structureView = updated.view;
        }
        const diagram = updated && structureView ? { key: structureKey, view: structureView } : void 0;
        const key2 = JSON.stringify([lines, diagram?.key, innerWidth, innerHeight]);
        if (key2 !== infoKey || !hint.querySelector("[data-role]")) {
          infoKey = key2;
          hint.replaceChildren();
          hint.style.whiteSpace = "normal";
          hint.style.width = "max-content";
          hint.style.maxWidth = "min(300px,calc(100vw - 16px))";
          for (const [role, name, detail] of lines) {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:7px;min-width:0;";
            const badge = document.createElement("span");
            badge.dataset.role = role;
            badge.textContent = role;
            badge.style.cssText = `flex:none;box-sizing:border-box;width:17px;height:17px;text-align:center;font:600 10px/15px system-ui;border:1px ${role === "A" ? "solid" : "dashed"} #9eabbc;border-radius:3px;color:${role === "A" ? "#272c33" : "#e7edf5"};background:${role === "A" ? "#dce4ef" : "transparent"};`;
            const nameNode = document.createElement("span");
            nameNode.textContent = name;
            nameNode.style.cssText = "min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
            const meta = document.createElement("span");
            meta.textContent = detail;
            meta.style.cssText = "flex:none;margin-left:auto;color:#c0cad7;font-variant-numeric:tabular-nums;";
            row.append(badge, nameNode, meta);
            hint.append(row);
          }
          const foot = document.createElement("div");
          foot.textContent = other ? "border-box \xB7 CSS px  /  Alt \uD574\uC81C \xB7 Esc \uC885\uB8CC" : "Alt + hover \uAC70\uB9AC  \xB7  Esc \uC885\uB8CC";
          foot.style.cssText = "margin-top:4px;color:#b7c1ce;font-size:10px;";
          hint.append(foot);
          if (diagram) {
            hint.append(diagram.view);
            hint.style.width = "264px";
          }
          if (diagram) diagram.view.style.zoom = String(Math.min(1, Math.max(0.45, (innerHeight - 76) / 184)));
          hint.style.maxHeight = "calc(100vh - 16px)";
          hint.style.overflow = "hidden";
        }
        const w = hint.offsetWidth, h = hint.offsetHeight, b = other?.getBoundingClientRect();
        const area = (x2, y2, rect) => Math.max(0, Math.min(x2 + w, rect.right) - Math.max(x2, rect.left)) * Math.max(0, Math.min(y2 + h, rect.bottom) - Math.max(y2, rect.top));
        const corners = [[8, 8], [Math.max(8, innerWidth - w - 8), 8], [8, Math.max(8, innerHeight - h - 8)], [Math.max(8, innerWidth - w - 8), Math.max(8, innerHeight - h - 8)]];
        corners.sort((c, d) => area(c[0], c[1], a) + (b ? area(c[0], c[1], b) : 0) - (area(d[0], d[1], a) + (b ? area(d[0], d[1], b) : 0)));
        hint.style.left = corners[0][0] + "px";
        hint.style.top = corners[0][1] + "px";
      };
      const pinPaint = () => {
        if (!state.pinned) return;
        const anchor = state.selected;
        if (!supported(anchor)) {
          state.message = "\uACE0\uC815\uD55C \uC694\uC18C\uAC00 \uC81C\uAC70\uB418\uC5B4 \uD45C\uC2DC\uB97C \uC885\uB8CC\uD588\uC5B4\uC694.";
          state.cleanup();
          return;
        }
        if (peer && !supported(peer)) clearDistance();
        const rootStyle = getComputedStyle(document.documentElement);
        const unsafe = rootStyle.transform !== "none" || rootStyle.perspective !== "none" || rootStyle.filter !== "none" || !["", "1", "normal"].includes(rootStyle.zoom) || (window.visualViewport?.scale ?? 1) !== 1;
        const a = anchor.getBoundingClientRect();
        if (unsafe || !a.width || !a.height) {
          clearDistance();
          box2.style.display = "none";
          state.message = "\uACE0\uC815 A \xB7 \uD604\uC7AC \uD655\uB300/\uB8E8\uD2B8 \uBCC0\uD615 \uB610\uB294 \uBE48 \uBC15\uC2A4\uB294 \uCE21\uC815\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. Esc \uC885\uB8CC";
          hint.textContent = state.message;
          return;
        }
        place(box2, a);
        const base = `\uACE0\uC815 A \xB7 ${label(anchor)} \xB7 ${number(a.width)} \xD7 ${number(a.height)} CSS px
Alt+\uB2E4\uB978 \uC694\uC18C hover: \uAC70\uB9AC \xB7 Esc: \uACE0\uC815 \uD45C\uC2DC \uC885\uB8CC`;
        if (!altHeld || !document.hasFocus()) {
          clearDistance(false);
          state.message = base;
          info(anchor, a);
          return;
        }
        const candidate = hit();
        if (!candidate || candidate === anchor) {
          peer = void 0;
          state.measurement = void 0;
          peerBox.style.display = "none";
          guides.replaceChildren();
          lastPaint = "";
          state.message = base + (candidate ? "" : "\n\uCE21\uC815 \uBBF8\uC9C0\uC6D0: iframe\xB7Shadow DOM \uB0B4\uBD80\xB7SVG");
          hint.textContent = state.message;
          return;
        }
        peer = candidate;
        const b = peer.getBoundingClientRect(), distance = measure?.(a, b);
        if (!distance || distance.kind === "invalid") {
          clearDistance();
          state.message = base + "\n\uBE48 \uBC15\uC2A4\uB294 \uCE21\uC815\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.";
          hint.textContent = state.message;
          return;
        }
        state.measurement = distance;
        if (altGesture) usedAlt = true;
        place(peerBox, b);
        const kind = distance.kind === "contains" ? `${distance.container}\uAC00 \uB2E4\uB978 \uBC15\uC2A4\uB97C \uD3EC\uD568` : distance.kind === "coincident" ? "\uB3D9\uC77C \uACBD\uACC4" : distance.kind === "touching" ? "\uB9DE\uB2FF\uC74C" : distance.kind === "overlap" ? "\uBC15\uC2A4 \uACB9\uCE68" : `\uAC00\uB85C ${number(distance.horizontal)} \xB7 \uC138\uB85C ${number(distance.vertical)} CSS px`;
        state.message = base + `
B \xB7 ${label(peer)} \xB7 ${kind}
\uCD95 \uC815\uB82C border-box \uACBD\uACC4 \uAE30\uC900 \xB7 margin/padding \uAC12 \uC544\uB2D8`;
        if (distance.insets) state.message += `
\uB0B4\uBD80 \uACBD\uACC4: \uC704 ${number(distance.insets.top)} \xB7 \uC624\uB978\uCABD ${number(distance.insets.right)} \xB7 \uC544\uB798 ${number(distance.insets.bottom)} \xB7 \uC67C\uCABD ${number(distance.insets.left)} CSS px`;
        info(anchor, a, peer, distance.kind === "separated" ? "\uAC70\uB9AC" : kind);
        const stamp = JSON.stringify([distance, innerWidth, innerHeight, hint.style.left, hint.style.top]);
        if (stamp === lastPaint) return;
        lastPaint = stamp;
        guides.replaceChildren();
        const occupied = [hint.getBoundingClientRect()];
        const tick = (x2, y2, vertical) => {
          const e = document.createElement("div");
          e.style.cssText = `position:fixed;left:${x2 - (vertical ? 3 : 0)}px;top:${y2 - (vertical ? 0 : 3)}px;width:${vertical ? 7 : 1}px;height:${vertical ? 1 : 7}px;background:#60758d;outline:1px solid #ffffff90;`;
          guides.append(e);
        };
        for (const line of distance.lines) {
          const vertical = line.x1 === line.x2;
          const stroke = document.createElement("div");
          stroke.style.cssText = `position:fixed;left:${Math.min(line.x1, line.x2)}px;top:${Math.min(line.y1, line.y2)}px;width:${Math.max(1, Math.abs(line.x2 - line.x1))}px;height:${Math.max(1, Math.abs(line.y2 - line.y1))}px;background:#60758d;outline:1px solid #ffffff90;pointer-events:none;`;
          guides.append(stroke);
          tick(line.x1, line.y1, vertical);
          tick(line.x2, line.y2, vertical);
          const text = document.createElement("div");
          text.dataset.measureLabel = "";
          const caption = distance.kind === "touching" ? vertical ? "\uC138\uB85C" : "\uAC00\uB85C" : line.label;
          text.textContent = `${caption} ${number(line.value)}`;
          text.style.cssText = 'position:fixed;box-sizing:border-box;width:max-content;max-width:calc(100vw - 8px);padding:2px 5px;border:1px solid #aeb9c7;border-radius:3px;background:#f7f9fc;color:#263444;font:500 11px/16px "Pretendard Variable",system-ui,sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:none;';
          guides.append(text);
          const w = text.offsetWidth, h = text.offsetHeight, cx = (line.x1 + line.x2) / 2, cy = (line.y1 + line.y2) / 2;
          const positions = vertical ? [[cx + 7, cy - h / 2], [cx - w - 7, cy - h / 2]] : [[cx - w / 2, cy - h - 6], [cx - w / 2, cy + 6]];
          for (let step = 1; step <= 8; step++) for (const side of [-1, 1]) positions.push([cx - w / 2, cy + side * step * (h + 4)]);
          let chosen = [4, 4], best = Infinity;
          for (const pos of positions) {
            const x2 = Math.max(4, Math.min(innerWidth - w - 4, pos[0])), y2 = Math.max(4, Math.min(innerHeight - h - 4, pos[1]));
            const overlap = occupied.reduce((n, r) => n + Math.max(0, Math.min(x2 + w + 3, r.right) - Math.max(x2 - 3, r.left)) * Math.max(0, Math.min(y2 + h + 3, r.bottom) - Math.max(y2 - 3, r.top)), 0);
            if (overlap < best) {
              best = overlap;
              chosen = [x2, y2];
            }
            if (!overlap) break;
          }
          text.style.left = chosen[0] + "px";
          text.style.top = chosen[1] + "px";
          occupied.push(text.getBoundingClientRect());
        }
      };
      let paintedAt = 0;
      const animate = () => {
        if (state.pinned) {
          const now = performance.now();
          if (now - paintedAt >= 100) {
            pinPaint();
            paintedAt = now;
          }
          frame = requestAnimationFrame(animate);
        }
      };
      const keyup = (e) => {
        if (!state.pinned) return;
        if (e.key === "Alt") {
          if (altGesture && usedAlt && e.cancelable && document.hasFocus() && !editable(e.target) && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.getModifierState("AltGraph")) e.preventDefault();
          altGesture = usedAlt = false;
        }
        if (!altOnly(e) || e.key === "Alt") {
          clearDistance();
          pinPaint();
        }
      };
      const focus = () => {
        if (state.pinned) pinPaint();
      };
      const blur = () => {
        altGesture = usedAlt = false;
        clearDistance();
        if (state.pinned) pinPaint();
      };
      const leave = (e) => {
        if (e.relatedTarget instanceof Element && e.relatedTarget.tagName === "IFRAME") {
          if (state.active) {
            x = e.clientX;
            y = e.clientY;
            source = target = void 0;
            overlay.style.pointerEvents = "auto";
            paint("\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uB300\uC0C1: iframe \uB0B4\uBD80 \xB7 Elements\uC5D0\uC11C \uC9C1\uC811 \uC120\uD0DD\uD558\uC138\uC694.");
          } else blur();
        } else if (!e.relatedTarget) blur();
      };
      let target, source;
      const children = /* @__PURE__ */ new WeakMap();
      let x = -1, y = -1;
      const block = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      const supported = (el) => Boolean(el?.isConnected && el !== overlay && !el.closest("[data-figcheck-picker],[data-figcheck-pin]") && el.getRootNode() === document && el.tagName !== "IFRAME" && el.namespaceURI === "http://www.w3.org/1999/xhtml");
      const label = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id.slice(0, 60) : ""}`;
      const paint = (note = "") => {
        if (!supported(target)) {
          target = void 0;
          box2.style.display = "none";
          state.message = note || "\uB300\uC0C1\uC774 \uC0AC\uB77C\uC84C\uC5B4\uC694. \uD3EC\uC778\uD130\uB97C \uB2E4\uB978 \uC694\uC18C\uB85C \uC774\uB3D9\uD558\uC138\uC694.";
        } else {
          const r = target.getBoundingClientRect();
          box2.style.display = "block";
          box2.style.left = r.left + "px";
          box2.style.top = r.top + "px";
          box2.style.width = r.width + "px";
          box2.style.height = r.height + "px";
          const path2 = [];
          let el = target;
          for (let i = 0; el && i < 3; i++, el = el.parentElement) path2.unshift(label(el));
          state.message = `${path2.join(" \u203A ")}${note ? " \xB7 " + note : ""}
\u2191 \uBD80\uBAA8 / \u2193 \uC774\uC804 \uC790\uC2DD \xB7 \uD074\uB9AD/Enter \uC120\uD0DD \xB7 Esc \uCDE8\uC18C`;
        }
        hint.textContent = state.message;
      };
      const hit = () => {
        overlay.style.pointerEvents = "none";
        let first = null;
        try {
          first = document.elementFromPoint(x, y);
          if (first?.shadowRoot) first = first.shadowRoot.elementFromPoint(x, y);
          return supported(first) ? first : void 0;
        } finally {
          overlay.style.pointerEvents = !state.pinned && first?.tagName === "IFRAME" ? "auto" : "none";
        }
      };
      const move = (e) => {
        if (state.pinned) {
          x = e.clientX;
          y = e.clientY;
          altHeld = altOnly(e) && !editable(document.activeElement);
          pinPaint();
          return;
        }
        const moved = Math.hypot(e.clientX - x, e.clientY - y) >= 3;
        if (!moved && supported(target)) {
          paint();
          return;
        }
        x = e.clientX;
        y = e.clientY;
        const first = hit();
        if (!first) {
          source = target = void 0;
          paint("\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uB300\uC0C1: iframe \uB0B4\uBD80\xB7Shadow DOM \uB0B4\uBD80\xB7SVG \xB7 Elements\uC5D0\uC11C \uC9C1\uC811 \uC120\uD0DD\uD558\uC138\uC694.");
          return;
        }
        if (first !== source || !supported(target)) {
          source = target = first;
        }
        paint();
      };
      const depth = (up) => {
        if (!supported(target)) {
          paint();
          return;
        }
        let next;
        if (up) {
          const parent = target.parentElement;
          if (supported(parent)) {
            children.set(parent, target);
            next = parent;
          }
        } else {
          const remembered = children.get(target);
          if (supported(remembered) && remembered.parentElement === target) next = remembered;
          else {
            let child = hit();
            while (supported(child) && child !== target && child.parentElement !== target) child = child.parentElement ?? void 0;
            if (supported(child) && child.parentElement === target) next = child;
          }
        }
        if (next) {
          target = next;
          paint(up ? "\u2191 \uBD80\uBAA8" : "\u2193 \uC790\uC2DD");
        } else paint(up ? "\uCD5C\uC0C1\uC704 \uC694\uC18C" : "\uC774 \uACBD\uB85C\uC758 \uB354 \uAE4A\uC740 \uC790\uC2DD \uC5C6\uC74C");
      };
      const confirm = () => {
        if (!target) return;
        if (!supported(target)) {
          paint();
          return;
        }
        state.selected = target;
        ++state.sequence;
        state.active = false;
        state.pinned = true;
        overlay.removeAttribute("data-figcheck-picker");
        overlay.setAttribute("data-figcheck-pin", "");
        overlay.style.pointerEvents = "none";
        overlay.style.cursor = "default";
        window.removeEventListener("click", choose, true);
        for (const event of ["pointerdown", "pointerup", "mousedown", "mouseup", "contextmenu"]) window.removeEventListener(event, block, true);
        clearDistance();
        pinPaint();
        frame = requestAnimationFrame(animate);
      };
      const choose = (e) => {
        block(e);
        if (x < 0) move(e);
        confirm();
      };
      const keydown = (e) => {
        if (e.key === "Escape") {
          block(e);
          state.message = state.pinned ? "\uACE0\uC815 \uD45C\uC2DC\uB97C \uC885\uB8CC\uD588\uC5B4\uC694. \uAE30\uC874 \uBE44\uAD50\uB294 \uC720\uC9C0\uD569\uB2C8\uB2E4." : "\uC120\uD0DD\uC744 \uCDE8\uC18C\uD588\uC5B4\uC694. \uAE30\uC874 \uBE44\uAD50\uB294 \uC720\uC9C0\uD569\uB2C8\uB2E4.";
          state.cleanup();
          return;
        }
        if (state.pinned) {
          if (e.isComposing || editable(e.target)) {
            altGesture = usedAlt = false;
            clearDistance();
            return;
          }
          if (e.key === "Alt" && altOnly(e) && !e.repeat) {
            altGesture = true;
            usedAlt = false;
          } else if (e.key !== "Alt") altGesture = usedAlt = false;
          altHeld = altOnly(e);
          pinPaint();
          return;
        }
        const el = e.target;
        if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || el instanceof HTMLElement && (el.isContentEditable || el.closest('input,textarea,select,[role="textbox"]'))) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          block(e);
          if (!e.repeat) depth(e.key === "ArrowUp");
        } else if (e.key === "Enter") {
          block(e);
          if (!e.repeat) confirm();
        }
      };
      const viewport = () => {
        if (state.pinned) pinPaint();
        else if (target) paint();
      };
      const hide = () => {
        if (document.hidden) {
          state.message = "\uD0ED \uC774\uB3D9\uC73C\uB85C \uC120\uD0DD\uC744 \uCDE8\uC18C\uD588\uC5B4\uC694.";
          state.cleanup();
        }
      };
      const timers = setInterval(() => {
        if (state.pinned) pinPaint();
        else if (target && !supported(target)) paint();
        if (Date.now() - state.lease > 1500) {
          state.message = "\uD328\uB110 \uC5F0\uACB0\uC774 \uB05D\uB098 \uC120\uD0DD\uC744 \uCDE8\uC18C\uD588\uC5B4\uC694.";
          state.cleanup();
          if (host[key] === state) delete host[key];
        }
      }, 250);
      state.cleanup = () => {
        state.active = false;
        state.pinned = false;
        clearDistance();
        cancelAnimationFrame(frame);
        clearInterval(timers);
        overlay.remove();
        window.removeEventListener("keyup", keyup, true);
        window.removeEventListener("blur", blur);
        window.removeEventListener("focus", focus);
        window.removeEventListener("mouseout", leave, true);
        window.removeEventListener("mousemove", move, true);
        window.removeEventListener("click", choose, true);
        for (const event of ["pointerdown", "pointerup", "mousedown", "mouseup", "contextmenu"]) window.removeEventListener(event, block, true);
        window.removeEventListener("keydown", keydown, true);
        document.removeEventListener("visibilitychange", hide);
        window.removeEventListener("pagehide", state.cleanup);
        window.removeEventListener("scroll", viewport, true);
        window.removeEventListener("resize", viewport);
      };
      window.addEventListener("keyup", keyup, true);
      window.addEventListener("blur", blur);
      window.addEventListener("focus", focus);
      window.addEventListener("mouseout", leave, true);
      window.addEventListener("mousemove", move, true);
      window.addEventListener("click", choose, true);
      for (const event of ["pointerdown", "pointerup", "mousedown", "mouseup", "contextmenu"]) window.addEventListener(event, block, true);
      window.addEventListener("keydown", keydown, true);
      document.addEventListener("visibilitychange", hide);
      window.addEventListener("pagehide", state.cleanup);
      window.addEventListener("scroll", viewport, true);
      window.addEventListener("resize", viewport);
    }
    if (s && op === "pulse") s.lease = Date.now();
    return { pinned: s?.pinned === true, active: s?.active ?? false, sequence: s?.sequence ?? 0, message: s?.message ?? "", selected: Boolean(s?.selected?.isConnected) };
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
        state = { ...state, active: false, pinned: false };
        origin = void 0;
      }
      return new Promise((resolve) => chrome.devtools.inspectedWindow.eval(`(${pagePicker.toString()})(${JSON.stringify(op)},${JSON.stringify(token)},${current},${measureBoxes.toString()},${compactBox.toString()},${JSON.stringify(icons)})`, (value, error) => {
        if (current !== epoch) {
          resolve(state);
          return;
        }
        const v = value;
        if (error?.isException || error?.isError || !v || typeof v.active !== "boolean" || !Number.isSafeInteger(v.sequence) || typeof v.message !== "string") {
          state = { token, active: false, sequence: 0, selected: false, message: "\uC774 \uD398\uC774\uC9C0\uC5D0\uC11C \uC694\uC18C \uC120\uD0DD\uC744 \uC2E4\uD589\uD560 \uC218 \uC5C6\uC5B4\uC694. \uC77C\uBC18 \uC6F9\uD398\uC774\uC9C0\uC5D0\uC11C \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." };
        } else state = { token, active: v.active, pinned: v.pinned === true, sequence: v.sequence, selected: v.selected === true, message: message ?? v.message.slice(0, 500), forget: op === "clear" };
        if (!state.active) origin = void 0;
        publish(state);
        resolve(state);
      }));
    }
    const timer = setInterval(() => {
      if (state.active || state.pinned) void action("pulse");
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
        if (origin === "button" || state.pinned) void action("stop");
      },
      refresh: () => publish(state),
      dispose: () => {
        clearInterval(timer);
        void action("clear");
      }
    };
  }

  // apps/chrome-extension/src/devtools.ts
  chrome.devtools.panels.create("FigCheck \u21C4", "icons/icon-32.png", "panel.html", (panel) => {
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
