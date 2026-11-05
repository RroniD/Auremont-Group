"""Builds the static site into site/:
   index.html (sq), en/index.html, privatesia/index.html, en/privacy/index.html, 404.html,
   sitemap.xml, robots.txt, site.webmanifest, host config (_headers, _redirects, .htaccess),
   .well-known/security.txt. Texts for English come from js/i18n.js."""
import base64, hashlib, html as H, json, os, re

# Run with Python 3 from anywhere:  python3 source/build.py
# Templates live next to this file; the site is written to ../site (or AUREMONT_SITE).
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.environ.get('AUREMONT_SITE', os.path.join(HERE, '..', 'site'))) + '/'
DOMAIN = 'https://auremont-group.com'
UPDATED = '2026-11-05'
UPDATED_TXT = {'sq': '5 nëntor 2026', 'en': '5 November 2026'}
LAT, LON = 42.6593, 20.2883

parts = json.load(open(os.path.join(HERE, 'logo_parts.json')))
def read_i18n(path):
    """Reads js/i18n.js: one block per language with 'key': 'text' pairs."""
    src = open(path, encoding='utf-8').read()
    out = {}
    for m in re.finditer(r"\n  (\w+): \{(.*?)\n  \}", src, re.S):
        out[m.group(1)] = {k: v.replace("\\'", "'") for k, v in re.findall(r"'([^']+)':\s*'((?:[^'\\]|\\.)*)'", m.group(2))}
    return out
I18N = read_i18n(SITE + 'js/i18n.js')

def write(rel, text):
    path = SITE + rel
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text)

def version(rel):
    return hashlib.sha1(open(SITE + rel, 'rb').read()).hexdigest()[:8]

def fill_versions(text):
    return re.sub(r'\{\{V:([^}]+)\}\}', lambda m: version(m.group(1)), text)

def logo(text):
    return text.replace('{{MARK}}', parts['mark']).replace('{{WORD}}', parts['word']).replace('{{GROUP}}', parts['group'])

def tr(lang, key):
    return I18N[lang].get(key) or I18N['sq'].get(key, '')

def translate(text, lang):
    """Apply data-i18n / data-i18n-html / data-i18n-attr texts for a language."""
    def text_sub(m):
        v = tr(lang, m.group(3))
        return m.group(1) + (H.escape(v, quote=False) if v else m.group(4)) + m.group(5)
    text = re.sub(r'(<(\w+)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>)([^<]*)(</\2>)', text_sub, text)
    def html_sub(m):
        v = tr(lang, m.group(3))
        return m.group(1) + (v or m.group(4)) + m.group(5)
    text = re.sub(r'(<(\w+)\b[^>]*?\sdata-i18n-html="([^"]+)"[^>]*>)(.*?)(</\2>)', html_sub, text, flags=re.S)
    def attr_tag(m):
        tag = m.group(0)
        spec = re.search(r'data-i18n-attr="([^"]+)"', tag).group(1)
        for pair in spec.split(';'):
            attr, key = pair.split(':')
            v = tr(lang, key)
            if not v:
                continue
            v = H.escape(v, quote=True)
            if re.search(r'\s' + re.escape(attr) + r'="[^"]*"', tag):
                tag = re.sub(r'(\s' + re.escape(attr) + r'=")[^"]*(")', lambda mm: mm.group(1) + v + mm.group(2), tag, count=1)
            else:
                tag = tag[:-1] + f' {attr}="{v}">'
        return tag
    return re.sub(r'<[^>]*\sdata-i18n-attr="[^"]+"[^>]*>', attr_tag, text)

def prefix_assets(text, root):
    if not root:
        return text
    text = re.sub(r'(\s(?:src|href|data-full)=")(assets|css|js)/', lambda m: m.group(1) + root + m.group(2) + '/', text)
    return re.sub(r'(\ssrcset=")([^"]*)"', lambda m: m.group(1) + re.sub(r'(^|,\s*)assets/', lambda k: k.group(1) + root + 'assets/', m.group(2)) + '"', text)

PAGES = {
    'home': {'sq': '/', 'en': '/en/'},
    'privacy': {'sq': '/privatesia/', 'en': '/en/privacy/'},
}

