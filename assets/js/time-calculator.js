/* CreationFirst, time-calculator.js
   "Zeitersparnis-Rechner": pick an industry, enter roughly how many hours per
   week your team spends on recurring tasks, and get a rough estimate of the
   weekly/monthly/yearly time an AI-assisted workflow could give back. The
   per-industry "factor" is an illustrative rule of thumb (see the on-page
   disclaimer), not a scientific model, it exists to make the abstract pitch
   concrete with the visitor's own numbers. */
(function () {
  "use strict";

  function animateNumber(el, to, duration) {
    var from = parseFloat(el.textContent) || 0;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      el.textContent = (from + (to - from) * progress).toFixed(1);
      if (progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function initCalc(wrap) {
    var dataEl = wrap.querySelector(".calc-data");
    if (!dataEl) return;
    var data = {};
    try { data = JSON.parse(dataEl.textContent || "{}"); } catch (e) { data = {}; }
    var industries = data.industries || [];
    if (!industries.length) return;

    var hoursInput = wrap.querySelector(".calc-hours-input");
    var industrySelect = wrap.querySelector(".calc-industry-select");
    var btn = wrap.querySelector(".calc-btn");
    var resultEl = wrap.querySelector(".calc-result");
    var weekEl = wrap.querySelector(".calc-result-week");
    var monthEl = wrap.querySelector(".calc-result-month");
    var yearEl = wrap.querySelector(".calc-result-year");
    if (!hoursInput || !industrySelect || !btn || !resultEl) return;

    function factorFor(value) {
      for (var i = 0; i < industries.length; i++) {
        if (industries[i].value === value) return industries[i].factor;
      }
      return 0.3;
    }

    btn.addEventListener("click", function () {
      var hours = parseFloat(hoursInput.value);
      if (!hours || hours < 0) hours = 0;
      var factor = factorFor(industrySelect.value);
      var weekly = hours * factor;

      resultEl.hidden = false;
      resultEl.classList.remove("is-in");
      void resultEl.offsetWidth;
      resultEl.classList.add("is-in");

      if (weekEl) animateNumber(weekEl, weekly, 600);
      if (monthEl) animateNumber(monthEl, weekly * 4.33, 600);
      if (yearEl) animateNumber(yearEl, weekly * 52, 600);
    });
  }

  document.querySelectorAll("[data-calc]").forEach(initCalc);
})();
