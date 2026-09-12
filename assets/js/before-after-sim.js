/* CreationFirst — before-after-sim.js
   "Vorher-Nachher-Simulator": toggle between a manual and an AI-assisted
   version of the same task (e.g. quote creation) and watch the per-step time
   breakdown and the running total change. Numbers are illustrative example
   figures (the content disclaimer says so) meant to make the abstract idea
   of "AI saves time" concrete and visual, not a real productivity study. */
(function () {
  "use strict";

  function animateNumber(el, to, duration) {
    var from = parseFloat(el.textContent) || 0;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      el.textContent = Math.round(from + (to - from) * progress);
      if (progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function initSim(wrap) {
    var dataEl = wrap.querySelector(".sim-data");
    if (!dataEl) return;
    var data = {};
    try { data = JSON.parse(dataEl.textContent || "{}"); } catch (e) { data = {}; }
    var stepsManual = data.steps_manual || [];
    var stepsAi = data.steps_ai || [];
    if (!stepsManual.length || !stepsAi.length) return;

    var totalManual = stepsManual.reduce(function (s, x) { return s + x.minutes; }, 0);
    var totalAi = stepsAi.reduce(function (s, x) { return s + x.minutes; }, 0);
    var maxMinutes = Math.max.apply(null, stepsManual.concat(stepsAi).map(function (s) { return s.minutes; }));

    var listEl = wrap.querySelector(".sim-steps");
    var totalEl = wrap.querySelector(".sim-total-value");
    var toggleManualBtn = wrap.querySelector(".sim-toggle-manual");
    var toggleAiBtn = wrap.querySelector(".sim-toggle-ai");
    var savingsEl = wrap.querySelector(".sim-savings");
    var savingsValueEl = wrap.querySelector(".sim-savings-value");
    if (!listEl || !totalEl || !toggleManualBtn || !toggleAiBtn) return;

    var seenManual = false;
    var seenAi = false;

    function render(steps, total, mode) {
      listEl.innerHTML = "";
      steps.forEach(function (s, i) {
        var row = document.createElement("div");
        row.className = "sim-step";
        row.style.setProperty("--sim-delay", (i * 60) + "ms");
        var pct = Math.max(6, Math.round((s.minutes / maxMinutes) * 100));
        var label = document.createElement("span");
        label.className = "sim-step-label";
        label.textContent = s.label;
        var barWrap = document.createElement("span");
        barWrap.className = "sim-step-bar-wrap";
        var bar = document.createElement("span");
        bar.className = "sim-step-bar";
        barWrap.appendChild(bar);
        var minutes = document.createElement("span");
        minutes.className = "sim-step-minutes";
        minutes.textContent = s.minutes + " Min.";
        row.appendChild(label);
        row.appendChild(barWrap);
        row.appendChild(minutes);
        listEl.appendChild(row);
        window.requestAnimationFrame(function () {
          window.setTimeout(function () { bar.style.width = pct + "%"; }, i * 60);
        });
      });

      animateNumber(totalEl, total, 500);
      toggleManualBtn.classList.toggle("is-active", mode === "manual");
      toggleAiBtn.classList.toggle("is-active", mode === "ai");
      wrap.classList.toggle("is-ai-mode", mode === "ai");

      if (mode === "manual") seenManual = true;
      if (mode === "ai") seenAi = true;

      if (seenManual && seenAi && savingsEl && savingsValueEl) {
        var diff = totalManual - totalAi;
        var pctSaved = totalManual > 0 ? Math.round((diff / totalManual) * 100) : 0;
        savingsEl.hidden = false;
        savingsValueEl.textContent = diff + " Min. (" + pctSaved + "%)";
      }
    }

    toggleManualBtn.addEventListener("click", function () { render(stepsManual, totalManual, "manual"); });
    toggleAiBtn.addEventListener("click", function () { render(stepsAi, totalAi, "ai"); });

    render(stepsManual, totalManual, "manual");
  }

  document.querySelectorAll("[data-sim]").forEach(initSim);
})();
