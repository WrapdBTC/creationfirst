/* CreationFirst, quiz.js
   The "KI-Reifegrad-Check" on the homepage: a short, honest self-assessment.
   Click through 4 questions, each answer carries a small score, and at the
   end we bucket the total score into one of a few result tiers defined in
   content_de/en/hr.py. No backend, no real scoring model behind the scenes , 
   just a simple, transparent heuristic, exactly as the on-page disclaimer says. */
(function () {
  "use strict";

  function initQuiz(wrap) {
    var dataEl = wrap.querySelector(".quiz-data");
    if (!dataEl) return;
    var data = {};
    try { data = JSON.parse(dataEl.textContent || "{}"); } catch (e) { data = {}; }
    var questions = data.questions || [];
    var results = data.results || [];
    if (!questions.length || !results.length) return;

    var introEl = wrap.querySelector(".quiz-intro");
    var questionEl = wrap.querySelector(".quiz-question");
    var resultEl = wrap.querySelector(".quiz-result");
    var progressBar = wrap.querySelector(".quiz-progress-bar");
    var progressLabel = wrap.querySelector(".quiz-progress-label");
    var questionText = wrap.querySelector(".quiz-question-text");
    var optionsWrap = wrap.querySelector(".quiz-options");
    var resultTitle = wrap.querySelector(".quiz-result-title");
    var resultText = wrap.querySelector(".quiz-result-text");
    var startBtn = wrap.querySelector(".quiz-start-btn");
    var restartBtn = wrap.querySelector(".quiz-restart-btn");
    if (!introEl || !questionEl || !resultEl || !questionText || !optionsWrap || !startBtn) return;

    var progressTemplate = wrap.dataset.progressLabel || "{current}/{total}";
    var index = 0;
    var score = 0;

    function renderQuestion() {
      var q = questions[index];
      if (progressLabel) {
        progressLabel.textContent = progressTemplate
          .replace("{current}", String(index + 1))
          .replace("{total}", String(questions.length));
      }
      if (progressBar) progressBar.style.width = ((index / questions.length) * 100) + "%";
      questionText.textContent = q.q;
      optionsWrap.innerHTML = "";
      (q.options || []).forEach(function (opt) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-option-btn";
        btn.textContent = opt.label;
        btn.addEventListener("click", function () {
          score += opt.score || 0;
          index += 1;
          if (index < questions.length) {
            renderQuestion();
          } else {
            showResult();
          }
        });
        optionsWrap.appendChild(btn);
      });
    }

    function showResult() {
      if (progressBar) progressBar.style.width = "100%";
      questionEl.hidden = true;
      var match = results[results.length - 1];
      for (var i = 0; i < results.length; i++) {
        var r = results[i];
        if (score >= r.min_score && score <= r.max_score) { match = r; break; }
      }
      if (resultTitle) resultTitle.textContent = match.title;
      if (resultText) resultText.textContent = match.text;
      resultEl.hidden = false;
      resultEl.classList.add("is-in");
    }

    startBtn.addEventListener("click", function () {
      introEl.hidden = true;
      questionEl.hidden = false;
      renderQuestion();
    });

    if (restartBtn) {
      restartBtn.addEventListener("click", function () {
        index = 0;
        score = 0;
        resultEl.hidden = true;
        resultEl.classList.remove("is-in");
        introEl.hidden = false;
      });
    }
  }

  document.querySelectorAll("[data-quiz]").forEach(initQuiz);
})();
