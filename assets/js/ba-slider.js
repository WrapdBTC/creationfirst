/* CreationFirst — accessible before/after image slider */
(function () {
  "use strict";

  function initSlider(root) {
    var range = root.querySelector(".ba-slider-range");
    var beforeWrap = root.querySelector(".ba-slider-before-wrap");
    if (!range || !beforeWrap) return;

    function setPos(value) {
      var v = Math.max(0, Math.min(100, Number(value)));
      beforeWrap.style.width = v + "%";
      root.style.setProperty("--ba-pos", v + "%");
      range.setAttribute("aria-valuenow", String(Math.round(v)));
    }

    setPos(range.value || 50);

    range.addEventListener("input", function () {
      setPos(range.value);
    });
    range.addEventListener("change", function () {
      setPos(range.value);
    });
  }

  function boot() {
    document.querySelectorAll("[data-ba-slider]").forEach(initSlider);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
