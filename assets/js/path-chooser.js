/* CreationFirst, path-chooser.js
   3-path picker: pain → distinct recommendation + next step.
   Outcomes are intentionally different (Audit / Sprint / Retainer). */
(function () {
  "use strict";

  function init(wrap) {
    var dataEl = wrap.querySelector(".path-data");
    if (!dataEl) return;
    var data = {};
    try { data = JSON.parse(dataEl.textContent || "{}"); } catch (e) { data = {}; }
    var paths = data.paths || [];
    if (!paths.length) return;

    var optionsEl = wrap.querySelector(".path-options");
    var resultEl = wrap.querySelector(".path-result");
    var kickerEl = wrap.querySelector(".path-kicker");
    var titleEl = wrap.querySelector(".path-result-title");
    var textEl = wrap.querySelector(".path-result-text");
    var nextEl = wrap.querySelector(".path-next");
    var bulletsEl = wrap.querySelector(".path-result-bullets");
    var ctaEl = wrap.querySelector(".path-cta");
    var backBtn = wrap.querySelector(".path-back");
    if (!optionsEl || !resultEl) return;

    function showOptions() {
      resultEl.hidden = true;
      resultEl.classList.remove("is-in");
      optionsEl.hidden = false;
      optionsEl.classList.remove("is-leaving");
    }

    function showPath(path) {
      optionsEl.classList.add("is-leaving");
      window.setTimeout(function () {
        optionsEl.hidden = true;
        if (kickerEl) kickerEl.textContent = path.kicker || "";
        if (titleEl) titleEl.textContent = path.result_title || "";
        if (textEl) textEl.textContent = path.result_text || "";
        if (nextEl) nextEl.textContent = path.next || "";
        if (bulletsEl) {
          bulletsEl.innerHTML = "";
          (path.bullets || []).forEach(function (b) {
            var li = document.createElement("li");
            li.textContent = b;
            bulletsEl.appendChild(li);
          });
        }
        if (ctaEl) {
          ctaEl.textContent = path.cta || "";
          if (path.href) ctaEl.setAttribute("href", path.href);
        }
        resultEl.hidden = false;
        requestAnimationFrame(function () { resultEl.classList.add("is-in"); });
        try { resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) { /* ignore */ }
      }, 180);
    }

    optionsEl.querySelectorAll("[data-path-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-path-id");
        var match = paths.filter(function (p) { return p.id === id; })[0];
        if (match) showPath(match);
      });
    });

    if (backBtn) backBtn.addEventListener("click", showOptions);
  }

  document.querySelectorAll("[data-path-chooser]").forEach(init);
})();
