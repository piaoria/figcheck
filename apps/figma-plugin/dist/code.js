"use strict";
(() => {
  // packages/ui/color.ts
  function isColorFormat(value) {
    return value === "hex" || value === "rgb" || value === "hsl";
  }

  // packages/core/src/shadows.ts
  var shadowUnavailable = (reason, status = "unsupported") => ({ version: 1, status, layers: [], reason });
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
    let depth = 0, current = "";
    const result = [];
    for (const ch of input) {
      if (ch === "(") depth++;
      if (ch === ")" && --depth < 0) throw Error("\uAD04\uD638 \uC624\uB958");
      if (depth === 0 && (space ? /\s/.test(ch) : ch === ",")) {
        if (current.trim()) result.push(current.trim());
        else if (!space) throw Error("\uBE48 \uB808\uC774\uC5B4");
        current = "";
      } else current += ch;
    }
    if (depth !== 0 || !space && !current.trim()) throw Error("\uAD04\uD638/\uB808\uC774\uC5B4 \uC624\uB958");
    if (current.trim()) result.push(current.trim());
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
  var numericalEpsilon = { px: 1e-6, colorChannel: 2e-5, alpha: 1e-7, opacity: 1e-7, fontWeight: 1e-9 };

  // apps/figma-plugin/src/shadow-extract.ts
  function extractShadows(node, profile, css, cssError) {
    if (!("effects" in node) || !Array.isArray(node.effects)) return shadowUnavailable("effects \uBBF8\uC218\uC9D1", "unknown");
    if (node.effects.length > 64) return shadowUnavailable("\uD6A8\uACFC 64\uAC1C \uCD08\uACFC");
    const effects = node.effects.map((effect, index) => {
      const e = { index, type: effect.type, visible: effect.visible !== false };
      if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") Object.assign(e, { x: effect.offset.x, y: effect.offset.y, radius: effect.radius, spread: effect.spread ?? 0, color: [effect.color.r * 255, effect.color.g * 255, effect.color.b * 255, effect.color.a], blendMode: effect.blendMode, ...effect.type === "DROP_SHADOW" ? { showShadowBehindNode: effect.showShadowBehindNode ?? false } : {} });
      return e;
    });
    const fail = (reason, status = "unsupported") => ({ ...shadowUnavailable(reason, status), effects });
    if (!["RECTANGLE", "FRAME", "COMPONENT", "INSTANCE"].includes(node.type)) return fail("\uB2E8\uC77C \uBC15\uC2A4 \uB178\uB4DC\uB9CC \uC9C0\uC6D0: TEXT/\uBCA1\uD130/\uADF8\uB8F9\uD569\uC131 \uC81C\uC678");
    if (profile !== "SRGB") return fail("\uADF8\uB9BC\uC790 sRGB \uC0C9\uACF5\uAC04\uB9CC \uC9C0\uC6D0");
    for (let n = node; n && n.type !== "PAGE" && n.type !== "DOCUMENT"; n = n.parent) {
      if ("relativeTransform" in n) {
        const t = n.relativeTransform;
        if (Math.abs(t[0][0] - 1) > 1e-6 || Math.abs(t[1][1] - 1) > 1e-6 || Math.abs(t[0][1]) > 1e-6 || Math.abs(t[1][0]) > 1e-6) return fail("\uC790\uAE30/\uC870\uC0C1 transform \uADF8\uB9BC\uC790 \uB300\uC751 \uC81C\uC678");
      }
      if ("blendMode" in n && !["NORMAL", "PASS_THROUGH"].includes(n.blendMode)) return fail("\uB178\uB4DC/\uC870\uC0C1 blend \uD569\uC131 \uC81C\uC678");
      if (n !== node && "effects" in n && n.effects.some((e) => e.visible !== false)) return fail("\uC870\uC0C1 effects \uD569\uC131 \uC81C\uC678");
    }
    if ("cornerSmoothing" in node && node.cornerSmoothing > 0) return fail("cornerSmoothing \uBC15\uC2A4 \uD615\uD0DC \uB300\uC751 \uC81C\uC678");
    const visible = effects.filter((e) => e.visible);
    if (visible.some((e) => !["DROP_SHADOW", "INNER_SHADOW"].includes(e.type))) return fail("\uADF8\uB9BC\uC790 \uC678 visible effect \uD3EC\uD568: blur/noise/texture/glass/\uC0C8 \uD6A8\uACFC\uB294 \uBE44\uAD50 \uC81C\uC678");
    if (visible.some((e) => e.blendMode !== "NORMAL")) return fail("NORMAL \uADF8\uB9BC\uC790 blend\uB9CC \uC9C0\uC6D0");
    if (visible.some((e) => e.showShadowBehindNode)) return fail("showShadowBehindNode\uB294 CSS \uC678\uBD80 \uADF8\uB9BC\uC790 \uC808\uB2E8\uACFC \uB2E4\uB984");
    if (!visible.length) return { version: 1, status: "supported", layers: [], effects };
    if (node.type !== "RECTANGLE") {
      if (!("fills" in node) || typeof node.fills === "symbol") return fail("\uD504\uB808\uC784 \uCC44\uC6B0\uAE30 \uBBF8\uC218\uC9D1: \uBC15\uC2A4 \uD615\uC0C1 \uD655\uC778 \uBD88\uAC00");
      const fills = node.fills.filter((p) => p.visible !== false);
      if (fills.length !== 1 || fills[0].type !== "SOLID" || (fills[0].opacity ?? 1) !== 1) return fail("\uD22C\uBA85/\uBCF5\uD569 \uCC44\uC6B0\uAE30\uC758 \uC54C\uD30C \uD615\uC0C1\xB7\uC790\uC2DD \uD569\uC131\uC740 CSS \uBC15\uC2A4 \uB300\uC751 \uD655\uC778 \uBD88\uAC00");
    }
    if (!css) return fail(cssError ?? "getCSSAsync box-shadow \uADFC\uAC70 \uBBF8\uC218\uC9D1", "unknown");
    if (css.filter && css.filter !== "none" || css["text-shadow"] && css["text-shadow"] !== "none") return fail("Figma CSS filter/text-shadow \uB300\uC751 \uC81C\uC678");
    const parsed = parseBoxShadows(css["box-shadow"]);
    if (parsed.status !== "supported" || parsed.layers.length !== visible.length) return fail("getCSSAsync box-shadow \uB808\uC774\uC5B4 \uC218/\uAC12 \uD655\uC778 \uBD88\uAC00");
    const used = /* @__PURE__ */ new Set();
    const layers = [];
    for (const layer of parsed.layers) {
      const matches = visible.filter((e) => !used.has(e.index) && e.type === "INNER_SHADOW" === layer.inset && Math.abs(e.x - layer.x) <= 1e-4 && Math.abs(e.y - layer.y) <= 1e-4 && Math.abs(e.spread - layer.spread) <= 1e-4 && e.color.every((v, i) => Math.abs(v - layer.color[i]) <= (i === 3 ? 5e-3 + numericalEpsilon.alpha : 1 + numericalEpsilon.colorChannel)));
      if (matches.length !== 1) return fail("raw effect\uC640 Inspect CSS \uB300\uC751\uC774 \uBAA8\uD638\uD568: \uC21C\uC11C/blur \uBCC0\uD658 \uCD94\uC815 \uC548 \uD568");
      used.add(matches[0].index);
      layers.push({ ...layer, effectIndex: matches[0].index });
    }
    return { ...parsed, layers, effects, mapping: "getCSSAsync" };
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
    return { id: node.id, name: node.name || "(\uC774\uB984 \uC5C6\uC74C)", type: node.type, properties: p, ..."effects" in node ? { shadows: extractShadows(node, colorProfile) } : {} };
  }

  // apps/figma-plugin/src/protocol.ts
  var BUILD = "0.3.23";
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
  var extraction = 0;
  function snapshot() {
    const generation = ++extraction, owner = session, ownerRequest = requestId;
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
      const chosen = selection[0];
      const finish = () => {
        if (generation === extraction && owner === session && ownerRequest === requestId) send({ type: "state", state: "complete", document });
      };
      if (document.nodes[0].shadows?.status === "unknown" && "effects" in chosen && chosen.effects.some((e) => e.visible !== false)) {
        const unavailableCSS = (reason) => {
          const old = document.nodes[0].shadows;
          document.nodes[0].shadows = { ...old, status: "unknown", layers: [], reason };
          finish();
        };
        const timeout = setTimeout(() => {
          if (generation === extraction) {
            unavailableCSS("getCSSAsync \uC751\uB2F5 \uC2DC\uAC04 \uCD08\uACFC");
            ++extraction;
          }
        }, 1200);
        void Promise.resolve().then(() => chosen.getCSSAsync()).then((css) => {
          if (generation === extraction) {
            try {
              document.nodes[0].shadows = extractShadows(chosen, profile, css);
              finish();
            } catch {
              unavailableCSS("CSS \uCD94\uCD9C \uC911 \uB178\uB4DC \uBCC0\uACBD/\uC81C\uAC70: \uB2E4\uC2DC \uCD94\uCD9C\uD558\uC138\uC694.");
            }
          }
        }, () => {
          if (generation === extraction) unavailableCSS("getCSSAsync \uC2E4\uD328: \uADF8\uB9BC\uC790 \uB300\uC751 \uC81C\uC678");
        }).finally(() => clearTimeout(timeout));
      } else finish();
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
    if (m.type === "close") {
      ++extraction;
      figma.closePlugin();
    }
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
