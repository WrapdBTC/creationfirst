# _build (optional)

Quelltexte und Build-Skript der Website. GitHub Pages liefert Ordner mit Unterstrich nicht aus.

- `src/<sprache>/<seite>.html`: Inhalt von `<main>` je Seite (de, en, hr)
- `src/<sprache>/_offer.html`: Angebots-Baustein (Start- und Leistungsseite)
- `meta.json`: Title, Description und Breadcrumb je Seite und Sprache
- `build.py`: setzt Head, Header, Footer, Sticky-CTA, Icons, JSON-LD und Sitemap zusammen

Platzhalter in den Fragmenten: `{{url:contact}}`, `{{url:services#preise}}`, `{{A}}` (Pfad zu assets/),
`{{v}}` (Cache-Version), `{{icon:check}}`, `{{include:offer}}`.

Bauen (überschreibt die 30 HTML-Dateien im Projektordner und `sitemap.xml`):

    python3 _build/build.py            # alle Seiten
    python3 _build/build.py contact    # nur eine Seite in allen Sprachen

Wer mit dem Build arbeitet, ändert Texte in `src/`, nicht direkt im HTML. Sonst gehen die HTML-Änderungen
beim nächsten Build verloren.
