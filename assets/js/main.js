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
    revealEls.forEach(function (el) { io.observe(el); });
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
    var tiltEls = document.querySelectorAll(".card, .portfolio-card, .pricing-card, .testimonial");
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

  /* Contact form: basic client-side validation + Formspree-friendly submit */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", function (e) {
      var statusEl = form.querySelector(".form-status");
      var action = form.getAttribute("action") || "";
      var isConfigured = action.indexOf("YOUR_FORM_ID") === -1 && action.length > 0;

      if (!isConfigured) {
        e.preventDefault();
        if (statusEl) {
          statusEl.textContent = form.getAttribute("data-msg-notconfigured") ||
            "Formular ist noch nicht aktiviert. Bitte kontaktiere uns per E-Mail.";
          statusEl.className = "form-status is-visible err";
        }
        return;
      }

      // Let Formspree handle the actual submission (native POST),
      // but show an optimistic status message.
      if (statusEl) {
        statusEl.textContent = form.getAttribute("data-msg-sending") || "Wird gesendet …";
        statusEl.className = "form-status is-visible";
      }
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
        var text = card.querySelector(".portfolio-body p");
        var cat = card.querySelector(".cat");
        var chips = card.querySelectorAll(".portfolio-meta .chip");

        lbThumb.innerHTML = "";
        if (thumb) lbThumb.appendChild(thumb.cloneNode(true));
        lbCat.textContent = cat ? cat.textContent : "";
        lbTitle.textContent = title ? title.textContent : "";
        lbText.textContent = text ? text.textContent : "";
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
})();
