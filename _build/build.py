# -*- coding: utf-8 -*-
"""CreationFirst static site assembler.

Fragments in src/<lang>/<page>.html hold the <main> content. This script wraps them with
the shared head, header, footer and floating widgets so all 30 pages stay in sync.

Fragment placeholders:
  {{url:<page>}}         link to a page in the same language   (e.g. {{url:contact}})
  {{url:<page>#anchor}}  same, with anchor
  {{A}}                  relative prefix to /assets/            (assets/ or ../assets/)
  {{v}}                  cache-busting version
  {{icon:<name>}}        inline SVG icon
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "src")
BASE = "https://wrapdbtc.github.io/creationfirst/"
VER = "1789900200"
YEAR = "2026"
EMAIL = "info@creationfirst.io"
PHONE_HREF = "+491621717423"
PHONE = "+49 162 1717423"
LANGS = ["de", "en", "hr"]
OG_LOCALE = {"de": "de_DE", "en": "en_US", "hr": "hr_HR"}

# ---------------------------------------------------------------- pages
PAGES = {
 "home":       {"de": "index.html", "en": "en/index.html", "hr": "hr/index.html"},
 "services":   {"de": "leistungen.html", "en": "en/services.html", "hr": "hr/usluge.html"},
 "ai":         {"de": "ki-beschleunigung.html", "en": "en/ai-acceleration.html", "hr": "hr/ubrzanje-uz-ai.html"},
 "portfolio":  {"de": "portfolio.html", "en": "en/portfolio.html", "hr": "hr/portfolio.html"},
 "about":      {"de": "ueber-uns.html", "en": "en/about.html", "hr": "hr/o-nama.html"},
 "playground": {"de": "spielplatz.html", "en": "en/playground.html", "hr": "hr/igra.html"},
 "contact":    {"de": "kontakt.html", "en": "en/contact.html", "hr": "hr/kontakt.html"},
 "trades":     {"de": "bau-handwerk.html", "en": "en/construction-trades.html", "hr": "hr/gradjevinarstvo-obrt.html"},
 "hospitality": {"de": "gastronomie-hotels.html", "en": "en/hospitality.html", "hr": "hr/ugostiteljstvo-hoteli.html"},
 "field_services": {"de": "sanitaer-elektro-klima.html", "en": "en/plumbing-electrical-hvac.html", "hr": "hr/instalacije-elektro-klima.html"},
 "practices": {"de": "praxen-lokale-services.html", "en": "en/practices-local-services.html", "hr": "hr/ordinacije-lokalne-usluge.html"},
 "realestate": {"de": "immobilien-makler.html", "en": "en/real-estate.html", "hr": "hr/nekretnine.html"},
 "imprint":    {"de": "impressum.html", "en": "en/legal-notice.html", "hr": "hr/impresum.html"},
 "privacy":    {"de": "datenschutz.html", "en": "en/privacy-policy.html", "hr": "hr/politika-privatnosti.html"},
}

CHAT = ["site-chat-config", "site-chat"]
SCRIPTS = {
 "home": ["main", "ba-slider", "path-chooser"] + CHAT,
 "playground": ["main", "game", "idea-generator", "before-after-sim", "time-calculator"] + CHAT,
}
# hero images to preload (LCP)
PRELOAD = {
 "home": "images/home-v2-hero.webp",
 "trades": "images/bau-handwerk-hero.webp",
 "realestate": "images/immobilien-makler-hero.webp",
 "practices": "images/praxen-lokale-services-hero.webp",
 "field_services": "images/sanitaer-elektro-klima-hero.webp",
 "hospitality": "images/gastronomie-hotels-hero.webp",
}
NAV_KEY = {"services": "services", "ai": "ai", "portfolio": "portfolio", "about": "about",
           "playground": "playground", "contact": "contact", "trades": "ai",
           "hospitality": "ai", "field_services": "ai", "practices": "ai", "realestate": "ai"}

META = json.load(open(os.path.join(HERE, "meta.json"), encoding="utf-8"))

# ---------------------------------------------------------------- i18n chrome
T = {
 "de": {
  "skip": "Zum Inhalt springen", "home_aria": "CreationFirst, zur Startseite",
  "nav_aria": "Hauptnavigation", "menu": "Menü", "theme": "Hell oder dunkel",
  "nav": [("services", "Leistungen"), ("ai", "KI-Automatisierung"), ("portfolio", "Projekte"),
          ("playground", "Playground"), ("about", "Über uns"), ("contact", "Kontakt")],
  "nav_mobile": [],
  "cta": "Erstgespräch anfragen", "cta_short": "Erstgespräch",
  "lang_label": "Sprache wählen",
  "blurb": "Websites, Apps und KI-Automatisierung für kleine und mittlere Unternehmen. Ein kleines Team aus Split, remote für den DACH-Raum und Kroatien.",
  "f_offer": "Angebot", "f_company": "CreationFirst", "f_contact": "Kontakt",
  "f_offer_links": [("services", "Leistungen"), ("ai", "KI-Automatisierung"), ("services#zusammenarbeit", "So arbeiten wir"),
                    ("services#kurzanalyse", "Kurzanalyse"), ("trades", "Bau & Handwerk"), ("hospitality", "Gastronomie & Hotels"), ("field_services", "Sanitär, Elektro & Klima"), ("practices", "Praxen & lokale Services"), ("realestate", "Immobilien & Makler")],
  "f_company_links": [("portfolio", "Projekte"), ("playground", "Playground"), ("about", "Über uns"), ("contact", "Kontakt")],
  "place": "Split, Kroatien", "hours": "Mo–Fr, 9–17 Uhr", "langs_line": "Deutsch · English · Hrvatski",
  "rights": "CreationFirst", "imprint": "Impressum", "privacy": "Datenschutz",
  "sticky_title": "Erstgespräch", "sticky_sub": "kostenlos · 30 Min.", "sticky_btn": "Anfragen",
  "top": "Nach oben", "dev_toggle": "Technische Details zu dieser Seite", "dev_head": "Unter der Haube",
  "dev_labels": ["HTTP-Anfragen", "Übertragen", "Ladezeit", "Tracker & Cookies", "Technik", "Sprachen"],
  "dev_note": "Live gemessen, für genau diese Seite.", "close": "Schließen",
  "crumb_home": "Start",
 },
 "en": {
  "skip": "Skip to content", "home_aria": "CreationFirst, home",
  "nav_aria": "Main navigation", "menu": "Menu", "theme": "Light or dark",
  "nav": [("services", "Services"), ("ai", "AI automation"), ("portfolio", "Projects"),
          ("playground", "Playground"), ("about", "About"), ("contact", "Contact")],
  "nav_mobile": [],
  "cta": "Book a free call", "cta_short": "Free call",
  "lang_label": "Choose language",
  "blurb": "Websites, apps and AI automation for small and mid-sized businesses. A small team in Split, working remotely across the DACH region and Croatia.",
  "f_offer": "Offer", "f_company": "CreationFirst", "f_contact": "Contact",
  "f_offer_links": [("services", "Services"), ("ai", "AI automation"), ("services#working-together", "How we work"),
                    ("services#quick-analysis", "Quick analysis"), ("trades", "Construction & trades"), ("hospitality", "Hospitality"), ("field_services", "Plumbing, electrical & HVAC"), ("practices", "Practices & local services"), ("realestate", "Real estate")],
  "f_company_links": [("portfolio", "Projects"), ("playground", "Playground"), ("about", "About"), ("contact", "Contact")],
  "place": "Split, Croatia", "hours": "Mon–Fri, 9 am–5 pm CET", "langs_line": "Deutsch · English · Hrvatski",
  "rights": "CreationFirst", "imprint": "Legal notice", "privacy": "Privacy",
  "sticky_title": "Intro call", "sticky_sub": "free · 30 min", "sticky_btn": "Book",
  "top": "Back to top", "dev_toggle": "Technical details about this page", "dev_head": "Under the hood",
  "dev_labels": ["HTTP requests", "Transferred", "Load time", "Trackers & cookies", "Stack", "Languages"],
  "dev_note": "Measured live, for this exact page.", "close": "Close",
  "crumb_home": "Home",
 },
 "hr": {
  "skip": "Preskoči na sadržaj", "home_aria": "CreationFirst, početna",
  "nav_aria": "Glavna navigacija", "menu": "Izbornik", "theme": "Svijetlo ili tamno",
  "nav": [("services", "Usluge"), ("ai", "AI automatizacija"), ("portfolio", "Projekti"),
          ("playground", "Playground"), ("about", "O nama"), ("contact", "Kontakt")],
  "nav_mobile": [],
  "cta": "Zatraži razgovor", "cta_short": "Razgovor",
  "lang_label": "Odaberi jezik",
  "blurb": "Web stranice, aplikacije i AI automatizacija za mala i srednja poduzeća. Mali tim iz Splita, na daljinu za DACH regiju i Hrvatsku.",
  "f_offer": "Ponuda", "f_company": "CreationFirst", "f_contact": "Kontakt",
  "f_offer_links": [("services", "Usluge"), ("ai", "AI automatizacija"), ("services#suradnja", "Kako radimo"),
                    ("services#kratka-analiza", "Kratka analiza"), ("trades", "Građevina i obrt"), ("hospitality", "Ugostiteljstvo i hoteli"), ("field_services", "Instalacije, elektro i klima"), ("practices", "Ordinacije i lokalne usluge"), ("realestate", "Nekretnine")],
  "f_company_links": [("portfolio", "Projekti"), ("playground", "Playground"), ("about", "O nama"), ("contact", "Kontakt")],
  "place": "Split, Hrvatska", "hours": "pon–pet, 9–17 h", "langs_line": "Deutsch · English · Hrvatski",
  "rights": "CreationFirst", "imprint": "Impresum", "privacy": "Privatnost",
  "sticky_title": "Uvodni razgovor", "sticky_sub": "besplatno · 30 min", "sticky_btn": "Zatraži",
  "top": "Na vrh", "dev_toggle": "Tehnički detalji ove stranice", "dev_head": "Ispod haube",
  "dev_labels": ["HTTP zahtjevi", "Preneseno", "Učitavanje", "Trackeri i kolačići", "Tehnika", "Jezici"],
  "dev_note": "Izmjereno uživo, za ovu stranicu.", "close": "Zatvori",
  "crumb_home": "Početna",
 },
}
LANG_NAMES = {"de": ("🇩🇪", "Deutsch", "DE"), "en": ("🇬🇧", "English", "EN"), "hr": ("🇭🇷", "Hrvatski", "HR")}

# ---------------------------------------------------------------- icons
def _svg(inner, extra=""):
    return ('<svg class="icon%s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>') % (extra, inner)

ICONS = {
 "check": '<path d="M20 6L9 17l-5-5"/>',
 "arrow": '<path d="M5 12h14M13 5l7 7-7 7"/>',
 "arrow-up": '<path d="M12 19V5M5 12l7-7 7 7"/>',
 "plus": '<path d="M12 5v14M5 12h14"/>',
 "x": '<path d="M6 6l12 12M18 6L6 18"/>',
 "sun": '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
 "moon": '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>',
 "code": '<path d="M9 8l-4 4 4 4"/><path d="M15 8l4 4-4 4"/>',
 "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
 "window": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 9v11"/>',
 "spark": '<path d="M11 3l1.5 4L17 8.5 13 10l-1.5 4L10 10 6 8.5 10 7z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/>',
 "headset": '<path d="M4 13a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19v1a3 3 0 0 1-3 3h-3"/>',
 "users": '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.5 13.2a5.5 5.5 0 0 1 6 6.8"/>',
 "timer": '<circle cx="12" cy="13" r="8"/><path d="M12 13l4-3"/><path d="M9 5.5L8 3M15 5.5L16 3"/>',
 "target": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
 "rocket": '<path d="M5 15l-2 6 6-2M14 3c3 0 7 4 7 7-3 5-9 11-9 11S6 15 3 10c0-3 4-7 7-7z"/><circle cx="14" cy="10" r="2"/>',
 "shield": '<path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
 "cart": '<circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none"/><path d="M2 3h3l2.4 12.2A2 2 0 0 0 9.4 17H18a2 2 0 0 0 2-1.6L21.5 8H6"/>',
 "palette": '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-1 2-2 0-.6-.3-1.1-.6-1.5-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H16a4 4 0 0 0 4-4c0-4-3.6-7.5-8-7.5z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
 "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 "phone": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
 "pin": '<path d="M12 21s7-6.6 7-11.5A7 7 0 0 0 5 9.5C5 14.4 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
 "chat": '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.2V6.5Z"/><path d="M8 9.5h8M8 13h5"/>',
 "file": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
 "search": '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
 "repeat": '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
 "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
 "euro": '<path d="M18 7.5A7 7 0 1 0 18 16.5"/><path d="M4 10h9M4 14h9"/>',
 "handshake": '<path d="M11 17l2 2a1.4 1.4 0 0 0 2-2"/><path d="M14 14l2.5 2.5a1.4 1.4 0 0 0 2-2L15 11"/><path d="M3 11l4-4 5 1 3-2 6 5-3 3"/><path d="M3 11l6 6a1.4 1.4 0 0 0 2-2"/>',
 "tool": '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
 "gauge": '<path d="M12 14l4-4"/><path d="M3.3 17A9 9 0 1 1 20.7 17"/>',
 "layers": '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
 "bolt": '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 "quote": '<path d="M7 7h4v4H7zM7 11c0 3-1 5-3 6M15 7h4v4h-4zM15 11c0 3-1 5-3 6"/>',
}

USED_ICONS = set()

def icon(name, extra=""):
    """Reference into the per-page SVG sprite (each icon's paths appear once per page)."""
    if name not in ICONS:
        raise KeyError("unknown icon: " + name)
    USED_ICONS.add(name)
    return '<svg class="icon%s" aria-hidden="true"><use href="#i-%s"></use></svg>' % ((" " + extra) if extra else "", name)

def sprite():
    if not USED_ICONS:
        return ""
    syms = "".join('<symbol id="i-%s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
                   'stroke-linecap="round" stroke-linejoin="round">%s</symbol>' % (n, ICONS[n]) for n in sorted(USED_ICONS))
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">%s</svg>' % syms

# ---------------------------------------------------------------- helpers
def esc(s):
    return html.escape(s, quote=True)

def rel_prefix(lang):
    return "" if lang == "de" else "../"

def url(page, lang, from_lang, anchor=""):
    """Relative URL from a page in from_lang to page in lang."""
    target = PAGES[page][lang]
    if from_lang == "de":
        out = target
    else:
        out = "../" + target
    if lang != "de" and from_lang == lang:
        out = target.split("/", 1)[1]
    if page == "home" and out.endswith("index.html") and anchor == "":
        pass
    return out + (("#" + anchor) if anchor else "")

def abs_url(page, lang):
    p = PAGES[page][lang]
    if p.endswith("index.html"):
        p = p[: -len("index.html")]
    return BASE + p

def link(target, lang):
    page, _, anchor = target.partition("#")
    return url(page, lang, lang, anchor)

def include_partials(s, lang, depth=0):
    def rep(m):
        name = m.group(1)
        part = open(os.path.join(SRC, lang, "_" + name + ".html"), encoding="utf-8").read().strip("\n")
        return include_partials(part, lang, depth + 1) if depth < 3 else part
    return re.sub(r"\{\{include:([a-z\-]+)\}\}", rep, s)

def render_placeholders(s, lang):
    s = include_partials(s, lang)
    A = rel_prefix(lang) + "assets/"
    s = s.replace("{{A}}", A).replace("{{v}}", VER)
    s = re.sub(r"\{\{url:([a-z]+)(?:#([A-Za-z0-9\-_]+))?\}\}",
               lambda m: url(m.group(1), lang, lang, m.group(2) or ""), s)
    s = re.sub(r"\{\{icon:([a-z\-]+)\}\}", lambda m: icon(m.group(1)), s)
    return s

# ---------------------------------------------------------------- head
THEME_SCRIPT = """<script>
(function(){
  document.documentElement.classList.add("js");
  try {
    var saved = localStorage.getItem("theme");
    var theme = saved || ((window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) { document.documentElement.setAttribute("data-theme", "light"); }
})();
</script>"""

def org_jsonld():
    return {
      "@type": ["Organization", "ProfessionalService"],
      "@id": BASE + "#org",
      "name": "CreationFirst",
      "url": BASE,
      "logo": BASE + "assets/images/favicon.png",
      "image": BASE + "assets/images/og-image.png",
      "email": EMAIL,
      "telephone": PHONE_HREF,
      "address": {"@type": "PostalAddress", "streetAddress": "Sarajevska ulica 24",
                  "postalCode": "21000", "addressLocality": "Split", "addressCountry": "HR"},
      "areaServed": ["DE", "AT", "CH", "HR"],
      "knowsLanguage": ["de", "en", "hr"],
      "founder": {"@type": "Person", "name": "Pierre Schulteis"},
      "priceRange": "€€",
    }

def faq_jsonld(main_html):
    items = re.findall(r'<button class="faq-q"[^>]*>(.*?)<svg.*?</button>\s*<div class="faq-a"[^>]*><div class="faq-a-inner">(.*?)</div></div>',
                       main_html, re.S)
    if not items:
        return None
    def clean(x):
        x = re.sub(r"<[^>]+>", "", x)
        return html.unescape(re.sub(r"\s+", " ", x)).strip()
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": clean(q), "acceptedAnswer": {"@type": "Answer", "text": clean(a)}}
        for q, a in items]}

