"use strict";
(() => {
  // packages/ui/color.ts
  function isColorFormat(value) {
    return value === "hex" || value === "rgb" || value === "hsl";
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
  var unavailable = (reason, status = "unsupported") => ({ status, reason });
  var numberValue = (value, kind = "px", note) => Number.isFinite(value) ? { status: "supported", kind, value, ...note ? { note } : {} } : unavailable("\uC720\uD55C\uD55C \uC22B\uC790\uAC00 \uC544\uB2D8", "unknown");
  var stringValue = (value, note) => ({ status: "supported", kind: "string", value, ...note ? { note } : {} });
  var colorValue = (value) => value.length === 4 && value.every((v, i) => Number.isFinite(v) && v >= 0 && v <= (i === 3 ? 1 : 255)) ? { status: "supported", kind: "rgba", value } : unavailable("\uC720\uD55C\uD55C sRGB RGBA \uBC94\uC704\uB97C \uBC97\uC5B4\uB0A8", "unknown");
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

  // apps/figma-plugin/src/protocol.ts
  var BUILD = "0.3.7";
  var PROTOCOL = "figcheck-plugin-1";

  // apps/figma-plugin/src/code.ts
  var session = "";
  var requestId = 0;
  var sequence = 0;
  var themeKey = "figcheck.theme.v1";
  var themeRevision = 0;
  var latestThemeRequest = 0;
  var themeWrites = Promise.resolve();
  async function loadTheme(readySession) {
    const revision = themeRevision;
    try {
      const saved = await figma.clientStorage.getAsync(themeKey);
      if (session === readySession && revision === themeRevision && (saved === "light" || saved === "dark")) send({ type: "theme", theme: saved, themeRevision: 0 });
    } catch {
    }
  }
  var colorKey = "figcheck.color-format.v1";
  var colorRevision = 0;
  var latestColorRequest = 0;
  var colorWrites = Promise.resolve();
  async function loadColorFormat(owner) {
    const revision = colorRevision;
    try {
      const value = await figma.clientStorage.getAsync(colorKey);
      if (owner === session && revision === colorRevision && isColorFormat(value)) send({ type: "color-format", colorFormat: value, colorRevision: 0 });
    } catch {
    }
  }
  var startupError;
  function errorInfo(error) {
    return { message: error instanceof Error ? error.message.slice(0, 2e3) : String(error).slice(0, 2e3), detail: error instanceof Error ? (error.stack || error.message).slice(0, 4e3) : String(error).slice(0, 4e3) };
  }
  function send(message) {
    if (!session) return;
    figma.ui.postMessage({ ...message, protocol: PROTOCOL, session, requestId, sequence: ++sequence, build: BUILD });
  }
  function snapshot() {
    if (!session) return;
    try {
      if (startupError) {
        send({ type: "state", state: "error", ...startupError });
        return;
      }
      send({ type: "state", state: "extracting" });
      const selection = figma.currentPage.selection;
      if (selection.length !== 1) {
        send({ type: "state", state: selection.length ? "multiple-selection" : "empty-selection", selectionCount: selection.length });
        return;
      }
      const profile = figma.root.documentColorProfile;
      const document = { schemaVersion: VERSION, source: "figma", colorProfile: profile === "SRGB" ? "SRGB" : profile === "DISPLAY_P3" ? "DISPLAY_P3" : "UNKNOWN", exportedAt: (/* @__PURE__ */ new Date()).toISOString(), nodes: [extractNode(selection[0], figma.mixed, profile)] };
      send({ type: "state", state: "complete", document });
    } catch (error) {
      const info = errorInfo(error);
      console.error("[FigCheck " + BUILD + "] extract: " + info.message);
      send({ type: "state", state: "error", ...info });
    }
  }
  figma.ui.onmessage = (value) => {
    if (!value || typeof value !== "object") return;
    const m = value;
    if (m.protocol !== PROTOCOL || typeof m.session !== "string" || !m.session || m.session.length > 128 || !Number.isSafeInteger(m.requestId) || !m.requestId || m.requestId < 1) return;
    if (m.type === "ready") {
      if (m.session === session && m.requestId <= requestId) return;
      session = m.session;
      requestId = m.requestId;
      latestThemeRequest = 0;
      latestColorRequest = 0;
      send({ type: "ready" });
      snapshot();
      void loadTheme(session);
      void loadColorFormat(session);
      return;
    }
    if (m.session !== session || m.requestId < requestId) return;
    if (m.type === "color-set") {
      if (!isColorFormat(m.colorFormat) || !Number.isSafeInteger(m.colorRevision) || m.colorRevision <= latestColorRequest) return;
      const value2 = m.colorFormat, revision = m.colorRevision, owner = session;
      latestColorRequest = revision;
      ++colorRevision;
      colorWrites = colorWrites.then(async () => {
        let failed = false;
        try {
          await figma.clientStorage.setAsync(colorKey, value2);
        } catch {
          failed = true;
        }
        if (owner === session) send({ type: "color-format", colorFormat: value2, colorRevision: revision, colorError: failed });
      });
      return;
    }
    if (m.type === "theme-set") {
      if (m.theme !== "light" && m.theme !== "dark" || !Number.isSafeInteger(m.themeRevision) || m.themeRevision <= latestThemeRequest) return;
      const value2 = m.theme, revision = m.themeRevision, owner = session;
      latestThemeRequest = revision;
      ++themeRevision;
      themeWrites = themeWrites.then(async () => {
        let failed = false;
        try {
          await figma.clientStorage.setAsync(themeKey, value2);
        } catch {
          failed = true;
        }
        if (session === owner) send({ type: "theme", theme: value2, themeRevision: revision, themeError: failed });
      });
      return;
    }
    if (m.type === "refresh") {
      requestId = m.requestId;
      snapshot();
    }
    if (m.type === "close") figma.closePlugin();
  };
  try {
    figma.on("selectionchange", snapshot);
  } catch (error) {
    startupError = errorInfo(error);
    console.error("[FigCheck " + BUILD + "] selectionchange: " + startupError.message);
  }
  try {
    figma.showUI(__html__, { width: 440, height: 640, themeColors: true, title: "FigCheck " + BUILD });
  } catch (error) {
    console.error("[FigCheck " + BUILD + "] showUI: " + errorInfo(error).detail);
    throw error;
  }
})();
