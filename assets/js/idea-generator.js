/* CreationFirst, idea-generator.js
   Second Playground mini-experience (the first is Snake). A small, honest demo:
   pick an industry, get back one of several pre-written automation ideas at random.
   Deliberately NOT wired to a real AI model (a static site has nowhere safe to hold
   an API key, and faking a "live AI" would be misleading), the on-page disclaimer
   text says so explicitly. The point is to give visitors a fast, concrete feel for
   the kind of thinking behind the AI-acceleration offer, not to claim this widget
   itself is AI-generated. */
(function () {
  "use strict";

  function initIdeaGen(wrap) {
    var select = wrap.querySelector(".idea-gen-select");
    var btn = wrap.querySelector(".idea-gen-btn");
    var output = wrap.querySelector(".idea-gen-text");
    var dataEl = wrap.querySelector(".idea-gen-data");
    if (!select || !btn || !output || !dataEl) return;

    var ideas = {};
    try { ideas = JSON.parse(dataEl.textContent || "{}"); } catch (e) { ideas = {}; }

    var againLabel = wrap.dataset.againLabel || "";
    var generateLabel = wrap.dataset.generateLabel || btn.textContent;
    var lastIndex = {};

    function pickIdea(type) {
      var list = ideas[type];
      if (!list || !list.length) return null;
      if (list.length === 1) return list[0];
      var idx;
      do {
        idx = Math.floor(Math.random() * list.length);
      } while (idx === lastIndex[type]);
      lastIndex[type] = idx;
      return list[idx];
    }

    function showIdea() {
      var type = select.value;
      var idea = pickIdea(type);
      if (!idea) return;
      output.classList.remove("is-in");
      // force reflow so the fade-in transition restarts on every click
      void output.offsetWidth;
      output.textContent = idea;
      output.classList.add("is-in");
      if (againLabel) btn.textContent = againLabel;
    }

    btn.addEventListener("click", showIdea);
    select.addEventListener("change", function () {
      btn.textContent = generateLabel;
      output.classList.remove("is-in");
      output.textContent = wrap.dataset.placeholder || "";
    });
  }

  document.querySelectorAll("[data-idea-gen]").forEach(initIdeaGen);
})();