def head(page, lang, main_html):
    m = META[page][lang]
    title, desc = m["title"], m["desc"]
    A = rel_prefix(lang) + "assets/"
    canon = abs_url(page, lang)
    out = ['<!DOCTYPE html>', '<html lang="%s">' % lang, '<head>', '<meta charset="UTF-8">',
           '<meta name="viewport" content="width=device-width, initial-scale=1.0">', THEME_SCRIPT,
           '<title>%s</title>' % esc(title), '<meta name="description" content="%s">' % esc(desc),
           '<link rel="canonical" href="%s">' % canon]
    for l in LANGS:
        out.append('<link rel="alternate" hreflang="%s" href="%s">' % (l, abs_url(page, l)))
    out.append('<link rel="alternate" hreflang="x-default" href="%s">' % abs_url(page, "de"))
    out += ['<link rel="icon" type="image/svg+xml" href="%simages/favicon.svg?v=%s">' % (A, VER),
            '<link rel="icon" type="image/png" sizes="512x512" href="%simages/favicon.png?v=%s">' % (A, VER),
            '<link rel="apple-touch-icon" href="%simages/apple-touch-icon.png?v=%s">' % (A, VER)]
    if page in PRELOAD:
        out.append('<link rel="preload" as="image" href="%s%s?v=%s" type="image/webp" fetchpriority="high">' % (A, PRELOAD[page], VER))
    og_img = BASE + "assets/images/og-image.png"
    out += ['<meta property="og:type" content="website">',
            '<meta property="og:site_name" content="CreationFirst">',
            '<meta property="og:title" content="%s">' % esc(m.get("og_title", title)),
            '<meta property="og:description" content="%s">' % esc(desc),
            '<meta property="og:image" content="%s">' % og_img,
            '<meta property="og:image:width" content="1280">', '<meta property="og:image:height" content="720">',
            '<meta property="og:image:alt" content="CreationFirst">',
            '<meta property="og:url" content="%s">' % canon,
            '<meta property="og:locale" content="%s">' % OG_LOCALE[lang]]
    for l in LANGS:
        if l != lang:
            out.append('<meta property="og:locale:alternate" content="%s">' % OG_LOCALE[l])
    robots = "noindex, follow" if m.get("noindex") else "index, follow"
    out += ['<meta name="twitter:card" content="summary_large_image">',
            '<meta name="twitter:title" content="%s">' % esc(m.get("og_title", title)),
            '<meta name="twitter:description" content="%s">' % esc(desc),
            '<meta name="twitter:image" content="%s">' % og_img,
            '<meta name="robots" content="%s">' % robots,
            '<meta name="theme-color" content="#0a0e1a">',
            '<meta name="format-detection" content="telephone=no">',
            '<link rel="stylesheet" href="%scss/style.css?v=%s">' % (A, VER)]
    graph = [org_jsonld()]
    if page == "home":
        graph.append({"@type": "WebSite", "@id": BASE + "#website", "url": BASE, "name": "CreationFirst",
                      "inLanguage": lang, "publisher": {"@id": BASE + "#org"}})
    else:
        graph.append({"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": T[lang]["crumb_home"], "item": abs_url("home", lang)},
            {"@type": "ListItem", "position": 2, "name": m["crumb"], "item": canon}]})
    faq = faq_jsonld(main_html)
    if faq:
        graph.append(faq)
    ld = {"@context": "https://schema.org", "@graph": graph}
    out.append('<script type="application/ld+json">%s</script>' % json.dumps(ld, ensure_ascii=False, separators=(",", ":")))
    out.append('</head>')
    return "\n".join(out)

