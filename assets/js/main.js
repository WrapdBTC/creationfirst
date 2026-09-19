/* CreationFirst, main.js (vanilla, no dependencies) */
(function () {
  "use strict";

  var root = document.documentElement;
  var lang = (root.lang || "de").slice(0, 2);
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("js");

  /* Theme toggle (light/dark). The initial theme is set synchronously in <head>. */
  var themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* private mode */ }
    });
  }

  /* Header shadow, scroll progress, back-to-top */
  var header = document.querySelector(".site-header");
  var progress = document.querySelector(".scroll-progress");
  var backToTop = document.querySelector(".back-to-top");
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY || 0;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (backToTop) backToTop.classList.toggle("is-visible", y > 900);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, Math.max(0, y / max)) : 0).toFixed(4) + ")";
    }
  }
  function requestScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }
  document.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll, { passive: true });
  onScroll();
  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* Mobile navigation */
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");
  function setNav(open) {
    if (!navToggle || !mainNav) return;
    mainNav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
  }
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setNav(!mainNav.classList.contains("is-open"));
    });
    mainNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("click", function (e) {
      if (mainNav.classList.contains("is-open") && !mainNav.contains(e.target)) setNav(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1060 && mainNav.classList.contains("is-open")) setNav(false);
    });
  }

  /* Language switcher */
  var langSwitches = document.querySelectorAll(".lang-switch");
  function closeLangs(except) {
    langSwitches.forEach(function (el) {
      if (el === except) return;
      el.classList.remove("is-open");
      var b = el.querySelector(".lang-switch-btn");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  }
  langSwitches.forEach(function (el) {
    var btn = el.querySelector(".lang-switch-btn");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeLangs(el);
      var open = el.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function () { closeLangs(null); });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeLangs(null);
    if (mainNav && mainNav.classList.contains("is-open")) { setNav(false); if (navToggle) navToggle.focus(); }
  });

  /* FAQ accordion (one open per list) */
  document.querySelectorAll(".faq-item").forEach(function (item, i) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    var id = "faq-a-" + i;
    a.id = id;
    a.setAttribute("role", "region");
    q.setAttribute("aria-controls", id);
    q.setAttribute("aria-expanded", "false");
    q.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");
      var list = item.closest(".faq-list") || item.parentNode;
      list.querySelectorAll(".faq-item.is-open").forEach(function (other) {
        other.classList.remove("is-open");
        other.querySelector(".faq-a").style.maxHeight = null;
        other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("is-open");
        a.style.maxHeight = a.scrollHeight + "px";
        q.setAttribute("aria-expanded", "true");
      }
    });
  });
  window.addEventListener("resize", function () {
    document.querySelectorAll(".faq-item.is-open .faq-a").forEach(function (a) { a.style.maxHeight = a.scrollHeight + "px"; });
  }, { passive: true });

  /* Reveal on scroll, staggered per group of siblings */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) {
      var siblings = el.parentNode ? Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute("data-reveal"); }) : [];
      var idx = siblings.indexOf(el);
      if (idx > 0) el.style.transitionDelay = Math.min(idx, 5) * 70 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Desktop-only motion accents */
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".hero .btn-primary, .cta-band .btn-primary").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        btn.style.transform = "translate(" + (x * 0.12).toFixed(1) + "px," + (y * 0.2 - 2).toFixed(1) + "px)";
      });
      btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
    });
    var heroEl = document.querySelector(".hero");
    if (heroEl) {
      var glows = heroEl.querySelectorAll("[data-parallax]");
      heroEl.addEventListener("mousemove", function (e) {
        var r = heroEl.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        glows.forEach(function (g) {
          var f = parseFloat(g.getAttribute("data-parallax")) * 100;
          g.style.transform = "translate(" + (x * f).toFixed(1) + "px," + (y * f).toFixed(1) + "px)";
        });
      });
      heroEl.addEventListener("mouseleave", function () { glows.forEach(function (g) { g.style.transform = ""; }); });
    }
  }

  /* Contact form: preselect topic from ?thema=, send to the Cloudflare relay */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var params = new URLSearchParams(window.location.search);
    var topic = (params.get("thema") || params.get("topic") || "").toLowerCase();
    var serviceSelect = form.querySelector("#service");
    if (topic && serviceSelect) {
      var match = serviceSelect.querySelector('option[data-topic="' + topic.replace(/[^a-z-]/g, "") + '"]');
      if (match) serviceSelect.value = match.value;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var statusEl = form.querySelector(".form-status");
      var action = (form.getAttribute("action") || "").trim();
      var btn = form.querySelector('button[type="submit"]');
      function setStatus(msg, ok) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.className = "form-status is-visible" + (ok === false ? " err" : ok === true ? " ok" : "");
      }
      if (action.indexOf("http") !== 0) {
        setStatus(form.getAttribute("data-msg-notconfigured") || "", false);
        return;
      }
      var fd = new FormData(form);
      var payload = {
        name: String(fd.get("name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
        company: String(fd.get("company") || "").trim(),
        budget: String(fd.get("budget") || "").trim(),
        service: String(fd.get("service") || "").trim(),
        message: String(fd.get("message") || "").trim(),
        _gotcha: String(fd.get("_gotcha") || "").trim()
      };
      if (payload.phone.length < 5) {
        setStatus(form.getAttribute("data-msg-phone") || "", false);
        var phoneEl = form.querySelector("#phone");
        if (phoneEl) phoneEl.focus();
        return;
      }
      setStatus(form.getAttribute("data-msg-sending") || "…");
      if (btn) btn.disabled = true;
      fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit"
      }).then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        return res.json().catch(function () { return { ok: true }; });
      }).then(function () {
        setStatus(form.getAttribute("data-msg-ok") || "", true);
        form.reset();
      }).catch(function () {
        setStatus(form.getAttribute("data-msg-err") || "", false);
      }).finally(function () {
        if (btn) btn.disabled = false;
      });
    });
  }

  /* Portfolio: category filter + lightbox (reads the clicked card, no duplicated data) */
  var portfolioGrid = document.querySelector("#portfolio-grid");
  if (portfolioGrid) {
    var filterPills = document.querySelectorAll(".filter-pill");
    var cards = portfolioGrid.querySelectorAll(".portfolio-card");
    var emptyMsg = document.querySelector(".portfolio-empty");
    filterPills.forEach(function (pill) {
      pill.setAttribute("aria-pressed", pill.classList.contains("is-active") ? "true" : "false");
      pill.addEventListener("click", function () {
        filterPills.forEach(function (p) { p.classList.remove("is-active"); p.setAttribute("aria-pressed", "false"); });
        pill.classList.add("is-active");
        pill.setAttribute("aria-pressed", "true");
        var key = pill.dataset.filter;
        var visible = 0;
        cards.forEach(function (card) {
          var show = key === "all" || card.dataset.cat === key;
          card.classList.toggle("is-filtered-out", !show);
          if (show) visible++;
        });
        if (emptyMsg) emptyMsg.hidden = visible !== 0;
      });
    });

    var lightbox = document.querySelector("#portfolio-lightbox");
    if (lightbox) {
      var lbThumb = lightbox.querySelector(".lightbox-thumb");
      var lbCat = lightbox.querySelector(".lightbox-cat");
      var lbTitle = lightbox.querySelector(".lightbox-title");
      var lbText = lightbox.querySelector(".lightbox-text");
      var lbMeta = lightbox.querySelector(".lightbox-meta");
      var closeBtn = lightbox.querySelector(".lightbox-close");
      var lastFocused = null;
      function openLightbox(card) {
        var thumb = card.querySelector(".portfolio-thumb");
        var title = card.querySelector("h3");
        var facts = card.querySelector(".portfolio-facts");
        var cat = card.querySelector(".cat");
        lbThumb.innerHTML = "";
        if (thumb) {
          var clone = thumb.cloneNode(true);
          var hint = clone.querySelector(".lightbox-hint");
          if (hint) hint.remove();
          lbThumb.appendChild(clone);
        }
        lbCat.textContent = cat ? cat.textContent : "";
        lbTitle.textContent = title ? title.textContent : "";
        lbText.innerHTML = "";
        if (facts) lbText.appendChild(facts.cloneNode(true));
        lbMeta.innerHTML = "";
        card.querySelectorAll(".portfolio-meta .chip").forEach(function (chip) {
          var span = document.createElement("span");
          span.className = "chip";
          span.textContent = chip.textContent;
          lbMeta.appendChild(span);
        });
        lastFocused = document.activeElement;
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        if (closeBtn) closeBtn.focus();
      }
      function closeLightbox() {
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        if (lastFocused && lastFocused.focus) lastFocused.focus();
      }
      cards.forEach(function (card) {
        card.addEventListener("click", function () { openLightbox(card); });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(card); }
        });
      });
      lightbox.querySelectorAll("[data-lightbox-close]").forEach(function (el) { el.addEventListener("click", closeLightbox); });
      document.addEventListener("keydown", function (e) {
        if (!lightbox.classList.contains("is-open")) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "Tab" && closeBtn) { e.preventDefault(); closeBtn.focus(); }
      });
    }
  }

  /* "Under the hood": live-measured facts about the current page */
  var devToggle = document.querySelector(".dev-toggle");
  var devPanel = document.querySelector(".dev-panel");
  function setDev(open) {
    if (!devToggle || !devPanel) return;
    devPanel.classList.toggle("is-open", open);
    devToggle.setAttribute("aria-expanded", open ? "true" : "false");
    devPanel.setAttribute("aria-hidden", open ? "false" : "true");
  }
  if (devToggle && devPanel) {
    var devLoaded = false;
    var nf = new Intl.NumberFormat(lang === "en" ? "en-GB" : lang === "hr" ? "hr-HR" : "de-DE");
    devToggle.addEventListener("click", function () {
      var open = !devPanel.classList.contains("is-open");
      setDev(open);
      if (!open || devLoaded) return;
      devLoaded = true;
      try {
        var resources = performance.getEntriesByType("resource") || [];
        var nav = (performance.getEntriesByType("navigation") || [])[0];
        var bytes = resources.reduce(function (s, r) { return s + (r.transferSize || 0); }, nav && nav.transferSize ? nav.transferSize : 0);
        devPanel.querySelector(".dev-stat-requests").textContent = nf.format(resources.length + 1);
        devPanel.querySelector(".dev-stat-weight").textContent = bytes > 0 ? nf.format(Math.round(bytes / 1024)) + " KB" : "–";
        var ms = nav && nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd - nav.startTime) : null;
        devPanel.querySelector(".dev-stat-load").textContent = ms != null ? nf.format(ms) + " ms" : "–";
      } catch (e) { /* stats are a nice-to-have */ }
    });
    var devClose = devPanel.querySelector(".dev-panel-close");
    if (devClose) devClose.addEventListener("click", function () { setDev(false); devToggle.focus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setDev(false); });
  }

  /* Hide floating dev control near the footer so it never sits on the copyright line */
  var footer = document.querySelector(".site-footer");
  if (footer && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        root.classList.toggle("footer-near", entry.isIntersecting);
        if (entry.isIntersecting) setDev(false);
      });
    }, { rootMargin: "0px 0px -8% 0px" }).observe(footer);
  }

  /* Mobile sticky CTA: visible after the hero, hidden near the final CTA and the footer */
  (function () {
    var bar = document.querySelector("[data-sticky-cta]");
    if (!bar) return;
    document.body.classList.add("has-sticky-cta");
    var hero = document.querySelector(".hero, .page-hero");
    var stops = Array.prototype.slice.call(document.querySelectorAll(".cta-band, .site-footer"));
    function update() {
      var vh = window.innerHeight;
      var pastHero = hero ? hero.getBoundingClientRect().bottom < 60 : (window.scrollY > 300);
      var nearStop = stops.some(function (el) {
        var r = el.getBoundingClientRect();
        return r.top < vh - 40 && r.bottom > 0;
      });
      var show = pastHero && !nearStop && !document.body.classList.contains("nav-open");
      bar.classList.toggle("is-visible", show);
      document.body.classList.toggle("sticky-cta-on", show);
    }
    var queued = false;
    function queue() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; update(); }); } }
    document.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue, { passive: true });
    update();
  })();
})();
