// Run with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const { diffKeys } = require("./diff.js");

const paths = (list) => list.map((x) => x.path);

test("identical key sets", () => {
  const r = diffKeys({ a: 1, b: { c: 2 } }, { a: 9, b: { c: "x" } });
  assert.deepEqual(r.onlyInA, []);
  assert.deepEqual(r.onlyInB, []);
  assert.equal(r.common, 3);
});

test("nested differences, collapsed to top-most", () => {
  const a = { user: { id: 1, name: "x", address: { city: "y", zip: "z" } } };
  const b = { user: { id: 1, email: "e" } };
  const r = diffKeys(a, b);
  assert.deepEqual(r.onlyInA, [{ path: "user.address", nested: 2 }, { path: "user.name", nested: 0 }]);
  assert.deepEqual(paths(r.onlyInB), ["user.email"]);
});

test("uncollapsed lists every nested key", () => {
  const r = diffKeys({ a: { b: { c: 1 } } }, {}, { collapse: false });
  assert.deepEqual(paths(r.onlyInA), ["a", "a.b", "a.b.c"]);
});

test("arrays merged by default", () => {
  const a = { items: [{ x: 1 }, { y: 2 }] };
  const b = { items: [{ x: 1 }] };
  assert.deepEqual(paths(diffKeys(a, b).onlyInA), ["items[*].y"]);
});

test("arrays compared by index", () => {
  const a = { items: [{ x: 1 }, { x: 2 }] };
  const b = { items: [{ x: 1 }] };
  const r = diffKeys(a, b, { arrayMode: "index" });
  assert.deepEqual(r.onlyInA, [{ path: "items[1]", nested: 1 }]);
});

test("special keys are quoted", () => {
  const r = diffKeys({ "a.b": 1, "with space": { k: 1 } }, {});
  assert.deepEqual(paths(r.onlyInA), ['["a.b"]', '["with space"]']);
});

test("object vs primitive at same key", () => {
  const r = diffKeys({ a: { b: 1 } }, { a: 5 });
  assert.deepEqual(paths(r.onlyInA), ["a.b"]);
  assert.deepEqual(r.onlyInB, []);
});

const { mergeKeys } = require("./diff.js");

test("merge adds only missing keys, A's values win", () => {
  const a = { id: 1, user: { name: "a" } };
  const b = { id: 2, user: { name: "b", email: "e" }, extra: { x: 1 } };
  assert.deepEqual(mergeKeys(a, b), { id: 1, user: { name: "a", email: "e" }, extra: { x: 1 } });
});

test("merge keeps A on type conflict and does not mutate inputs", () => {
  const a = { k: 5 };
  const b = { k: { nested: 1 } };
  assert.deepEqual(mergeKeys(a, b), { k: 5 });
  assert.deepEqual(a, { k: 5 });
});

test("merge arrays by index, appending B's extra elements", () => {
  const r = mergeKeys({ items: [{ x: 1 }] }, { items: [{ x: 9, y: 2 }, { z: 3 }] });
  assert.deepEqual(r, { items: [{ x: 1, y: 2 }, { z: 3 }] });
});

test("merged result has no missing keys on either side (index mode)", () => {
  const a = { a: 1, n: { p: [1, { q: 1 }] } };
  const b = { b: 2, n: { r: 1, p: [1, { s: 1 }, 3] } };
  const m = mergeKeys(a, b);
  assert.deepEqual(diffKeys(m, a, { arrayMode: "index" }).onlyInB, []);
  assert.deepEqual(diffKeys(m, b, { arrayMode: "index" }).onlyInB, []);
});

test("__proto__ key stays a plain key", () => {
  const r = mergeKeys({}, JSON.parse('{"__proto__": {"polluted": 1}}'));
  assert.equal(JSON.stringify(r), '{"__proto__":{"polluted":1}}');
  assert.equal(({}).polluted, undefined);
});
