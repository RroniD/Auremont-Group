# Auremont Group website

Website of [Auremont Group](https://auremont-group.com), a construction company in Peja, Kosovo, founded in 1990. The site is in Albanian (`/`) and English (`/en/`).

It is a static site: HTML, CSS and JavaScript, with no framework and no server code. The pages are generated from templates by a small Python script, and the generated pages are committed at the top level of the repository, so it can be published as it is.

## Repository layout

```
index.html                Home page, Albanian
en/                       Home page and privacy policy, English
privatesia/               Privacy and cookie policy, Albanian
404.html
css/style.css
js/main.js                Scroll animations, language switch, gallery, contact form
js/consent.js             Cookie banner, Google Consent Mode, Tag Manager loader
js/i18n.js                All page texts in both languages
js/grid.js                Hero background
js/kosovo-data.js         Outline of Kosovo used by the map animation
js/vendor/                GSAP, ScrollTrigger, Lenis, Flubber
assets/                   Fonts, logo, photos, map, social images
_headers, _redirects      Netlify and Cloudflare Pages configuration
.htaccess                 Apache configuration
.nojekyll                 Tells GitHub Pages to serve the files as they are

source/                   Not part of the website
  build.py                Generates the pages and host configuration
  index.tpl.html          Home page template
  doc.tpl.html            Template for the privacy and 404 pages
  partials/consent.html   Cookie banner markup
  content/                Privacy policy texts
  logo_parts.json         Logo paths for the inline SVG
```

## Building

The build needs Python 3 and no extra packages.

```
python3 source/build.py
```

Run it after changing anything in `source/` or `js/i18n.js`. It writes:

- the Albanian and English home pages (the English text comes from `i18n.js`),
- the privacy pages and `404.html`,
- `sitemap.xml`, `robots.txt`, `site.webmanifest` and `.well-known/security.txt`,
- `_headers`, `_redirects` and `.htaccess` with the Content Security Policy, and `.nojekyll`,
- a content hash on every CSS and JS link (`?v=`), so browsers fetch changed files.

To preview the site locally:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deployment

The repository root is the web root. Everything except `source/`, `.github/` and `README.md` belongs to the website.

- **GitHub Pages:** in the repository settings under Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`. Choosing "GitHub Actions" also works and uses `.github/workflows/pages.yml`. GitHub Pages does not read `_headers` or `.htaccess`, so the security headers are not sent there.
- **Netlify or Cloudflare Pages:** connect the repository, leave the build command empty and set the publish directory to the repository root. `_headers` and `_redirects` are applied automatically. Add the domain and enable HTTPS.
- **Apache (cPanel and similar):** upload the website files to `public_html`, including `.htaccess` and `.well-known/`, and enable AutoSSL or Let's Encrypt.

The Netlify, Cloudflare and Apache configurations redirect all traffic to `https://auremont-group.com` (without `www`), send HSTS and the other security headers, cache static files for 30 days and serve `404.html` for missing pages.

When an external service is added (a form backend, a chat widget, another analytics tool), its domains must be added to the Content Security Policy in `source/build.py` before rebuilding.

## Configuration

| Setting | Location |
| --- | --- |
| Phone number | `source/index.tpl.html` |
| Email address | `source/index.tpl.html`, `js/main.js`, `source/content/`, `source/build.py` |
| Street address, working hours | `js/i18n.js`, keys `contact.addrv` and `contact.hoursv` |
| Map location | `data-src` of `.map__frame` in `source/index.tpl.html`; `LAT` and `LON` in `source/build.py` |
| Google Tag Manager container | `GTM_ID` in `js/consent.js` |
| Privacy policy date | `UPDATED` in `source/build.py` |

The phone number, street address, working hours and map location are not final yet.

## Analytics and consent

Nothing that sets cookies is loaded before the visitor makes a choice. The banner offers "Accept all", "Necessary only" and separate settings for statistics (Google Analytics through Tag Manager) and the Google map. The choice is stored in `localStorage` for 12 months and can be changed at any time from "Cookie settings" in the footer.

- Google Consent Mode v2 starts with everything denied and is updated after the visitor's choice.
- Tag Manager loads only after consent to statistics, and only when `GTM_ID` is set. While it is empty, the statistics option is not shown.
- The contact section shows a static map of Peja until the visitor allows the Google map.
- Form submissions and clicks on the phone number or email are sent as `generate_lead` and `contact_click` events when statistics are allowed.

The privacy policy states a 14-month retention period, so GA4 data retention should be set to 14 months.

## Search engines

Each page has a single `h1` with `h2` headings for its sections, a canonical URL, `hreflang` links between the two languages, Open Graph and Twitter Card tags, and schema.org `GeneralContractor` data. All text is in the HTML rather than loaded by JavaScript.

After launch, submit `https://auremont-group.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Performance

Fonts are self-hosted and subset to the characters used in Albanian and English (71 KB in total). Scripts are deferred, photos are WebP with smaller versions for phones, and images below the first screen load lazily. Lighthouse scores: Performance 93 on mobile and 100 on desktop; Accessibility, Best Practices and SEO 100.

## Content

**Photos.** Field photos are `assets/photos/01-water.webp` to `07-arch.webp` (landscape, cropped to 4:3, about 1200 × 900 px). Gallery photos are `g01.webp` to `g10.webp`, each with a 640 px version for phones (`g01-640.webp`); their descriptions are the keys `gal.a1` to `gal.a10` in `i18n.js`. Save photos as WebP at quality 75 to 80. If all stock photos are replaced, remove the credits link from the footer in `source/index.tpl.html`.

**Contact form.** The form opens the visitor's email client with the message filled in (`mailto:`), so the site itself does not process any personal data.

**Accessibility.** The site can be used entirely from the keyboard, text passes WCAG AA contrast checks, and visitors with reduced motion enabled skip the intro animation, smooth scrolling and the moving gallery.

## Credits

- [GSAP and ScrollTrigger](https://gsap.com) 3.12.5, GreenSock Standard License
- [Lenis](https://github.com/darkroomengineering/lenis) 1.1.13, MIT License
- [Flubber](https://github.com/veltman/flubber) 0.4.2, MIT License
- [Archivo](https://github.com/Omnibus-Type/Archivo), [Geist and Geist Mono](https://github.com/vercel/geist-font), SIL Open Font License 1.1 (license files in `assets/fonts/`)
- Stock photos from Open Images, CC BY 2.0, listed in [`assets/photos/CREDITS.md`](assets/photos/CREDITS.md)
- Street map of Peja rendered from Overture Maps data, © OpenStreetMap contributors

## License

© 2026 Auremont Group. All rights reserved. The third-party components listed above are covered by their own licenses.