def head(page, lang, title, desc, root, noindex=False):
    url = DOMAIN + PAGES[page][lang] if page in PAGES else None
    L = []
    L.append(f'<title>{H.escape(title)}</title>')
    L.append(f'<meta name="description" content="{H.escape(desc)}">')
    L.append('<meta name="robots" content="noindex, follow">' if noindex else '<meta name="robots" content="index, follow, max-image-preview:large">')
    if url:
        L.append(f'<link rel="canonical" href="{url}">')
        for l in ('sq', 'en'):
            L.append(f'<link rel="alternate" hreflang="{l}" href="{DOMAIN}{PAGES[page][l]}">')
        L.append(f'<link rel="alternate" hreflang="x-default" href="{DOMAIN}{PAGES[page]["sq"]}">')
    L.append('<meta name="theme-color" content="#0F0F0D">')
    L.append('<meta name="format-detection" content="telephone=no">')
    if url:
        L.append('<meta property="og:type" content="website">')
        L.append('<meta property="og:site_name" content="Auremont Group">')
        L.append(f'<meta property="og:locale" content="{"sq_AL" if lang == "sq" else "en_US"}">')
        L.append(f'<meta property="og:locale:alternate" content="{"en_US" if lang == "sq" else "sq_AL"}">')
        L.append(f'<meta property="og:title" content="{H.escape(title)}">')
        L.append(f'<meta property="og:description" content="{H.escape(desc)}">')
        L.append(f'<meta property="og:url" content="{url}">')
        L.append(f'<meta property="og:image" content="{DOMAIN}/assets/og/og-{lang}.jpg">')
        L.append('<meta property="og:image:width" content="1200">')
        L.append('<meta property="og:image:height" content="630">')
        L.append(f'<meta property="og:image:alt" content="{H.escape(tr(lang, "og.alt"))}">')
        L.append('<meta name="twitter:card" content="summary_large_image">')
    L.append(f'<link rel="icon" href="{root}favicon.ico" sizes="32x32">')
    L.append(f'<link rel="icon" href="{root}assets/logo/favicon.svg" type="image/svg+xml">')
    L.append(f'<link rel="apple-touch-icon" href="{root}assets/logo/apple-touch-icon.png">')
    L.append(f'<link rel="manifest" href="{root}site.webmanifest">')
    return '\n'.join(L)

def jsonld(lang):
    services = [tr(lang, f'f{i}.t') for i in range(1, 8)]
    org = {
        '@type': 'GeneralContractor',
        '@id': DOMAIN + '/#company',
        'name': 'Auremont Group',
        'url': DOMAIN + PAGES['home'][lang],
        'logo': DOMAIN + '/assets/logo/icon-512.png',
        'image': f'{DOMAIN}/assets/og/og-{lang}.jpg',
        'description': tr(lang, 'meta.desc'),
        'foundingDate': '1990',
        'email': 'info@auremont-group.com',
        'address': {'@type': 'PostalAddress', 'addressLocality': 'Pejë' if lang == 'sq' else 'Peja', 'addressCountry': 'XK'},
        'geo': {'@type': 'GeoCoordinates', 'latitude': LAT, 'longitude': LON},
        'areaServed': {'@type': 'Country', 'name': 'Kosovë' if lang == 'sq' else 'Kosovo'},
        'knowsAbout': services,
        'hasMap': 'https://share.google/pdYurMQRCZzFXRY7z',
    }
    site = {'@type': 'WebSite', '@id': DOMAIN + '/#website', 'url': DOMAIN + '/', 'name': 'Auremont Group',
            'inLanguage': ['sq', 'en'], 'publisher': {'@id': DOMAIN + '/#company'}}
    data = {'@context': 'https://schema.org', '@graph': [org, site]}
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '</script>'

def langnav(page, lang, root):
    here = PAGES[page][lang]
    def rel(target):
        # relative link from this page's folder to the target folder
        a = [x for x in here.strip('/').split('/') if x]
        b = [x for x in target.strip('/').split('/') if x]
        return ('../' * len(a) + '/'.join(b) + ('/' if b else '')) or './'
    out = []
    for l, label in (('sq', 'SQ'), ('en', 'EN')):
        cur = ' aria-current="true"' if l == lang else ''
        out.append(f'<a href="{rel(PAGES[page][l])}" hreflang="{l}" lang="{l}" data-lang="{l}"{cur}>{label}</a>')
    return '<nav class="lang" aria-label="Gjuha / Language">\n      ' + '\n      '.join(out) + '\n    </nav>'

consent_tpl = open(os.path.join(HERE, 'partials', 'consent.html'), encoding='utf-8').read()