# ---------------------------------------------------------------- header
def header(page, lang):
    t = T[lang]
    A = rel_prefix(lang) + "assets/"
    active = NAV_KEY.get(page)
    nav = []
    branchen = [
        ("trades", {"de": "Bau & Handwerk", "en": "Construction & trades", "hr": "Građevina i obrt"}),
        ("hospitality", {"de": "Gastronomie & Hotels", "en": "Hospitality", "hr": "Ugostiteljstvo i hoteli"}),
        ("field_services", {"de": "Sanitär, Elektro & Klima", "en": "Plumbing, electrical & HVAC", "hr": "Instalacije, elektro i klima"}),
        ("practices", {"de": "Praxen & lokale Services", "en": "Practices & local services", "hr": "Ordinacije i lokalne usluge"}),
        ("realestate", {"de": "Immobilien & Makler", "en": "Real estate", "hr": "Nekretnine"}),
    ]
    drop_lbl = {"de": "Branchen öffnen", "en": "Open industries", "hr": "Otvori grane"}
    overview = {"de": "Überblick", "en": "Overview", "hr": "Pregled"}
    for target, label in t["nav"]:
        p, _, anchor = target.partition("#")
        is_active = (p == active and not anchor)
        if p == "ai":
            ind_active = (active == "ai")
            items = ['<a href="%s"%s>%s</a>' % (link("ai", lang), ' class="is-active" aria-current="page"' if page == "ai" else "", esc(overview[lang]))]
            for ik, labs in branchen:
                cur = ' class="is-active" aria-current="page"' if page == ik else ""
                items.append('<a href="%s"%s>%s</a>' % (link(ik, lang), cur, esc(labs[lang])))
            nav.append(
                '<div class="nav-drop%s">'
                '<a class="nav-drop-btn%s" href="%s"%s>%s</a>'
                '<button class="nav-drop-toggle" type="button" aria-expanded="false" aria-label="%s"></button>'
                '<div class="nav-drop-menu">%s</div>'
                '</div>' % (
                    " is-active" if ind_active else "",
                    " is-active" if ind_active else "",
                    link("ai", lang),
                    ' aria-current="page"' if page == "ai" else "",
                    esc(label),
                    esc(drop_lbl[lang]),
                    "".join(items),
                )
            )
        else:
            attrs = ' class="is-active" aria-current="page"' if is_active else ""
            nav.append('<a href="%s"%s>%s</a>' % (link(target, lang), attrs, esc(label)))
    for target, label in t["nav_mobile"]:
        is_active = (target == active)
        cls = "nav-mobile-only" + (" is-active" if is_active else "")
        cur = ' aria-current="page"' if is_active else ""
        nav.append('<a class="%s" href="%s"%s>%s</a>' % (cls, link(target, lang), cur, esc(label)))
    nav.append('<a class="btn btn-primary nav-mobile-cta" href="%s">%s</a>' % (link("contact", lang), esc(t["cta"])))
    langs = []
    for l in LANGS:
        flag, name, _ = LANG_NAMES[l]
        cls = ' class="is-active" aria-current="true"' if l == lang else ""
        langs.append('<a href="%s" hreflang="%s" lang="%s"%s><span class="flag" aria-hidden="true">%s</span> %s</a>'
                     % (url(page, l, lang), l, l, cls, flag, name))
    flag, _, code = LANG_NAMES[lang]
    return """<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="%(home)s" aria-label="%(home_aria)s">
      <img class="logo-mark logo-mark-color" src="%(A)simages/logo-mark-light.svg?v=%(v)s" alt="" width="32" height="32">
      <img class="logo-mark logo-mark-white" src="%(A)simages/logo-mark-dark.svg?v=%(v)s" alt="" width="32" height="32">
      <span class="brand-word">Creation<em>First</em></span>
    </a>
    <nav class="main-nav" id="main-nav" aria-label="%(nav_aria)s">
      %(nav)s
    </nav>
    <div class="header-actions">
      <button class="btn btn-icon theme-toggle" type="button" aria-label="%(theme)s">
        <span class="icon-sun">%(sun)s</span>
        <span class="icon-moon">%(moon)s</span>
      </button>
      <div class="lang-switch">
        <button class="lang-switch-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="%(lang_label)s">
          <span class="flag" aria-hidden="true">%(flag)s</span> <span class="lang-code">%(code)s</span>
        </button>
        <div class="lang-menu">
          %(langs)s
        </div>
      </div>
      <a class="btn btn-primary btn-sm nav-cta-btn" href="%(contact)s">%(cta)s</a>
      <button class="nav-toggle" type="button" aria-label="%(menu)s" aria-expanded="false" aria-controls="main-nav"><span></span></button>
    </div>
  </div>
</header>""" % {
        "home": url("home", lang, lang), "home_aria": esc(t["home_aria"]), "A": A, "v": VER,
        "nav_aria": esc(t["nav_aria"]), "nav": "\n      ".join(nav), "theme": esc(t["theme"]),
        "sun": icon("sun"), "moon": icon("moon"), "lang_label": esc(t["lang_label"]),
        "flag": flag, "code": code, "langs": "\n          ".join(langs),
        "contact": link("contact", lang), "cta": esc(t["cta"]), "menu": esc(t["menu"]),
    }

