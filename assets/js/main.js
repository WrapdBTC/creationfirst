/* CreationFirst — main.js (vanilla, no dependencies) */
(function () {
  "use strict";

  /* Theme toggle (light/dark). Initial theme is already set synchronously in <head>. */
  var themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var root = document.documentElement;
      var current = root.getAttribute("data-theme") || "light";
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
    });
  }

  /* Sticky header shadow on scroll + scroll-progress bar */
  var header = document.querySelector(".site-header");
  var scrollProgress = document.querySelector(".scroll-progress");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    var btt = document.querySelector(".back-to-top");
    if (btt) btt.classList.toggle("is-visible", window.scrollY > 600);
    if (scrollProgress) {
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      var pct = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
      scrollProgress.style.width = pct + "%";
    }
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* Mobile nav toggle */
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var open = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Language switcher dropdown */
  document.querySelectorAll(".lang-switch").forEach(function (el) {
    var btn = el.querySelector(".lang-switch-btn");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      document.querySelectorAll(".lang-switch.is-open").forEach(function (other) {
        if (other !== el) other.classList.remove("is-open");
      });
      el.classList.toggle("is-open");
    });
  });
  document.addEventListener("click", function () {
    document.querySelectorAll(".lang-switch.is-open").forEach(function (el) {
      el.classList.remove("is-open");
    });
    document.querySelectorAll(".nav-more.is-open").forEach(function (el) {
      el.classList.remove("is-open");
      var b = el.querySelector(".nav-more-btn");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  });

  /* Mid-width nav overflow ("Mehr") for secondary items such as Playground */
  document.querySelectorAll(".nav-more").forEach(function (el) {
    var btn = el.querySelector(".nav-more-btn");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      document.querySelectorAll(".nav-more.is-open").forEach(function (other) {
        if (other !== el) {
          other.classList.remove("is-open");
          var ob = other.querySelector(".nav-more-btn");
          if (ob) ob.setAttribute("aria-expanded", "false");
        }
      });
      document.querySelectorAll(".lang-switch.is-open").forEach(function (other) {
        other.classList.remove("is-open");
      });
      var open = el.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* FAQ accordion */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");
      item.closest(".faq-list").querySelectorAll(".faq-item").forEach(function (other) {
        other.classList.remove("is-open");
        other.querySelector(".faq-a").style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("is-open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });

  /* Reveal-on-scroll animation */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = ((i % 8) * 55) + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Animated stat counters */
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var countIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var target = parseFloat(el.getAttribute("data-count"));
          var suffix = el.getAttribute("data-suffix") || "";
          var duration = 1200;
          var start = null;
          function step(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var value = Math.floor(progress * target);
            el.textContent = value + suffix;
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = target + suffix;
          }
          requestAnimationFrame(step);
          countIO.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) { countIO.observe(el); });
  }

  /* Back to top */
  var backToTop = document.querySelector(".back-to-top");
  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Extra "alive" touches (desktop / fine-pointer only) ---------- */
  var isFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  if (isFinePointer) {
    /* Tilt-hover on cards */
    var tiltEls = document.querySelectorAll(".card, .portfolio-card, .pricing-card, .path-option, .entry-step");
    tiltEls.forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          "perspective(800px) rotateX(" + (-y * 7).toFixed(2) + "deg) rotateY(" +
          (x * 7).toFixed(2) + "deg) translateY(-4px)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });

    /* Magnetic primary buttons */
    document.querySelectorAll(".btn-primary").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        btn.style.transform = "translate(" + (x * 0.22).toFixed(1) + "px," + (y * 0.35).toFixed(1) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });

    /* Hero glow parallax */
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
      heroEl.addEventListener("mouseleave", function () {
        glows.forEach(function (g) { g.style.transform = ""; });
      });
    }
  }

  /* Contact form → Cloudflare relay → Discord */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var statusEl = form.querySelector(".form-status");
      var action = (form.getAttribute("action") || "").trim();
      var isConfigured = action.indexOf("YOUR_FORM_ID") === -1 && action.length > 0 && action.indexOf("http") === 0;
      var btn = form.querySelector('button[type="submit"]');

      function setStatus(msg, ok) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.className = "form-status is-visible" + (ok === false ? " err" : ok === true ? " ok" : "");
      }

      if (!isConfigured) {
        setStatus(form.getAttribute("data-msg-notconfigured") ||
          "Formular ist noch nicht aktiviert. Bitte kontaktiere uns per E-Mail.", false);
        return;
      }

      var fd = new FormData(form);
      var phone = String(fd.get("phone") || "").trim();
      if (!phone) {
        setStatus("Bitte Telefonnummer angeben.", false);
        return;
      }

      var payload = {
        name: String(fd.get("name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        phone: phone,
        company: String(fd.get("company") || "").trim(),
        budget: String(fd.get("budget") || "").trim(),
        service: String(fd.get("service") || "").trim(),
        message: String(fd.get("message") || "").trim(),
        _gotcha: String(fd.get("_gotcha") || "").trim()
      };

      setStatus(form.getAttribute("data-msg-sending") || "Wird gesendet …");
      if (btn) btn.disabled = true;

      fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit"
      }).then(function (res) {
        if (!res.ok) throw new Error("bad status");
        return res.json().catch(function () { return { ok: true }; });
      }).then(function () {
        setStatus(form.getAttribute("data-msg-ok") || "Danke — deine Anfrage ist raus.", true);
        form.reset();
      }).catch(function () {
        setStatus(form.getAttribute("data-msg-err") ||
          "Senden fehlgeschlagen. Bitte erneut versuchen oder info@creationfirst.io schreiben.", false);
      }).finally(function () {
        if (btn) btn.disabled = false;
      });
    });
  }

  /* Portfolio: category filter + lightbox (reads content straight off the clicked card,
     no duplicated data — the lightbox is just a bigger, focused view of the same DOM). */
  var portfolioGrid = document.querySelector("#portfolio-grid");
  if (portfolioGrid) {
    var filterPills = document.querySelectorAll(".filter-pill");
    var cards = portfolioGrid.querySelectorAll(".portfolio-card");
    var emptyMsg = document.querySelector(".portfolio-empty");

    function applyFilter(key) {
      var visible = 0;
      cards.forEach(function (card) {
        var match = key === "all" || card.dataset.cat === key;
        card.classList.toggle("is-filtered-out", !match);
        if (match) visible++;
      });
      if (emptyMsg) emptyMsg.hidden = visible !== 0;
    }
    filterPills.forEach(function (pill) {
      pill.addEventListener("click", function () {
        filterPills.forEach(function (p) { p.classList.remove("is-active"); });
        pill.classList.add("is-active");
        applyFilter(pill.dataset.filter);
      });
    });

    var lightbox = document.querySelector("#portfolio-lightbox");
    if (lightbox) {
      var lbThumb = lightbox.querySelector(".lightbox-thumb");
      var lbCat = lightbox.querySelector(".lightbox-cat");
      var lbTitle = lightbox.querySelector(".lightbox-title");
      var lbText = lightbox.querySelector(".lightbox-text");
      var lbMeta = lightbox.querySelector(".lightbox-meta");
      var lastFocused = null;

      function openLightbox(card) {
        var thumb = card.querySelector(".portfolio-thumb");
        var title = card.querySelector("h3");
        var facts = card.querySelector(".portfolio-facts");
        var cat = card.querySelector(".cat");
        var chips = card.querySelectorAll(".portfolio-meta .chip");

        lbThumb.innerHTML = "";
        if (thumb) lbThumb.appendChild(thumb.cloneNode(true));
        lbCat.textContent = cat ? cat.textContent : "";
        lbTitle.textContent = title ? title.textContent : "";
        lbText.innerHTML = "";
        if (facts) lbText.appendChild(facts.cloneNode(true));
        lbMeta.innerHTML = "";
        chips.forEach(function (chip) {
          var span = document.createElement("span");
          span.className = "chip";
          span.textContent = chip.textContent;
          lbMeta.appendChild(span);
        });

        lastFocused = document.activeElement;
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        var closeBtn = lightbox.querySelector(".lightbox-close");
        if (closeBtn) closeBtn.focus();
      }
      function closeLightbox() {
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
      }

      cards.forEach(function (card) {
        card.addEventListener("click", function () { openLightbox(card); });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(card); }
        });
      });
      lightbox.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
        el.addEventListener("click", closeLightbox);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
      });
    }
  }

  /* "Under the hood" — a small terminal-styled panel with real, live-measured facts
     about the current page (HTTP requests, transferred bytes, load time), plus a few
     static facts that are simply true for this site (no external trackers, vanilla JS). */
  var devToggle = document.querySelector(".dev-toggle");
  var devPanel = document.querySelector(".dev-panel");
  if (devToggle && devPanel) {
    var devStatsLoaded = false;
    function loadDevStats() {
      if (devStatsLoaded) return;
      devStatsLoaded = true;
      try {
        var resources = performance.getEntriesByType("resource") || [];
        var navEntries = performance.getEntriesByType("navigation");
        var nav = navEntries && navEntries[0];
        var totalBytes = 0;
        resources.forEach(function (r) { if (r.transferSize) totalBytes += r.transferSize; });
        if (nav && nav.transferSize) totalBytes += nav.transferSize;

        var reqEl = devPanel.querySelector(".dev-stat-requests");
        var weightEl = devPanel.querySelector(".dev-stat-weight");
        var loadEl = devPanel.querySelector(".dev-stat-load");
        if (reqEl) reqEl.textContent = String(resources.length + 1);
        if (weightEl) weightEl.textContent = totalBytes > 0 ? (totalBytes / 1024).toFixed(0) + " KB" : "–";
        if (loadEl) {
          var ms = null;
          if (nav && typeof nav.loadEventEnd === "number" && nav.loadEventEnd > 0) {
            ms = Math.round(nav.loadEventEnd - nav.startTime);
          } else if (performance.timing) {
            var t = performance.timing;
            if (t.loadEventEnd > 0) ms = t.loadEventEnd - t.navigationStart;
          }
          loadEl.textContent = ms != null && ms >= 0 ? ms + " ms" : "–";
        }
      } catch (e) { /* stats are a nice-to-have, never worth breaking the page over */ }
    }

    devToggle.addEventListener("click", function () {
      var open = devPanel.classList.toggle("is-open");
      devToggle.setAttribute("aria-expanded", open ? "true" : "false");
      devPanel.setAttribute("aria-hidden", open ? "false" : "true");
      if (open) loadDevStats();
    });
    var devClose = devPanel.querySelector(".dev-panel-close");
    if (devClose) {
      devClose.addEventListener("click", function () {
        devPanel.classList.remove("is-open");
        devToggle.setAttribute("aria-expanded", "false");
        devPanel.setAttribute("aria-hidden", "true");
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && devPanel.classList.contains("is-open")) {
        devPanel.classList.remove("is-open");
        devToggle.setAttribute("aria-expanded", "false");
        devPanel.setAttribute("aria-hidden", "true");
      }
    });
  }

  /* Hide the floating technical-details control when the footer is in view so it
     does not sit on top of the copyright line (left-bottom collision). */
  var siteFooter = document.querySelector(".site-footer");
  if (siteFooter && "IntersectionObserver" in window) {
    var footerObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        document.documentElement.classList.toggle("footer-near", entry.isIntersecting);
        if (entry.isIntersecting && devPanel && devPanel.classList.contains("is-open")) {
          devPanel.classList.remove("is-open");
          if (devToggle) {
            devToggle.setAttribute("aria-expanded", "false");
            devPanel.setAttribute("aria-hidden", "true");
          }
        }
      });
    }, { root: null, threshold: 0, rootMargin: "0px 0px -8% 0px" });
    footerObs.observe(siteFooter);
  }

  /* Conversion sticky CTA (mobile) */
  (function () {
    var bar = document.querySelector("[data-sticky-cta]");
    if (!bar) return;
    var path = (location.pathname || "").replace(/\\/g, "/");
    if (/kontakt\.html$/i.test(path) || /contact\.html$/i.test(path)) return;
    document.body.classList.add("has-sticky-cta");
    var hero = document.querySelector(".hero, .page-hero");
    var finalCta = document.querySelector(".cta-band");
    function update() {
      var y = window.scrollY || 0;
      var pastHero = true;
      if (hero) {
        var hr = hero.getBoundingClientRect();
        pastHero = hr.bottom < 40;
      }
      var nearEnd = false;
      if (finalCta) {
        var fr = finalCta.getBoundingClientRect();
        nearEnd = fr.top < window.innerHeight - 40;
      }
      bar.classList.toggle("is-visible", pastHero && !nearEnd && y > 280);
    }
    document.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  })();

})();
