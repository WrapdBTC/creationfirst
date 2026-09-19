# CreationFirst, Website (statisch, GitHub-Pages-ready)

Reines HTML/CSS/Vanilla-JS, kein Build-Schritt nötig. Der Ordnerinhalt kann direkt über GitHub Pages
veröffentlicht werden.

Sprachen: Deutsch (Root), Englisch (`/en/`), Kroatisch (`/hr/`). Alle drei Sprachversionen haben dieselbe
Struktur, dieselben Sektionen und dieselben Preise.

## 1. Seiten

| Seite | DE | EN | HR |
|---|---|---|---|
| Start | `index.html` | `en/index.html` | `hr/index.html` |
| Leistungen | `leistungen.html` (`#zusammenarbeit`, `#kurzanalyse`) | `en/services.html` (`#working-together`, `#quick-analysis`) | `hr/usluge.html` (`#suradnja`, `#kratka-analiza`) |
| KI-Automatisierung | `ki-beschleunigung.html` | `en/ai-acceleration.html` | `hr/ubrzanje-uz-ai.html` |
| Projekte | `portfolio.html` | `en/portfolio.html` | `hr/portfolio.html` |
| Über uns | `ueber-uns.html` | `en/about.html` | `hr/o-nama.html` |
| Playground | `spielplatz.html` | `en/playground.html` | `hr/igra.html` |
| Kontakt | `kontakt.html` | `en/contact.html` | `hr/kontakt.html` |
| Bau & Handwerk | `bau-handwerk.html` | `en/construction-trades.html` | `hr/gradjevinarstvo-obrt.html` |
| Impressum / Datenschutz | `impressum.html`, `datenschutz.html` | `en/legal-notice.html`, `en/privacy-policy.html` | `hr/impresum.html`, `hr/politika-privatnosti.html` |

Dazu: `404.html` (eigenständig, funktioniert unter `/creationfirst/` und auf eigener Domain), `sitemap.xml`
(alle 30 URLs mit hreflang), `robots.txt`.

## 2. Angebot (bewusst ohne Preisschilder)

Hauptmenü: Leistungen, KI-Automatisierung, Projekte, Playground, Über uns, Kontakt. Jeder Punkt ist eine
eigene Seite.

Ablauf auf der Website: kostenloses Erstgespräch, optional Kurzanalyse (199 €, wird bei Beauftragung
angerechnet), danach eines der Formate KI-Audit, Umsetzungs-Sprint oder laufende Betreuung. Für die Formate
stehen **keine Preise** auf der Seite. Die Aussage lautet überall: Preis nach Aufwand, festes schriftliches
Angebot nach dem Erstgespräch. Die einzigen Euro-Beträge sind die Kurzanalyse auf der Leistungsseite und die
Budget-Auswahl im Kontaktformular.

Der Chat-Worker (`chat-relay/src/worker.js`) ist auf dieselbe Linie gebracht: Er nennt nur „Erstgespräch
kostenlos“ und „Kurzanalyse 199 €“. Wirksam erst nach `npx wrangler deploy`.

Angebots-Buttons verlinken auf das Kontaktformular mit Vorauswahl, z. B. `kontakt.html?thema=audit`
(EN/HR: `?topic=audit`). Mögliche Werte: `call`, `analysis`, `audit`, `sprint`, `retainer`, `web`, `app`,
`ai`, `shop`, `seo`, `other`.

## 3. Kontaktformular & Live-Chat

Beide laufen über den Cloudflare Worker in `chat-relay/`
(`https://creationfirst-chat.creationfirst-wrapd.workers.dev`). Das Formular sendet dieselben Felder wie
bisher (`name`, `email`, `phone`, `company`, `budget`, `service`, `message`, `_gotcha`). Telefon ist
Pflichtfeld, weil der Worker es verlangt. Anfragen landen per Discord-Webhook, Secrets liegen in Wrangler.

Deploy nach Worker-Änderungen: `cd chat-relay && npx wrangler deploy`.

## 4. Technik

- `assets/css/style.css`: ein Stylesheet, gegliedert in 17 Abschnitte (Tokens oben in `:root`, Dark Mode
  unter `[data-theme="dark"]`).
- `assets/js/main.js`: Theme, Navigation, FAQ, Reveal-Animationen, Kontaktformular, Portfolio-Filter und
  Lightbox, Sticky-CTA, Dev-Panel.
- Module: `path-chooser.js`, `ba-slider.js`, `before-after-sim.js`, `time-calculator.js`,
  `idea-generator.js`, `game.js`, `site-chat.js` (+ `site-chat-config.js`).
- `quiz.js` und `chatbot-demo.js` werden derzeit auf keiner Seite geladen.
- Icons stehen pro Seite einmal als SVG-Sprite direkt nach `<body>` und werden per `<use href="#i-…">`
  eingebunden.
- Cache-Busting über `?v=…` an allen Asset-URLs. Bei Änderungen an CSS/JS die Versionsnummer in allen
  HTML-Dateien erhöhen.
- Keine externen Schriften, keine Tracker, keine Cookies. Local Storage nur für Theme und Snake-Bestenliste,
  Session Storage für die Chat-Gesprächs-ID (in der Datenschutzerklärung beschrieben).

## 5. SEO

- Title und Description pro Seite und Sprache, Canonical, hreflang (de, en, hr, x-default)
- Open Graph und Twitter Cards inkl. `og:locale:alternate`
- JSON-LD pro Seite: `Organization`/`ProfessionalService`, `BreadcrumbList` auf Unterseiten, `WebSite` auf der
  Startseite, `FAQPage` überall dort, wo ein FAQ steht
- `sitemap.xml` mit allen 30 URLs und hreflang-Alternates

Bei eigener Domain: Basis-URL `https://wrapdbtc.github.io/creationfirst/` in allen HTML-Dateien und in
`sitemap.xml`/`robots.txt` ersetzen.

## 6. Wichtig zum alten Generator

Die Seiten wurden ursprünglich mit einem Python/Jinja-Generator (`generator-source/`, außerhalb dieses
Ordners) erzeugt. Dieser Stand ist inzwischen deutlich weiterentwickelt. **Den alten Generator nicht mehr
laufen lassen**, er würde alle Änderungen überschreiben.

Der aktuelle Stand liegt als Quelltext in `_build/` (siehe `_build/README.md`). Damit lassen sich Header,
Footer, SEO-Daten und alle drei Sprachen synchron neu bauen. Alternativ können Texte direkt in den HTML-Dateien
gepflegt werden, dann aber nicht mehr mit `_build/` neu bauen.