# ---------------------------------------------------------------- footer + floating
def footer(page, lang):
    t = T[lang]
    A = rel_prefix(lang) + "assets/"
    def lis(items):
        return "\n".join('          <li><a href="%s">%s</a></li>' % (link(tg, lang), esc(lb)) for tg, lb in items)
    langs = " · ".join('<a href="%s" hreflang="%s" lang="%s"%s>%s</a>'
                       % (url(page, l, lang), l, l, ' aria-current="true"' if l == lang else "", LANG_NAMES[l][2])
                       for l in LANGS)
    return """<footer class="site-footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <a class="brand" href="%(home)s" aria-label="%(home_aria)s">
          <img class="logo-mark" src="%(A)simages/logo-mark-dark.svg?v=%(v)s" alt="" width="32" height="32">
          <span class="brand-word">Creation<em>First</em></span>
        </a>
        <p class="footer-brand-blurb">%(blurb)s</p>
        <a class="btn btn-primary btn-sm footer-cta" href="%(contact)s">%(cta)s</a>
      </div>
      <div class="footer-col">
        <h2 class="footer-h">%(f_offer)s</h2>
        <ul>
%(offer)s
        </ul>
      </div>
      <div class="footer-col">
        <h2 class="footer-h">%(f_company)s</h2>
        <ul>
%(company)s
        </ul>
      </div>
      <div class="footer-col">
        <h2 class="footer-h">%(f_contact)s</h2>
        <ul>
          <li><a href="mailto:%(email)s">%(email)s</a></li>
          <li><a href="tel:%(phone_href)s">%(phone)s</a></li>
          <li>%(place)s</li>
          <li>%(hours)s</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; %(year)s %(rights)s</span>
      <div class="footer-bottom-links">
        <a href="%(imprint_url)s">%(imprint)s</a>
        <a href="%(privacy_url)s">%(privacy)s</a>
        <span class="footer-langs">%(langs)s</span>
      </div>
    </div>
  </div>
</footer>""" % {
        "home": url("home", lang, lang), "home_aria": esc(t["home_aria"]), "A": A, "v": VER,
        "blurb": esc(t["blurb"]), "contact": link("contact", lang), "cta": esc(t["cta"]),
        "f_offer": esc(t["f_offer"]), "f_company": esc(t["f_company"]), "f_contact": esc(t["f_contact"]),
        "offer": lis(t["f_offer_links"]), "company": lis(t["f_company_links"]),
        "email": EMAIL, "phone_href": PHONE_HREF, "phone": PHONE, "place": esc(t["place"]), "hours": esc(t["hours"]),
        "year": YEAR, "rights": esc(t["rights"]), "imprint_url": link("imprint", lang), "imprint": esc(t["imprint"]),
        "privacy_url": link("privacy", lang), "privacy": esc(t["privacy"]), "langs": langs,
    }