# sets the 'js' / 'is-intro' classes before the first paint; allowed by its hash in the CSP
BOOT_JS = "(function(d){d.classList.add('js');if(d.getAttribute('data-page')==='home')d.classList.add('is-intro')})(document.documentElement)"
BOOT = '<script>' + BOOT_JS + '</script>'
BOOT_HASH = "'sha256-" + base64.b64encode(hashlib.sha256(BOOT_JS.encode()).digest()).decode() + "'"

# ---------- home pages ----------
tpl = open(os.path.join(HERE, 'index.tpl.html'), encoding='utf-8').read()
for lang in ('sq', 'en'):
    root = '' if lang == 'sq' else '../'
    privacy = 'privatesia/' if lang == 'sq' else 'privacy/'
    t = tpl.replace('{{LANG}}', lang)
    t = t.replace('{{HEAD}}', head('home', lang, tr(lang, 'meta.title'), tr(lang, 'meta.desc'), root))
    t = t.replace('{{JSONLD}}', jsonld(lang))
    t = t.replace('{{HREF_SQ}}', './' if lang == 'sq' else '../').replace('{{HREF_EN}}', 'en/' if lang == 'sq' else './')
    t = t.replace('{{CONSENT}}', consent_tpl).replace('{{PRIVACY}}', privacy)
    t = t.replace('{{BOOT}}', BOOT)
    t = fill_versions(logo(t))
    if lang != 'sq':
        t = translate(t, lang)
    # the current language link
    t = re.sub(r'(<a href="[^"]*" hreflang="%s" lang="%s" data-lang="%s")' % (lang, lang, lang), r'\1 aria-current="true"', t)
    t = prefix_assets(t, root)
    write('index.html' if lang == 'sq' else 'en/index.html', t)

# ---------- text pages ----------
doc = open(os.path.join(HERE, 'doc.tpl.html'), encoding='utf-8').read()
def doc_page(page, lang, title, desc, content, root, home, privacy, out, noindex=False, nav=True):
    t = doc.replace('{{LANG}}', lang).replace('{{ROOT}}', root).replace('{{HOME}}', home).replace('{{PRIVACY}}', privacy)
    t = t.replace('{{HEAD}}', head(page, lang, title, desc, root, noindex))
    t = t.replace('{{SKIP}}', tr(lang, 'skip')).replace('{{BOOT}}', BOOT)
    t = t.replace('{{LANGNAV}}', langnav(page, lang, root) if nav else '')
    t = t.replace('{{CONTENT}}', content).replace('{{CONSENT}}', consent_tpl).replace('{{PRIVACY}}', privacy)
    t = t.replace('{{UPDATED_SQ}}', UPDATED_TXT['sq']).replace('{{UPDATED_EN}}', UPDATED_TXT['en'])
    t = fill_versions(logo(t))
    t = translate(t, lang)
    write(out, t)

for lang, root, home, out in (('sq', '../', '../', 'privatesia/index.html'), ('en', '../../', '../', 'en/privacy/index.html')):
    content = open(os.path.join(HERE, 'content', f'privacy.{lang}.html'), encoding='utf-8').read()
    doc_page('privacy', lang, tr(lang, 'privacy.title'), tr(lang, 'privacy.desc'), content, root, home, './', out)

nf = '''<p class="eyebrow"><i></i><span>404</span></p>
<h1>Faqja nuk u gjet</h1>
<p>Adresa që keni hapur nuk ekziston ose është zhvendosur.</p>
<p><a class="btn btn--yellow" href="/"><span>Kthehu në faqen kryesore</span><i aria-hidden="true">→</i></a></p>
<p lang="en" style="margin-top:40px">Page not found. <a href="/en/">Go to the English home page</a>.</p>'''
doc_page('404', 'sq', 'Faqja nuk u gjet · Auremont Group', 'Faqja nuk u gjet.', nf, '/', '/', '/privatesia/', '404.html', noindex=True, nav=False)

