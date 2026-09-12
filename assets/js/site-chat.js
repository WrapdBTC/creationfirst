/**
 * CreationFirst floating live chat widget.
 * Talks to CREATIONFIRST_CHAT_API (Worker relay). No xAI calls from the browser.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "cf_chat_conversation_id";
  var POLL_MS = 1500;
  var TIMEOUT_MS = 90000;
  var api = (typeof window.CREATIONFIRST_CHAT_API === "string"
    ? window.CREATIONFIRST_CHAT_API.trim()
    : "");

  var lang = (document.documentElement.lang || "de").slice(0, 2).toLowerCase();
  var copy = {
    de: {
      title: "CreationFirst Chat",
      subtitle: "Kurz fragen — wir antworten direkt hier.",
      placeholder: "Nachricht schreiben…",
      send: "Senden",
      open: "Chat öffnen",
      close: "Chat schließen",
      unavailable: "Chat bald verfügbar",
      unavailableHint: "Der Live-Chat wird gerade eingerichtet. Schreiben Sie uns gern über das Kontaktformular.",
      typing: "Assistent tippt…",
      timeout: "Noch keine Antwort. Bitte erneut versuchen oder später nochmal schreiben.",
      retry: "Erneut versuchen",
      error: "Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.",
      greeting: "Hallo! Wie können wir Ihnen helfen?",
    },
    en: {
      title: "CreationFirst Chat",
      subtitle: "Ask briefly — we reply right here.",
      placeholder: "Write a message…",
      send: "Send",
      open: "Open chat",
      close: "Close chat",
      unavailable: "Chat coming soon",
      unavailableHint: "Live chat is being set up. Please use the contact form in the meantime.",
      typing: "Assistant is typing…",
      timeout: "No reply yet. Please try again or write later.",
      retry: "Try again",
      error: "Could not send message. Please try again.",
      greeting: "Hi! How can we help?",
    },
    hr: {
      title: "CreationFirst Chat",
      subtitle: "Pitajte kratko — odgovaramo ovdje.",
      placeholder: "Napišite poruku…",
      send: "Pošalji",
      open: "Otvori chat",
      close: "Zatvori chat",
      unavailable: "Chat uskoro dostupan",
      unavailableHint: "Live chat se upravo postavlja. Pišite nam putem kontakt obrasca.",
      typing: "Asistent tipka…",
      timeout: "Još nema odgovora. Pokušajte ponovo ili pišite kasnije.",
      retry: "Pokušaj ponovo",
      error: "Poruka nije poslana. Pokušajte ponovo.",
      greeting: "Bok! Kako vam možemo pomoći?",
    },
  };
  var t = copy[lang] || copy.de;

  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs.html;
        else node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  function getConversationId() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setConversationId(id) {
    try {
      if (id) sessionStorage.setItem(STORAGE_KEY, id);
    } catch (e) { /* ignore */ }
  }

  var root = el("div", "cf-site-chat", { "data-cf-site-chat": "1" });
  var launcher = el("button", "cf-site-chat__launcher", {
    type: "button",
    "aria-label": t.open,
    "aria-expanded": "false",
    "aria-controls": "cf-site-chat-panel",
  });
  launcher.innerHTML =
    '<svg class="cf-site-chat__icon-open" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.2V6.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 9.5h8M8 13h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
    '<svg class="cf-site-chat__icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  var panel = el("div", "cf-site-chat__panel", {
    id: "cf-site-chat-panel",
    role: "dialog",
    "aria-label": t.title,
    "aria-hidden": "true",
  });

  var header = el("div", "cf-site-chat__header");
  header.appendChild(el("div", "cf-site-chat__title", { text: t.title }));
  header.appendChild(el("div", "cf-site-chat__subtitle", { text: t.subtitle }));
  var closeBtn = el("button", "cf-site-chat__close", {
    type: "button",
    "aria-label": t.close,
  });
  closeBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  header.appendChild(closeBtn);

  var thread = el("div", "cf-site-chat__thread", {
    role: "log",
    "aria-live": "polite",
    "aria-relevant": "additions",
  });

  var form = el("form", "cf-site-chat__form");
  var input = el("textarea", "cf-site-chat__input", {
    rows: "1",
    placeholder: t.placeholder,
    "aria-label": t.placeholder,
    maxlength: "4000",
  });
  var sendBtn = el("button", "cf-site-chat__send", {
    type: "submit",
    "aria-label": t.send,
  });
  sendBtn.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  form.appendChild(input);
  form.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(thread);
  panel.appendChild(form);
  root.appendChild(panel);
  root.appendChild(launcher);

  var open = false;
  var busy = false;
  var pollTimer = null;
  var knownCount = 0;

  function setOpen(next) {
    open = !!next;
    root.classList.toggle("is-open", open);
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) {
      input.focus();
      scrollThread();
    }
  }

  function scrollThread() {
    thread.scrollTop = thread.scrollHeight;
  }

  function appendBubble(role, text) {
    var row = el(
      "div",
      "cf-site-chat__row cf-site-chat__row--" + (role === "user" ? "user" : "bot")
    );
    var bubble = el(
      "div",
      "cf-site-chat__bubble cf-site-chat__bubble--" + (role === "user" ? "user" : "bot"),
      { text: text }
    );
    row.appendChild(bubble);
    thread.appendChild(row);
    scrollThread();
    return row;
  }

  function showTyping(show) {
    var existing = thread.querySelector(".cf-site-chat__typing");
    if (!show) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    var row = el("div", "cf-site-chat__row cf-site-chat__row--bot cf-site-chat__typing");
    var bubble = el("div", "cf-site-chat__bubble cf-site-chat__bubble--bot cf-site-chat__typing-bubble");
    bubble.innerHTML =
      '<span class="cf-site-chat__dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<span class="cf-site-chat__typing-label">' +
      t.typing +
      "</span>";
    row.appendChild(bubble);
    thread.appendChild(row);
    scrollThread();
  }

  function setDisabled(disabled, reason) {
    input.disabled = disabled;
    sendBtn.disabled = disabled;
    if (reason) {
      var note = thread.querySelector(".cf-site-chat__system");
      if (!note) {
        note = el("div", "cf-site-chat__system");
        thread.appendChild(note);
      }
      note.textContent = reason;
    }
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function renderHistory(messages) {
    thread.innerHTML = "";
    if (!messages || !messages.length) {
      appendBubble("assistant", t.greeting);
      knownCount = 0;
      return;
    }
    messages.forEach(function (m) {
      if (m && m.text) appendBubble(m.role === "user" ? "user" : "assistant", m.text);
    });
    knownCount = messages.length;
  }

  async function fetchMessages(conversationId) {
    var url =
      api +
      (api.indexOf("?") >= 0 ? "&" : "?") +
      "conversation_id=" +
      encodeURIComponent(conversationId);
    var res = await fetch(url, { method: "GET", credentials: "omit" });
    if (!res.ok) throw new Error("poll " + res.status);
    return res.json();
  }

  function startPoll(conversationId, baselineCount) {
    stopPoll();
    var started = Date.now();
    showTyping(true);
    pollTimer = setInterval(async function () {
      try {
        var data = await fetchMessages(conversationId);
        var messages = (data && data.messages) || [];
        var last = messages[messages.length - 1];
        if (
          messages.length > baselineCount &&
          last &&
          last.role === "assistant"
        ) {
          stopPoll();
          showTyping(false);
          // Append only new assistant messages beyond what we already showed
          for (var i = knownCount; i < messages.length; i++) {
            var m = messages[i];
            if (m && m.role === "assistant" && m.text) {
              appendBubble("assistant", m.text);
            } else if (m && m.role === "user" && i >= knownCount) {
              /* already shown locally */
            }
          }
          knownCount = messages.length;
          busy = false;
          return;
        }
        if (Date.now() - started > TIMEOUT_MS) {
          stopPoll();
          showTyping(false);
          var timeoutRow = el("div", "cf-site-chat__system");
          timeoutRow.textContent = t.timeout + " ";
          var retry = el("button", "cf-site-chat__retry", {
            type: "button",
            text: t.retry,
          });
          retry.addEventListener("click", function () {
            timeoutRow.remove();
            startPoll(conversationId, baselineCount);
          });
          timeoutRow.appendChild(retry);
          thread.appendChild(timeoutRow);
          scrollThread();
          busy = false;
        }
      } catch (e) {
        /* keep polling until timeout */
      }
    }, POLL_MS);
  }

  async function loadExisting() {
    var id = getConversationId();
    if (!api || !id) {
      appendBubble("assistant", t.greeting);
      return;
    }
    try {
      var data = await fetchMessages(id);
      renderHistory(data.messages || []);
    } catch (e) {
      appendBubble("assistant", t.greeting);
    }
  }

  async function sendMessage(text) {
    if (busy || !api) return;
    busy = true;
    appendBubble("user", text);
    input.value = "";
    autoSize();
    showTyping(true);

    var conversation_id = getConversationId() || undefined;
    var baseline = knownCount + 1; // after user message lands on server

    try {
      var res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ conversation_id: conversation_id, message: text }),
      });
      if (!res.ok) throw new Error("post " + res.status);
      var data = await res.json();
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        conversation_id = data.conversation_id;
      }
      knownCount = baseline;
      startPoll(conversation_id, baseline);
    } catch (e) {
      showTyping(false);
      var err = el("div", "cf-site-chat__system", { text: t.error });
      thread.appendChild(err);
      scrollThread();
      busy = false;
    }
  }

  function autoSize() {
    input.style.height = "auto";
    input.style.height = Math.min(120, Math.max(40, input.scrollHeight)) + "px";
  }

  launcher.addEventListener("click", function () {
    setOpen(!open);
  });
  closeBtn.addEventListener("click", function () {
    setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) setOpen(false);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = (input.value || "").trim();
    if (!text) return;
    sendMessage(text);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener("input", autoSize);

  if (!api) {
    root.classList.add("is-disabled");
    launcher.setAttribute("aria-label", t.unavailable);
    setDisabled(true, t.unavailableHint);
    header.querySelector(".cf-site-chat__subtitle").textContent = t.unavailable;
    thread.innerHTML = "";
    appendBubble("assistant", t.unavailableHint);
    input.placeholder = t.unavailable;
  } else {
    loadExisting();
  }

  function mount() {
    if (document.body) document.body.appendChild(root);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
