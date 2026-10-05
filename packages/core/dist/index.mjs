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
var record = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
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
  assert(record(v), "properties \uAC1D\uCCB4 \uD544\uC694");
  exactKeys(v, keys, "properties");
  for (const key of keys) {
    const p = v[key];
    assert(record(p), `${key}: \uBA85\uC2DC\uC801 status \uD544\uC694`);
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
function parseDesign(text) {
  assert(text.length <= 1024 * 1024, "JSON \uCD5C\uB300 1 MiB");
  const doc = JSON.parse(text);
  assert(record(doc), "\uBB38\uC11C \uAC1D\uCCB4 \uD544\uC694");
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
    assert(record(v), "node \uAC1D\uCCB4 \uD544\uC694");
    exactKeys(v, ["id", "name", "type", "properties", "children"], "node");
    boundedText(v.id, "id");
    boundedText(v.name, "name");
    boundedText(v.type, "type");
    assert(!ids.has(v.id), "\uC911\uBCF5 node id");
    ids.add(v.id);
    validateProperties(v.properties);
    if ("children" in v) {
      assert(Array.isArray(v.children), "children \uBC30\uC5F4 \uD544\uC694");
      v.children.forEach((c) => node(c, depth + 1));
    }
  }
  doc.nodes.forEach((n) => node(n, 0));
  if (doc.colorProfile === "DISPLAY_P3" || doc.colorProfile === "UNKNOWN") {
    const excludeColors = (n) => {
      for (const k of keys.filter((k2) => k2.endsWith("Color"))) n.properties[k] = unavailable(`Figma ${doc.colorProfile} \uC0C9\uACF5\uAC04: sRGB \uBCC0\uD658 \uBBF8\uC9C0\uC6D0`);
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
function within(delta, limit, epsilon) {
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
      row.status = row.delta.every((d, i) => within(d, i === 3 ? tolerance.alpha : tolerance.colorChannel, i === 3 ? numericalEpsilon.alpha : numericalEpsilon.colorChannel)) ? "match" : "mismatch";
    } else {
      row.delta = a.value - e.value;
      const limit = key === "opacity" ? tolerance.opacity : key === "fontWeight" ? 0 : category === "typography" ? tolerance.typographyPx : tolerance.px;
      const epsilon = key === "opacity" ? numericalEpsilon.opacity : key === "fontWeight" ? numericalEpsilon.fontWeight : numericalEpsilon.px;
      row.status = within(row.delta, limit, epsilon) ? "match" : "mismatch";
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
  const rgba = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === void 0 ? 1 : Number(m[4])];
  return rgba.every((v, i) => Number.isFinite(v) && v >= 0 && v <= (i === 3 ? 1 : 255)) ? colorValue(rgba) : unavailable("\uC0C9 \uBC94\uC704 \uC624\uB958");
}
export {
  VERSION,
  categories,
  colorValue,
  compare,
  cssColor,
  cssLength,
  emptyProperties,
  flattenNodes,
  keys,
  kindFor,
  normalTolerance,
  numberValue,
  numericalEpsilon,
  parseDesign,
  strictTolerance,
  stringValue,
  unavailable,
  validateProperties
};
