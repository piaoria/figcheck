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
var within = (d, t, e) => Math.abs(d) <= t + e;
function equal(a, b, t) {
  return a.inset === b.inset && ["x", "y", "blur", "spread"].every((k) => within(b[k] - a[k], t.px, numericalEpsilon.px)) && a.color.every((v, i) => within(b.color[i] - v, i === 3 ? t.alpha : t.colorChannel, i === 3 ? numericalEpsilon.alpha : numericalEpsilon.colorChannel));
}
function compareShadows(expected, actual, t = normalTolerance, included = true) {
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
  if (!included) {
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
var unavailable = (reason, status = "unsupported") => ({ status, reason });
var numberValue = (value, kind = "px", note) => Number.isFinite(value) ? { status: "supported", kind, value, ...note ? { note } : {} } : unavailable("\uC720\uD55C\uD55C \uC22B\uC790\uAC00 \uC544\uB2D8", "unknown");
var stringValue = (value, note) => ({ status: "supported", kind: "string", value, ...note ? { note } : {} });
var colorValue = (value) => value.length === 4 && value.every((v, i) => Number.isFinite(v) && v >= 0 && v <= (i === 3 ? 1 : 255)) ? { status: "supported", kind: "rgba", value } : unavailable("\uC720\uD55C\uD55C sRGB RGBA \uBC94\uC704\uB97C \uBC97\uC5B4\uB0A8", "unknown");
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
function exactKeys(v, allowed, path) {
  assert(Object.keys(v).every((k) => allowed.includes(k)), `${path}: \uC54C \uC218 \uC5C6\uB294 \uD0A4 \uB610\uB294 \uC704\uD5D8\uD55C \uD0A4`);
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
var strictTolerance = { px: 0, typographyPx: 0, colorChannel: 0, alpha: 0, opacity: 0 };
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
function compare(expected, actual, tolerance = normalTolerance, included = keys) {
  for (const key of Object.keys(normalTolerance)) {
    const value = tolerance[key], max = key === "alpha" || key === "opacity" ? 1 : key === "colorChannel" ? 255 : 1e4;
    if (!Number.isFinite(value) || value < 0 || value > max) throw new Error(`\uD5C8\uC6A9\uC624\uCC28 ${key}\uB294 0~${max}\uC758 \uC720\uD55C\uD55C \uC22B\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
  }
  const rows = [];
  for (const [category, list] of Object.entries(categories)) for (const key of list) {
    const e = expected[key], a = actual[key];
    const row = { key, category, expected: e, actual: a, status: "excluded" };
    if (!included.includes(key)) {
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
  if (raw === "transparent") return colorValue([0, 0, 0, 0]);
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(raw);
  if (!m) return unavailable(`CSS \uC0C9 '${raw}'\uB294 sRGB rgb/rgba \uB2E8\uC0C9 \uC544\uB2D8`);
  const rgba2 = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === void 0 ? 1 : Number(m[4])];
  return rgba2.every((v, i) => Number.isFinite(v) && v >= 0 && v <= (i === 3 ? 1 : 255)) ? colorValue(rgba2) : unavailable("\uC0C9 \uBC94\uC704 \uC624\uB958");
}
export {
  VERSION,
  categories,
  colorValue,
  compare,
  compareShadows,
  cssColor,
  cssLength,
  emptyProperties,
  flattenNodes,
  keys,
  kindFor,
  missingShadows,
  normalTolerance,
  numberValue,
  numericalEpsilon,
  parseBoxShadows,
  parseDesign,
  shadowUnavailable,
  strictTolerance,
  stringValue,
  unavailable,
  validateProperties,
  validateShadows
};
