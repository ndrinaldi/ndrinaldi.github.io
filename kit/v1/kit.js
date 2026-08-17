/* ============================================================================
   publish kit v1 — behavior. No dependencies, no build step.
   Reads the page's own <section data-section="..."> elements and builds the
   rail from them, so a page author never hand-writes navigation markup.
   ========================================================================= */
(function () {
  'use strict';

  var doc = document;
  var sections = [].slice.call(doc.querySelectorAll('section[data-section]'));

  /* ------------------------------------------------------------- theme --
     Explicit choice wins over the media query in BOTH directions, which is
     why the attribute is always written rather than only set for dark.     */
  var THEME_KEY = 'kit-theme';
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') doc.documentElement.setAttribute('data-theme', t);
    else doc.documentElement.removeAttribute('data-theme');
  }
  /* Only a STORED choice may move the attribute. Calling applyTheme(null) here
     would strip a data-theme the page author set deliberately, silently
     forcing every such page back to light. */
  try {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);
  } catch (e) {}

  function currentTheme() {
    var set = doc.documentElement.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  [].forEach.call(doc.querySelectorAll('[data-theme-toggle]'), function (btn) {
    function label() {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      btn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    }
    label();
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      label();
    });
  });

  /* ---------------------------------------------------------- progress -- */
  var bar = doc.querySelector('.progress > i');
  function progress() {
    if (!bar) return;
    var h = doc.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
    bar.style.width = (p * 100).toFixed(2) + '%';
  }

  /* -------------------------------------------------------------- rail --
     Skipped entirely for a single-section page: a navigator for one
     destination is ornament, and ornament is the thing we are avoiding.    */
  if (sections.length < 2) {
    var solo = doc.querySelector('.rail');
    if (solo) solo.remove();
    window.addEventListener('scroll', progress, { passive: true });
    progress();
    return;
  }

  sections.forEach(function (s, i) {
    if (!s.id) s.id = 's' + (i + 1);
  });

  function labelFor(s) {
    return s.getAttribute('data-section') ||
           (s.querySelector('h1,h2,h3') || {}).textContent ||
           'Section';
  }

  var rail = doc.querySelector('.rail');
  if (!rail) {
    rail = doc.createElement('nav');
    rail.className = 'rail';
    doc.body.appendChild(rail);
  }
  rail.setAttribute('aria-label', 'Contents');
  rail.innerHTML =
    '<button class="rail-bar" aria-expanded="false">' +
      '<span class="rail-dots" aria-hidden="true">' +
        sections.map(function () { return '<i></i>'; }).join('') +
      '</span>' +
      '<span class="rail-now"></span>' +
      '<span class="rail-toggle" aria-hidden="true">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
        '<path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.75" ' +
        'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</span>' +
    '</button>' +
    '<div class="rail-sheet">' +
      sections.map(function (s, i) {
        return '<a href="#' + s.id + '"><span class="idx">' +
               String(i + 1).padStart(2, '0') + '</span><span>' +
               labelFor(s).trim() + '</span></a>';
      }).join('') +
      /* Theme lives here rather than in the hero, where a lone 44px circle in
         the metadata row read as an orphaned dot rather than a control. */
      '<button class="rail-theme" data-theme-toggle>' +
        '<span class="idx">◐</span><span>Switch theme</span>' +
      '</button>' +
    '</div>';

  var barBtn = rail.querySelector('.rail-bar');
  var now    = rail.querySelector('.rail-now');
  var dots   = [].slice.call(rail.querySelectorAll('.rail-dots i'));
  var links  = [].slice.call(rail.querySelectorAll('.rail-sheet a'));

  function open(state) {
    rail.setAttribute('data-open', state ? 'true' : 'false');
    barBtn.setAttribute('aria-expanded', state ? 'true' : 'false');
  }
  open(false);

  barBtn.addEventListener('click', function () {
    open(rail.getAttribute('data-open') !== 'true');
  });
  links.forEach(function (a) { a.addEventListener('click', function () { open(false); }); });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && rail.getAttribute('data-open') === 'true') {
      open(false); barBtn.focus();
    }
  });
  doc.addEventListener('click', function (e) {
    if (!rail.contains(e.target) && rail.getAttribute('data-open') === 'true') open(false);
  });

  /* Active section is the last one whose top has passed a line ~40% down the
     viewport. Cheaper and far steadier than IntersectionObserver ratios,
     which flicker between two sections when both are partly visible.       */
  var active = -1;
  function mark() {
    var line = window.scrollY + window.innerHeight * 0.4;
    var i = 0;
    for (var k = 0; k < sections.length; k++) {
      if (sections[k].offsetTop <= line) i = k;
    }
    if (i === active) return;
    active = i;
    now.textContent = labelFor(sections[i]).trim();
    dots.forEach(function (d, k) {
      d.setAttribute('data-state', k < i ? 'read' : k === i ? 'here' : 'ahead');
    });
    links.forEach(function (a, k) {
      if (k === i) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { progress(); mark(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  progress(); mark();
})();