def floating(page, lang):
    t = T[lang]
    out = []
    if page != "contact":
        out.append("""<div class="conv-sticky-cta" data-sticky-cta>
  <div class="conv-sticky-cta-inner">
    <div class="conv-sticky-cta-copy"><strong>%s</strong><span>%s</span></div>
    <a class="btn btn-primary btn-sm" href="%s">%s</a>
  </div>
</div>""" % (esc(t["sticky_title"]), esc(t["sticky_sub"]), link("contact", lang), esc(t["sticky_btn"])))
    L = t["dev_labels"]
    out.append("""<button class="back-to-top" type="button" aria-label="%(top)s">%(arrow)s</button>

<button class="dev-toggle" type="button" aria-label="%(dev_toggle)s" aria-expanded="false" aria-controls="dev-panel">%(code)s</button>
<div class="dev-panel" id="dev-panel" aria-hidden="true">
  <div class="dev-panel-inner">
    <div class="dev-panel-head">
      <span class="dev-dot"></span><span class="dev-dot"></span><span class="dev-dot"></span>
      <b>%(dev_head)s</b>
      <button type="button" class="dev-panel-close" aria-label="%(close)s">%(x)s</button>
    </div>
    <ul class="dev-stats">
      <li><span>%(l0)s</span><b class="dev-stat-requests">–</b></li>
      <li><span>%(l1)s</span><b class="dev-stat-weight">–</b></li>
      <li><span>%(l2)s</span><b class="dev-stat-load">–</b></li>
      <li><span>%(l3)s</span><b>0</b></li>
      <li><span>%(l4)s</span><b>HTML · CSS · Vanilla JS</b></li>
      <li><span>%(l5)s</span><b>DE · EN · HR</b></li>
    </ul>
    <p class="dev-panel-note">%(note)s</p>
  </div>
</div>""" % {"top": esc(t["top"]), "arrow": icon("arrow-up"), "dev_toggle": esc(t["dev_toggle"]), "code": icon("code"),
             "dev_head": esc(t["dev_head"]), "close": esc(t["close"]), "x": icon("x"),
             "l0": L[0], "l1": L[1], "l2": L[2], "l3": L[3], "l4": L[4], "l5": L[5], "note": esc(t["dev_note"])})
    return "\n\n".join(out)

