// Core key-diff logic. No DOM access, so it runs in the browser and in Node (for tests).
(function (root) {
  "use strict";

  const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

  function isObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function joinKey(parent, key) {
    if (IDENT.test(key)) return parent ? parent + "." + key : key;
    return parent + "[" + JSON.stringify(key) + "]";
  }

  // Collects every key path in `value` into `out` (a Map of path -> true).
  // arrayMode:
  //   "merge" - all array elements are folded into one `[*]` segment, so the
  //             result describes the shape of the elements, not their count.
  //   "index" - each element gets its own `[0]`, `[1]`, ... segment.
  function collectPaths(value, arrayMode, parent, out) {
    if (Array.isArray(value)) {
      value.forEach(function (item, i) {
        const p = parent + (arrayMode === "index" ? "[" + i + "]" : "[*]");
        if (arrayMode === "index") out.set(p, true);
        collectPaths(item, arrayMode, p, out);
      });
    } else if (isObject(value)) {
      Object.keys(value).forEach(function (k) {
        const p = joinKey(parent, k);
        out.set(p, true);
        collectPaths(value[k], arrayMode, p, out);
      });
    }
    return out;
  }

  // Nearest ancestor of `path` that is present in `set`, or null.
  // e.g. for `a.b[*].c` it checks `a.b[*]`, then `a.b`, then `a`.
  function parentOf(path, set) {
    for (let i = path.length - 1; i > 0; i--) {
      const ch = path[i];
      if (ch === "." || ch === "[") {
        const prefix = path.slice(0, i);
        if (set.has(prefix)) return prefix;
      }
    }
    return null;
  }

  function missing(from, other, collapse) {
    const result = [];
    for (const path of from.keys()) {
      if (other.has(path)) continue;
      if (collapse) {
        // Skip if some ancestor is already reported as missing.
        let anc = parentOf(path, from);
        let covered = false;
        while (anc !== null) {
          if (!other.has(anc)) { covered = true; break; }
          anc = parentOf(anc, from);
        }
        if (covered) continue;
      }
      let nested = 0;
      if (collapse) {
        for (const p of from.keys()) {
          if (p !== path && p.startsWith(path) && (p[path.length] === "." || p[path.length] === "[")) nested++;
        }
      }
      result.push({ path: path, nested: nested });
    }
    return result.sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });
  }

  function diffKeys(a, b, options) {
    const opts = Object.assign({ arrayMode: "merge", collapse: true }, options);
    const pa = collectPaths(a, opts.arrayMode, "", new Map());
    const pb = collectPaths(b, opts.arrayMode, "", new Map());
    let common = 0;
    for (const p of pa.keys()) if (pb.has(p)) common++;
    return {
      onlyInA: missing(pa, pb, opts.collapse),
      onlyInB: missing(pb, pa, opts.collapse),
      totalA: pa.size,
      totalB: pb.size,
      common: common,
    };
  }

  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  // defineProperty so a JSON key named "__proto__" stays a plain key instead
  // of replacing the object's prototype.
  function setOwn(o, k, v) {
    Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
  }

  // Deep-merges `b` into `a` without overwriting anything: a key that exists in
  // `a` keeps a's value, and only keys missing from `a` are copied from `b`.
  // Objects are merged key by key; arrays element by element (by index), with
  // b's extra elements appended. If the two sides have different types (e.g.
  // object vs string), a's value wins. Inputs are not mutated.
  function mergeKeys(a, b) {
    if (isObject(a) && isObject(b)) {
      const out = {};
      Object.keys(a).forEach(function (k) {
        setOwn(out, k, hasOwn(b, k) ? mergeKeys(a[k], b[k]) : a[k]);
      });
      Object.keys(b).forEach(function (k) {
        if (!hasOwn(a, k)) setOwn(out, k, b[k]);
      });
      return out;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      const out = a.map(function (item, i) { return i < b.length ? mergeKeys(item, b[i]) : item; });
      for (let i = a.length; i < b.length; i++) out.push(b[i]);
      return out;
    }
    return a;
  }

  const api = { diffKeys: diffKeys, collectPaths: collectPaths, mergeKeys: mergeKeys };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JsonKeyDiff = api;
})(this);
