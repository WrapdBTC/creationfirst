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


  /* Industry nav dropdown */
  var drops = document.querySelectorAll(".nav-drop");
  function closeDrops(except) {
    drops.forEach(function (el) {
      if (el === except) return;
      el.classList.remove("is-open");
      var b = el.querySelector(".nav-drop-toggle");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  }
  drops.forEach(function (el) {
    var btn = el.querySelector(".nav-drop-toggle");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = !el.classList.contains("is-open");
      closeDrops(el);
      el.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function () { closeDrops(null); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDrops(null);
  });

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

  /* Auto-Reveal: Bausteine ohne data-reveal bekommen es automatisch, damit jede Seite gleich lebendig ist */
  if (!reduceMotion) {
    var AUTO = ".section-head, .usp-card, .card, .service-block, .portfolio-card, .process-step, .faq-item, .cta-band, " +
      ".closing-panel, .section-figure, .price-card, .entry-card, .personal-grid > *, .service-paths > *, .case-layout > *, " +
      ".process-strip > li, .compact-faq > *, .contact-info-row, .trust-bar-chips > *, .privacy-promise, .offer-teaser, " +
      ".example-jumps, .case-heading, .showcase-card, .form-card, .contact-form";
    document.querySelectorAll(AUTO).forEach(function (el) {
      if (el.hasAttribute("data-reveal") || el.querySelector("[data-reveal]")) return;
      if (el.parentElement && el.parentElement.closest("[data-reveal]")) return;
      if (el.closest(".hero, .page-hero, .studio-hero, [data-hscroll]")) return;
      el.setAttribute("data-reveal", "");
    });

    /* Überschrift im Unterseiten-Hero Wort für Wort aufbauen (Vorlesetext bleibt über aria-label ganz) */
    var splitH1 = document.querySelector(".hero h1, .page-hero h1, .studio-hero.compact h1");
    if (splitH1) {
      splitH1.setAttribute("aria-label", splitH1.textContent.replace(/\s+/g, " ").trim());
      var wordIndex = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
              var w = document.createElement("span");
              w.className = "split-word";
              w.setAttribute("aria-hidden", "true");
              w.style.setProperty("--i", String(wordIndex++));
              w.textContent = part;
              frag.appendChild(w);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName !== "BR") {
            walk(n);
          }
        });
      })(splitH1);
    }
  }

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
    var aliases = { analysis: "ai", audit: "ai", sprint: "app", shop: "web", seo: "web" };
    topic = aliases[topic] || topic;
    var serviceSelect = form.querySelector("#service");
    // Progressive enhancement: never allow requests the deployed relay would reject.
    var contactEndpoint = form.getAttribute("action");
    var isFormSubmit = /formsubmit\.co/.test(contactEndpoint || "");
    if (contactEndpoint) {
      (isFormSubmit ? Promise.resolve({ phoneOptional: true }) : fetch(contactEndpoint, { credentials: "omit" }).then(function (res) {
        if (!res.ok) throw new Error("Capability unavailable");
        return res.json();
      })).then(function (capabilities) {
        if (capabilities.phoneOptional !== true) return;
        var phone = form.querySelector("#phone");
        phone.required = false;
        var marker = form.querySelector('label[for="phone"] .req');
        if (marker) { marker.className = "opt"; marker.removeAttribute("aria-hidden"); marker.textContent = form.dataset.phoneOptional; }
        var hint = form.querySelector("#phone-hint");
        if (hint) hint.textContent = form.dataset.phoneHint;
      }).catch(function () { /* Keep the current relay's required phone field. */ });
    }
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
      if ((form.querySelector("#phone").required || payload.phone) && payload.phone.length < 5) {
        setStatus(form.getAttribute("data-msg-phone") || "", false);
        var phoneEl = form.querySelector("#phone");
        if (phoneEl) phoneEl.focus();
        return;
      }
      setStatus(form.getAttribute("data-msg-sending") || "…");
      if (btn) btn.disabled = true;
      if (isFormSubmit) {
        if (payload._gotcha) { setStatus(form.getAttribute("data-msg-ok") || "", true); form.reset(); return; }
        delete payload._gotcha;
        payload._subject = "Neue Anfrage über creationfirst.io: " + (payload.name || "");
        payload._template = "table";
        payload._captcha = "false";
      }
      fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit"
      }).then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        return res.json().catch(function () { return { ok: true }; });
      }).then(function (data) {
        if (data && (data.success === false || data.success === "false")) throw new Error("not delivered");
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

/* Vorschau-Rahmen: iframe mit fester Größe (1280 x 800) auf die Breite des Rahmens skalieren. */
(function () {
  "use strict";
  var frames = document.querySelectorAll("[data-scale-frame]");
  if (!frames.length) return;
  function fit(el) { el.style.setProperty("--frame-scale", String(el.clientWidth / 1280)); }
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function (entries) { entries.forEach(function (e) { fit(e.target); }); });
    frames.forEach(function (el) { fit(el); ro.observe(el); });
  } else {
    frames.forEach(fit);
    window.addEventListener("resize", function () { frames.forEach(fit); });
  }
})();

