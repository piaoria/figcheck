"use strict";
(() => {
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
  var unavailable = (reason, status = "unsupported") => ({ status, reason });
  var numberValue = (value, kind = "px", note) => Number.isFinite(value) ? { status: "supported", kind, value, ...note ? { note } : {} } : unavailable("\uC720\uD55C\uD55C \uC22B\uC790\uAC00 \uC544\uB2D8", "unknown");
  var stringValue = (value, note) => ({ status: "supported", kind: "string", value, ...note ? { note } : {} });
  var colorValue = (value) => ({ status: "supported", kind: "rgba", value });
  function emptyProperties(reason = "\uC774 \uB178\uB4DC\uC5D0\uC11C \uC18D\uC131\uC744 \uD655\uC778\uD560 \uC218 \uC5C6\uC74C") {
    return Object.fromEntries(keys.map((k) => [k, unavailable(reason, "unknown")]));
  }

  // apps/figma-plugin/src/extract.ts
  function extractNode(node, mixed, colorProfile) {
    const p = emptyProperties();
    const numeric = (v, label, kind = "px") => typeof v === "number" ? numberValue(v, kind) : unavailable(v === mixed ? `Figma mixed ${label}` : `Figma ${label} \uC5C6\uC74C`, v === mixed ? "unsupported" : "unknown");
    const paint = (paints) => {
      if (colorProfile !== "SRGB") return unavailable(`Figma ${colorProfile} \uC0C9\uACF5\uAC04: sRGB \uBCC0\uD658 \uBBF8\uC9C0\uC6D0`);
      if (typeof paints === "symbol") return unavailable("Figma mixed paint");
      if (!paints) return unavailable("paint \uC18D\uC131 \uC5C6\uC74C", "unknown");
      const visible = paints.filter((v) => v.visible !== false);
      if (visible.length === 0) return colorValue([0, 0, 0, 0]);
      if (visible.length !== 1 || visible[0].type !== "SOLID" || visible[0].blendMode && visible[0].blendMode !== "NORMAL") return unavailable("gradient/image/\uBCF5\uC218 paint/blend\uB294 \uB2E8\uC0C9 \uBE44\uAD50 \uBD88\uAC00");
      const c = visible[0];
      return colorValue([c.color.r * 255, c.color.g * 255, c.color.b * 255, c.opacity ?? 1]);
    };
    let transformed = false;
    for (let n = node; n && n.type !== "DOCUMENT" && n.type !== "PAGE"; n = n.parent) {
      if ("relativeTransform" in n) {
        const t = n.relativeTransform;
        if (Math.abs(t[0][0] - 1) > 1e-6 || Math.abs(t[1][1] - 1) > 1e-6 || Math.abs(t[0][1]) > 1e-6 || Math.abs(t[1][0]) > 1e-6) transformed = true;
      }
    }
    p.width = transformed ? unavailable("\uC790\uAE30/\uC870\uC0C1 Figma transform: \uACBD\uACC4\uC0C1\uC790 \uBE44\uAD50 \uC81C\uC678") : numeric(node.width, "width");
    p.height = transformed ? unavailable("\uC790\uAE30/\uC870\uC0C1 Figma transform: \uACBD\uACC4\uC0C1\uC790 \uBE44\uAD50 \uC81C\uC678") : numeric(node.height, "height");
    if ("opacity" in node) p.opacity = numeric(node.opacity, "opacity", "number");
    if ("layoutMode" in node && (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL")) {
      for (const key of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) p[key] = numeric(node[key], key);
      const primary = node.primaryAxisAlignItems === "SPACE_BETWEEN" ? unavailable("Figma SPACE_BETWEEN: \uACE0\uC815 gap \uC544\uB2D8") : numeric(node.itemSpacing, "itemSpacing");
      const cross = node.layoutWrap === "WRAP" ? node.counterAxisAlignContent === "SPACE_BETWEEN" ? unavailable("Figma cross-axis SPACE_BETWEEN: \uACE0\uC815 gap \uC544\uB2D8") : numeric(node.counterAxisSpacing ?? void 0, "counterAxisSpacing") : unavailable("Figma \uBE44-wrap: \uAD50\uCC28\uCD95 gap \uC815\uC758 \uC5C6\uC74C", "unknown");
      p.columnGap = node.layoutMode === "HORIZONTAL" ? primary : cross;
      p.rowGap = node.layoutMode === "VERTICAL" ? primary : cross;
    } else for (const key of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "rowGap", "columnGap"]) p[key] = unavailable("Figma Auto Layout HORIZONTAL/VERTICAL \uD544\uC694", "unknown");
    p.backgroundColor = node.type === "TEXT" ? colorValue([0, 0, 0, 0]) : paint("fills" in node ? node.fills : void 0);
    p.textColor = node.type === "TEXT" ? paint(node.fills) : unavailable("TEXT \uB178\uB4DC\uAC00 \uC544\uB2C8\uBBC0\uB85C \uC790\uC2DD \uD14D\uC2A4\uD2B8 \uC0C9 \uCD94\uC815 \uC548 \uD568", "unknown");
    if (node.type === "TEXT") {
      p.fontFamily = typeof node.fontName === "symbol" ? unavailable("Figma mixed fontName") : stringValue(node.fontName.family, "CSS \uCCAB \uC694\uCCAD font-family\uC640 \uBE44\uAD50. \uC2E4\uC81C \uB80C\uB354 \uD3F0\uD2B8 \uAC10\uC9C0 \uC544\uB2D8");
      p.fontSize = numeric(node.fontSize, "fontSize");
      p.fontWeight = numeric(node.fontWeight, "fontWeight", "number");
      const resolve = (v, label) => {
        if (typeof v === "symbol") return unavailable(`Figma mixed ${label}`);
        if (v.unit === "AUTO") return unavailable("Figma AUTO lineHeight: \uACE0\uC815 px \uC5C6\uC74C");
        if (v.unit === "PIXELS") return numberValue(v.value);
        return typeof node.fontSize === "number" ? numberValue(v.value / 100 * node.fontSize, "px", "Figma percent \xD7 \uB2E8\uC77C fontSize") : unavailable("percent \uAE30\uC900 fontSize\uAC00 mixed");
      };
      p.lineHeight = resolve(node.lineHeight, "lineHeight");
      p.letterSpacing = resolve(node.letterSpacing, "letterSpacing");
    }
    if ("strokes" in node) {
      const strokes = typeof node.strokes === "symbol" ? null : node.strokes.filter((s) => s.visible !== false);
      const noStroke = strokes?.length === 0;
      const borderShape = ["FRAME", "RECTANGLE", "COMPONENT", "INSTANCE", "COMPONENT_SET"].includes(node.type);
      const supported = noStroke || borderShape && strokes?.length === 1 && strokes[0].type === "SOLID" && node.strokeAlign === "INSIDE";
      const widths = ["strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"];
      const widthKeys = ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"];
      const colorKeys = ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"];
      widthKeys.forEach((key, i) => p[key] = supported ? noStroke ? numberValue(0) : numeric(widths[i] in node ? node[widths[i]] : node.strokeWeight, key) : unavailable("\uBCF5\uC218/mixed/gradient \uB610\uB294 CENTER/OUTSIDE stroke: CSS border \uB9E4\uD551 \uBD88\uAC00"));
      colorKeys.forEach((key) => p[key] = supported && !noStroke ? paint(node.strokes) : unavailable(noStroke ? "stroke \uC5C6\uC74C: border \uC0C9 \uBE44\uAD50 \uC81C\uC678" : "stroke \uB9E4\uD551 \uBD88\uAC00", noStroke ? "unknown" : "unsupported"));
      if (!noStroke && node.strokeAlign !== "INSIDE") {
        p.width = unavailable("CENTER/OUTSIDE stroke\uC758 CSS border-box \uB9E4\uD551 \uBD88\uAC00");
        p.height = unavailable("CENTER/OUTSIDE stroke\uC758 CSS border-box \uB9E4\uD551 \uBD88\uAC00");
      }
    }
    if ("cornerRadius" in node) {
      for (const [key, source] of [["radiusTopLeft", "topLeftRadius"], ["radiusTopRight", "topRightRadius"], ["radiusBottomRight", "bottomRightRadius"], ["radiusBottomLeft", "bottomLeftRadius"]]) {
        p[key] = "cornerSmoothing" in node && node.cornerSmoothing > 0 ? unavailable("Figma cornerSmoothing: CSS radius\uC640 \uD615\uD0DC \uB2E4\uB984") : numeric(source in node ? node[source] : node.cornerRadius, key);
      }
    }
    return { id: node.id, name: node.name || "(\uC774\uB984 \uC5C6\uC74C)", type: node.type, properties: p };
  }

  // apps/figma-plugin/src/code.ts
  figma.showUI(__html__, { width: 420, height: 540, themeColors: true });
  function snapshot() {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1) {
      figma.ui.postMessage({ type: "selection", error: selection.length ? "\uB178\uB4DC \uD558\uB098\uB9CC \uC120\uD0DD\uD574\uC8FC\uC138\uC694." : "Figma \uB178\uB4DC \uD558\uB098\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694." });
      return;
    }
    try {
      const colorProfile = figma.root.documentColorProfile;
      const doc = { schemaVersion: VERSION, source: "figma", colorProfile: colorProfile === "SRGB" ? "SRGB" : colorProfile === "DISPLAY_P3" ? "DISPLAY_P3" : "UNKNOWN", exportedAt: (/* @__PURE__ */ new Date()).toISOString(), nodes: [extractNode(selection[0], figma.mixed, colorProfile)] };
      figma.ui.postMessage({ type: "selection", document: doc });
    } catch (e) {
      figma.ui.postMessage({ type: "selection", error: e instanceof Error ? e.message : "\uCD94\uCD9C \uC2E4\uD328" });
    }
  }
  figma.on("selectionchange", snapshot);
  figma.ui.onmessage = (message) => {
    if (!message || typeof message !== "object" || !("type" in message)) return;
    if (message.type === "refresh") snapshot();
    if (message.type === "close") figma.closePlugin();
  };
  snapshot();
})();
