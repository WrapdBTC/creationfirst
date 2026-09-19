/* CreationFirst, time-calculator.js
   "Zeitersparnis-Rechner": pick an industry, enter roughly how many hours per
   week your team spends on recurring tasks, and get a rough estimate of the
   weekly/monthly/yearly time an AI-assisted workflow could give back. The
   per-industry "factor" is an illustrative rule of thumb (see the on-page
   disclaimer), not a scientific model, it exists to make the abstract pitch
   concrete with the visitor's own numbers. */
(function () {
  "use strict";

  var lang = (document.documentElement.lang || "de").slice(0, 2);
  var nf = new Intl.NumberFormat(lang === "en" ? "en-GB" : lang === "hr" ? "hr-HR" : "de-DE", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat(lang === "en" ? "en-GB" : lang === "hr" ? "hr-HR" : "de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function fmt(v, precise) { return precise ? nf1.format(v) : nf.format(Math.round(v)); }
  function animateNumber(el, to, duration, precise) {
    var from = parseFloat(el.getAttribute("data-value")) || 0;
    el.setAttribute("data-value", String(to));
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = fmt(from + (to - from) * eased, precise);
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

    var shown = false;
    function calculate() {
      var hours = parseFloat(String(hoursInput.value).replace(",", "."));
      if (!hours || hours < 0) hours = 0;
      hours = Math.min(hours, 400);
      var weekly = hours * factorFor(industrySelect.value);
      if (!shown) {
        resultEl.hidden = false;
        void resultEl.offsetWidth;
        resultEl.classList.add("is-in");
        shown = true;
      }
      if (weekEl) animateNumber(weekEl, weekly, 600, true);
      if (monthEl) animateNumber(monthEl, weekly * 4.33, 600, false);
      if (yearEl) animateNumber(yearEl, weekly * 52, 600, false);
    }
    btn.addEventListener("click", calculate);
    hoursInput.addEventListener("input", function () { if (shown) calculate(); });
    industrySelect.addEventListener("change", function () { if (shown) calculate(); });
    hoursInput.addEventListener("keydown", function (e) { if (e.key === "Enter") calculate(); });
  }

  document.querySelectorAll("[data-calc]").forEach(initCalc);
})();
