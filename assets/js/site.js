/*
 * site.js - the small bits every page needs: the mobile menu button and sticky-header hash links.
 * (The estimator has its own scripts; this file works on its own on the content pages.)
 */
(function () {
  'use strict';
  var btn = document.getElementById('menu-btn'), nav = document.getElementById('site-nav');
  if (!btn || !nav) return;

  function set(open) {
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  }
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
  });
  // choosing a link closes the menu (hash links stay on the same page)
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  // on large screens the nav is always visible, so reset the state when the window grows
  if (window.matchMedia) {
    var mq = window.matchMedia('(min-width: 900px)');
    var reset = function () { if (mq.matches) set(false); };
    if (mq.addEventListener) mq.addEventListener('change', reset); else if (mq.addListener) mq.addListener(reset);
  }
})();