/* Lichtkegel: Karten und Unterseiten-Heros folgen dem Mauszeiger (nur mit Maus, nicht bei reduzierter Bewegung). */
(function () {
  "use strict";
  var mm = window.matchMedia;
  if (!mm || !mm("(pointer: fine)").matches || mm("(prefers-reduced-motion: reduce)").matches) return;
  function track(el, xVar, yVar) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty(xVar, (e.clientX - r.left).toFixed(0) + "px");
      el.style.setProperty(yVar, (e.clientY - r.top).toFixed(0) + "px");
    });
    el.addEventListener("pointerleave", function () {
      el.style.removeProperty(xVar);
      el.style.removeProperty(yVar);
    });
  }
  document.querySelectorAll(".card, .usp-card, .process-step, .price-card, .entry-card, .portfolio-card, .example-tile, .showcase-card, .closing-panel").forEach(function (el) {
    el.classList.add("spot");
    track(el, "--mx", "--my");
  });
  document.querySelectorAll(".hero, .page-hero, .studio-hero.compact").forEach(function (el) { track(el, "--hx", "--hy"); });
})();

/* Scroll-Effekte: alles hier hängt direkt an der Scroll-Position (kein Hover, keine Bibliothek).
   Ein einziger requestAnimationFrame-Durchlauf pro Scroll-Ereignis setzt CSS-Variablen; die Optik steht in style.css (Abschnitt 21). */
(function () {
  "use strict";
  var mm = window.matchMedia;
  if (mm && mm("(prefers-reduced-motion: reduce)").matches) return;
  var root = document.documentElement;
  root.classList.add("scrollfx");

  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { return 1 - Math.pow(1 - v, 3); }

  /* Abschnittstitel in Wörter zerlegen */
  var titles = [];
  all(".section-head h2, .calc-band h2, .closing-panel h2, .personal-grid h2, .compact-faq > h2, .cta-band h2, .case-heading h2").forEach(function (h) {
    if (h.closest(".hero, .page-hero, .studio-hero")) return;
    h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span");
            w.className = "sw";
            w.setAttribute("aria-hidden", "true");
            w.textContent = part;
            words.push(w);
            frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") {
          walk(n);
        }
      });
    })(h);
    titles.push({ el: h, words: words, lit: -1 });
  });

  var heroes = all(".hero, .page-hero, .studio-hero.compact");
  var liveDemo = document.querySelector(".next-hero .live-demo");
  var images = all(".service-visual, .section-figure, .founder-photo, .case-visual > img");
  var strips = all(".process-strip").map(function (el) { return { el: el, items: Array.prototype.slice.call(el.children) }; });
  var grids = all(".grid, .service-paths").map(function (el) {
    var items = Array.prototype.slice.call(el.children).filter(function (c) { return /usp-card|process-step|\bcard\b/.test(c.className) || el.classList.contains("service-paths"); });
    items.forEach(function (c, i) {
      var mid = (items.length - 1) / 2;
      c.style.setProperty("--gx", ((i - mid) * 46).toFixed(0) + "px");
      c.style.setProperty("--gr", ((i - mid) * 3.5).toFixed(1) + "deg");
      c.classList.add("is-visible");
    });
    return { el: el, items: items };
  }).filter(function (g) { return g.items.length > 1; });
  var gallery = all("[data-hscroll]").map(function (sec) {
    return { sec: sec, sticky: sec.querySelector(".hscroll-sticky"), track: sec.querySelector(".hscroll-track"), bar: sec.querySelector(".hscroll-progress"), overflow: 0 };
  });
  var marquees = all(".big-marquee-track").map(function (el) { return { el: el, half: 0 }; });
  var tagRows = all(".tag-row").map(function (el) { return { el: el, dir: parseFloat(el.getAttribute("data-dir")) || 1 }; });

  var vh = window.innerHeight;
  var headerH = 72;

  function measure() {
    vh = window.innerHeight;
    var header = document.querySelector(".site-header");
    if (header) headerH = header.offsetHeight;
    gallery.forEach(function (g) {
      var on = window.innerWidth >= 900 && vh >= 620;
      g.sec.classList.toggle("hscroll-on", on);
      g.track.style.transform = "";
      if (!on) { g.sec.style.height = ""; g.overflow = 0; return; }
      g.overflow = Math.max(0, g.track.scrollWidth - window.innerWidth);
      g.sec.style.height = (g.sticky.offsetHeight + g.overflow) + "px";
    });
    marquees.forEach(function (m) { m.half = m.el.scrollWidth / 2; });
  }

  function update() {
    var y = window.scrollY || 0;

    titles.forEach(function (t) {
      var r = t.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var p = clamp((vh * 0.92 - r.top) / (vh * 0.42));
      var lit = Math.round(p * t.words.length);
      if (lit === t.lit) return;
      t.lit = lit;
      t.words.forEach(function (w, i) { w.classList.toggle("on", i < lit); });
    });

    heroes.forEach(function (h) {
      var height = h.offsetHeight || 1;
      if (y > height + 100) return;
      h.style.setProperty("--sp", clamp(y / (height * 0.85)).toFixed(3));
    });

    if (liveDemo) {
      var lr = liveDemo.getBoundingClientRect();
      liveDemo.style.setProperty("--tilt", (1 - clamp((vh - lr.top) / (vh * 0.55))).toFixed(3));
    }

    images.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      el.style.setProperty("--ip", ease(clamp((vh - r.top) / (vh * 0.6))).toFixed(3));
    });

    strips.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = clamp((vh * 0.88 - r.top) / (vh * 0.45));
      s.el.style.setProperty("--p", p.toFixed(3));
      s.items.forEach(function (li, i) { li.classList.toggle("is-on", p > (i + 0.35) / s.items.length); });
    });

    grids.forEach(function (g) {
      var r = g.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 150) return;
      var p = clamp((vh - r.top) / (vh * 0.5));
      var stacked = window.innerWidth < 760; /* untereinander: jede Karte nach ihrer eigenen Position */
      g.items.forEach(function (c, i) {
        var own = stacked ? clamp((vh - c.getBoundingClientRect().top) / (vh * 0.3)) : clamp(p * 1.25 - i * 0.08);
        c.style.setProperty("--gp", ease(own).toFixed(3));
      });
    });

    gallery.forEach(function (g) {
      if (!g.overflow) return;
      var r = g.sec.getBoundingClientRect();
      var p = clamp((headerH - r.top) / g.overflow);
      g.track.style.transform = "translate3d(" + (-p * g.overflow).toFixed(1) + "px,0,0)";
      if (g.bar) g.bar.style.setProperty("--hp", p.toFixed(3));
    });

    tagRows.forEach(function (t) {
      var r = t.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = (vh - r.top) / (vh + r.height);
      t.el.style.transform = "translate3d(" + (t.dir * (p - 0.5) * 520).toFixed(1) + "px,0,0)";
    });

    marquees.forEach(function (m) {
      if (!m.half) return;
      m.el.style.transform = "translate3d(" + (-((y * 0.55) % m.half)).toFixed(1) + "px,0,0)";
    });
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; update(); });
  }
  function refresh() { measure(); update(); }
  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", refresh, { passive: true });
  window.addEventListener("load", refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  refresh();
})();

