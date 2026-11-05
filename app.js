(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  const inputA = $("json-a");
  const inputB = $("json-b");

  function parse(text, errorEl) {
    errorEl.textContent = "";
    if (!text.trim()) {
      errorEl.textContent = "Empty input.";
      return { ok: false };
    }
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (e) {
      errorEl.textContent = "Invalid JSON: " + e.message;
      return { ok: false };
    }
  }

  function renderList(ul, countEl, items) {
    ul.replaceChildren();
    countEl.textContent = String(items.length);
    if (items.length === 0) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "None";
      ul.appendChild(li);
      return;
    }
    items.forEach(function (item) {
      const li = document.createElement("li");
      const code = document.createElement("code");
      code.textContent = item.path;
      li.appendChild(code);
      if (item.nested > 0) {
        const span = document.createElement("span");
        span.className = "nested";
        span.textContent = "+" + item.nested + " nested";
        li.appendChild(span);
      }
      ul.appendChild(li);
    });
  }

  function compare() {
    const a = parse(inputA.value, $("error-a"));
    const b = parse(inputB.value, $("error-b"));
    if (!a.ok || !b.ok) {
      $("results").hidden = true;
      return;
    }
    const r = JsonKeyDiff.diffKeys(a.value, b.value, {
      arrayMode: $("array-mode").value,
      collapse: $("collapse").checked,
    });
    renderList($("only-a"), $("count-a"), r.onlyInA);
    renderList($("only-b"), $("count-b"), r.onlyInB);
    const same = r.onlyInA.length === 0 && r.onlyInB.length === 0;
    $("summary").textContent = same
      ? "Both documents have identical key sets (" + r.common + " keys)."
      : r.totalA + " keys in A, " + r.totalB + " keys in B, " + r.common + " in common.";
    $("summary").classList.toggle("same", same);
    $("results").hidden = false;
  }

  function merge() {
    const a = parse(inputA.value, $("error-a"));
    const b = parse(inputB.value, $("error-b"));
    if (!a.ok || !b.ok) {
      $("merged").hidden = true;
      return;
    }
    $("merged-output").value = JSON.stringify(JsonKeyDiff.mergeKeys(a.value, b.value), null, 2);
    $("merged").hidden = false;
    $("merged").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("merge").addEventListener("click", merge);

  $("copy-merged").addEventListener("click", function () {
    const btn = $("copy-merged");
    navigator.clipboard.writeText($("merged-output").value).then(
      function () { btn.textContent = "Copied"; },
      function () { btn.textContent = "Copy failed"; }
    );
    setTimeout(function () { btn.textContent = "Copy"; }, 1500);
  });

  $("use-merged").addEventListener("click", function () {
    inputA.value = $("merged-output").value;
    compare();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("compare").addEventListener("click", compare);
  $("array-mode").addEventListener("change", function () { if (!$("results").hidden) compare(); });
  $("collapse").addEventListener("change", function () { if (!$("results").hidden) compare(); });
  [inputA, inputB].forEach(function (el) {
    el.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") compare();
    });
  });

  $("swap").addEventListener("click", function () {
    const t = inputA.value;
    inputA.value = inputB.value;
    inputB.value = t;
    if (!$("results").hidden) compare();
    if (!$("merged").hidden) merge();
  });

  $("sample").addEventListener("click", function () {
    inputA.value = JSON.stringify({
      id: 1,
      name: "Sample",
      settings: { theme: "dark", notifications: { email: true, push: false } },
      tags: [{ label: "a", color: "red" }],
      "key.with.dots": true,
    }, null, 2);
    inputB.value = JSON.stringify({
      id: 2,
      name: "Sample",
      settings: { theme: "light", notifications: { email: true, sms: true } },
      tags: [{ label: "b" }],
      metadata: { createdAt: "2026-01-01", owner: { team: "x" } },
    }, null, 2);
    compare();
  });
})();
