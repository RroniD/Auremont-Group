/* Cookie consent and analytics.
   Loads in <head> on every page. Nothing that sets cookies (Google Analytics through
   Google Tag Manager, the Google Maps embed) runs until the visitor allows it.

   To turn on Google Analytics: create a GA4 property and a Tag Manager container,
   add the GA4 tag in Tag Manager, then put the container ID below (it looks like GTM-ABC1234). */
(function () {
  var GTM_ID = '';                  // e.g. 'GTM-ABC1234'; empty = no analytics at all
  var KEY = 'auremont-consent';
  var VERSION = 1;                  // raise this to ask everyone again after the policy changes
  var MAX_AGE = 365 * 24 * 3600e3;  // ask again after 12 months

  var html = document.documentElement;   // the 'js' and 'is-intro' classes are set by the inline snippet in <head>

  // Google consent mode: everything denied until the visitor decides
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted'
  });

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c && c.v === VERSION && Date.now() - c.t < MAX_AGE) return c;
    } catch (e) { /* storage blocked */ }
    return null;
  }
  var state = read();

  function loadGtm() {
    if (!GTM_ID || loadGtm.done) return;
    loadGtm.done = true;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID);
    document.head.appendChild(s);
  }
  function apply() {
    var a = !!(state && state.analytics);
    gtag('consent', 'update', { analytics_storage: a ? 'granted' : 'denied' });
    if (a) loadGtm();
    document.dispatchEvent(new CustomEvent('auremont:consent', { detail: state }));
  }
  function save(analytics, maps) {
    state = { v: VERSION, t: Date.now(), analytics: !!analytics, maps: !!maps };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: remember for this page only */ }
    apply();
  }
  if (state) apply();

  window.AuremontConsent = {
    has: function (k) { return !!(state && state[k]); },
    allow: function (k) { save(k === 'analytics' || (state && state.analytics), k === 'maps' || (state && state.maps)); },
    track: function (event, params) { if (state && state.analytics) { var o = { event: event }; for (var p in params) o[p] = params[p]; window.dataLayer.push(o); } },
    open: function () { openBanner(true); }
  };

  /* ---------- Banner ---------- */
  var box, opts, settingsBtn;
  function openBanner(withSettings) {
    if (!box) return;
    box.hidden = false;
    var an = box.querySelector('input[name="analytics"]'), mp = box.querySelector('input[name="maps"]');
    if (an) an.checked = !!(state && state.analytics);
    if (mp) mp.checked = !!(state && state.maps);
    showSettings(!!withSettings);
    requestAnimationFrame(function () { box.classList.add('is-open'); });
    if (withSettings) { var f = box.querySelector('.cc__opt:not([hidden]) input:not([disabled])'); if (f) f.focus({ preventScroll: true }); }
  }
  function closeBanner() {
    box.classList.remove('is-open');
    setTimeout(function () { box.hidden = true; }, 350);
  }
  function showSettings(on) {
    opts.hidden = !on;
    settingsBtn.dataset.cc = on ? 'save' : 'settings';
    var label = settingsBtn.querySelector('span');
    label.textContent = label.getAttribute(on ? 'data-save' : 'data-settings');
  }
  function init() {
    box = document.querySelector('.cc');
    if (!box) return;
    opts = box.querySelector('.cc__opts');
    settingsBtn = box.querySelector('[data-cc="settings"]');
    if (!GTM_ID) { var row = box.querySelector('.cc__opt--analytics'); if (row) row.hidden = true; }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cc]');
      if (!b) return;
      var what = b.dataset.cc;
      if (what === 'accept') { save(!!GTM_ID, true); closeBanner(); }
      else if (what === 'reject') { save(false, false); closeBanner(); }
      else if (what === 'settings') showSettings(true);
      else if (what === 'save') {
        save(box.querySelector('input[name="analytics"]').checked, box.querySelector('input[name="maps"]').checked);
        closeBanner();
      }
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-cc-open]')) { e.preventDefault(); openBanner(true); }
    });
    if (!state) setTimeout(function () { openBanner(false); }, html.classList.contains('is-intro') ? 3200 : 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