# ---------- sitemap, robots, manifest ----------
urls = []
for page, langs in PAGES.items():
    for lang, path in langs.items():
        alts = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{l}" href="{DOMAIN}{p}"/>' for l, p in langs.items())
        alts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{DOMAIN}{langs["sq"]}"/>'
        pr = '1.0' if page == 'home' else '0.3'
        urls.append(f'  <url>\n    <loc>{DOMAIN}{path}</loc>\n    <lastmod>{UPDATED}</lastmod>\n    <priority>{pr}</priority>{alts}\n  </url>')
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(urls) + '\n</urlset>\n')
write('robots.txt', f'User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n')
write('site.webmanifest', json.dumps({
    'name': 'Auremont Group', 'short_name': 'Auremont', 'lang': 'sq', 'start_url': '/', 'display': 'browser',
    'background_color': '#0F0F0D', 'theme_color': '#0F0F0D',
    'icons': [{'src': '/assets/logo/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': '/assets/logo/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
              {'src': '/assets/logo/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]
}, indent=2) + '\n')
write('.well-known/security.txt', f'Contact: mailto:info@auremont-group.com\nExpires: 2027-11-05T00:00:00.000Z\nPreferred-Languages: sq, en\nCanonical: {DOMAIN}/.well-known/security.txt\n')

# ---------- host configuration ----------
CSP = ("default-src 'self'; "
       "script-src 'self' " + BOOT_HASH + " https://*.googletagmanager.com; "
       "style-src 'self' 'unsafe-inline'; "
       "img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; "
       "font-src 'self'; "
       "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; "
       "frame-src https://www.google.com https://maps.google.com; "
       "manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; "
       "frame-ancestors 'self'; upgrade-insecure-requests")
HEADERS = [
    ('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'),
    ('Content-Security-Policy', CSP),
    ('X-Content-Type-Options', 'nosniff'),
    ('X-Frame-Options', 'SAMEORIGIN'),
    ('Referrer-Policy', 'strict-origin-when-cross-origin'),
    ('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()'),
    ('Cross-Origin-Opener-Policy', 'same-origin'),
]
hdr = '# Netlify and Cloudflare Pages read this file.\n/*\n' + ''.join(f'  {k}: {v}\n' for k, v in HEADERS)
hdr += '\n/assets/*\n  Cache-Control: public, max-age=2592000\n'
hdr += '\n/css/*\n  Cache-Control: public, max-age=2592000\n'
hdr += '\n/js/*\n  Cache-Control: public, max-age=2592000\n'
hdr += '\n/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n'
write('_headers', hdr)
write('_redirects', '# Netlify and Cloudflare Pages read this file. HTTP to HTTPS is automatic on both.\n'
      'https://www.auremont-group.com/*  https://auremont-group.com/:splat  301!\n'
      'http://www.auremont-group.com/*   https://auremont-group.com/:splat  301!\n'
      '/privacy     /en/privacy/   301\n'
      '/en/privatesia  /en/privacy/  301\n')
ht = ['# Apache / cPanel hosting. Upload together with the site files.',
      'Options -Indexes',
      'DirectoryIndex index.html',
      'ErrorDocument 404 /404.html',
      '',
      '<IfModule mod_rewrite.c>',
      '  RewriteEngine On',
      '  # always HTTPS, always without www',
      '  RewriteCond %{HTTPS} !=on [OR]',
      '  RewriteCond %{HTTP_HOST} ^www\\. [NC]',
      '  RewriteRule ^ https://auremont-group.com%{REQUEST_URI} [L,R=301]',
      '</IfModule>',
      '',
      '<IfModule mod_headers.c>']
ht += [f'  Header always set {k} "{v}"' for k, v in HEADERS]
ht += ['  <FilesMatch "\\.(woff2|webp|png|jpg|svg|ico|css|js)$">',
       '    Header set Cache-Control "public, max-age=2592000"',
       '  </FilesMatch>',
       '  <FilesMatch "\\.(html|xml|txt|webmanifest)$">',
       '    Header set Cache-Control "public, max-age=0, must-revalidate"',
       '  </FilesMatch>',
       '</IfModule>',
       '',
       '<IfModule mod_deflate.c>',
       '  AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript application/json image/svg+xml text/xml application/xml text/plain application/manifest+json',
       '</IfModule>',
       '',
       'AddType application/manifest+json .webmanifest',
       'AddType font/woff2 .woff2',
       'AddType image/webp .webp',
       '']
write('.htaccess', '\n'.join(ht))

fav = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0F0F0D"/><svg x="8" y="14" width="48" height="36" viewBox="134.2 118.9 85.9 44.6"><path fill="#FFC21A" fill-rule="evenodd" d="{parts["mark"]}"/></svg></svg>'
write('assets/logo/favicon.svg', fav)
print('built')