def scripts(page, lang):
    A = rel_prefix(lang) + "assets/"
    names = SCRIPTS.get(page, ["main"] + CHAT)
    return "\n".join('<script src="%sjs/%s.js?v=%s"%s></script>' % (A, n, VER, "")
                     for n in names)

# ---------------------------------------------------------------- build
def build_page(page, lang):
    USED_ICONS.clear()
    src = open(os.path.join(SRC, lang, page + ".html"), encoding="utf-8").read()
    main = render_placeholders(src, lang).strip("\n")
    t = T[lang]
    hdr, ftr, flt = header(page, lang), footer(page, lang), floating(page, lang)
    parts = [head(page, lang, main), "<body>", sprite(),
             '<div class="scroll-progress" aria-hidden="true"></div>',
             '<a class="skip-link" href="#main">%s</a>' % esc(t["skip"]), "",
             hdr, "", '<main id="main">', main, "</main>", "",
             ftr, "", flt, "", scripts(page, lang), "</body>", "</html>", ""]
    return "\n".join(parts)

SITEMAP_DATE = "2026-09-18"
def sitemap():
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for page in PAGES:
        for lang in LANGS:
            out.append("  <url>")
            out.append("    <loc>%s</loc>" % abs_url(page, lang))
            out.append("    <lastmod>%s</lastmod>" % SITEMAP_DATE)
            for l in LANGS:
                out.append('    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (l, abs_url(page, l)))
            out.append('    <xhtml:link rel="alternate" hreflang="x-default" href="%s"/>' % abs_url(page, "de"))
            out.append("  </url>")
    out.append("</urlset>")
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(out) + "\n")

def main():
    only = sys.argv[1:]
    for page in PAGES:
        for lang in LANGS:
            if only and page not in only:
                continue
            out = build_page(page, lang)
            open(os.path.join(ROOT, PAGES[page][lang]), "w", encoding="utf-8").write(out)
    if not only:
        sitemap()
    print("built")

if __name__ == "__main__":
    main()
