/* CreationFirst, demos/shared.js
   Gemeinsame Grundlage der Beispielseiten (Shop, Marke, Betreuung):
   - ?preview=1  Kachel oder Popup auf der CreationFirst-Seite: Hinweisleiste aus, Links zur Seite verlassen den Rahmen
   - ?lang=en|hr Sprache. Deutsch steht im HTML; die anderen Sprachen ersetzen Texte anhand des deutschen Wortlauts
                 (Wörterbuch: deutscher Text -> [Englisch, Kroatisch]).
   Aufruf im Beispiel:  var demo = CFDemo.init({ "Deutsch": ["English", "Hrvatski"], ... });  demo.t("Deutsch") */
window.CFDemo = (function () {
  "use strict";
  function init(dict) {
    var search = location.search;
    var preview = /[?&]preview=1/.test(search);
    var lang = (search.match(/[?&]lang=(en|hr)/) || [])[1] || "de";
    function t(s) {
      if (lang === "de") return s;
      var e = dict[s];
      return e ? e[lang === "en" ? 0 : 1] : s;
    }
    if (preview) document.documentElement.classList.add("is-preview");

    var bar = document.querySelector(".demo-bar .langs");
    if (bar) {
      var keep = preview ? "preview=1&" : "";
      bar.querySelectorAll("a").forEach(function (a) {
        var l = a.getAttribute("data-lang");
        a.setAttribute("href", l === "de" ? (preview ? "?preview=1" : "./") : "?" + keep + "lang=" + l);
        if (l === lang) a.setAttribute("aria-current", "true");
      });
    }

    if (lang !== "de") {
      document.documentElement.lang = lang;
      document.title = t(document.title);
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        if (p === "SCRIPT" || p === "STYLE") return;
        var key = n.nodeValue.replace(/\s+/g, " ").trim();
        if (key && dict[key]) n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), t(key));
      });
      ["placeholder", "aria-label"].forEach(function (attr) {
        document.querySelectorAll("[" + attr + "]").forEach(function (el) { el.setAttribute(attr, t(el.getAttribute(attr))); });
      });
      var home = { en: "../../en/index.html", hr: "../../hr/index.html" }[lang];
      var contact = { en: "../../en/contact.html", hr: "../../hr/kontakt.html" }[lang];
      document.querySelectorAll('a[href^="../../"]').forEach(function (a) {
        var h = a.getAttribute("href");
        if (h.indexOf("../../index.html") === 0) a.setAttribute("href", home);
        else if (h.indexOf("../../kontakt.html") === 0) a.setAttribute("href", contact + h.slice("../../kontakt.html".length));
      });
    }
    if (preview) document.querySelectorAll('a[href^="../../"]').forEach(function (a) { a.setAttribute("target", "_top"); });
    return { t: t, lang: lang, preview: preview };
  }
  return { init: init };
})();
