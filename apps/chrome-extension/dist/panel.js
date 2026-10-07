"use strict";
(() => {
  // apps/chrome-extension/src/selection-fingerprint.ts
  function selectionFingerprint(selected) {
    if (!selected || typeof selected !== "object" || !("nodeType" in selected) || selected.nodeType !== 1) return "missing";
    const node = selected;
    if (!node.isConnected) return "missing";
    const win = node.ownerDocument.defaultView;
    if (!win) return "missing";
    const s = win.getComputedStyle(node), r = node.getBoundingClientRect();
    const properties = Array.from(s).filter((k) => /^(width|height|box-|overflow|scrollbar|padding|row-gap|column-gap|display|font-|line-height|letter-spacing|color|background|border|opacity|transform|zoom|text-shadow|filter|backdrop-filter|mix-blend-mode)$|^(box-|overflow-|scrollbar-|padding-|border-|font-|background-)/.test(k));
    const values = properties.map((k) => s.getPropertyValue(k));
    const ancestry = [];
    for (let n = node, depth = 0; n && depth < 64; n = n.parentElement ?? (n.getRootNode() instanceof win.ShadowRoot ? n.getRootNode().host : null), depth++) {
      const c = win.getComputedStyle(n);
      ancestry.push([c.transform, c.rotate, c.scale, c.translate, c.zoom, c.filter, c.backdropFilter, c.mixBlendMode]);
    }
    return JSON.stringify([node.tagName, node.id, node.className, node.getAttribute("style"), node.childElementCount, Array.from(node.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim()), win.getComputedStyle(node, "::before").content, win.getComputedStyle(node, "::after").content, r.width, r.height, node.getClientRects().length, values, ancestry]);
  }

  // packages/ui/action-icon.ts
  var paths = {
    copy: "M9 9h11v12H9z M16 9V3H3v13h6",
    check: "M5 12l4 4L19 6",
    save: "M12 3v12m-5-5 5 5 5-5 M4 17v4h16v-4",
    import: "M14 3H5v18h14V8l-5-5 M14 3v5h5 M8 14h8m-3-3 3 3-3 3",
    clipboard: "M9 4H5v17h14V4h-4 M9 2h6v4H9z M8 11h8 M8 15h6",
    select: "M4 3l5 16 3-6 6-3-14-7 M17 3h4v4 M21 15v6h-6",
    refresh: "M20 7V3l-4 4 M20 7a8 8 0 1 0 0 10",
    cancel: "M5 5l14 14 M19 5 5 19",
    clear: "M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
    json: "M8 5H5v14h3 M16 5h3v14h-3 M13 8l-2 8",
    help: "M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20"
  };
  function actionIcon(action) {
    const ns = "http://www.w3.org/2000/svg", svg2 = document.createElementNS(ns, "svg");
    svg2.setAttribute("viewBox", "0 0 24 24");
    svg2.setAttribute("aria-hidden", "true");
    svg2.setAttribute("focusable", "false");
    svg2.setAttribute("class", "action-icon");
    svg2.dataset.actionIcon = action;
    const path2 = document.createElementNS(ns, "path");
    path2.setAttribute("d", paths[action]);
    svg2.append(path2);
    return svg2;
  }
  function setAction(button, action, text2 = button.textContent, title = text2) {
    button.classList.add("action-control");
    button.title = title;
    button.replaceChildren(actionIcon(action), document.createTextNode(text2));
  }

  // packages/ui/color.ts
  function isColorFormat(value) {
    return value === "hex" || value === "rgb" || value === "hsl";
  }
  var decimal = (value, digits) => value !== 0 && Math.abs(value) < 10 ** -digits ? String(Number(value.toPrecision(3))) : String(Number(value.toFixed(digits)));
  function formatColor(rgba3, format) {
    if (rgba3.length !== 4 || rgba3.some((v, i) => !Number.isFinite(v) || v < 0 || v > (i === 3 ? 1 : 255))) return "\uAC12 \uC624\uB958";
    const [red, green, blue, alpha] = rgba3;
    if (format === "hex") {
      const hex = (value) => Math.round(value).toString(16).padStart(2, "0").toUpperCase();
      return "#" + [red, green, blue].map(hex).join("") + (alpha === 1 ? "" : hex(alpha * 255));
    }
    if (format === "rgb") return `${alpha === 1 ? "rgb" : "rgba"}(${[red, green, blue].map((v) => decimal(v, 3)).join(", ")}${alpha === 1 ? "" : ", " + decimal(alpha, 6)})`;
    const [r, g, b] = [red, green, blue].map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, l = (max + min) / 2;
    let h = 0, s = 0;
    if (delta !== 0) {
      s = delta / (l <= 0.5 ? max + min : 1 - max + (1 - min));
      h = (max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60;
      h = (h + 360) % 360;
    }
    const hue = Math.round(h * 1e3) / 1e3 % 360;
    return `${alpha === 1 ? "hsl" : "hsla"}(${decimal(hue, 3)}, ${decimal(s * 100, 3)}%, ${decimal(l * 100, 3)}%${alpha === 1 ? "" : ", " + decimal(alpha, 6)})`;
  }

  // packages/ui/color-display.ts
  var current = "rgb";
  var currentColorFormat = () => current;
  function update(node, rgba3) {
    const text2 = formatColor(rgba3, current);
    if (node.classList.contains("color-value")) node.textContent = text2;
    node.title = text2 + " \xB7 \uC6D0\uBCF8 RGBA " + JSON.stringify(rgba3);
  }
  function bindColor(node, rgba3) {
    node.dataset.rgba = JSON.stringify(rgba3);
    update(node, rgba3);
  }
  function colorValue(rgba3) {
    const span = document.createElement("span");
    span.className = "color-value";
    bindColor(span, rgba3);
    return span;
  }
  function initializeColorFormat(save) {
    let revision = 0;
    const select = document.getElementById("color-format");
    const feedback = document.getElementById("color-feedback");
    function apply(format) {
      current = format;
      select.value = format;
      for (const node of Array.from(document.querySelectorAll("[data-rgba]"))) {
        const value = JSON.parse(node.dataset.rgba);
        if (Array.isArray(value) && value.every((v) => typeof v === "number")) update(node, value);
      }
    }
    apply("rgb");
    select.onchange = () => {
      if (!isColorFormat(select.value)) return;
      apply(select.value);
      feedback.textContent = "";
      save(select.value, ++revision);
    };
    return { restore(value) {
      if (revision === 0 && isColorFormat(value)) apply(value);
    }, saved(savedRevision, failed) {
      if (savedRevision === revision) feedback.textContent = failed ? "\uC0C9\uC0C1 \uD45C\uAE30\uB97C \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC774\uBC88 \uCC3D\uC5D0\uB294 \uC801\uC6A9\uB3FC\uC694." : "";
    } };
  }

  // packages/ui/theme.ts
  function isTheme(value) {
    return value === "light" || value === "dark";
  }
  function initializeTheme(initial, save) {
    let revision = 0;
    const buttons = Array.from(document.querySelectorAll("[data-theme-toggle]"));
    const feedback = document.getElementById("theme-feedback");
    function apply(theme2) {
      document.documentElement.dataset.theme = theme2;
      for (const button of buttons) {
        const dark = theme2 === "dark";
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-theme-icon="' + (dark ? "moon" : "sun") + '">' + (dark ? '<path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5a8.5 8.5 0 1 0 9.7 9.7Z"/>' : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>') + "</svg>";
        button.setAttribute("aria-pressed", String(dark));
        const description = dark ? "\uD604\uC7AC \uB2E4\uD06C \xB7 \uB77C\uC774\uD2B8\uB85C \uC804\uD658" : "\uD604\uC7AC \uB77C\uC774\uD2B8 \xB7 \uB2E4\uD06C\uB85C \uC804\uD658";
        button.setAttribute("aria-label", description);
        button.title = description;
      }
    }
    apply(initial);
    for (const button of buttons) button.onclick = () => {
      const theme2 = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      apply(theme2);
      feedback.textContent = "";
      save(theme2, ++revision);
    };
    return {
      restore(value) {
        if (revision === 0 && isTheme(value)) apply(value);
      },
      saved(savedRevision, failed) {
        if (savedRevision === revision) feedback.textContent = failed ? "\uD14C\uB9C8\uB97C \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC774\uBC88 \uCC3D\uC5D0\uB294 \uC801\uC6A9\uB3FC\uC694." : "";
      }
    };
  }

  // packages/ui/properties.ts
  var labels = {
    width: "\uB108\uBE44",
    height: "\uB192\uC774",
    paddingTop: "\uC0C1\uB2E8 \uB0B4\uBD80 \uC5EC\uBC31",
    paddingRight: "\uC6B0\uCE21 \uB0B4\uBD80 \uC5EC\uBC31",
    paddingBottom: "\uD558\uB2E8 \uB0B4\uBD80 \uC5EC\uBC31",
    paddingLeft: "\uC88C\uCE21 \uB0B4\uBD80 \uC5EC\uBC31",
    rowGap: "\uD589 \uC0AC\uC774 \uAC04\uACA9",
    columnGap: "\uC5F4 \uC0AC\uC774 \uAC04\uACA9",
    fontFamily: "\uAE00\uAF34",
    fontSize: "\uAE00\uC790 \uD06C\uAE30",
    fontWeight: "\uAE00\uC790 \uAD75\uAE30",
    lineHeight: "\uC904 \uB192\uC774",
    letterSpacing: "\uAE00\uC790 \uAC04\uACA9",
    textColor: "\uAE00\uC790 \uC0C9",
    backgroundColor: "\uBC30\uACBD \uC0C9",
    borderTopWidth: "\uC0C1\uB2E8 \uD14C\uB450\uB9AC \uB450\uAED8",
    borderRightWidth: "\uC6B0\uCE21 \uD14C\uB450\uB9AC \uB450\uAED8",
    borderBottomWidth: "\uD558\uB2E8 \uD14C\uB450\uB9AC \uB450\uAED8",
    borderLeftWidth: "\uC88C\uCE21 \uD14C\uB450\uB9AC \uB450\uAED8",
    borderTopColor: "\uC0C1\uB2E8 \uD14C\uB450\uB9AC \uC0C9",
    borderRightColor: "\uC6B0\uCE21 \uD14C\uB450\uB9AC \uC0C9",
    borderBottomColor: "\uD558\uB2E8 \uD14C\uB450\uB9AC \uC0C9",
    borderLeftColor: "\uC88C\uCE21 \uD14C\uB450\uB9AC \uC0C9",
    radiusTopLeft: "\uC88C\uCE21 \uC0C1\uB2E8 \uBAA8\uC11C\uB9AC",
    radiusTopRight: "\uC6B0\uCE21 \uC0C1\uB2E8 \uBAA8\uC11C\uB9AC",
    radiusBottomRight: "\uC6B0\uCE21 \uD558\uB2E8 \uBAA8\uC11C\uB9AC",
    radiusBottomLeft: "\uC88C\uCE21 \uD558\uB2E8 \uBAA8\uC11C\uB9AC",
    opacity: "\uC694\uC18C \uD22C\uBA85\uB3C4"
  };
  var categoryLabels = { size: "\uD06C\uAE30", spacing: "\uC5EC\uBC31\uACFC \uAC04\uACA9", typography: "\uAE00\uAF34", color: "\uC0C9\uC0C1", border: "\uD14C\uB450\uB9AC\uC640 \uBAA8\uC11C\uB9AC", appearance: "\uD22C\uBA85\uB3C4" };

  // packages/ui/help.ts
  function initializeDialog(name) {
    const trigger = document.getElementById(name + "-button");
    const dialog = document.getElementById(name + "-dialog");
    const close = document.getElementById(name + "-close");
    function restore() {
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
    function dismiss() {
      dialog.close();
      restore();
    }
    dialog.addEventListener("close", () => trigger.setAttribute("aria-expanded", "false"));
    trigger.onclick = () => {
      for (const other of Array.from(document.querySelectorAll("dialog[open]"))) if (other !== dialog) other.close();
      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
      trigger.setAttribute("aria-expanded", "true");
      close.focus();
    };
    close.onclick = dismiss;
    if (name === "settings") {
      let startedOutside = false;
      const outside = (e) => {
        const r = dialog.getBoundingClientRect();
        return e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
      };
      dialog.addEventListener("pointerdown", (e) => {
        startedOutside = outside(e);
      });
      dialog.addEventListener("pointerup", (e) => {
        if (startedOutside && outside(e)) dismiss();
        startedOutside = false;
      });
    }
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      dismiss();
    });
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        dismiss();
      }
      if (e.key === "Tab") {
        const items = Array.from(dialog.querySelectorAll("button,a[href],input,textarea,select,summary")).filter((el3) => el3.getClientRects().length > 0 && !el3.disabled);
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }, true);
  }
  function initializeHelp() {
    initializeDialog("help");
  }
  function initializeSettings() {
    initializeDialog("settings");
  }

  // packages/ui/format.ts
  function formatNumber(value) {
    if (!Number.isFinite(value)) return "\uAC12 \uBBF8\uD655\uC778";
    if (value === 0) return "0";
    if (Math.abs(value) < 1e-3) return String(Number(value.toPrecision(3)));
    return String(Number(value.toFixed(3)));
  }
  function valueText(v) {
    if (v.status !== "supported") return v.status === "unsupported" ? "\uBBF8\uC9C0\uC6D0" : "\uAC12 \uBBF8\uD655\uC778";
    if (v.kind === "rgba") return formatColor(v.value, currentColorFormat());
    return `${typeof v.value === "number" ? formatNumber(v.value) : v.value}${v.kind === "px" ? " px" : ""}`;
  }
  var signed = (v) => `${v > 0 ? "+" : ""}${formatNumber(v)}`;
  function deltaText(row) {
    if (row.delta === void 0) return "\uAC12 \uB2E4\uB984";
    if (Array.isArray(row.delta)) return row.delta.map((v, i) => `${["R", "G", "B", "\u03B1"][i]} ${signed(v)}`).join(", ");
    return `${signed(row.delta)}${row.actual.status === "supported" && row.actual.kind === "px" ? "px" : ""}`;
  }
  function direction(row) {
    if (Array.isArray(row.delta)) return "sRGB \uCC44\uB110\uBCC4 \uCC28\uC774 (\uC6F9 \u2212 \uB514\uC790\uC778)";
    if (typeof row.delta !== "number" || row.delta === 0) return "\uB514\uC790\uC778\uACFC \uC6F9\uC758 \uAC12\uC774 \uB2E4\uB985\uB2C8\uB2E4.";
    const unit = row.actual.status === "supported" && row.actual.kind === "px" ? "px" : "";
    return `\uC6F9 \uAC12\uC774 ${formatNumber(Math.abs(row.delta))}${unit} ${row.delta > 0 ? "\uB354 \uD07D\uB2C8\uB2E4" : "\uB354 \uC791\uC2B5\uB2C8\uB2E4"}.`;
  }
  function exclusionLabel(row) {
    if (row.exclusion === "user") return "\uC0AC\uC6A9\uC790 \uC81C\uC678";
    if (row.expected.status === "unsupported" || row.actual.status === "unsupported") return "\uBBF8\uC9C0\uC6D0";
    if (row.expected.status === "unknown" || row.actual.status === "unknown") return "\uAC12 \uBBF8\uD655\uC778";
    return "\uAC12 \uC624\uB958";
  }

  // packages/ui/shadow-view.ts
  var el = (tag, text2) => {
    const n = document.createElement(tag);
    if (text2 !== void 0) n.textContent = text2;
    return n;
  };
  function heading() {
    const h = el("h3");
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.style.cssText = "width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.5;vertical-align:middle;margin-right:6px";
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M4 4h12v12H4z M8 19h11V8");
    icon.append(p);
    h.append(icon, document.createTextNode("\uADF8\uB9BC\uC790"));
    return h;
  }
  function layerCell(layer) {
    const cell = el("td");
    cell.className = "shadow-value";
    if (!layer) {
      cell.textContent = "\uC5C6\uC74C";
      return cell;
    }
    cell.append(el("span", `${layer.inset ? "\uB0B4\uBD80" : "\uC678\uBD80"} ${layer.index + 1}`), el("div", `X ${formatNumber(layer.x)} \xB7 Y ${formatNumber(layer.y)} \xB7 Blur ${formatNumber(layer.blur)} \xB7 Spread ${formatNumber(layer.spread)} px`));
    const pair = el("span");
    pair.className = "color-cell";
    const swatch = el("span");
    swatch.className = "swatch";
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.backgroundColor = `rgba(${layer.color.join(",")})`;
    bindColor(swatch, layer.color);
    pair.append(swatch, colorValue(layer.color));
    cell.append(pair);
    return cell;
  }
  function shadowDetails(s) {
    const d = el("details");
    d.className = "shadow-details";
    d.append(el("summary", "\uADF8\uB9BC\uC790 \xB7 \uCD94\uAC00 \uC815\uBCF4"), el("p", s.reason ?? "Figma \uC6D0\uBCF8 effects \uBC0F CSS \uB300\uC751 \uADFC\uAC70"), el("pre", JSON.stringify({ effects: s.effects, css: s.css, mapping: s.mapping }, null, 2)));
    return d;
  }
  function shadowComparison(c) {
    const section = el("section");
    section.className = "shadow-section";
    section.id = "shadow-comparison";
    section.append(heading());
    if (c.status === "excluded") {
      section.append(el("p", c.reason));
      return section;
    }
    section.append(el("p", `${c.total.score?.toFixed(1)}% \xB7 \uADF8\uB9BC\uC790 \uADDC\uACA9 \uC77C\uCE58`));
    if (!c.rows.length) section.append(el("p", "\uB514\uC790\uC778\xB7\uC6F9 \uBAA8\uB450 \uC5C6\uC74C"));
    for (const r of c.rows) {
      const table = el("table");
      table.className = "shadow-table property-table";
      const caption = el("caption", r.status === "match" ? "\uC77C\uCE58" : r.status === "added" ? "\uC6F9\uC5D0 \uCD94\uAC00" : r.status === "missing" ? "\uC6F9\uC5D0\uC11C \uB204\uB77D" : "\uAC12 \uCC28\uC774");
      const head = el("tr");
      head.append(el("th", "\uB514\uC790\uC778"), el("th", "\uC6F9"));
      const row = el("tr"), expected = layerCell(r.expected), actual = layerCell(r.actual);
      expected.dataset.label = "\uB514\uC790\uC778";
      actual.dataset.label = "\uC6F9";
      row.append(expected, actual);
      for (const th of Array.from(head.children)) th.setAttribute("scope", "col");
      const thead = el("thead"), tbody = el("tbody");
      thead.append(head);
      tbody.append(row);
      table.append(caption, thead, tbody);
      section.append(table);
      if (r.delta && r.status === "mismatch") section.append(el("p", `\uC6F9 \u2212 \uB514\uC790\uC778: X ${formatNumber(r.delta.x)} \xB7 Y ${formatNumber(r.delta.y)} \xB7 Blur ${formatNumber(r.delta.blur)} \xB7 Spread ${formatNumber(r.delta.spread)} px \xB7 RGBA ${r.delta.color.map(formatNumber).join(", ")}`));
    }
    section.append(el("p", c.note));
    return section;
  }

  // packages/ui/view-icon.ts
  function viewIcon(kind) {
    const ns = "http://www.w3.org/2000/svg", svg2 = document.createElementNS(ns, "svg");
    for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" })) svg2.setAttribute(k, v);
    const add = (tag, attrs) => {
      const n = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      svg2.append(n);
    };
    if (kind === "web") {
      add("circle", { cx: "12", cy: "12", r: "9" });
      add("path", { d: "M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18" });
    } else {
      add("path", { d: "M9 3H6a3 3 0 0 0 0 6h3ZM9 3h3a3 3 0 1 1 0 6H9ZM9 9H6a3 3 0 1 0 0 6h3ZM9 15H6a3 3 0 1 0 3 3Z" });
      add("circle", { cx: "12", cy: "12", r: "3" });
    }
    return svg2;
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
  function propertyIcon(key) {
    const ns = "http://www.w3.org/2000/svg", svg2 = document.createElementNS(ns, "svg");
    svg2.classList.add("property-icon");
    svg2.dataset.key = key;
    for (const [name, value] of Object.entries({ viewBox: "0 0 16 16", width: "16", height: "16", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" })) svg2.setAttribute(name, value);
    for (const shape of icons[key]) {
      const node = document.createElementNS(ns, shape.tag);
      for (const [name, value] of Object.entries(shape.attrs)) node.setAttribute(name, value);
      if (shape.muted) node.setAttribute("opacity", ".3");
      else node.setAttribute("data-emphasis", "true");
      svg2.append(node);
    }
    return svg2;
  }
  function propertyLabel(key) {
    const wrap = document.createElement("span");
    wrap.className = "property-label";
    const text2 = document.createElement("span");
    text2.className = "property-label-text";
    text2.textContent = labels[key];
    wrap.append(propertyIcon(key), text2);
    return wrap;
  }

  // packages/core/src/shadows.ts
  var shadowUnavailable = (reason, status2 = "unsupported") => ({ version: 1, status: status2, layers: [], reason });
  var missingShadows = () => shadowUnavailable("\uADF8\uB9BC\uC790 \uBBF8\uC218\uC9D1: \uC774\uC804 JSON \uB610\uB294 API \uADFC\uAC70 \uC5C6\uC74C", "unknown");
  var record = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
  var num = (x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) <= 1e7;
  var rgba = (x) => Array.isArray(x) && x.length === 4 && x.every((n, i) => num(n) && n >= 0 && n <= (i === 3 ? 1 : 255));
  function requireValue(ok) {
    if (!ok) throw new Error("\uADF8\uB9BC\uC790 \uC2A4\uD0A4\uB9C8/\uAC12 \uC624\uB958");
  }
  function fields(x, allowed) {
    requireValue(Object.keys(x).every((k) => allowed.includes(k)));
  }
  var text = (x) => typeof x === "string" && x.length > 0 && x.length <= 8192;
  function validateShadows(value) {
    requireValue(record(value));
    fields(value, ["version", "status", "layers", "reason", "css", "effects", "mapping"]);
    requireValue(value.version === 1 && ["supported", "unsupported", "unknown"].includes(String(value.status)));
    requireValue(Array.isArray(value.layers) && value.layers.length <= 32);
    if (value.status !== "supported") requireValue(text(value.reason));
    if ("reason" in value) requireValue(text(value.reason));
    if ("css" in value) requireValue(text(value.css));
    if ("mapping" in value) requireValue(value.mapping === "computed" || value.mapping === "getCSSAsync");
    value.layers.forEach((l, i) => {
      requireValue(record(l));
      fields(l, ["index", "effectIndex", "inset", "x", "y", "blur", "spread", "color"]);
      requireValue(l.index === i && typeof l.inset === "boolean" && num(l.x) && num(l.y) && num(l.blur) && Number(l.blur) >= 0 && num(l.spread) && rgba(l.color));
      if ("effectIndex" in l) requireValue(Number.isInteger(l.effectIndex) && Number(l.effectIndex) >= 0 && Number(l.effectIndex) < 64);
    });
    if ("effects" in value) {
      requireValue(Array.isArray(value.effects) && value.effects.length <= 64);
      value.effects.forEach((e, i) => {
        requireValue(record(e));
        fields(e, ["index", "type", "visible", "x", "y", "radius", "spread", "color", "blendMode", "showShadowBehindNode"]);
        requireValue(e.index === i && text(e.type) && typeof e.visible === "boolean");
        for (const k of ["x", "y", "radius", "spread"]) if (k in e) requireValue(num(e[k]) && (k !== "radius" || Number(e[k]) >= 0));
        if ("color" in e) requireValue(rgba(e.color));
        if ("blendMode" in e) requireValue(text(e.blendMode));
        if ("showShadowBehindNode" in e) requireValue(typeof e.showShadowBehindNode === "boolean");
      });
    }
  }
  function split(input, space = false) {
    let depth = 0, current2 = "";
    const result = [];
    for (const ch of input) {
      if (ch === "(") depth++;
      if (ch === ")" && --depth < 0) throw Error("\uAD04\uD638 \uC624\uB958");
      if (depth === 0 && (space ? /\s/.test(ch) : ch === ",")) {
        if (current2.trim()) result.push(current2.trim());
        else if (!space) throw Error("\uBE48 \uB808\uC774\uC5B4");
        current2 = "";
      } else current2 += ch;
    }
    if (depth !== 0 || !space && !current2.trim()) throw Error("\uAD04\uD638/\uB808\uC774\uC5B4 \uC624\uB958");
    if (current2.trim()) result.push(current2.trim());
    return result;
  }
  function color(input) {
    const s = input.toLowerCase();
    if (s === "transparent") return [0, 0, 0, 0];
    if (s === "black") return [0, 0, 0, 1];
    if (s === "white") return [255, 255, 255, 1];
    if (/^#[\da-f]{3,8}$/.test(s)) {
      let h = s.slice(1);
      if (h.length === 3 || h.length === 4) h = [...h].map((c2) => c2 + c2).join("");
      if (h.length !== 6 && h.length !== 8) return;
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
    }
    const m = /^(rgb|rgba|hsl|hsla)\((.*)\)$/.exec(s);
    if (!m) return;
    const tokens = m[2].trim().split(/[\s,/]+/);
    if (tokens.length < 3 || tokens.length > 4) return;
    const numeric = (v, max) => v.endsWith("%") ? Number(v.slice(0, -1)) * max / 100 : Number(v);
    const a = tokens[3] === void 0 ? 1 : numeric(tokens[3], 1);
    let c;
    if (m[1].startsWith("rgb")) c = [numeric(tokens[0], 255), numeric(tokens[1], 255), numeric(tokens[2], 255), a];
    else {
      if (!tokens[1].endsWith("%") || !tokens[2].endsWith("%") || !/^[-+\d.]+(?:deg)?$/.test(tokens[0])) return;
      const h = (Number(tokens[0].replace("deg", "")) % 360 + 360) % 360 / 60, sat = numeric(tokens[1], 1), l = numeric(tokens[2], 1);
      if (sat < 0 || sat > 1 || l < 0 || l > 1) return;
      const chroma = (1 - Math.abs(2 * l - 1)) * sat, x = chroma * (1 - Math.abs(h % 2 - 1)), v = l - chroma / 2;
      const rgb = h < 1 ? [chroma, x, 0] : h < 2 ? [x, chroma, 0] : h < 3 ? [0, chroma, x] : h < 4 ? [0, x, chroma] : h < 5 ? [x, 0, chroma] : [chroma, 0, x];
      c = [(rgb[0] + v) * 255, (rgb[1] + v) * 255, (rgb[2] + v) * 255, a];
    }
    return rgba(c) ? c : void 0;
  }
  function parseBoxShadows(css) {
    if (css === void 0 || !css.trim()) return missingShadows();
    if (css.length > 8192) return shadowUnavailable("box-shadow \uCD5C\uB300 \uAE38\uC774 \uCD08\uACFC");
    if (css.trim() === "none") return { version: 1, status: "supported", layers: [], css, mapping: "computed" };
    try {
      const parts = split(css);
      if (parts.length > 32) throw Error("\uCD5C\uB300 32\uAC1C \uB808\uC774\uC5B4");
      const layers = parts.map((part, index) => {
        let inset = false, rgbaValue;
        const lengths = [];
        for (const token of split(part, true)) {
          if (token === "inset") {
            if (inset) throw Error("\uC911\uBCF5 inset");
            inset = true;
            continue;
          }
          const c = color(token);
          if (c) {
            if (rgbaValue) throw Error("\uC911\uBCF5 \uC0C9");
            rgbaValue = c;
            continue;
          }
          if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:px)?$/.test(token) || !token.endsWith("px") && Number(token) !== 0) throw Error("px/rgb/hex/hsl\uB85C \uD655\uC815 \uBD88\uAC00");
          lengths.push(Number(token.replace("px", "")));
        }
        if (lengths.length < 2 || lengths.length > 4 || !rgbaValue) throw Error("\uBA85\uC2DC\uC801\uC778 \uC0C9\uACFC 2~4\uAC1C \uAE38\uC774 \uD544\uC694");
        const [x, y, blur = 0, spread = 0] = lengths;
        if (blur < 0 || !lengths.every(num)) throw Error("\uAE38\uC774 \uBC94\uC704");
        return { index, inset, x, y, blur, spread, color: rgbaValue };
      });
      const result = { version: 1, status: "supported", layers, css, mapping: "computed" };
      validateShadows(result);
      return result;
    } catch (e) {
      return { ...shadowUnavailable(`box-shadow \uD574\uC11D \uBBF8\uC9C0\uC6D0: ${e instanceof Error ? e.message : "\uAC12 \uC624\uB958"}`), css };
    }
  }
  var within = (d, t, e) => Math.abs(d) <= t + e;
  function equal(a, b, t) {
    return a.inset === b.inset && ["x", "y", "blur", "spread"].every((k) => within(b[k] - a[k], t.px, numericalEpsilon.px)) && a.color.every((v, i) => within(b.color[i] - v, i === 3 ? t.alpha : t.colorChannel, i === 3 ? numericalEpsilon.alpha : numericalEpsilon.colorChannel));
  }
  function compareShadows(expected, actual, t = normalTolerance, included2 = true) {
    const e = expected ?? missingShadows(), a = actual ?? missingShadows();
    const result = { expected: e, actual: a, status: "excluded", rows: [], total: { supported: 0, matched: 0, score: null }, note: "CSS \uADF8\uB9BC\uC790 \uC218\uCE58 \uBE44\uAD50 \xB7 \uC2DC\uAC01\uC801 \uC644\uC804 \uC77C\uCE58\uB97C \uBCF4\uC7A5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." };
    try {
      validateShadows(e);
      validateShadows(a);
      for (const key of ["px", "colorChannel", "alpha"]) if (!Number.isFinite(t[key]) || t[key] < 0 || t[key] > (key === "alpha" ? 1 : key === "colorChannel" ? 255 : 1e4)) throw Error();
    } catch {
      result.reason = "\uADF8\uB9BC\uC790 \uAC12/\uD5C8\uC6A9\uC624\uCC28 \uAC80\uC99D \uC2E4\uD328";
      return result;
    }
    if (!included2) {
      result.reason = "\uC0AC\uC6A9\uC790\uAC00 \uADF8\uB9BC\uC790\uB97C \uBE44\uAD50\uC5D0\uC11C \uC81C\uC678";
      return result;
    }
    if (e.status !== "supported" || a.status !== "supported") {
      result.reason = `\uB514\uC790\uC778: ${e.reason ?? "\uC218\uC9D1\uB428"} / \uC6F9: ${a.reason ?? "\uC218\uC9D1\uB428"}`;
      return result;
    }
    result.status = "supported";
    const n = e.layers.length, m = a.layers.length;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i2 = 0; i2 <= n; i2++) dp[i2][0] = i2;
    for (let j2 = 0; j2 <= m; j2++) dp[0][j2] = j2;
    const cost = (i2, j2) => e.layers[i2].inset !== a.layers[j2].inset ? 3 : equal(e.layers[i2], a.layers[j2], t) ? 0 : 1.5;
    for (let i2 = 1; i2 <= n; i2++) for (let j2 = 1; j2 <= m; j2++) dp[i2][j2] = Math.min(dp[i2 - 1][j2] + 1, dp[i2][j2 - 1] + 1, dp[i2 - 1][j2 - 1] + cost(i2 - 1, j2 - 1));
    let i = n, j = m;
    while (i || j) {
      if (i && j && dp[i][j] === dp[i - 1][j - 1] + cost(i - 1, j - 1)) {
        const expected2 = e.layers[--i], actual2 = a.layers[--j];
        result.rows.unshift({ expected: expected2, actual: actual2, status: equal(expected2, actual2, t) ? "match" : "mismatch", delta: { x: actual2.x - expected2.x, y: actual2.y - expected2.y, blur: actual2.blur - expected2.blur, spread: actual2.spread - expected2.spread, color: actual2.color.map((c, k) => c - expected2.color[k]) } });
      } else if (j && dp[i][j] === dp[i][j - 1] + 1) result.rows.unshift({ actual: a.layers[--j], status: "added" });
      else result.rows.unshift({ expected: e.layers[--i], status: "missing" });
    }
    const supported = result.rows.length || 1, matched = result.rows.length ? result.rows.filter((r) => r.status === "match").length : 1;
    result.total = { supported, matched, score: matched / supported * 100 };
    if (result.rows.some((r) => r.status === "added" || r.status === "missing")) result.note += " \uC21C\uC11C\uB97C \uBCF4\uC874\uD55C \uB300\uC751\uC774\uBA70 \uCD94\uAC00\xB7\uB204\uB77D \uB610\uB294 \uC7AC\uBC30\uCE58\uAC00 \uC788\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
    return result;
  }

  // packages/core/src/index.ts
  var VERSION = "1.0";
  var categories = {
    size: ["width", "height"],
    spacing: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "rowGap", "columnGap"],
    typography: ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"],
    color: ["textColor", "backgroundColor"],
    border: ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft"],
    appearance: ["opacity"]
  };
  var keys = Object.values(categories).flat();
  var unavailable = (reason, status2 = "unsupported") => ({ status: status2, reason });
  var numberValue = (value, kind = "px", note) => Number.isFinite(value) ? { status: "supported", kind, value, ...note ? { note } : {} } : unavailable("\uC720\uD55C\uD55C \uC22B\uC790\uAC00 \uC544\uB2D8", "unknown");
  var stringValue = (value, note) => ({ status: "supported", kind: "string", value, ...note ? { note } : {} });
  var colorValue2 = (value) => value.length === 4 && value.every((v, i) => Number.isFinite(v) && v >= 0 && v <= (i === 3 ? 1 : 255)) ? { status: "supported", kind: "rgba", value } : unavailable("\uC720\uD55C\uD55C sRGB RGBA \uBC94\uC704\uB97C \uBC97\uC5B4\uB0A8", "unknown");
  function emptyProperties(reason = "\uC774 \uB178\uB4DC\uC5D0\uC11C \uC18D\uC131\uC744 \uD655\uC778\uD560 \uC218 \uC5C6\uC74C") {
    return Object.fromEntries(keys.map((k) => [k, unavailable(reason, "unknown")]));
  }
  function kindFor(key) {
    if (key.endsWith("Color")) return "rgba";
    if (key === "fontFamily") return "string";
    if (key === "fontWeight" || key === "opacity") return "number";
    return "px";
  }
  var record2 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function boundedText(v, name) {
    assert(typeof v === "string" && v.length > 0 && v.length <= 2048, `${name}: 1~2048\uC790 \uBB38\uC790\uC5F4 \uD544\uC694`);
  }
  function exactKeys(v, allowed, path2) {
    assert(Object.keys(v).every((k) => allowed.includes(k)), `${path2}: \uC54C \uC218 \uC5C6\uB294 \uD0A4 \uB610\uB294 \uC704\uD5D8\uD55C \uD0A4`);
  }
  function validateProperties(v) {
    assert(record2(v), "properties \uAC1D\uCCB4 \uD544\uC694");
    exactKeys(v, keys, "properties");
    for (const key of keys) {
      const p = v[key];
      assert(record2(p), `${key}: \uBA85\uC2DC\uC801 status \uD544\uC694`);
      if (p.status === "supported") {
        exactKeys(p, ["status", "kind", "value", "note"], key);
        assert(p.kind === kindFor(key), `${key}: \uC18D\uC131\uC5D0 \uB9DE\uB294 kind \uD544\uC694`);
        if (p.kind === "rgba") assert(Array.isArray(p.value) && p.value.length === 4 && p.value.every((n, i) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= (i === 3 ? 1 : 255)), `${key}: RGBA \uBC94\uC704 \uC624\uB958`);
        else if (p.kind === "string") boundedText(p.value, key);
        else {
          assert(typeof p.value === "number" && Number.isFinite(p.value) && Math.abs(p.value) <= 1e7, `${key}: \uC720\uD55C\uD55C \uC22B\uC790 \uD544\uC694`);
          assert(key === "letterSpacing" || p.value >= 0, `${key}: \uC74C\uC218 \uBD88\uAC00`);
          if (key === "opacity") assert(p.value <= 1, "opacity \uBC94\uC704 0~1");
          if (key === "fontWeight") assert(p.value >= 1 && p.value <= 1e3, "fontWeight \uBC94\uC704 1~1000");
        }
        if ("note" in p) boundedText(p.note, `${key}.note`);
      } else {
        exactKeys(p, ["status", "reason"], key);
        assert(p.status === "unknown" || p.status === "unsupported", `${key}: \uC798\uBABB\uB41C status`);
        boundedText(p.reason, key);
      }
    }
  }
  function parseDesign(text2) {
    assert(text2.length <= 1024 * 1024, "JSON \uCD5C\uB300 1 MiB");
    const doc = JSON.parse(text2);
    assert(record2(doc), "\uBB38\uC11C \uAC1D\uCCB4 \uD544\uC694");
    exactKeys(doc, ["schemaVersion", "source", "exportedAt", "colorProfile", "nodes"], "document");
    assert(doc.schemaVersion === VERSION, "\uC9C0\uC6D0 schemaVersion\uC740 1.0\uC785\uB2C8\uB2E4. \uC784\uC758\uC758 \uAD6C\uD615 JSON\uC740 \uC790\uB3D9 \uBCC0\uD658\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
    assert(doc.source === "figma", "source\uB294 figma\uC5EC\uC57C \uD569\uB2C8\uB2E4");
    if ("colorProfile" in doc) assert(["SRGB", "DISPLAY_P3", "UNKNOWN"].includes(String(doc.colorProfile)), "colorProfile \uC624\uB958");
    boundedText(doc.exportedAt, "exportedAt");
    assert(Number.isFinite(Date.parse(doc.exportedAt)), "exportedAt \uB0A0\uC9DC \uC624\uB958");
    assert(Array.isArray(doc.nodes) && doc.nodes.length > 0, "nodes \uBC30\uC5F4\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4");
    let count = 0;
    const ids = /* @__PURE__ */ new Set();
    function node(v, depth) {
      assert(++count <= 256 && depth <= 16, "\uB178\uB4DC \uCD5C\uB300 256\uAC1C / \uAE4A\uC774 \uCD5C\uB300 16");
      assert(record2(v), "node \uAC1D\uCCB4 \uD544\uC694");
      exactKeys(v, ["id", "name", "type", "properties", "children", "shadows"], "node");
      boundedText(v.id, "id");
      boundedText(v.name, "name");
      boundedText(v.type, "type");
      assert(!ids.has(v.id), "\uC911\uBCF5 node id");
      ids.add(v.id);
      validateProperties(v.properties);
      if ("shadows" in v) validateShadows(v.shadows);
      if ("children" in v) {
        assert(Array.isArray(v.children), "children \uBC30\uC5F4 \uD544\uC694");
        v.children.forEach((c) => node(c, depth + 1));
      }
    }
    doc.nodes.forEach((n) => node(n, 0));
    if (doc.colorProfile === "DISPLAY_P3" || doc.colorProfile === "UNKNOWN") {
      const excludeColors = (n) => {
        for (const k of keys.filter((k2) => k2.endsWith("Color"))) n.properties[k] = unavailable(`Figma ${doc.colorProfile} \uC0C9\uACF5\uAC04: sRGB \uBCC0\uD658 \uBBF8\uC9C0\uC6D0`);
        if (n.shadows) n.shadows = { ...n.shadows, status: "unsupported", reason: "Figma \uC0C9\uACF5\uAC04 sRGB \uBCC0\uD658 \uBBF8\uC9C0\uC6D0" };
        n.children?.forEach(excludeColors);
      };
      doc.nodes.forEach(excludeColors);
    }
    return doc;
  }
  function flattenNodes(doc) {
    const out = [];
    const walk = (n) => {
      out.push(n);
      n.children?.forEach(walk);
    };
    doc.nodes.forEach(walk);
    return out;
  }
  var normalTolerance = { px: 1, typographyPx: 0.5, colorChannel: 1, alpha: 0.01, opacity: 0.01 };
  var numericalEpsilon = { px: 1e-6, colorChannel: 2e-5, alpha: 1e-7, opacity: 1e-7, fontWeight: 1e-9 };
  function validSupported(v, key) {
    if (v.status !== "supported" || v.kind !== kindFor(key)) return false;
    if (v.kind === "rgba") return Array.isArray(v.value) && v.value.length === 4 && v.value.every((n, i) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= (i === 3 ? 1 : 255));
    if (v.kind === "string") return typeof v.value === "string" && v.value.trim().length > 0;
    return typeof v.value === "number" && Number.isFinite(v.value) && Math.abs(v.value) <= 1e7 && (key === "letterSpacing" || v.value >= 0) && (key !== "opacity" || v.value <= 1) && (key !== "fontWeight" || v.value >= 1 && v.value <= 1e3);
  }
  function within2(delta, limit, epsilon) {
    return Math.abs(delta) <= limit || Math.abs(delta) - limit <= epsilon;
  }
  function compare(expected, actual, tolerance = normalTolerance, included2 = keys) {
    for (const key of Object.keys(normalTolerance)) {
      const value = tolerance[key], max = key === "alpha" || key === "opacity" ? 1 : key === "colorChannel" ? 255 : 1e4;
      if (!Number.isFinite(value) || value < 0 || value > max) throw new Error(`\uD5C8\uC6A9\uC624\uCC28 ${key}\uB294 0~${max}\uC758 \uC720\uD55C\uD55C \uC22B\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
    }
    const rows = [];
    for (const [category, list] of Object.entries(categories)) for (const key of list) {
      const e = expected[key], a = actual[key];
      const row = { key, category, expected: e, actual: a, status: "excluded" };
      if (!included2.includes(key)) {
        row.exclusion = "user";
        row.reason = "\uC0AC\uC6A9\uC790\uAC00 \uBE44\uAD50\uC5D0\uC11C \uC81C\uC678";
      } else if (e.status !== "supported" || a.status !== "supported") {
        row.reason = `expected: ${e.status === "supported" ? "supported" : `${e.status} \u2014 ${e.reason}`} / actual: ${a.status === "supported" ? "supported" : `${a.status} \u2014 ${a.reason}`}`;
      } else if (!validSupported(e, key) || !validSupported(a, key)) row.reason = "\uC815\uADDC\uD654 kind/\uAC12\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC74C (\uBC94\uC704 \uB610\uB294 \uBE44\uC720\uD55C \uAC12)";
      else if (e.kind === "string") row.status = String(e.value).trim().toLowerCase() === String(a.value).trim().toLowerCase() ? "match" : "mismatch";
      else if (e.kind === "rgba") {
        const ev = e.value, av = a.value;
        row.delta = av.map((v, i) => v - ev[i]);
        row.status = row.delta.every((d, i) => within2(d, i === 3 ? tolerance.alpha : tolerance.colorChannel, i === 3 ? numericalEpsilon.alpha : numericalEpsilon.colorChannel)) ? "match" : "mismatch";
      } else {
        row.delta = a.value - e.value;
        const limit = key === "opacity" ? tolerance.opacity : key === "fontWeight" ? 0 : category === "typography" ? tolerance.typographyPx : tolerance.px;
        const epsilon = key === "opacity" ? numericalEpsilon.opacity : key === "fontWeight" ? numericalEpsilon.fontWeight : numericalEpsilon.px;
        row.status = within2(row.delta, limit, epsilon) ? "match" : "mismatch";
      }
      if (row.status === "excluded" && !row.exclusion) row.exclusion = "unsupported";
      rows.push(row);
    }
    const summarize = (list) => {
      const supported = list.filter((r) => r.status !== "excluded").length, matched = list.filter((r) => r.status === "match").length;
      return { supported, matched, score: supported ? matched / supported * 100 : null };
    };
    return { rows, total: summarize(rows), categories: Object.fromEntries(Object.keys(categories).map((c) => [c, summarize(rows.filter((r) => r.category === c))])) };
  }
  function cssLength(raw) {
    const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/.exec(raw.trim());
    return m ? numberValue(Number(m[1])) : unavailable(`CSS '${raw}'\uB294 \uB2E8\uC77C px\uB85C \uD655\uC815 \uBD88\uAC00 (normal/auto/%/calc/\uBCF5\uD569\uAC12 \uB4F1)`);
  }
  function cssColor(raw) {
    if (raw === "transparent") return colorValue2([0, 0, 0, 0]);
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(raw);
    if (!m) return unavailable(`CSS \uC0C9 '${raw}'\uB294 sRGB rgb/rgba \uB2E8\uC0C9 \uC544\uB2D8`);
    const rgba3 = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === void 0 ? 1 : Number(m[4])];
    return rgba3.every((v, i) => Number.isFinite(v) && v >= 0 && v <= (i === 3 ? 1 : 255)) ? colorValue2(rgba3) : unavailable("\uC0C9 \uBC94\uC704 \uC624\uB958");
  }

  // packages/ui/visual-model.ts
  var structureKeys = ["width", "height", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft", "rowGap", "columnGap"];
  function px(value) {
    return value.status === "supported" && value.kind === "px" && typeof value.value === "number" && Number.isFinite(value.value) && value.value >= 0 ? value.value : void 0;
  }
  function rgba2(value) {
    return value.status === "supported" && value.kind === "rgba" && Array.isArray(value.value) && value.value.length === 4 && value.value.every((n, i) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= (i === 3 ? 1 : 255)) ? value.value : void 0;
  }
  function contentSize(p, source, css) {
    const fail = (reason) => ({ width: unavailable(reason, "unknown"), height: unavailable(reason, "unknown") });
    if (source === "figma") return fail("Figma stroke/layout \uD3EC\uD568 \uC815\uBCF4 \uC5C6\uC74C: content \uC5ED\uC0B0 \uC548 \uD568");
    if (!css || !["content-box", "border-box"].includes(css["box-sizing"]) || !["visible", "clip", "hidden"].includes(css["overflow-x"]) || !["visible", "clip", "hidden"].includes(css["overflow-y"]) || css["scrollbar-gutter"] !== "auto") return fail("\uC6F9 box-sizing/scrollbar \uC5EC\uBD80 \uBD88\uD655\uC2E4: content \uC5ED\uC0B0 \uC548 \uD568");
    const list = ["width", "height", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "borderLeftWidth", "borderRightWidth", "borderTopWidth", "borderBottomWidth"];
    const v = list.map((k) => px(p[k]));
    if (v.some((n) => n === void 0)) return fail("\uD06C\uAE30\xB7padding\xB7solid border N/A: content \uC5ED\uC0B0 \uC548 \uD568");
    const [w, h, pl, pr, pt, pb, bl, br, bt, bb] = v, cw = w - pl - pr - bl - br, ch = h - pt - pb - bt - bb;
    if (cw < 0 || ch < 0) return fail("\uB0B4\uBD80 \uD06C\uAE30\uAC00 \uC74C\uC218: clamp\uD558\uC9C0 \uC54A\uACE0 \uACC4\uC0B0 \uC624\uB958\uB85C \uC81C\uC678");
    return { width: numberValue(cw, "px", "\uD655\uC778\uB41C border-box \u2212 padding \u2212 border"), height: numberValue(ch, "px", "\uD655\uC778\uB41C border-box \u2212 padding \u2212 border") };
  }

  // packages/ui/visual-preview.ts
  var state = /* @__PURE__ */ new Map();
  var el2 = (tag, text2, cls) => {
    const n = document.createElement(tag);
    if (text2 !== void 0) n.textContent = text2;
    if (cls) n.className = cls;
    return n;
  };
  function na(v) {
    return v.status === "supported" ? "\uC720\uD6A8\uD55C \uC9C0\uC6D0 \uAC12\uC774 \uC544\uB2D8" : v.reason;
  }
  function shown(v) {
    return v.status === "supported" ? valueText(v) : "N/A";
  }
  function visualPreview(id, kind, sides, status2, onProperty) {
    const details = document.createElement("details");
    details.id = id;
    details.className = "property-preview";
    details.open = state.get(id) ?? kind === "structure";
    const summary = el2("summary", kind === "structure" ? "\uAD6C\uC870" : kind === "color" ? "\uC0C9\uC0C1 \uBBF8\uB9AC\uBCF4\uAE30" : "\uAE00\uAF34 \uBBF8\uB9AC\uBCF4\uAE30");
    summary.id = id + "-summary";
    details.append(summary);
    summary.addEventListener("click", () => state.set(id, !details.open));
    details.addEventListener("toggle", () => {
      if (details.isConnected) state.set(id, details.open);
    });
    const note = el2("p", kind === "structure" ? "\uC2E4\uC81C \uD06C\uAE30\uB294 \uC218\uCE58\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4. \uC911\uCCA9 \uC601\uC5ED\uC740 \uAE30\uD638\uC774\uBA70 \uD06C\uAE30\xB7\uB450\uAED8\xB7\uB0B4\uBD80 \uC5EC\uBC31\uC740 \uBE44\uB840\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. margin\uC740 \uC0DD\uB7B5, gap\uC740 \uBCC4\uB3C4 \uAC12\uC785\uB2C8\uB2E4." : "\uC6D0\uBCF8 \uAC12 \uC694\uC57D \xB7 \uBE44\uAD50\uC5D0\uC11C \uD655\uC778\uB41C \uCC28\uC774\uB9CC \uAC15\uC870", "preview-note");
    details.append(note);
    const wrap = el2("div", void 0, "preview-sides");
    details.append(wrap);
    function metric(key, v, source, compact = false) {
      const b = el2("button", void 0, "preview-metric");
      b.type = "button";
      b.id = id + "-" + source + "-" + key;
      b.dataset.previewKey = key;
      const name = labels[key] + ": " + shown(v);
      b.setAttribute("aria-label", name);
      b.append(propertyIcon(key), el2("span", compact ? shown(v) : name, "preview-value"));
      b.title = name + " \xB7 " + (v.status === "supported" ? v.note ?? "\uC18D\uC131 \uD589\uC73C\uB85C \uC774\uB3D9" : na(v));
      if (status2(key) === "mismatch") b.classList.add("preview-difference");
      if (v.status !== "supported") b.classList.add("preview-na");
      b.onclick = () => onProperty(key);
      return b;
    }
    for (const side of sides) {
      const p = side.properties, card = el2("section", void 0, "preview-side");
      card.dataset.source = side.source;
      card.append(el2("h3", side.title));
      wrap.append(card);
      if (kind === "structure") {
        let corners2 = function(keys2) {
          const row = el2("div", void 0, "corner-row");
          for (const key of keys2) row.append(metric(key, p[key], side.source, true));
          return row;
        }, region2 = function(name, cls, keys2, center2) {
          const box2 = el2("div", void 0, "box-region " + cls);
          box2.dataset.region = cls;
          box2.append(el2("span", name, "region-label"));
          for (const [i, key] of keys2.entries()) {
            const button = metric(key, p[key], side.source, true);
            button.dataset.position = ["top", "right", "bottom", "left"][i];
            box2.append(button);
          }
          box2.append(center2);
          return box2;
        };
        var corners = corners2, region = region2;
        const w = px(p.width), h = px(p.height);
        const map = el2("div", void 0, "box-map");
        map.setAttribute("aria-label", side.title + " \uD14C\uB450\uB9AC\xB7\uB0B4\uBD80 \uC5EC\uBC31\xB7\uBAA8\uC11C\uB9AC \uC18D\uC131");
        const center = el2("div", void 0, "box-center");
        const dimensions = el2("div", void 0, "box-dimensions");
        dimensions.dataset.layoutWidth = w === void 0 ? "N/A" : String(w);
        dimensions.dataset.layoutHeight = h === void 0 ? "N/A" : String(h);
        dimensions.dataset.geometry = w === void 0 || h === void 0 ? "unknown" : "known";
        for (const key of ["width", "height"]) dimensions.append(metric(key, p[key], side.source, true));
        center.append(dimensions);
        const padding = region2("Padding", "padding-region", ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"], center);
        const border = region2("Border", "border-region", ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"], padding);
        border.prepend(corners2(["radiusTopLeft", "radiusTopRight"]));
        border.append(corners2(["radiusBottomLeft", "radiusBottomRight"]));
        map.append(border);
        card.append(map);
        card.append(el2("p", "Radius\uB294 Border\uC758 \uB124 \uBAA8\uC11C\uB9AC \uAC12 \xB7 \uC2E4\uC81C \uACE1\uC120 \uB80C\uB354\uB9C1 \uC5C6\uC74C", "preview-note"));
        const metrics = el2("div", void 0, "preview-metrics");
        for (const key of structureKeys.filter((k) => k === "rowGap" || k === "columnGap")) metrics.append(metric(key, p[key], side.source));
        card.append(metrics);
        const inner = contentSize(p, side.source, side.css);
        const content = el2("p", "content " + shown(inner.width) + " \xD7 " + shown(inner.height), "preview-content");
        content.title = inner.width.status === "supported" ? "\uC6F9 \uD655\uC778\uB41C border-box \u2212 padding \u2212 border" : inner.width.reason;
        content.dataset.status = inner.width.status;
        card.append(content);
        if (inner.width.status !== "supported") card.append(el2("p", inner.width.reason, "preview-note"));
      } else if (kind === "color") {
        const colorKeys = sides.length === 1 && side.source === "figma" ? ["textColor", "backgroundColor"] : ["backgroundColor", "textColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"];
        for (const key of colorKeys) {
          if (sides.length === 1 && side.source === "figma" && p[key].status !== "supported") continue;
          const row = el2("div", void 0, "preview-color-row");
          const label = metric(key, p[key], side.source);
          label.replaceChildren(propertyIcon(key), el2("span", labels[key], "preview-value"));
          row.append(label);
          const value = rgba2(p[key]);
          if (value) {
            const checker = el2("span", void 0, "preview-checker");
            const paint = el2("span", void 0, "preview-paint");
            paint.style.backgroundColor = `rgba(${value.join(",")})`;
            bindColor(paint, value);
            paint.setAttribute("aria-hidden", "true");
            checker.append(paint);
            const text2 = colorValue(value);
            if (sides.length === 1 && side.source === "figma") {
              const pair = el2("span", void 0, "preview-color-value");
              pair.append(checker, text2);
              row.append(pair);
            } else row.append(checker, text2);
          } else row.append(el2("span", "N/A", "preview-na"));
          card.append(row);
        }
      } else {
        const list = el2("div", void 0, "preview-fonts");
        for (const key of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"]) list.append(metric(key, p[key], side.source));
        card.append(list, el2("p", "\uC694\uCCAD\uB41C font-family \uC694\uC57D \xB7 \uC2E4\uC81C \uC0AC\uC6A9 font/fallback\uC740 \uD655\uC778\uD558\uC9C0 \uC54A\uC74C", "preview-note"));
      }
    }
    return details;
  }

  // packages/ui/category-icon.ts
  var paths2 = {
    size: "M3 3H13V13H3ZM5 8H11M8 5V11",
    spacing: "M2 4H5V12H2ZM11 4H14V12H11ZM6.5 8H9.5M7 6L5.5 8L7 10M9 6L10.5 8L9 10",
    typography: "M3 3H13M8 3V13M5 13H11",
    color: "M8 2C6 5 3 7 3 10A5 5 0 0 0 13 10C13 7 10 5 8 2Z",
    border: "M5 3H13V13H3V5A2 2 0 0 1 5 3ZM9 3V6H13",
    appearance: "M8 3A5 5 0 1 0 8 13A5 5 0 1 0 8 3ZM8 3V13M5 5V11"
  };
  function svg(path2, className) {
    const ns = "http://www.w3.org/2000/svg", icon = document.createElementNS(ns, "svg");
    icon.classList.add(className);
    for (const [key, value] of Object.entries({ viewBox: "0 0 16 16", width: "16", height: "16", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" })) icon.setAttribute(key, value);
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", path2);
    icon.append(p);
    return icon;
  }
  function categoryLabel(category) {
    const label = document.createElement("span");
    label.className = "category-label";
    const text2 = document.createElement("span");
    text2.className = "category-label-text";
    text2.textContent = categoryLabels[category];
    label.append(svg(paths2[category], "category-icon"), text2);
    return label;
  }

  // apps/chrome-extension/src/result-view.ts
  var extraOpen = false;
  var together = false;
  function resetComparisonView() {
    extraOpen = false;
    rememberedFocus = "";
  }
  var rememberedOpen = [];
  var rememberedFocus = "";
  var view = "differences";
  function remember(target) {
    if (target.querySelector("details")) rememberedOpen = Array.from(target.querySelectorAll("details[open]")).map((d) => d.id);
    if (document.activeElement instanceof HTMLElement && target.contains(document.activeElement) && document.activeElement.id) rememberedFocus = document.activeElement.id;
  }
  var element = (tag, text2, className) => {
    const n = document.createElement(tag);
    if (text2 !== void 0) n.textContent = text2;
    if (className) n.className = className;
    return n;
  };
  function detail(id, title) {
    const d = document.createElement("section");
    d.id = id;
    d.className = "result-detail";
    const h = element("h3", title);
    h.id = id + "-summary";
    d.append(h);
    return d;
  }
  function stageHeading(title = "\uBE44\uAD50 \uACB0\uACFC") {
    const header = element("div", void 0, "card-heading step-header");
    const h = element("h2");
    const number = element("span", "\u2461");
    number.setAttribute("aria-hidden", "true");
    h.append(number, document.createTextNode(" " + title));
    header.append(h);
    return header;
  }
  function fixedPreview(...args) {
    const old = visualPreview(...args), section = element("section", void 0, "property-preview preview-fixed");
    section.id = old.id;
    const title = element("h3", args[1] === "structure" ? "\uC601\uC5ED \uAD6C\uC870" : args[1] === "color" ? "\uC0C9\uC0C1" : "\uD0C0\uC774\uD3EC\uADF8\uB798\uD53C");
    title.id = old.id + "-summary";
    section.setAttribute("aria-labelledby", title.id);
    section.append(title);
    for (const child of Array.from(old.children)) if (child.tagName !== "SUMMARY") section.append(child);
    if (args[1] !== "structure") section.querySelector(":scope > .preview-note")?.remove();
    else section.querySelector(":scope > .preview-note").textContent = "Border \uC548\uC5D0 Padding\uACFC \uD06C\uAE30, \uB124 \uBAA8\uC11C\uB9AC\uC5D0 Radius\uB97C \uD45C\uC2DC\uD569\uB2C8\uB2E4. \uB3C4\uC2DD\uC740 \uBE44\uB840 \uCD95\uCC99\uC774 \uC544\uB2D9\uB2C8\uB2E4.";
    return section;
  }
  function emptyResult(target, title, description, action, run) {
    remember(target);
    target.replaceChildren();
    const wrap = element("div", void 0, "empty");
    target.append(stageHeading("\uC694\uC18C \uC815\uBCF4"));
    wrap.append(element("h3", title), element("p", description));
    const button = element("button", action);
    button.id = "next-action";
    setAction(button, action.includes("\uBC29\uBC95") ? "help" : action.includes("JSON") ? "import" : "refresh", action);
    button.onclick = run;
    wrap.append(button);
    target.append(wrap);
  }
  function viewControls(parent, canCompare, rerender) {
    const bar = element("div", void 0, "preview-toolbar");
    const note = element("p", canCompare ? (together ? "Figma\xB7\uC6F9 \uD568\uAED8 \uBCF4\uAE30" : "\uC6F9 \uBBF8\uB9AC\uBCF4\uAE30") + " \xB7 \uD45C\uC640 \uC810\uC218\uB294 \uB514\uC790\uC778\uACFC \uBE44\uAD50\uD569\uB2C8\uB2E4." : "Figma \uD568\uAED8 \uBCF4\uAE30\uB294 \uB514\uC790\uC778 JSON \uC801\uC6A9 \uD6C4 \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", "preview-note");
    note.id = "preview-mode-note";
    note.setAttribute("role", "status");
    for (const source of ["web", "figma"]) {
      const button = element("button", void 0, "view-icon-button");
      button.id = "preview-" + source;
      button.type = "button";
      button.append(viewIcon(source));
      button.setAttribute("aria-label", source === "web" ? "\uC6F9 \uBCF4\uAE30 \xB7 \uD56D\uC0C1 \uD45C\uC2DC" : "Figma \uD568\uAED8 \uBCF4\uAE30");
      button.setAttribute("aria-pressed", String(source === "web" || canCompare && together));
      button.setAttribute("aria-controls", parent.id);
      if (source === "figma" && !canCompare) button.setAttribute("aria-disabled", "true");
      button.title = source === "web" ? "\uC6F9\uB9CC \uBCF4\uAE30" : canCompare ? together ? "Figma \uD568\uAED8 \uBCF4\uAE30 \uD574\uC81C" : "Figma\uC640 \uC6F9 \uD568\uAED8 \uBCF4\uAE30" : "\uB514\uC790\uC778 JSON\uC744 \uBA3C\uC800 \uC801\uC6A9\uD558\uC138\uC694";
      button.onclick = () => {
        if (source === "figma" && !canCompare) {
          note.textContent = "\uB514\uC790\uC778 JSON\uC744 \uBA3C\uC800 \uC801\uC6A9\uD558\uC138\uC694. \uC6F9 \uBBF8\uB9AC\uBCF4\uAE30\uB294 \uACC4\uC18D \uD45C\uC2DC\uD569\uB2C8\uB2E4.";
          return;
        }
        together = source === "figma" ? !together : false;
        rerender();
        document.getElementById(button.id)?.focus();
      };
      bar.append(button);
    }
    parent.append(bar, note);
  }
  function renderWebOnly(target, actual, css) {
    target.replaceChildren(stageHeading("\uC694\uC18C \uC815\uBCF4"));
    const preview = element("div");
    preview.id = "web-preview";
    if (actual) {
      const note = element("p", void 0, "preview-note");
      note.id = "web-value-note";
      note.setAttribute("role", "status");
      for (const kind of ["structure", "color", "typography"]) preview.append(fixedPreview("visual-" + kind, kind, [{ title: "\uC6F9", source: "web", properties: actual, css }], () => void 0, (key) => {
        const v = actual[key];
        note.textContent = labels[key] + ": " + (v.status === "supported" ? valueText(v) : v.reason);
      }));
      preview.append(note);
    }
    target.append(preview);
  }
  function renderComparison(target, evidence2, c, snapshot2, designName) {
    remember(target);
    const openIds = rememberedOpen;
    const focused = document.activeElement instanceof HTMLElement && target.contains(document.activeElement) ? document.activeElement.id : document.activeElement === document.body ? rememberedFocus : "";
    target.replaceChildren();
    evidence2.replaceChildren();
    const main = element("div");
    main.id = "comparison-main";
    const extra = element("section");
    extra.id = "comparison-extra";
    extra.hidden = !extraOpen;
    main.hidden = extraOpen;
    target.append(stageHeading(), main, extra);
    const shadowDifferences = c.shadows?.rows.filter((r) => r.status !== "match").length ?? 0;
    const differences = c.rows.filter((r) => r.status === "mismatch"), excluded = c.rows.filter((r) => r.status === "excluded" && r.exclusion !== "user"), userExcluded = c.rows.filter((r) => r.exclusion === "user");
    const heading2 = element("div", void 0, "result-heading");
    heading2.append(element("div", c.total.score === null ? "\uBE44\uAD50 \uAC00\uB2A5\uD55C \uC18D\uC131\uC774 \uC5C6\uC5B4\uC694" : `${c.total.score.toFixed(1)}% \uC77C\uCE58`, "score"), element("span", differences.length + shadowDifferences ? `${differences.length + shadowDifferences}\uAC1C \uC18D\uC131\uC5D0 \uCC28\uC774` : "\uD655\uC778\uB41C \uCC28\uC774 \uC5C6\uC74C", `result-count${differences.length + shadowDifferences ? "" : " good"}`));
    main.append(heading2);
    const context = element("dl", void 0, "comparison-context");
    for (const [label, value] of [["\uB514\uC790\uC778", designName], ["\uC6F9 \uC694\uC18C", snapshot2.tag + (snapshot2.id ? "#" + snapshot2.id : "")]]) {
      const field = element("div");
      const valueNode = element("dd", value);
      valueNode.title = value;
      field.append(element("dt", label), valueNode);
      context.append(field);
    }
    main.append(context);
    const note = element("div", void 0, "result-note");
    for (const text3 of [`${c.total.supported}\uAC1C \uBE44\uAD50 \uC911 ${c.total.matched}\uAC1C \uC77C\uCE58`, ...excluded.length + userExcluded.length ? [`\uCD94\uAC00 \uC815\uBCF4 ${excluded.length + userExcluded.length}\uAC1C`] : []]) note.append(element("span", text3));
    main.append(note);
    if (c.total.score === null) main.append(element("p", "\uC774 \uB450 \uB300\uC0C1\uC5D0\uC11C\uB294 \uBE44\uAD50\uD560 \uC218 \uC788\uB294 \uC18D\uC131\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC544\uB798 \uC81C\uC678 \uC774\uC720\uB97C \uD655\uC778\uD558\uAC70\uB098 \uB2E4\uB978 \uC694\uC18C\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.", "muted"));
    else if (!(differences.length + shadowDifferences)) main.append(element("p", "\uBE44\uAD50\uD560 \uC218 \uC788\uB294 \uC18D\uC131\uC740 \uC124\uC815\uD55C \uAE30\uC900 \uC548\uC5D0\uC11C \uBAA8\uB450 \uAC19\uC544\uC694. \uB2E4\uB978 \uBD80\uBD84\uB3C4 \uD655\uC778\uD558\uB824\uBA74 Elements\uC5D0\uC11C \uB2E4\uC2DC \uC120\uD0DD\uD558\uC138\uC694.", "all-good"));
    const counts = element("div", void 0, "comparison-counts");
    for (const [number, label, kind] of [[differences.length + shadowDifferences, "\uCC28\uC774", "bad"], [c.total.supported, "\uBE44\uAD50 \uAC00\uB2A5", "supported"], [excluded.length, "\uBE44\uAD50 \uC81C\uC678", "excluded"]]) {
      const box2 = element("div", void 0, kind);
      box2.append(element("strong", String(number)), element("span", label));
      counts.append(box2);
    }
    main.append(counts);
    const expected = Object.fromEntries(c.rows.map((r) => [r.key, r.exclusion === "user" ? unavailable("\uC0AC\uC6A9\uC790 \uC81C\uC678: \uC790\uC138\uD788 \uBCF4\uAE30\uC5D0\uC11C \uD655\uC778", "unknown") : r.expected]));
    const actual = Object.fromEntries(c.rows.map((r) => [r.key, r.exclusion === "user" ? unavailable("\uC0AC\uC6A9\uC790 \uC81C\uC678: \uC790\uC138\uD788 \uBCF4\uAE30\uC5D0\uC11C \uD655\uC778", "unknown") : r.actual]));
    function showProperty(key) {
      const row = c.rows.find((r) => r.key === key);
      if (row.status === "match" || row.status === "mismatch") {
        view = "all";
        renderComparison(target, evidence2, c, snapshot2, designName);
        const tr = target.querySelector(`.visual-comparison tr[data-key=${key}]`);
        if (tr) {
          tr.classList.add("preview-target");
          tr.tabIndex = -1;
          tr.focus();
          tr.scrollIntoView({ block: "center" });
        }
      } else {
        document.getElementById("comparison-more")?.click();
        const reason = target.querySelector(`#comparison-extra [data-reason-key=${key}]`) ?? document.getElementById("user-excluded");
        if (reason) {
          reason.tabIndex = -1;
          reason.focus();
          reason.scrollIntoView({ block: "center" });
        }
      }
    }
    const inspection = element("section", void 0, "element-inspection");
    inspection.id = "element-inspection";
    inspection.append(element("h2", "\uC694\uC18C \uC18D\uC131"));
    viewControls(inspection, true, () => renderComparison(target, evidence2, c, snapshot2, designName));
    const sides = together ? [{ title: "Figma", source: "figma", properties: expected }, { title: "\uC6F9", source: "web", properties: actual, css: snapshot2.computed }] : [{ title: "\uC6F9", source: "web", properties: actual, css: snapshot2.computed }];
    for (const kind of ["structure", "color", "typography"]) inspection.append(fixedPreview("visual-" + kind, kind, sides, (key) => c.rows.find((r) => r.key === key)?.status, showProperty));
    const toolbar = element("div", void 0, "table-toolbar");
    for (const [mode, title] of [["differences", "\uCC28\uC774\uB9CC"], ["all", "\uC804\uCCB4 \uBE44\uAD50\uAC12"]]) {
      const b = element("button", title);
      b.id = "view-" + mode;
      b.setAttribute("aria-pressed", String(view === mode));
      b.onclick = () => {
        view = mode;
        renderComparison(target, evidence2, c, snapshot2, designName);
        document.getElementById(b.id)?.focus();
      };
      toolbar.append(b);
    }
    if (c.total.supported) main.append(toolbar);
    const grid = element("table", void 0, "visual-comparison");
    grid.append(element("caption", view === "all" ? "\uBE44\uAD50 \uAC00\uB2A5\uD55C \uC804\uCCB4 \uC18D\uC131" : "\uCC28\uC774\uAC00 \uC788\uB294 \uC18D\uC131"));
    const gridHead = element("thead"), gridHeadRow = element("tr");
    for (const [index, title] of ["\uC18D\uC131", "\uB514\uC790\uC778", "\uC6F9", "\uCC28\uC774 (\uC6F9 \u2212 \uB514\uC790\uC778)"].entries()) {
      const th = element("th", title);
      th.id = "comparison-column-" + index;
      th.setAttribute("scope", "col");
      gridHeadRow.append(th);
    }
    gridHead.append(gridHeadRow);
    grid.append(gridHead);
    let previousCategory = "";
    let gridBody = element("tbody");
    const bodies = [];
    for (const row of view === "differences" ? differences : c.rows.filter((r) => r.status === "match" || r.status === "mismatch")) {
      if (row.category !== previousCategory) {
        gridBody = element("tbody");
        bodies.push(gridBody);
        previousCategory = row.category;
        const section = element("tr", void 0, "table-group");
        const title = element("th");
        title.append(categoryLabel(row.category));
        title.setAttribute("colspan", "4");
        title.id = "comparison-group-" + row.category;
        title.setAttribute("scope", "rowgroup");
        section.append(title);
        gridBody.append(section);
      }
      const tr = element("tr", void 0, row.status === "mismatch" ? "diff-card mismatch" : row.status);
      tr.dataset.key = row.key;
      if ([row.expected, row.actual].some((v) => v.status === "supported" && (v.kind === "rgba" || v.kind === "string"))) tr.classList.add("long-value-row");
      const property = element("th");
      property.append(propertyLabel(row.key));
      property.setAttribute("scope", "row");
      property.id = "comparison-property-" + row.key;
      property.setAttribute("headers", "comparison-group-" + row.category);
      tr.append(property);
      for (const [index, v] of [row.expected, row.actual].entries()) {
        const cell = element("td");
        cell.dataset.label = index === 0 ? "\uB514\uC790\uC778" : "\uC6F9";
        cell.setAttribute("headers", `comparison-group-${row.category} comparison-property-${row.key} comparison-column-${index + 1}`);
        if (v.status === "supported" && typeof v.value === "number") cell.classList.add("numeric");
        const strong = element("strong");
        strong.append(v.status === "supported" && v.kind === "rgba" ? colorValue(v.value) : document.createTextNode(valueText(v)));
        const value = element("span", void 0, "comparison-value");
        value.append(strong);
        cell.append(value);
        if (v.status === "supported" && v.kind === "rgba") {
          const rgba3 = v.value;
          const swatch = element("span", void 0, "color-swatch");
          bindColor(swatch, rgba3);
          swatch.style.backgroundColor = `rgba(${rgba3.join(",")})`;
          swatch.setAttribute("aria-hidden", "true");
          value.prepend(swatch);
        }
        tr.append(cell);
      }
      const delta = deltaText(row);
      const change = element("td", row.status === "match" ? "\uC77C\uCE58" : row.status === "excluded" ? "\uBE44\uAD50 \uC81C\uC678" : delta, "delta");
      change.dataset.label = "\uCC28\uC774";
      change.setAttribute("headers", `comparison-group-${row.category} comparison-property-${row.key} comparison-column-3`);
      if (row.status === "excluded") change.title = row.reason ?? "\uBE44\uAD50 \uC81C\uC678";
      if (row.status === "mismatch") change.append(element("small", direction(row), "diff-direction"));
      tr.append(change);
      gridBody.append(tr);
    }
    grid.append(...bodies);
    if (bodies.length) main.append(grid);
    main.append(inspection);
    const more = element("button", excluded.length + userExcluded.length ? `\uC790\uC138\uD788 \uBCF4\uAE30 \xB7 \uCD94\uAC00 \uC815\uBCF4 ${excluded.length + userExcluded.length}\uAC1C` : "\uC790\uC138\uD788 \uBCF4\uAE30", "secondary");
    more.id = "comparison-more";
    more.setAttribute("aria-expanded", String(extraOpen));
    more.setAttribute("aria-controls", "comparison-extra");
    main.append(more);
    const back = element("button", "\uBE44\uAD50 \uACB0\uACFC\uB85C \uB3CC\uC544\uAC00\uAE30", "secondary");
    back.id = "comparison-back";
    extra.append(back, element("h2", "\uCD94\uAC00 \uC815\uBCF4"), element("p", "\uC544\uB798 \uD56D\uBAA9\uC740 \uAE30\uBCF8 \uBE44\uAD50 \uD45C\uC640 \uC810\uC218\uC5D0\uC11C \uC81C\uC678\uB429\uB2C8\uB2E4. \uD3EC\uD568 \uCCB4\uD06C\uC640 \uBE44\uAD50 \uAC00\uB2A5 \uC5EC\uBD80\uB294 \uBCC4\uAC1C\uC608\uC694.", "muted"));
    function switchExtra(open) {
      extraOpen = open;
      main.hidden = open;
      extra.hidden = !open;
      more.setAttribute("aria-expanded", String(open));
      (open ? back : more).focus();
    }
    more.onclick = () => switchExtra(true);
    back.onclick = () => switchExtra(false);
    for (const label of ["\uBBF8\uC9C0\uC6D0", "\uAC12 \uBBF8\uD655\uC778", "\uAC12 \uC624\uB958"]) {
      const rows = excluded.filter((row) => exclusionLabel(row) === label);
      if (!rows.length) continue;
      const section = element("section", void 0, "result-detail");
      section.append(element("h2", `${label} ${rows.length}\uAC1C`));
      const reasons = element("ul", void 0, "reason-list");
      for (const row of rows) {
        const item = element("li");
        item.dataset.reasonKey = row.key;
        const title = element("strong");
        title.append(propertyLabel(row.key));
        item.append(title);
        for (const [caption, v] of [["\uB514\uC790\uC778", row.expected], ["\uC6F9", row.actual]]) {
          const line = element("p", caption + ": ");
          line.append(v.status === "supported" && v.kind === "rgba" ? colorValue(v.value) : document.createTextNode(valueText(v)));
          if (v.status !== "supported") line.append(document.createTextNode(" \xB7 " + v.reason));
          item.append(line);
        }
        if (row.expected.status === "supported" && row.actual.status === "supported") item.append(element("p", `\uAC12 \uC624\uB958: ${row.reason ?? "\uC720\uD6A8\uD55C \uC815\uADDC\uD654 \uAC12\uC774 \uC544\uB2C8\uC5D0\uC694."}`));
        reasons.append(item);
      }
      section.append(reasons);
      extra.append(section);
    }
    if (userExcluded.length) {
      const omitted = element("section", void 0, "result-detail");
      omitted.id = "user-excluded";
      omitted.append(element("h2", `\uC0AC\uC6A9\uC790 \uC81C\uC678 ${userExcluded.length}\uAC1C`), element("p", userExcluded.map((r) => labels[r.key]).join(", "), "muted"), element("p", "\uC544\uB798 \uD3EC\uD568 \uCCB4\uD06C\uB97C \uCF1C\uBA74 \uB2E4\uC2DC \uBE44\uAD50\uB97C \uC694\uCCAD\uD560 \uC218 \uC788\uC5B4\uC694. \uC9C0\uC6D0 \uC5EC\uBD80\uC5D0 \uB530\uB77C \uBE44\uAD50\uC640 \uC810\uC218\uC5D0 \uB4E4\uC5B4\uAC11\uB2C8\uB2E4.", "muted"));
      extra.append(omitted);
    }
    if (!excluded.length && !userExcluded.length) extra.append(element("p", "\uBE44\uAD50\uC5D0\uC11C \uC81C\uC678\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC5B4\uC694.", "muted"));
    const categorySection = element("section", void 0, "result-detail");
    categorySection.id = "category-results";
    categorySection.append(element("h2", "\uD56D\uBAA9 \uC77C\uCE58\uC728"));
    const badges = element("div", void 0, "badges");
    for (const [category, score] of Object.entries(c.categories)) badges.append(element("span", `${categoryLabels[category]}: ${score.score === null ? "\uBE44\uAD50 \uBD88\uAC00" : score.score.toFixed(0) + "%"} (${score.matched}/${score.supported})`, "badge"));
    categorySection.append(badges);
    extra.append(categorySection);
    if (c.shadows) {
      if (c.shadows.status === "supported") main.append(shadowComparison(c.shadows));
      else extra.append(shadowComparison(c.shadows));
      if (c.shadows.expected.effects) extra.append(shadowDetails(c.shadows.expected));
    }
    const originals = element("section", void 0, "result-detail");
    originals.id = "original-values";
    originals.append(element("h2", "\uC6D0\uBCF8 \uAC12"), element("pre", JSON.stringify(c.rows.map((r) => ({ property: r.key, expected: r.expected, actual: r.actual, delta: r.delta, status: r.status, exclusion: r.exclusion })), null, 2)));
    extra.append(originals);
    const partial = snapshot2.evidenceLimits?.some((s) => /부분조회|접근불가/.test(s));
    evidence2.append(element("p", `${partial ? "\uC77C\uBD80 \uADDC\uCE59\uB9CC \uD655\uC778\uD588\uC5B4\uC694." : snapshot2.candidates?.length ? "\uAD00\uB828\uB41C CSS \uADDC\uCE59 \uD6C4\uBCF4\uB97C \uCC3E\uC558\uC5B4\uC694." : "\uD655\uC778\uD560 \uC218 \uC788\uB294 CSS \uADDC\uCE59\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694."} \uAC12\uC740 \uD604\uC7AC \uC2A4\uD0C0\uC77C\uACFC \uD06C\uAE30\uC5D0\uC11C \uC77D\uC5C8\uC2B5\uB2C8\uB2E4. \uD6C4\uBCF4\uB9CC\uC73C\uB85C \uC2E4\uC81C \uC801\uC6A9\uB41C \uADDC\uCE59\uC774\uB098 \uC6D0\uC778\uC744 \uD655\uC815\uD560 \uC218\uB294 \uC5C6\uC5B4\uC694.`, "muted"));
    const raw = detail("dom-evidence", "\uC694\uC18C \uC815\uBCF4\uC640 \uCE21\uC815\uAC12");
    raw.append(element("pre", JSON.stringify({ classes: snapshot2.classes, inline: snapshot2.inline, rect: snapshot2.rect, computed: snapshot2.computed }, null, 2)));
    evidence2.append(raw);
    for (const candidate of snapshot2.candidates ?? []) {
      const d = document.createElement("section");
      d.className = "result-detail";
      d.append(element("h3", `${candidate.inherited ? "\uBD80\uBAA8 \uADDC\uCE59 \uD6C4\uBCF4" : "\uC120\uD0DD \uC694\uC18C \uADDC\uCE59 \uD6C4\uBCF4"}: ${candidate.selector}`), element("p", candidate.source), element("p", candidate.context.join(" \u2192 ") || "\uCD5C\uC0C1\uC704 \uADDC\uCE59"), element("pre", candidate.declarations));
      evidence2.append(d);
    }
    const limits = element("ul");
    for (const limit of snapshot2.evidenceLimits ?? []) limits.append(element("li", limit));
    evidence2.append(limits);
    for (const id of openIds) {
      const d = document.getElementById(id);
      if (d instanceof HTMLDetailsElement) d.open = true;
    }
    if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
    rememberedFocus = "";
    const announcement = document.getElementById("result-announcement");
    const text2 = `${differences.length + shadowDifferences}\uAC1C \uCC28\uC774, ${c.total.matched}/${c.total.supported}\uAC1C \uC77C\uCE58, ${excluded.length}\uAC1C \uC81C\uC678`;
    if (announcement.textContent !== text2) announcement.textContent = text2;
  }

  // apps/chrome-extension/src/collect.ts
  function collectSelected(selected) {
    try {
      let visitSheet2 = function(sheet, context) {
        if (visited.has(sheet)) return;
        visited.add(sheet);
        const source = sheet.href ?? "inline stylesheet (\uC6D0\uBCF8 \uC904 \uBC88\uD638 \uC5C6\uC74C)";
        if (sheet.disabled) {
          evidenceLimits.push(`${source}: disabled \uC81C\uC678`);
          return;
        }
        const media = sheet.media?.mediaText;
        if (media && !win.matchMedia(media).matches) return;
        try {
          walk2(sheet.cssRules, source, media ? [...context, `sheet media ${media}`] : context);
        } catch (e) {
          evidenceLimits.push(`${source}: ${e instanceof Error ? e.name : "\uC624\uB958"} \u2014 CSSOM \uC811\uADFC\uBD88\uAC00 (cross-origin \uB4F1)`);
        }
      }, walk2 = function(rules, source, context) {
        for (const rule of Array.from(rules)) {
          if (++scanned > 2e3 || candidates.length >= 100) {
            if (!evidenceLimits.includes("CSSOM \uCD5C\uB300 2000 rule / 100 \uD6C4\uBCF4\uC5D0 \uB3C4\uB2EC: \uBD80\uBD84\uC870\uD68C")) evidenceLimits.push("CSSOM \uCD5C\uB300 2000 rule / 100 \uD6C4\uBCF4\uC5D0 \uB3C4\uB2EC: \uBD80\uBD84\uC870\uD68C");
            return;
          }
          if (rule instanceof win.CSSImportRule) {
            if (rule.styleSheet) visitSheet2(rule.styleSheet, [...context, "@import"]);
            continue;
          }
          if (rule instanceof win.CSSStyleRule) {
            const declarations = Array.from(rule.style).filter((k) => relevant.test(k)).map((k) => `${k}: ${rule.style.getPropertyValue(k)}${rule.style.getPropertyPriority(k) ? " !important" : ""}`).join("; ").slice(0, 4096);
            if (declarations) subjects.forEach((subject, i) => {
              try {
                if (subject.matches(rule.selectorText) && candidates.length < 100) candidates.push({ selector: rule.selectorText.slice(0, 2048), source: source.slice(0, 2048), declarations, context, inherited: i > 0 });
              } catch {
                evidenceLimits.push("selector \uB9E4\uCE6D \uBD88\uAC00 (pseudo/nesting \uB4F1): \uBD80\uBD84\uC870\uD68C");
              }
            });
            if ("cssRules" in rule) walk2(rule.cssRules, source, [...context, "nested selector (\uC2B9\uC790 \uCD94\uC801\uBD88\uAC00)"]);
          } else if ("cssRules" in rule) {
            const grouping = rule;
            const header = rule.cssText.split("{")[0].slice(0, 512);
            if (rule instanceof win.CSSMediaRule && !win.matchMedia(rule.conditionText).matches) continue;
            if (rule instanceof win.CSSSupportsRule && !win.CSS.supports(rule.conditionText)) continue;
            walk2(grouping.cssRules, source, [...context, header]);
          }
        }
      };
      var visitSheet = visitSheet2, walk = walk2;
      if (!selected || typeof selected !== "object" || !("nodeType" in selected) || selected.nodeType !== 1) return { ok: false, error: "Elements\uC5D0\uC11C DOM \uC694\uC18C \uD558\uB098\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694 ($0)." };
      const el3 = selected;
      const overlayRoot = el3.getRootNode();
      if (el3.closest("[data-figcheck-picker],[data-figcheck-pin]") || "host" in overlayRoot && overlayRoot.host.closest("[data-figcheck-picker],[data-figcheck-pin]")) return { ok: false, error: "FigCheck \uC624\uBC84\uB808\uC774\uB294 \uC218\uC9D1 \uB300\uC0C1\uC774 \uC544\uB2D9\uB2C8\uB2E4." };
      if (!el3.isConnected) return { ok: false, error: "\uC120\uD0DD DOM\uC774 \uC81C\uAC70\uB418\uC5C8\uC2B5\uB2C8\uB2E4. Elements\uC5D0\uC11C \uB2E4\uC2DC \uC120\uD0DD\uD574\uC8FC\uC138\uC694." };
      const win = el3.ownerDocument.defaultView;
      if (!win) return { ok: false, error: "\uC120\uD0DD DOM\uC758 window\uB97C \uD655\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." };
      const s = win.getComputedStyle(el3), rect = el3.getBoundingClientRect();
      const names = ["width", "height", "box-sizing", "overflow-x", "overflow-y", "scrollbar-gutter", "padding-top", "padding-right", "padding-bottom", "padding-left", "row-gap", "column-gap", "display", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color", "background-color", "background-image", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "border-top-style", "border-right-style", "border-bottom-style", "border-left-style", "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius", "opacity", "transform", "zoom", "box-shadow", "text-shadow", "filter", "backdrop-filter", "mix-blend-mode"];
      const computed = {};
      names.forEach((name) => computed[name] = s.getPropertyValue(name));
      let geometryIssue = "", shadowIssue = "";
      if (el3.namespaceURI !== "http://www.w3.org/1999/xhtml") geometryIssue = "SVG \uB4F1 \uBE44-HTML \uC694\uC18C: CSS border-box \uB9E4\uD551 \uBBF8\uC9C0\uC6D0";
      if (el3.getClientRects().length !== 1 || s.display === "inline" || s.display === "contents") geometryIssue = "inline/\uBD84\uC808/\uBE44\uB80C\uB354 \uC694\uC18C: \uB2E8\uC77C border-box \uD06C\uAE30 \uD655\uC815 \uBD88\uAC00";
      for (let n = el3, depth = 0; n && depth < 64; n = n.parentElement ?? (n.getRootNode() instanceof win.ShadowRoot ? n.getRootNode().host : null), depth++) {
        const cs = win.getComputedStyle(n);
        if (cs.filter && cs.filter !== "none" || cs.getPropertyValue("backdrop-filter") && cs.getPropertyValue("backdrop-filter") !== "none" || cs.mixBlendMode && cs.mixBlendMode !== "normal") shadowIssue = "\uC790\uAE30/\uC870\uC0C1 filter \uB610\uB294 blend \uD569\uC131: box-shadow \uBE44\uAD50 \uC81C\uC678";
        if (n === el3 && cs.textShadow && cs.textShadow !== "none") shadowIssue = "text-shadow\uB294 box-shadow \uB300\uC751 \uBC94\uC704 \uBC16";
        if (cs.transform !== "none" || ["rotate", "scale", "translate"].some((k) => {
          const v = cs.getPropertyValue(k);
          return v && v !== "none";
        }) || cs.getPropertyValue("zoom") && !["1", "normal"].includes(cs.getPropertyValue("zoom"))) geometryIssue = "\uC790\uAE30/\uC870\uC0C1 transform \uB610\uB294 zoom: rect\uC640 Figma local \uD06C\uAE30 \uBE44\uAD50 \uC81C\uC678";
        if (depth === 63) geometryIssue = "\uC870\uC0C1 \uAC80\uC0AC \uCD5C\uB300 64\uB2E8\uACC4 \uCD08\uACFC";
      }
      const directText = Array.from(el3.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
      const pseudoText = ["::before", "::after"].some((pseudo) => {
        const content = win.getComputedStyle(el3, pseudo).content;
        return content && content !== "none" && content !== "normal" && content !== '""';
      });
      const textIssue = el3.children.length || pseudoText ? "\uC790\uC2DD \uC694\uC18C/\uC0DD\uC131 \uD14D\uC2A4\uD2B8 \uD3EC\uD568: \uBD80\uBAA8 computedStyle\uB85C \uC804\uCCB4 \uD14D\uC2A4\uD2B8 \uB300\uD45C \uBD88\uAC00" : !directText ? "\uC9C1\uC811 \uD14D\uC2A4\uD2B8 \uC5C6\uC74C: typography/textColor \uBE44\uAD50 \uC81C\uC678" : "";
      const candidates = [], evidenceLimits = [];
      const subjects = [el3];
      for (let n = el3.parentElement; n && subjects.length < 9; n = n.parentElement) subjects.push(n);
      const root = el3.getRootNode();
      const sheets = [...Array.from(el3.ownerDocument.styleSheets), ...Array.from(el3.ownerDocument.adoptedStyleSheets ?? [])];
      if (root instanceof win.ShadowRoot) sheets.push(...Array.from(root.styleSheets), ...Array.from(root.adoptedStyleSheets));
      let scanned = 0;
      const visited = /* @__PURE__ */ new Set();
      const relevant = /^(width|height|padding|gap|row-gap|column-gap|font|line-height|letter-spacing|color|background|border|box-shadow|text-shadow|filter|opacity|all|--)/;
      sheets.forEach((sheet) => visitSheet2(sheet, []));
      evidenceLimits.push("\uD6C4\uBCF4\uB9CC \uD45C\uC2DC: cascade \uC2B9\uC790, inheritance, shorthand, layer/important, scope/container, animation, source map/\uC6D0\uBCF8 \uC904, authoring Tailwind\uB294 \uCD94\uC801\uBD88\uAC00.");
      if (root instanceof win.ShadowRoot) evidenceLimits.push("Shadow DOM scoped cascade/slot \uC0C1\uC18D\uC740 \uBD80\uBD84\uC870\uD68C");
      if (subjects.length === 9) evidenceLimits.push("\uC0C1\uC18D \uD6C4\uBCF4 \uC870\uC0C1\uC740 \uCD5C\uB300 8\uB2E8\uACC4");
      return { ok: true, capturedAt: (/* @__PURE__ */ new Date()).toISOString(), tag: el3.tagName.slice(0, 128), id: el3.id.slice(0, 2048), classes: Array.from(el3.classList).slice(0, 100).map((c) => c.slice(0, 256)), inline: (el3.getAttribute("style") ?? "").slice(0, 4096), computed, rect: { width: rect.width, height: rect.height }, geometryIssue, shadowIssue, textIssue, candidates, evidenceLimits: evidenceLimits.slice(0, 100) };
    } catch (e) {
      return { ok: false, error: `\uC218\uC9D1 \uC2E4\uD328: ${e instanceof Error ? e.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"}` };
    }
  }

  // apps/chrome-extension/src/normalize.ts
  function normalizeDOM(snapshot2) {
    const p = emptyProperties("DOM \uC218\uC9D1 \uC815\uBCF4 \uC5C6\uC74C");
    if (!snapshot2.ok || !snapshot2.computed || !snapshot2.rect) return p;
    const s = snapshot2.computed;
    for (const key of ["width", "height"]) p[key] = snapshot2.geometryIssue ? unavailable(snapshot2.geometryIssue) : numberValue(snapshot2.rect[key], "px", `untransformed rect border-box. computed ${key}=${s[key]}, box-sizing=${s["box-sizing"]}`);
    const mapping = { paddingTop: "padding-top", paddingRight: "padding-right", paddingBottom: "padding-bottom", paddingLeft: "padding-left", rowGap: "row-gap", columnGap: "column-gap", fontSize: "font-size", lineHeight: "line-height", letterSpacing: "letter-spacing", borderTopWidth: "border-top-width", borderRightWidth: "border-right-width", borderBottomWidth: "border-bottom-width", borderLeftWidth: "border-left-width", radiusTopLeft: "border-top-left-radius", radiusTopRight: "border-top-right-radius", radiusBottomRight: "border-bottom-right-radius", radiusBottomLeft: "border-bottom-left-radius" };
    for (const [key, css] of Object.entries(mapping)) p[key] = cssLength(s[css] ?? "unknown");
    if (!/^(inline-)?(flex|grid)$/.test(s.display)) {
      p.rowGap = unavailable("flex/grid \uC544\uB2CC \uC694\uC18C: gap \uC801\uC6A9 \uBE44\uAD50 \uC81C\uC678", "unknown");
      p.columnGap = unavailable("flex/grid \uC544\uB2CC \uC694\uC18C: gap \uC801\uC6A9 \uBE44\uAD50 \uC81C\uC678", "unknown");
    }
    for (const [key, css] of [["textColor", "color"], ["backgroundColor", "background-color"], ["borderTopColor", "border-top-color"], ["borderRightColor", "border-right-color"], ["borderBottomColor", "border-bottom-color"], ["borderLeftColor", "border-left-color"]]) p[key] = cssColor(s[css] ?? "unknown");
    if (s["background-image"] !== "none") p.backgroundColor = unavailable("background-image/gradient \uC874\uC7AC: \uBCF5\uD569 \uBC30\uACBD \uBE44\uAD50 \uBD88\uAC00");
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      const style = s[`border-${side.toLowerCase()}-style`];
      if (style === "none" || style === "hidden" || s[`border-${side.toLowerCase()}-width`] === "0px") p[`border${side}Color`] = unavailable("\uBCF4\uC774\uB294 border \uC5C6\uC74C: \uC0C9 \uBE44\uAD50 \uC81C\uC678", "unknown");
      else if (style !== "solid") {
        p[`border${side}Width`] = unavailable(`border style ${style}: Figma solid stroke\uC640 \uBE44\uAD50 \uBD88\uAC00`);
        p[`border${side}Color`] = unavailable(`border style ${style}`);
      }
    }
    const family = /^(?:"([^"]+)"|'([^']+)'|([^,]+))/.exec(s["font-family"] ?? "");
    p.fontFamily = family ? stringValue((family[1] ?? family[2] ?? family[3]).trim(), "CSS \uCCAB \uC694\uCCAD family. fallback \uC2E4\uC81C\uC0AC\uC6A9 \uD3F0\uD2B8 \uBBF8\uD655\uC778") : unavailable("font-family \uD655\uC778 \uBD88\uAC00", "unknown");
    const weight = s["font-weight"];
    p.fontWeight = /^\d+(?:\.\d+)?$/.test(weight) ? numberValue(Number(weight), "number") : unavailable(`font-weight ${weight} numeric \uC544\uB2D8`);
    const opacity = s.opacity;
    p.opacity = /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(opacity) ? numberValue(Number(opacity), "number", "\uC694\uC18C \uC790\uCCB4 opacity. \uC870\uC0C1 opacity \uBC0F paint alpha\uC640 \uD569\uC131 \uC548 \uD568") : unavailable("opacity numeric \uD655\uC778 \uBD88\uAC00");
    if (snapshot2.textIssue) for (const key of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textColor"]) p[key] = unavailable(snapshot2.textIssue, "unknown");
    return p;
  }
  function normalizeShadows(snapshot2) {
    if (!snapshot2.ok) return shadowUnavailable("DOM \uADF8\uB9BC\uC790 \uBBF8\uC218\uC9D1", "unknown");
    if (snapshot2.geometryIssue || snapshot2.shadowIssue) return shadowUnavailable(snapshot2.geometryIssue || snapshot2.shadowIssue);
    return parseBoxShadows(snapshot2.computed?.["box-shadow"]);
  }

  // apps/chrome-extension/src/panel.ts
  var $ = (id) => document.getElementById(id);
  var status = $("status");
  var results = $("results");
  var evidence = $("evidence");
  var domLabel = $("dom-label");
  for (const [id, action, title] of [["paste-toggle", "clipboard", "Figma \uB514\uC790\uC778 JSON \uBD99\uC5EC\uB123\uAE30"], ["import-button", "import", "Figma \uB514\uC790\uC778 JSON \uD30C\uC77C \uAC00\uC838\uC624\uAE30"], ["paste-import", "check", "\uC785\uB825\uD55C \uB514\uC790\uC778 JSON \uAC80\uC0AC \uBC0F \uC801\uC6A9"], ["paste-cancel", "cancel", "\uC785\uB825 \uCD08\uC548 \uCDE8\uC18C"], ["clear", "clear", "\uC800\uC7A5\uD55C \uB514\uC790\uC778 JSON \uBE44\uC6B0\uAE30"], ["pick", "select", "\uC6F9 \uC694\uC18C \uC120\uD0DD"]]) setAction($(id), action, void 0, title);
  var picker = $("node");
  var fileInput = $("file");
  var design;
  var snapshot;
  var epoch = 0;
  var importing = 0;
  var selectionConfirmed = false;
  var hasWebSelection = () => Boolean(snapshot?.ok && (selectionConfirmed || !["BODY", "HTML"].includes(snapshot.tag ?? "")));
  var storageKey = "figcheck.design.v1";
  var ownSelection = false;
  var pickerSequence = 0;
  var pickerToken = "";
  var code = () => `(${collectSelected.toString()})(${ownSelection ? `window[Symbol.for('figcheck.picker.v1')]?.token===${JSON.stringify(pickerToken)}?window[Symbol.for('figcheck.picker.v1')].selected:undefined` : "$0"})`;
  function pickerRequest(op, shortcut = false) {
    chrome.runtime.sendMessage({ type: "figcheck-picker-action", tabId: chrome.devtools.inspectedWindow.tabId, op, shortcut, issuedAt: Date.now() }).catch(() => {
      $("picker-status").textContent = "DevTools \uC5F0\uACB0\uC774 \uB05D\uB0AC\uC5B4\uC694. DevTools\uB97C \uB2E4\uC2DC \uC5F4\uC5B4\uC8FC\uC138\uC694.";
    });
  }
  var pickerWindow = window;
  pickerWindow.figcheckPickerState = (s) => {
    $("pick").dataset.pinned = String(s.pinned === true);
    pickerToken = s.token;
    $("picker-status").textContent = s.message;
    setAction($("pick"), s.active ? "cancel" : "select", s.active ? "\uC694\uC18C \uC120\uD0DD \uCDE8\uC18C (Esc)" : s.pinned ? "\uB2E4\uC2DC \uC120\uD0DD" : "\uC694\uC18C \uC120\uD0DD");
    $("pick").setAttribute("aria-pressed", String(s.active));
    if (s.forget) {
      ownSelection = false;
      pickerSequence = 0;
    }
    if (s.selected && s.sequence > pickerSequence) {
      resetComparisonView();
      pickerSequence = s.sequence;
      ownSelection = true;
      selectionConfirmed = true;
      capture();
    }
  };
  $("pick").onclick = () => pickerRequest("toggle");
  window.addEventListener("keydown", (e) => {
    if ($("help-dialog").open || $("settings-dialog").open) return;
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyX") {
      e.preventDefault();
      pickerRequest("toggle", true);
    } else if (e.key === "Escape" && ($("pick").getAttribute("aria-pressed") === "true" || $("pick").dataset.pinned === "true")) pickerRequest("cancel");
  });
  chrome.commands.getAll((commands) => {
    const shortcut = commands.find((c) => c.name === "figcheck-pick")?.shortcut;
    $("shortcut").textContent = shortcut ? `${shortcut}: \uD398\uC774\uC9C0\uC5D0 \uD3EC\uCEE4\uC2A4\uB97C \uB450\uACE0 \uC120\uD0DD` : "\uB2E8\uCD95\uD0A4 \uBBF8\uD560\uB2F9. chrome://extensions/shortcuts\uC5D0\uC11C \uC124\uC815";
  });
  chrome.runtime.sendMessage({ type: "figcheck-panel-ready", tabId: chrome.devtools.inspectedWindow.tabId }).catch(() => {
  });
  var writeStatus = (text2, error = false) => {
    status.textContent = text2;
    status.classList.toggle("error", error);
  };
  function updateFlow() {
    const node = design && flattenNodes(design).find((n) => n.id === picker.value);
    const ready = Boolean(node && hasWebSelection());
    $("design-summary").title = node ? `${node.name} (${node.type})` : "";
    $("design-state").textContent = node ? "" : "\uC120\uD0DD \uC0AC\uD56D";
    $("design-state").hidden = Boolean(node);
    $("design-state").classList.toggle("ready", Boolean(node));
    $("design-summary").textContent = node ? node.name : "";
    $("design-summary").hidden = !node;
    $("web-state").textContent = hasWebSelection() ? "" : "\uC120\uD0DD \uB300\uAE30";
    $("web-state").hidden = hasWebSelection();
    $("web-state").classList.toggle("ready", hasWebSelection());
    $("clear").hidden = !design;
    $("paste-toggle").hidden = $("paste-details").open;
    setAction($("paste-toggle"), "clipboard", design ? "\uB514\uC790\uC778 \uBCC0\uACBD" : "JSON \uBD99\uC5EC\uB123\uAE30", "Figma \uB514\uC790\uC778 JSON \uBD99\uC5EC\uB123\uAE30");
    $("node-label").hidden = !design || flattenNodes(design).length < 2;
    setAction($("import-button"), "import", "\uD30C\uC77C \uAC00\uC838\uC624\uAE30", "Figma \uB514\uC790\uC778 JSON \uD30C\uC77C \uAC00\uC838\uC624\uAE30");
    $("css-details").hidden = !ready;
    for (const [id, done, current2] of [["step-design", Boolean(node), false], ["step-web", hasWebSelection(), !hasWebSelection()], ["step-result", false, hasWebSelection()]]) {
      const step = $(id);
      step.classList.toggle("done", done);
      if (current2) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    }
  }
  function showSelectionGuide() {
    $("help-button").click();
  }
  var included = new Set(keys);
  var categoryNames = categoryLabels;
  try {
    const saved = JSON.parse(localStorage.getItem("figcheck.included.v1") ?? "null");
    if (Array.isArray(saved) && saved.every((k) => keys.includes(k))) {
      included.clear();
      saved.forEach((k) => included.add(k));
    }
  } catch {
  }
  function updateGroups() {
    for (const [group, list] of Object.entries(categories)) {
      const input = $("group-" + group), count = list.filter((k) => included.has(k)).length;
      input.checked = count === list.length;
      input.indeterminate = count > 0 && count < list.length;
    }
    $("included-count").textContent = `${included.size}/${keys.length}\uAC1C \uD3EC\uD568`;
  }
  function changeIncluded() {
    updateGroups();
    try {
      localStorage.setItem("figcheck.included.v1", JSON.stringify([...included]));
    } catch {
    }
    render();
  }
  for (const [group, list] of Object.entries(categories)) {
    const field = document.createElement("fieldset"), legend = document.createElement("legend"), label = document.createElement("label"), all = document.createElement("input");
    all.type = "checkbox";
    all.id = "group-" + group;
    label.append(all, document.createTextNode(" " + categoryNames[group]));
    legend.append(label);
    field.append(legend);
    field.className = "property-category-card";
    field.dataset.category = group;
    const options = document.createElement("div");
    options.className = "property-options";
    options.id = "options-" + group;
    all.setAttribute("aria-controls", options.id);
    all.setAttribute("aria-label", categoryNames[group] + " \uC804\uCCB4 \uC120\uD0DD");
    field.append(options);
    const subgroupTargets = /* @__PURE__ */ new Map();
    for (const key of list) {
      const l = document.createElement("label"), input = document.createElement("input");
      input.type = "checkbox";
      input.id = "include-" + key;
      input.checked = included.has(key);
      input.onchange = () => {
        if (input.checked) included.add(key);
        else included.delete(key);
        changeIncluded();
      };
      l.append(input, document.createTextNode(" " + labels[key]));
      const subgroup = group === "spacing" ? key.startsWith("padding") ? "\uB0B4\uBD80 \uC5EC\uBC31" : "\uC694\uC18C \uC0AC\uC774 \uAC04\uACA9" : group === "border" ? key.startsWith("radius") ? "\uBAA8\uC11C\uB9AC \uBC18\uACBD" : key.endsWith("Width") ? "\uD14C\uB450\uB9AC \uB450\uAED8" : "\uD14C\uB450\uB9AC \uC0C9\uC0C1" : "";
      if (subgroup) {
        let target = subgroupTargets.get(subgroup);
        if (!target) {
          const section = document.createElement("div"), heading2 = document.createElement("h4");
          section.className = "property-subgroup";
          heading2.textContent = subgroup;
          heading2.id = "subgroup-" + key;
          target = document.createElement("div");
          target.className = "property-option-list";
          target.setAttribute("role", "group");
          target.setAttribute("aria-labelledby", heading2.id);
          section.append(heading2, target);
          options.append(section);
          subgroupTargets.set(subgroup, target);
        }
        target.append(l);
      } else options.append(l);
    }
    all.onchange = () => {
      for (const key of list) {
        if (all.checked) included.add(key);
        else included.delete(key);
        $("include-" + key).checked = all.checked;
      }
      changeIncluded();
    };
    $("property-groups").append(field);
  }
  updateGroups();
  var includeShadows = true;
  try {
    includeShadows = localStorage.getItem("figcheck.shadows.included") !== "false";
  } catch {
  }
  var shadowLabel = document.createElement("label");
  var shadowInput = document.createElement("input");
  shadowInput.type = "checkbox";
  shadowInput.id = "include-shadows";
  shadowInput.checked = includeShadows;
  shadowLabel.append(shadowInput, document.createTextNode(" \uADF8\uB9BC\uC790"));
  var shadowField = document.createElement("fieldset");
  var shadowLegend = document.createElement("legend");
  shadowField.className = "property-category-card shadow-setting";
  shadowField.dataset.category = "shadow";
  shadowLegend.append(shadowLabel);
  shadowField.append(shadowLegend);
  $("property-groups").append(shadowField);
  shadowInput.onchange = () => {
    includeShadows = shadowInput.checked;
    try {
      localStorage.setItem("figcheck.shadows.included", String(includeShadows));
    } catch {
    }
    render();
  };
  for (const [id, enabled] of [["include-all", true], ["include-none", false]]) {
    $(id).onclick = () => {
      included.clear();
      if (enabled) keys.forEach((key) => included.add(key));
      for (const key of keys) $("include-" + key).checked = enabled;
      includeShadows = enabled;
      shadowInput.checked = enabled;
      try {
        localStorage.setItem("figcheck.shadows.included", String(enabled));
      } catch {
      }
      changeIncluded();
    };
  }
  function render() {
    updateFlow();
    if (!design) {
      evidence.replaceChildren();
      const webReady = hasWebSelection();
      if (webReady) try {
        const actual = snapshot?.ok ? normalizeDOM(snapshot) : void 0;
        if (actual) validateProperties(actual);
        renderWebOnly(results, actual, snapshot?.computed);
      } catch {
        writeStatus("\uC6F9 \uAC12\uC744 \uD655\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC694\uC18C\uB97C \uB2E4\uC2DC \uC120\uD0DD\uD558\uC138\uC694.", true);
      }
      else {
        emptyResult(results, "\uC6F9 \uC694\uC18C\uB97C \uC120\uD0DD\uD558\uC138\uC694", "\uD398\uC774\uC9C0\uC758 \uC694\uC18C\uB97C \uD074\uB9AD\uD574 \uD06C\uAE30\xB7\uC5EC\uBC31\xB7\uC0C9\uC0C1\xB7\uAE00\uAF34\uC744 \uD655\uC778\uD569\uB2C8\uB2E4. Figma \uBE44\uAD50\uB294 \uD544\uC694\uD560 \uB54C \uCD94\uAC00\uD558\uC138\uC694.", "\uC694\uC18C \uC120\uD0DD", () => pickerRequest("toggle"));
        $("next-action").remove();
      }
      return;
    }
    if (!snapshot?.ok || !hasWebSelection()) {
      evidence.replaceChildren();
      emptyResult(results, "\uC6F9 \uC694\uC18C\uB97C \uC120\uD0DD\uD558\uC138\uC694", "\uB514\uC790\uC778\uC740 \uC900\uBE44\uB418\uC5B4 \uC788\uC5B4\uC694. \uC704\uC758 \uC694\uC18C \uC120\uD0DD \uBC84\uD2BC\uC73C\uB85C \uBE44\uAD50\uD560 \uC6F9 \uC694\uC18C\uB97C \uD074\uB9AD\uD558\uAC70\uB098 Elements \uD0ED\uC5D0\uC11C \uC120\uD0DD\uD558\uC138\uC694.", "\uC6F9 \uC694\uC18C \uC120\uD0DD \uBC29\uBC95 \uBCF4\uAE30", showSelectionGuide);
      $("next-action").remove();
      return;
    }
    try {
      const node = flattenNodes(design).find((n) => n.id === picker.value);
      if (!node) throw new Error("\uBE44\uAD50\uD560 \uB514\uC790\uC778\uC744 \uBAA9\uB85D\uC5D0\uC11C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.");
      const actual = normalizeDOM(snapshot);
      validateProperties(actual);
      const comparison = compare(node.properties, actual, normalTolerance, [...included]);
      comparison.shadows = compareShadows(node.shadows, normalizeShadows(snapshot), normalTolerance, includeShadows);
      const shadowTotal = comparison.shadows.total;
      comparison.total.supported += shadowTotal.supported;
      comparison.total.matched += shadowTotal.matched;
      comparison.total.score = comparison.total.supported ? comparison.total.matched / comparison.total.supported * 100 : null;
      renderComparison(results, evidence, comparison, snapshot, node.name);
      if (status.classList.contains("error")) writeStatus("\uBE44\uAD50 \uAE30\uC900\uC744 \uC801\uC6A9\uD588\uC5B4\uC694.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "\uBE44\uAD50 \uAE30\uC900\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.";
      writeStatus(message, true);
      emptyResult(results, "\uBE44\uAD50 \uAC12\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694", message, "\uB2E4\uC2DC \uD655\uC778", capture);
    }
  }
  function setDesign(doc) {
    resetComparisonView();
    design = doc;
    picker.replaceChildren();
    for (const node of flattenNodes(doc)) {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = `${node.name} (${node.type}, ${node.id})`;
      picker.append(option);
    }
    picker.disabled = false;
    $("paste-details").open = false;
    render();
  }
  function importText(text2) {
    const doc = parseDesign(text2);
    setDesign(doc);
    try {
      localStorage.setItem(storageKey, JSON.stringify(doc));
      writeStatus("");
    } catch {
      writeStatus("\uAC00\uC838\uC624\uAE30 \uC644\uB8CC. \uC800\uC7A5 \uACF5\uAC04\uC774 \uBD80\uC871\uD574 \uD328\uB110\uC744 \uB2EB\uC73C\uBA74 \uB2E4\uC2DC \uAC00\uC838\uC640\uC57C \uD569\uB2C8\uB2E4.");
    }
  }
  var pasteInput = $("paste-json");
  var pasteError = $("paste-error");
  function resetPaste() {
    pasteInput.value = "";
    pasteError.textContent = "";
    pasteError.hidden = true;
    pasteInput.setAttribute("aria-invalid", "false");
  }
  function openPaste() {
    $("paste-details").open = true;
    updateFlow();
    pasteInput.focus();
  }
  $("compare-optional").onclick = openPaste;
  $("paste-toggle").onclick = openPaste;
  $("paste-details").addEventListener("toggle", () => {
    $("paste-toggle").setAttribute("aria-expanded", String($("paste-details").open));
    $("paste-toggle").hidden = $("paste-details").open;
    setAction($("paste-toggle"), "clipboard", design ? "\uB514\uC790\uC778 \uBCC0\uACBD" : "JSON \uBD99\uC5EC\uB123\uAE30", "Figma \uB514\uC790\uC778 JSON \uBD99\uC5EC\uB123\uAE30");
  });
  $("paste-import").onclick = () => {
    ++importing;
    fileInput.value = "";
    pasteError.hidden = true;
    try {
      if (!pasteInput.value.trim()) throw new Error("\uBD99\uC5EC\uB123\uC744 JSON\uC774 \uBE44\uC5B4 \uC788\uC5B4\uC694. Figma\uC5D0\uC11C JSON\uC744 \uBCF5\uC0AC\uD574 \uC8FC\uC138\uC694.");
      importText(pasteInput.value);
      resetPaste();
      $("paste-details").open = false;
      updateFlow();
      $("design-summary").focus();
      writeStatus("\uB514\uC790\uC778\uC744 \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.");
    } catch (e) {
      pasteError.textContent = `${e instanceof Error ? e.message : "JSON \uC624\uB958"} \uAE30\uC874 \uBE44\uAD50 \uB300\uC0C1\uC740 \uC720\uC9C0\uD588\uC5B4\uC694.`;
      pasteError.hidden = false;
      pasteInput.setAttribute("aria-invalid", "true");
      pasteInput.focus();
    }
  };
  $("paste-cancel").onclick = () => {
    resetPaste();
    $("paste-details").open = false;
    updateFlow();
    writeStatus("\uBD99\uC5EC\uB123\uAE30\uB97C \uCDE8\uC18C\uD588\uC2B5\uB2C8\uB2E4. \uAE30\uC874 JSON\uC744 \uC720\uC9C0\uD569\uB2C8\uB2E4.");
    $("paste-toggle").focus();
  };
  pasteInput.addEventListener("input", () => {
    pasteError.hidden = true;
    pasteInput.setAttribute("aria-invalid", "false");
  });
  pasteInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      $("paste-import").click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      $("paste-cancel").click();
    }
  });
  function safeSnapshot(value) {
    if (JSON.stringify(value)?.length > 512 * 1024 || !value || typeof value !== "object") throw new Error("DOM snapshot \uD06C\uAE30/\uD615\uC2DD \uC624\uB958");
    const v = value;
    if (typeof v.ok !== "boolean") throw new Error("DOM snapshot status \uC624\uB958");
    if (!v.ok) {
      if (typeof v.error !== "string") throw new Error("DOM \uC624\uB958 \uBA54\uC2DC\uC9C0 \uB204\uB77D");
      return { ok: false, error: v.error.slice(0, 2048) };
    }
    if (!v.computed || typeof v.computed !== "object" || Object.values(v.computed).some((s) => typeof s !== "string" || s.length > 4096)) throw new Error("computedStyle \uD615\uC2DD \uC624\uB958");
    if (!v.rect || !Number.isFinite(v.rect.width) || !Number.isFinite(v.rect.height) || v.rect.width < 0 || v.rect.height < 0) throw new Error("rect \uD615\uC2DD \uC624\uB958");
    for (const key of ["capturedAt", "tag", "id", "inline", "geometryIssue", "shadowIssue", "textIssue"]) if (v[key] !== void 0 && (typeof v[key] !== "string" || v[key].length > 4096)) throw new Error("DOM \uBB38\uC790\uC5F4 \uD615\uC2DD \uC624\uB958");
    for (const list of [v.classes, v.evidenceLimits]) if (!Array.isArray(list) || list.length > 100 || list.some((s) => typeof s !== "string" || s.length > 4096)) throw new Error("DOM \uBAA9\uB85D \uD615\uC2DD \uC624\uB958");
    if (!Array.isArray(v.candidates) || v.candidates.length > 100 || v.candidates.some((c) => !c || typeof c.selector !== "string" || typeof c.source !== "string" || typeof c.declarations !== "string" || typeof c.inherited !== "boolean" || !Array.isArray(c.context) || c.context.some((s) => typeof s !== "string"))) throw new Error("CSS \uD6C4\uBCF4 \uD615\uC2DD \uC624\uB958");
    return v;
  }
  var lastFingerprint = "";
  var probePending = false;
  function capture(quiet = false, changed = false) {
    if (quiet && !changed) {
      if (probePending || !hasWebSelection()) return;
      probePending = true;
      const generation = epoch;
      const selected = ownSelection ? `window[Symbol.for('figcheck.picker.v1')]?.token===${JSON.stringify(pickerToken)}?window[Symbol.for('figcheck.picker.v1')].selected:undefined` : "$0";
      chrome.devtools.inspectedWindow.eval(`(${selectionFingerprint.toString()})(${selected})`, (value, error) => {
        probePending = false;
        if (generation !== epoch || document.hidden) return;
        if (error?.isException || error?.isError || typeof value !== "string") return;
        if (value !== lastFingerprint) {
          lastFingerprint = value;
          capture(true, true);
        }
      });
      return;
    }
    if (!quiet) lastFingerprint = "";
    const previous = snapshot;
    const token = ++epoch;
    if (!quiet) {
      snapshot = void 0;
      domLabel.textContent = "\uC120\uD0DD\uD55C \uC6F9 \uC694\uC18C \uD655\uC778 \uC911\u2026";
      $("web-meta").textContent = "";
      render();
    }
    chrome.devtools.inspectedWindow.eval(code(), (value, error) => {
      if (token !== epoch) return;
      try {
        if (error?.isException || error?.isError) throw new Error("\uD604\uC7AC \uD0ED \uC218\uC9D1 \uBD88\uAC00. \uC77C\uBC18 \uC6F9\uD398\uC774\uC9C0\uC5D0\uC11C Elements \uC120\uD0DD\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.");
        snapshot = safeSnapshot(value);
        if (!snapshot.ok) resetComparisonView();
        domLabel.textContent = snapshot.ok ? `${snapshot.tag}${snapshot.id ? "#" + snapshot.id : ""}` : "\uC120\uD0DD\uD55C \uC6F9 \uC694\uC18C\uB97C \uC77D\uC9C0 \uBABB\uD588\uC5B4\uC694.";
        $("web-meta").textContent = snapshot.ok ? `${snapshot.rect?.width.toFixed(1)} \xD7 ${snapshot.rect?.height.toFixed(1)}px${["BODY", "HTML"].includes(snapshot.tag ?? "") ? " \uD398\uC774\uC9C0 \uC804\uCCB4\uAC00 \uC120\uD0DD\uB410\uC5B4\uC694. \uC6D0\uD558\uB294 \uBD80\uBD84\uC778\uC9C0 \uD655\uC778\uD558\uC138\uC694." : ""}` : `${snapshot.error ?? "\uC694\uC18C \uC120\uD0DD \uBC84\uD2BC\uC73C\uB85C \uBE44\uAD50\uD560 \uC694\uC18C\uB97C \uC120\uD0DD\uD558\uC138\uC694."}`;
        if (snapshot.ok && !hasWebSelection()) {
          domLabel.textContent = "\uC6F9 \uC694\uC18C \uC120\uD0DD \uB300\uAE30";
          $("web-meta").textContent = "\uD398\uC774\uC9C0 \uC804\uCCB4\uAC00 \uAE30\uBCF8 \uC120\uD0DD\uB410\uC5B4\uC694. \uC694\uC18C \uC120\uD0DD\uC73C\uB85C \uBC94\uC704\uB97C \uC881\uD788\uC138\uC694.";
        }
        if (quiet && previous && JSON.stringify({ ...previous, capturedAt: void 0 }) === JSON.stringify({ ...snapshot, capturedAt: void 0 })) return;
        render();
      } catch (e) {
        resetComparisonView();
        snapshot = void 0;
        domLabel.textContent = "\uC6F9 \uC694\uC18C\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694.";
        $("web-meta").textContent = (e instanceof Error ? e.message : "\uC218\uC9D1 \uC624\uB958") + " Elements\uC5D0\uC11C \uB2E4\uC2DC \uC120\uD0DD\uD558\uC138\uC694.";
        render();
      }
    });
  }
  fileInput.onchange = async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      writeStatus("\uD30C\uC77C \uC120\uD0DD\uC744 \uCDE8\uC18C\uD588\uC2B5\uB2C8\uB2E4. \uD604\uC7AC JSON\uC744 \uC720\uC9C0\uD569\uB2C8\uB2E4.");
      return;
    }
    const token = ++importing;
    try {
      if (file.size > 1024 * 1024) throw new Error("JSON \uCD5C\uB300 1 MiB");
      const text2 = await file.text();
      if (token !== importing) return;
      importText(text2);
    } catch (e) {
      if (token !== importing) return;
      render();
      writeStatus(`\uAC00\uC838\uC624\uAE30 \uC2E4\uD328: ${e instanceof Error ? e.message : "\uC624\uB958"} Figma\uC5D0\uC11C \uB2E4\uC2DC \uB0B4\uBCF4\uB0B8 JSON \uD30C\uC77C\uC744 \uAC00\uC838\uC640 \uC8FC\uC138\uC694.`, true);
    } finally {
      if (token === importing) fileInput.value = "";
    }
  };
  fileInput.addEventListener("cancel", () => writeStatus("\uD30C\uC77C \uC120\uD0DD\uC744 \uCDE8\uC18C\uD588\uC2B5\uB2C8\uB2E4. \uD604\uC7AC JSON\uC744 \uC720\uC9C0\uD569\uB2C8\uB2E4."));
  $("clear").onclick = () => {
    resetComparisonView();
    ++importing;
    design = void 0;
    picker.replaceChildren();
    picker.disabled = true;
    fileInput.value = "";
    localStorage.removeItem(storageKey);
    writeStatus("Figma JSON\uACFC \uB85C\uCEEC \uC800\uC7A5\uC744 \uC9C0\uC6E0\uC2B5\uB2C8\uB2E4.");
    render();
  };
  $("import-button").onclick = () => fileInput.click();
  picker.onchange = () => {
    resetComparisonView();
    render();
  };
  chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
    resetComparisonView();
    ownSelection = false;
    selectionConfirmed = true;
    capture();
  });
  chrome.devtools.network.onNavigated.addListener(() => {
    resetComparisonView();
    ownSelection = false;
    pickerSequence = 0;
    $("pick").textContent = "\uC694\uC18C \uC120\uD0DD";
    $("pick").setAttribute("aria-pressed", "false");
    $("picker-status").textContent = "\uD398\uC774\uC9C0 \uC774\uB3D9\uC73C\uB85C \uC120\uD0DD \uBAA8\uB4DC\uB97C \uC885\uB8CC\uD588\uC5B4\uC694.";
    selectionConfirmed = false;
    ++epoch;
    snapshot = void 0;
    domLabel.textContent = "\uD398\uC774\uC9C0\uAC00 \uBC14\uB00C\uC5C8\uC5B4\uC694. \uC6F9 \uC694\uC18C\uB97C \uB2E4\uC2DC \uC120\uD0DD\uD558\uC138\uC694.";
    $("web-meta").textContent = "\uC774\uC804 \uC120\uD0DD\uC758 \uACB0\uACFC\uB294 \uC9C0\uC6E0\uC5B4\uC694.";
    render();
  });
  window.figcheckRefresh = capture;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setDesign(parseDesign(saved));
      writeStatus("\uC774\uC804\uC5D0 \uAC00\uC838\uC628 \uB514\uC790\uC778\uC744 \uC5F4\uC5C8\uC5B4\uC694. \uB514\uC790\uC778\uC744 \uC218\uC815\uD588\uB2E4\uBA74 \uC0C8 JSON\uC744 \uAC00\uC838\uC624\uC138\uC694.");
    }
  } catch {
    localStorage.removeItem(storageKey);
    writeStatus("\uC800\uC7A5 \uB370\uC774\uD130\uAC00 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC544 \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.");
  }
  initializeHelp();
  initializeSettings();
  capture();
  var timer = setInterval(() => {
    if (!document.hidden) capture(true);
  }, 750);
  window.addEventListener("unload", () => {
    clearInterval(timer);
    ++epoch;
  });
  var themeKey = "figcheck.theme.v1";
  var theme = initializeTheme(chrome.devtools.panels.themeName === "dark" ? "dark" : "light", (value, revision) => {
    try {
      localStorage.setItem(themeKey, value);
      theme.saved(revision, false);
    } catch {
      theme.saved(revision, true);
    }
  });
  try {
    const saved = localStorage.getItem(themeKey);
    if (isTheme(saved)) theme.restore(saved);
  } catch {
  }
  var colorKey = "figcheck.color-format.v1";
  var colorSettings = initializeColorFormat((value, revision) => {
    try {
      localStorage.setItem(colorKey, value);
      colorSettings.saved(revision, false);
    } catch {
      colorSettings.saved(revision, true);
    }
  });
  try {
    const saved = localStorage.getItem(colorKey);
    if (isColorFormat(saved)) colorSettings.restore(saved);
  } catch {
  }
})();