/* Beispiele im Popup: Links auf demos/ öffnen ein Fenster über der Seite statt die Seite zu verlassen.
   Ohne JavaScript, mit Strg/Cmd-Klick oder per „In neuem Tab“ bleibt es ein normaler Link. */
(function () {
  "use strict";
  if (!("HTMLDialogElement" in window)) return;
  var lang = (document.documentElement.lang || "de").slice(0, 2);
  var TXT = {
    de: { note: "Beispiel zum Ausprobieren · es wird nichts gesendet", tab: "In neuem Tab ↗", close: "Schließen" },
    en: { note: "An example to try out · nothing is sent", tab: "Open in new tab ↗", close: "Close" },
    hr: { note: "Primjer za isprobavanje · ništa se ne šalje", tab: "Otvori u novoj kartici ↗", close: "Zatvori" }
  }[lang] || null;
  if (!TXT) return;

  var dialog, frame, titleEl, tabLink, lastFocus;
  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "demo-modal";
    dialog.innerHTML = '<div class="dm-bar"><span class="dm-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<strong class="dm-title"></strong><span class="dm-note"></span><a class="dm-new" target="_blank" rel="noopener"></a>' +
      '<button class="dm-close" type="button"></button></div><iframe title=""></iframe>';
    frame = dialog.querySelector("iframe");
    titleEl = dialog.querySelector(".dm-title");
    tabLink = dialog.querySelector(".dm-new");
    dialog.querySelector(".dm-note").textContent = TXT.note;
    tabLink.textContent = TXT.tab;
    var closeBtn = dialog.querySelector(".dm-close");
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", TXT.close);
    closeBtn.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", function () {
      frame.removeAttribute("src");
      document.documentElement.classList.remove("modal-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
    document.body.appendChild(dialog);
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href*="demos/"]') : null;
    if (!a || a.target === "_blank") return;
    e.preventDefault();
    if (!dialog) build();
    var href = a.getAttribute("href");
    var name = a.getAttribute("data-demo") || a.textContent.trim();
    lastFocus = a;
    titleEl.textContent = name;
    frame.setAttribute("title", name);
    tabLink.setAttribute("href", href);
    var hashAt = href.indexOf("#"); /* ein Teil hinter # bleibt am Ende stehen */
    var base = hashAt === -1 ? href : href.slice(0, hashAt);
    frame.setAttribute("src", base + (base.indexOf("?") === -1 ? "?" : "&") + "preview=1" + (hashAt === -1 ? "" : href.slice(hashAt)));
    document.documentElement.classList.add("modal-open");
    dialog.showModal();
  });
})();
