# CreationFirst — Agentur-Website (statisch, GitHub-Pages-ready)

Diese Website ist zu 100 % statisches HTML/CSS/JS — kein Build-Prozess nötig. Du kannst den Inhalt dieses Ordners
direkt in ein GitHub-Repository hochladen und über GitHub Pages veröffentlichen.

Sprachen: Deutsch (Standard, im Root), Englisch (`/en/`), Kroatisch (`/hr/`).

## 1. Struktur

```
index.html, leistungen.html, ki-beschleunigung.html, ueber-uns.html, portfolio.html, spielplatz.html, kontakt.html, impressum.html, datenschutz.html   → Deutsch (Root)
en/index.html, en/services.html, en/ai-acceleration.html, en/about.html, en/portfolio.html, en/playground.html, en/contact.html, en/legal-notice.html, en/privacy-policy.html → Englisch
hr/index.html, hr/usluge.html, hr/ubrzanje-uz-ai.html, hr/o-nama.html, hr/portfolio.html, hr/igra.html, hr/kontakt.html, hr/impresum.html, hr/politika-privatnosti.html → Kroatisch
assets/css/style.css, assets/js/main.js, assets/js/game.js, assets/images/*   → Styles, Skripte (inkl. Minigame), Logo/Favicon/OG-Bild
404.html, robots.txt, sitemap.xml, .nojekyll                → Technische Dateien
```

**Playground / Minigame:** "spielplatz.html" (bzw. "en/playground.html", "hr/igra.html") sowie ein kompakter
spielbarer Teaser auf der Startseite enthalten ein kleines Canvas-Snake-Minigame — komplett in Vanilla
JavaScript, ohne Frameworks oder Abhängigkeiten. Mit 3-2-1-Countdown-Start, Pause (Leertaste/Antippen), stummschaltbarem
Sound, drei Power-up-Typen (Bonus-Punkte, Schild, Zeitlupe), Hindernissen im späteren Spielverlauf, Rundum-Wraparound,
einem Combo-Punktesystem und Konfetti bei neuem persönlichen Highscore. Dient als spielerischer Beweis technischer
Fähigkeiten. Bestwerte und Bestenliste werden ausschließlich lokal im Browser der Besucher:innen gespeichert
(localStorage), es werden keine Daten übertragen.

## 2. In 5 Minuten auf GitHub Pages veröffentlichen

1. Erstelle ein neues (leeres) Repository auf GitHub, z. B. `creationfirst-website`.
2. Lade **den gesamten Inhalt dieses Ordners** (nicht den Ordner selbst, sondern alles darin) in das Repository hoch
   — entweder per Drag & Drop im Browser oder per Git:
   ```
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin <deine-repo-url>
   git push -u origin main
   ```
3. Gehe im Repository zu **Settings → Pages**.
4. Wähle unter „Build and deployment" als Source **„Deploy from a branch"**, Branch **`main`**, Ordner **`/ (root)`**.
5. Nach ein paar Minuten ist die Seite unter `https://<dein-username>.github.io/<repo-name>/` erreichbar.

Möchtest du eine eigene Domain (z. B. `www.deine-domain.de`) nutzen, lege zusätzlich eine Datei `CNAME` mit deiner
Domain als Inhalt im Root ab und richte bei deinem Domain-Anbieter einen CNAME/A-Record auf GitHub Pages ein
(siehe GitHub-Dokumentation zu „Custom domains").

## 3. Vor dem Livegang noch zu prüfen

- **Domain**: Die Adresse `https://your-domain-here.com` (in den `<link rel="canonical">`, hreflang-Tags,
  `sitemap.xml` und `robots.txt`) ist noch ein Platzhalter. Nach dem Livegang per „Suchen & Ersetzen" durch die
  echte GitHub-Pages- oder Custom-Domain-URL ersetzen.
- **Social-Links**: `#` unter „LinkedIn/Instagram/GitHub" im Footer durch echte Profil-URLs ersetzen, sobald
  vorhanden.
- **Testimonials & Portfolio**: Die Kundenstimmen und Projektbeispiele sind als Beispiele gekennzeichnet — vor
  Veröffentlichung nach und nach durch echte Referenzen ersetzen, sobald diese vorliegen.

Kontaktdaten, Impressum und Datenschutzerklärung sind bereits mit den echten CreationFirst-Angaben befüllt.

## 4. Kontaktformular aktivieren

Das Formular auf der Kontaktseite ist technisch vorbereitet, aber noch nicht aktiv (statische Seiten können Formulare
nicht selbst verarbeiten). So aktivierst du es kostenlos über [Formspree](https://formspree.io):

1. Kostenloses Konto auf formspree.io erstellen und ein neues Formular anlegen.
2. Die dir angezeigte Form-ID kopieren.
3. In `kontakt.html`, `en/contact.html` und `hr/kontakt.html` jeweils `YOUR_FORM_ID` in der Zeile
   `action="https://formspree.io/f/YOUR_FORM_ID"` durch deine echte ID ersetzen.

Alternativ kannst du jeden anderen Formular-Endpoint (z. B. einen eigenen Server) eintragen.

## 5. Design & Inhalte anpassen

- Farben, Schrift, Abstände: `assets/css/style.css` (CSS-Variablen oben in `:root`).
- Texte: direkt in den jeweiligen `.html`-Dateien.
- Logo/Favicon/Social-Bild: `assets/images/favicon.svg`, `favicon.png`, `og-image.png` — kannst du durch dein eigenes
  Branding ersetzen (gleiche Dateinamen beibehalten oder Pfade in den HTML-Head-Bereichen anpassen).

## 6. SEO — was bereits eingebaut ist

- Meta-Title & -Description pro Seite und Sprache
- `hreflang`-Alternates zwischen DE/EN/HR + `x-default`
- Canonical-Tags, Open-Graph- & Twitter-Card-Meta-Tags, generiertes Social-Share-Bild
- `sitemap.xml` und `robots.txt`
- JSON-LD (schema.org `Organization`)
- Sauberes, semantisches HTML, keine externen Tracking-Skripte oder Cookies (datenschutzfreundlich per Default)

## 7. Ordner „generator-source" (optional, nur für Entwickler)

Im übergeordneten Projektordner liegt zusätzlich ein Ordner `generator-source/` mit dem Python/Jinja2-Generator,
der diese Website erzeugt hat (Inhalte zentral in `content_de.py` / `content_en.py` / `content_hr.py`, Layout in
`templates/*.html`). Damit lassen sich alle Seiten auf einmal neu generieren, z. B. nach größeren Textänderungen
(`python3 generate.py`, danach `python3 generate_assets.py` für Logo/Favicon/Social-Bild).

Für den normalen Betrieb auf GitHub Pages brauchst du diesen Ordner **nicht** — du kannst die HTML-Dateien auch
direkt von Hand bearbeiten. Du kannst `generator-source/` vor dem Hochladen auf GitHub auch einfach löschen oder in
ein eigenes, privates Repository verschieben, wenn du eine schlanke Veröffentlichung bevorzugst.
