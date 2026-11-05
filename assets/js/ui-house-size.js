/*
 * ui-house-size.js - Step 1: choose a home size from a grid of large tap-friendly cards (no dropdown).
 *
 * The cards are real radio buttons (arrow keys move between them), shown first when the page opens.
 * The home size is context only: choosing one does NOT add any items. The visitor starts with an empty list and builds
 * it in step 2. The size is attached to the quote request. Choosing a card opens the inventory straight away (no separate
 * continue button): a tap or click does it, and with a keyboard the arrow keys only move the selection while Enter or Space
 * confirms it. Until then the catalogue and the bottom action bar stay hidden. "Change" brings the cards back (tap the
 * highlighted size to return to your items); the items already added are kept.
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});
  var UI = TSE.UI;
  var esc = UI.esc;

  var CUSTOM = { id: 'custom', label: 'Not sure / Custom', description: 'Any other size or situation' };

  /** Check data/house-presets.json. Returns a list of problems (empty = fine). */
  function validate(presetsData) {
    var problems = [];
    var list = presetsData && Array.isArray(presetsData.presets) ? presetsData.presets : [];
    if (!list.length) problems.push('No house-size options were found.');
    var seen = {};
    list.forEach(function (p) {
      if (!p.id || !p.label || !p.description) problems.push('House size "' + (p.id || '?') + '" needs an id, label and description.');
      else if (seen[p.id]) problems.push('Duplicate house size id ' + p.id);
      else if (p.id === 'custom') problems.push('"custom" is added automatically; remove it from the file.');
      seen[p.id] = true;
    });
    return problems;
  }

  function init(ctx) {
    var inventory = ctx.inventory;
    var $ = function (id) { return document.getElementById(id); };
    var sizes = ((ctx.presets && ctx.presets.presets) || []).concat([CUSTOM]);
    var grid = $('size-grid'), status = $('size-status'), step = $('size-step'), ws = $('est-grid');
    var bar = $('action-bar'), homeLabel = $('home-size-label');
    var picked = null;   // radio selection not yet confirmed
    var chosen = null;   // { id, label } once a size was confirmed
    var arrowNav = false; // true while an arrow key is moving the radio selection (that must not open the inventory)

    function renderCards() {
      grid.insertAdjacentHTML('beforeend', sizes.map(function (p) {
        return '<label class="size-card"><input type="radio" name="home-size" value="' + esc(p.id) + '" aria-labelledby="sz-' + esc(p.id) + '-l" aria-describedby="sz-' + esc(p.id) + '-d">' +
          '<span class="size-card-body"><span class="size-card-ico" aria-hidden="true"><svg class="ui-icon"><use href="#i-home"/></svg></span>' +
          '<strong class="size-card-label" id="sz-' + esc(p.id) + '-l">' + esc(p.label) + '</strong><small class="size-card-desc" id="sz-' + esc(p.id) + '-d">' + esc(p.description) + '</small></span>' +
          '<span class="size-card-check" aria-hidden="true"><svg class="ui-icon"><use href="#i-check"/></svg></span></label>';
      }).join(''));
    }
    function labelOf(id) { var s = sizes.filter(function (p) { return p.id === id; })[0]; return s ? s.label : ''; }
    function syncRadios() {
      Array.prototype.forEach.call(grid.querySelectorAll('input[type=radio]'), function (r) { r.checked = r.value === picked; });
      status.textContent = picked
        ? labelOf(picked) + ' selected. ' + (arrowNav ? 'Press Enter to continue.' : 'Tap it again to go back to your items.')
        : 'Tap a home size to open your item list.';
    }

    function showWorkspace(on) {
      step.hidden = on; ws.hidden = !on; bar.hidden = !on;
      document.body.classList.toggle('in-workspace', on);
      document.dispatchEvent(new CustomEvent('tse:workspace', { detail: { open: on } }));   // the desktop 3D panel starts when it appears
    }

    /** Confirm a size and open the item workspace. It never adds or removes items. `quiet` skips the scroll and focus. */
    function choose(id, opts) {
      opts = opts || {};
      var size = sizes.filter(function (p) { return p.id === id; })[0];
      if (!size) return;
      picked = size.id; chosen = { id: size.id, label: size.label };
      homeLabel.textContent = size.label;
      syncRadios();
      showWorkspace(true);
      if (opts.quiet) return;
      UI.announce(size.label + ' selected. Choose your household items.', 200);
      var smooth = !root.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ws.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      var h = $('items-title'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }

    // A click on a card (mouse, touch, screen-reader activation) confirms it. Arrow keys also fire click on a radio,
    // so those are told apart and only move the selection; Enter / Space then confirm.
    grid.addEventListener('keydown', function (e) {
      if (!e.target.matches('input[type=radio]')) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') { arrowNav = true; return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); arrowNav = false; choose(e.target.value); }
    });
    grid.addEventListener('keyup', function () { arrowNav = false; });
    grid.addEventListener('click', function (e) {
      if (!e.target.matches('input[type=radio]')) return;
      picked = e.target.value;
      if (arrowNav) { syncRadios(); return; }
      choose(picked);
    });
    $('size-change').addEventListener('click', function () {
      showWorkspace(false);
      syncRadios();
      var r = grid.querySelector('input[type=radio]:checked') || grid.querySelector('input[type=radio]');
      step.scrollIntoView({ block: 'start' });
      if (r) r.focus({ preventScroll: true });
    });

    renderCards();
    syncRadios();

    return {
      getChosen: function () { return chosen; },
      /** Used by the demo shortcuts: if no size was picked yet, open the estimator as "Custom" without touching the list. */
      ensureStarted: function () { if (!chosen) choose('custom', { quiet: true }); },
      /** Back to the very start: empty list, the size cards showing, estimator hidden. */
      reset: function () { inventory.clear(); chosen = null; picked = null; syncRadios(); showWorkspace(false); },
      choose: choose
    };
  }

  TSE.UIHouseSize = { init: init, validate: validate };
})(typeof window !== 'undefined' ? window : globalThis);
