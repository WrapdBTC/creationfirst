/* CreationFirst, chatbot-demo.js
   A scripted, honest mini-chatbot demo: pick a topic, and the bot walks
   through a short 2-3 message exchange, not just one fixed reply, so it
   actually feels like a conversation. Deliberately NOT wired to a real
   language model, a static site has nowhere safe to hold an API key, and
   faking a "live AI" would be misleading. The disclaimer text says so
   explicitly; the point is to show the kind of dialogue we'd actually build
   for a client, not to claim this widget itself is AI-generated. */
(function () {
  "use strict";

  function initChatbot(wrap) {
    var dataEl = wrap.querySelector(".chatbot-data");
    if (!dataEl) return;
    var data = {};
    try { data = JSON.parse(dataEl.textContent || "{}"); } catch (e) { data = {}; }
    var quickReplies = data.quick_replies || [];
    var flows = data.flows || {};
    var greeting = data.greeting || "";
    var typingLabel = wrap.dataset.typingLabel || "…";

    var threadEl = wrap.querySelector(".chatbot-thread");
    var repliesEl = wrap.querySelector(".chatbot-replies");
    var resetBtn = wrap.querySelector(".chatbot-reset-btn");
    if (!threadEl || !repliesEl) return;

    var busy = false;
    var currentFlow = null;
    var stepIndex = 0;

    function scrollToEnd() {
      threadEl.scrollTop = threadEl.scrollHeight;
    }

    function addBubble(text, who) {
      var row = document.createElement("div");
      row.className = "chatbot-row chatbot-row-" + who;
      var bubble = document.createElement("div");
      bubble.className = "chatbot-bubble chatbot-bubble-" + who;
      bubble.textContent = text;
      row.appendChild(bubble);
      threadEl.appendChild(row);
      scrollToEnd();
    }

    function showTyping(callback) {
      repliesEl.classList.add("is-waiting");
      var typingRow = document.createElement("div");
      typingRow.className = "chatbot-row chatbot-row-bot";
      var typingBubble = document.createElement("div");
      typingBubble.className = "chatbot-bubble chatbot-bubble-bot chatbot-typing";
      typingBubble.innerHTML = '<span></span><span></span><span></span>';
      typingBubble.setAttribute("aria-label", typingLabel);
      typingRow.appendChild(typingBubble);
      threadEl.appendChild(typingRow);
      scrollToEnd();

      window.setTimeout(function () {
        threadEl.removeChild(typingRow);
        repliesEl.classList.remove("is-waiting");
        callback();
      }, 850 + Math.random() * 500);
    }

    function renderTopics() {
      repliesEl.innerHTML = "";
      quickReplies.forEach(function (qr) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chatbot-reply-btn";
        btn.textContent = qr.label;
        btn.addEventListener("click", function () { startFlow(qr); });
        repliesEl.appendChild(btn);
      });
    }

    function renderNextStep() {
      repliesEl.innerHTML = "";
      if (!currentFlow || stepIndex >= currentFlow.length) {
        renderTopics();
        return;
      }
      var step = currentFlow[stepIndex];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chatbot-reply-btn";
      btn.textContent = step.user;
      btn.addEventListener("click", advanceFlow);
      repliesEl.appendChild(btn);
    }

    function advanceFlow() {
      if (busy || !currentFlow || stepIndex >= currentFlow.length) return;
      busy = true;
      var step = currentFlow[stepIndex];
      addBubble(step.user, "user");
      showTyping(function () {
        addBubble(step.bot, "bot");
        stepIndex++;
        busy = false;
        renderNextStep();
      });
    }

    function startFlow(qr) {
      if (busy) return;
      currentFlow = flows[qr.id] || [];
      stepIndex = 0;
      advanceFlow();
    }

    function reset() {
      threadEl.innerHTML = "";
      currentFlow = null;
      stepIndex = 0;
      busy = false;
      addBubble(greeting, "bot");
      renderTopics();
    }

    if (resetBtn) resetBtn.addEventListener("click", reset);

    reset();
  }

  document.querySelectorAll("[data-chatbot-demo]").forEach(initChatbot);
})();
