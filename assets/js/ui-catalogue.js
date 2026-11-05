/*
 * ui-catalogue.js - search box, category navigation and item cards (the catalogue workspace).
 * Categories are a left column on large screens and a scrolling row of chips on phones.
 * The search text is kept when you change category: with a search active, a category shows only the matches inside it,
 * and "All results" shows the matches from every category.
 * Cards keep the default face simple (picture, name, size/type, quantity); sizes, handling notes and dismantled parts
 * live under "More options".
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});
  var Icons = TSE.Icons, UI = TSE.UI;
  var esc = UI.esc;

  var ALL = '__all';

  function init(ctx) {
    var catalogue = ctx.catalogue, inventory = ctx.inventory;
    var MAX = inventory.MAX_QTY;

    var $ = function (id) { return document.getElementById(id); };
    var grid = $('item-grid'), catList = $('cat-list'), input = $('search-input'), clearBtn = $('search-clear');
    var countEl = $('result-count'), noteEl = $('category-note'), titleEl = $('items-title');
    var noRes = $('no-results');

    var activeCat = catalogue.categories.length ? catalogue.categories[0].id : null;
    var query = '';
    var searchAll = true;     // while a search is active: true = matches from every category, false = only the active category
    var cardVariant = {};     // itemId -> variant chosen on the card (UI only)
    var moreDlg = $('more-dialog'), moreOpener = null;   // the small "More options" popup
    var catSelect = $('cat-select');
    var searchTimer = null;
    var lastCustomSig = '';

    var CATEGORY_NOTES = {
      other: 'Fitness gear, instruments, baby items, special pieces and anything you add yourself with your own size.'
    };

    // ---------------- category navigation ----------------
    function countBadge(n) {
      return '<span class="cat-count" data-count' + (n ? '' : ' hidden') + '>' + n + '<span class="sr-only"> selected</span></span>';
    }
    function catButtonHtml(c, counts) {
      var shape = Icons.dims(c.icon);
      return '<li><button type="button" class="cat-btn" data-cat="' + esc(c.id) + '" aria-current="false">' +
        '<span class="cat-ico ' + shape.toneClass + '" aria-hidden="true">' + Icons.svg(c.icon) + '</span>' +
        '<span class="cat-name">' + esc(c.name) + '</span>' + countBadge(counts[c.id] || 0) + '</button></li>';
    }
    function renderCategoryNav() {
      var counts = inventory.countsByCategory();
      catList.innerHTML = '<li class="cat-all" hidden><button type="button" class="cat-btn" data-cat="' + ALL + '" aria-current="false">' +
        '<span class="cat-ico tone-soft" aria-hidden="true">' + Icons.ui('search') + '</span><span class="cat-name">All results</span></button></li>' +
        catalogue.categories.map(function (c) { return catButtonHtml(c, counts); }).join('');
      renderCategorySelect(counts);
      syncCategoryNav();
    }
    function optionText(c, n) { return c.name + (n ? ' (' + n + ' selected)' : ''); }
    function renderCategorySelect(counts) {
      if (!catSelect) return;
      catSelect.innerHTML = '<option value="' + ALL + '" hidden>All results</option>' +
        catalogue.categories.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(optionText(c, counts[c.id] || 0)) + '</option>'; }).join('');
    }
    function updateCategoryCounts() {
      var counts = inventory.countsByCategory();
      if (catSelect) Array.prototype.forEach.call(catSelect.options, function (o) {
        var c = catalogue.categoryById(o.value); if (c) o.textContent = optionText(c, counts[c.id] || 0);
      });
      Array.prototype.forEach.call(catList.querySelectorAll('.cat-btn[data-cat]'), function (b) {
        if (b.getAttribute('data-cat') === ALL) return;
        var n = counts[b.getAttribute('data-cat')] || 0, el = b.querySelector('[data-count]');
        el.hidden = !n;
        el.firstChild.nodeValue = n ? String(n) : '';
      });
    }
    function syncCategoryNav() {
      var q = !!query.trim();
      catList.querySelector('.cat-all').hidden = !q;
      if (catSelect) {
        var allOpt = catSelect.querySelector('option[value="' + ALL + '"]');
        if (allOpt) allOpt.hidden = !q;
        catSelect.value = q && searchAll ? ALL : (activeCat || '');
      }
      Array.prototype.forEach.call(catList.querySelectorAll('.cat-btn'), function (b) {
        var id = b.getAttribute('data-cat');
        var on = id === ALL ? (q && searchAll) : (id === activeCat && !(q && searchAll));
        b.setAttribute('aria-current', on ? 'true' : 'false');
        b.classList.toggle('is-active', on);
      });
    }
    function scrollChipIntoView(btn) {
      if (!btn || catList.scrollWidth <= catList.clientWidth + 2) return; // chip row only scrolls on narrow screens
      var target = btn.offsetLeft - (catList.clientWidth - btn.offsetWidth) / 2;
      var smooth = !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
      try { catList.scrollTo({ left: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { catList.scrollLeft = Math.max(0, target); }
    }

    // ---------------- cards ----------------
    function currentVariant(item) {
      var id = cardVariant[item.id];
      return catalogue.getVariant(item, id) || catalogue.defaultVariant(item);
    }
    function volumeText(item, variant) {
      var v = catalogue.variantVolume(item, variant);
      return v === null ? 'size unknown' : '≈ ' + TSE.Estimator.formatVolume(v) + ' ft³ each';
    }
    /** Short line under the name: category (in search results) and a volume hint. */
    function metaHtml(item, variant, showCat) {
      var parts = [];
      if (showCat) { var c = catalogue.categoryById(item.category); if (c) parts.push('<span class="ic-cat">' + esc(c.name) + '</span>'); }
      parts.push('<span class="ic-vol">' + esc(volumeText(item, variant)) + '</span>');
      return parts.join(' &middot; ');
    }
    /** Tags that stay on the card face: only safety-relevant ones. The rest are under "More options". */
    function faceTagsHtml(item) {
      var tags = [];
      if ((item.flags || []).indexOf('restricted') !== -1) tags.push('restricted');
      return tags.map(UI.tagHtml).join('');
    }
    function handlingLines(item, variant) {
      var f = item.flags || [], out = [];
      if (f.indexOf('fragile') !== -1) out.push('Fragile: nothing is stacked on it in the 3D plan, and it is kept upright.');
      if (f.indexOf('heavy') !== -1) out.push('Heavy: kept on the vehicle floor or on a strong support.');
      if (f.indexOf('bulky') !== -1) out.push('Bulky: may need extra space or a larger vehicle.');
      if (catalogue.variantNeedsReview(item, variant)) out.push('Needs a manual dimension or handling check before the vehicle is confirmed.');
      return out;
    }
    function partsText(variant) {
      if (!variant || !variant.parts) return '';
      return variant.parts.map(function (p) { return p.label + (p.qty > 1 ? ' × ' + p.qty : ''); }).join(', ');
    }
    /** Contents of "More options": packed size, dismantled parts, bundle contents, handling notes. */
    function moreHtml(item, variant) {
      var out = [];
      var dt = catalogue.variantDimsText(item, variant);
      if (dt) out.push('<p><strong>Size:</strong> ' + esc(dt) + '. Packed size, approximate.</p>');
      if (variant && variant.dismantled) out.push('<p><strong>Dismantled:</strong> drawn as flat parts (' + esc(partsText(variant)) + '). Counted once in the estimate.</p>');
      if (item.isBundle) {
        var comps = catalogue.variantComponents(item, variant) || [];
        out.push('<p><strong>Includes:</strong> ' + esc(comps.map(function (c) { return (c.qty > 1 ? c.qty + ' x ' : '') + c.item.name + (c.item.variants.length > 1 ? ' (' + c.variant.label + ')' : ''); }).join(', ')) + '. Counted once.</p>');
      }
      var h = handlingLines(item, variant);
      if (h.length) out.push('<ul class="ic-handling">' + h.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>');
      if (item.note) out.push('<p class="ic-note-text">' + esc(item.note) + '</p>');
      if (!out.length) out.push('<p>No special handling. Size and volume are approximate.</p>');
      return out.join('');
    }
    function actionsHtml(item, variant) {
      return UI.stepperHtml(item.name + (item.variants.length > 1 ? ', ' + variant.label : ''), inventory.getQty(item.id, variant.id), MAX, { zero: true });
    }
    function cardHtml(item, showCat) {
      var variant = currentVariant(item);
      var dims = Icons.dims(item.shape);
      var sel = '';
      if (item.variants.length > 1) {
        sel = '<div class="ic-variant"><label for="v-' + esc(item.id) + '">' + (item.isBundle ? 'Option' : 'Type / size') + '</label>' +
          '<select id="v-' + esc(item.id) + '" data-act="variant">' +
          item.variants.map(function (v) { return '<option value="' + esc(v.id) + '"' + (v.id === variant.id ? ' selected' : '') + '>' + esc(v.label) + '</option>'; }).join('') +
          '</select></div>';
      }
      var total = inventory.getItemQty(item.id);
      return '<article class="item-card" data-item="' + esc(item.id) + '" data-selected="' + (total > 0) + '">' +
        '<div class="ic-tile ' + dims.toneClass + '">' + Icons.svg(item.shape) + '</div>' +
        '<div class="ic-body">' +
        '<h3 class="ic-name">' + esc(item.name) + '</h3>' +
        '<p class="ic-meta">' + metaHtml(item, variant, showCat) + '</p>' +
        '<div class="tags" data-tags>' + faceTagsHtml(item) + '</div>' +
        sel +
        '<div class="ic-foot"><div class="ic-actions" data-actions data-sig="' + inventory.getQty(item.id, variant.id) + ':' + variant.id + '">' + actionsHtml(item, variant) + '</div>' +
        '<span class="sel-flag"' + (total > 0 ? '' : ' hidden') + '>' + Icons.ui('check') + '<span class="sel-flag-text">In list: ' + total + '</span></span></div>' +
        '<button type="button" class="ic-more-btn" data-act="more" aria-haspopup="dialog">' + Icons.ui('info') + 'More options</button>' +
        '</div></article>';
    }
    function customCardHtml(line) {
      var vol = typeof line.volumeFt3 === 'number' ? '≈ ' + TSE.Estimator.formatVolume(line.volumeFt3) + ' ft³ each' : 'size unknown';
      var tags = [line.approx ? (typeof line.volumeFt3 === 'number' ? 'approx' : 'unknown') : null, line.fragile ? 'fragile' : null, line.dismantled ? 'dismantled' : null, line.oversized ? 'manual' : null].filter(Boolean);
      var extra = [line.weightKg ? 'Weight: ' + line.weightKg + ' kg (not checked)' : '', line.notes || ''].filter(Boolean).join(' · ');
      return '<article class="item-card" data-key="' + esc(line.key) + '" data-selected="true">' +
        '<div class="ic-tile tone-carton">' + Icons.svg('box') + '</div>' +
        '<div class="ic-body"><h3 class="ic-name">' + esc(line.name) + '</h3>' +
        '<p class="ic-meta"><span class="ic-cat">Your custom item</span> &middot; <span class="ic-vol">' + vol + '</span></p>' +
        (tags.length ? '<div class="tags">' + tags.map(UI.tagHtml).join('') + '</div>' : '') +
        (extra ? '<p class="ic-includes">' + esc(extra) + '</p>' : '') +
        '<div class="ic-foot"><div class="ic-actions" data-actions>' + UI.stepperHtml(line.name, line.qty, MAX) + '</div>' +
        '<button type="button" class="btn btn-text btn-sm" data-act="edit-custom" aria-label="Edit ' + esc(line.name) + '">' + Icons.ui('edit') + 'Edit</button>' +
        '<span class="sel-flag">' + Icons.ui('check') + '<span class="sel-flag-text">In list: ' + line.qty + '</span></span></div></div></article>';
    }
    function customSig() {
      return inventory.getLines().filter(function (l) { return l.kind === 'custom'; }).map(function (l) { return l.key + ':' + l.qty + ':' + l.name; }).join(',');
    }

    // ---------------- main render ----------------
    function render() {
      var q = query.trim();
      var items = [], showCat = false, countText, title, otherHits = 0;
      var cat = catalogue.categoryById(activeCat);
      var customLines = (!q && cat && cat.id === 'other') ? inventory.getLines().filter(function (l) { return l.kind === 'custom'; }) : [];
      lastCustomSig = customSig();

      if (q) {
        var all = catalogue.search(q);
        if (searchAll || !cat) { items = all; title = 'Search results'; }
        else { items = all.filter(function (i) { return i.category === cat.id; }); otherHits = all.length - items.length; title = cat.name; }
        showCat = true;
        var where = searchAll || !cat ? '' : ' in ' + cat.name;
        countText = items.length ? items.length + (items.length === 1 ? ' result for “' : ' results for “') + q + '”' + where : 'No results for “' + q + '”' + where;
        if (!searchAll && cat && otherHits) countText += ' · ' + otherHits + ' more in other categories';
      } else if (cat) {
        items = catalogue.itemsInCategory(cat.id);
        title = cat.name;
        countText = items.length + ' items' + (customLines.length ? ' + ' + customLines.length + ' of your own' : '');
      } else { countText = ''; title = 'Items'; }

      titleEl.textContent = title;
      countEl.textContent = countText;
      var note = !q && cat ? CATEGORY_NOTES[cat.id] : '';
      noteEl.hidden = !note; noteEl.textContent = note || '';

      grid.innerHTML = customLines.map(customCardHtml).join('') + items.map(function (it) { return cardHtml(it, showCat); }).join('');

      var none = q && !items.length;
      noRes.hidden = !none;
      if (none) {
        $('no-results-title').textContent = 'No matching items found.';
        $('no-results-text').textContent = !searchAll && otherHits ? 'None in ' + cat.name + ', but ' + otherHits + (otherHits === 1 ? ' item matches' : ' items match') + ' in other categories.' : 'Can’t find it? Add a custom item.';
        $('no-results-all').hidden = !(!searchAll && otherHits);
      }
      syncCategoryNav();
    }
    /** After inventory changes: update only the controls whose state changed. */
    function refresh() {
      updateCategoryCounts();
      var q = query.trim();
      if (!q && activeCat === 'other' && customSig() !== lastCustomSig) { // custom cards depend on the list itself
        UI.keepFocus(grid, render, ['[data-act="inc"]', '.btn']);
        return;
      }
      Array.prototype.forEach.call(grid.querySelectorAll('.item-card[data-item]'), function (card) {
        var item = catalogue.getItem(card.getAttribute('data-item'));
        if (!item) return;
        var variant = currentVariant(item);
        var qty = inventory.getQty(item.id, variant.id);
        var total = inventory.getItemQty(item.id);
        var box = card.querySelector('[data-actions]');
        var sig = qty + ':' + variant.id;
        if (box.getAttribute('data-sig') !== sig) {
          box.setAttribute('data-sig', sig);
          UI.keepFocus(box, function () { box.innerHTML = actionsHtml(item, variant); }, ['[data-act="inc"]']);
        }
        card.setAttribute('data-selected', total > 0);
        var flag = card.querySelector('.sel-flag');
        flag.hidden = total === 0;
        flag.querySelector('.sel-flag-text').textContent = 'In list: ' + total;
      });
      // custom cards show their own quantity
      Array.prototype.forEach.call(grid.querySelectorAll('.item-card[data-key]'), function (card) {
        var l = inventory.getLine(card.getAttribute('data-key'));
        var t = card.querySelector('.sel-flag-text'); if (l && t) t.textContent = 'In list: ' + l.qty;
      });
    }

    // ---------------- events ----------------
    function cardOf(el) { return el.closest('.item-card'); }
    function keyOfCard(card) {
      var item = catalogue.getItem(card.getAttribute('data-item'));
      return item ? item.id + '::' + currentVariant(item).id : null;
    }
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn || btn.disabled) return;
      var card = cardOf(btn); if (!card) return;
      var act = btn.getAttribute('data-act');
      var key = card.getAttribute('data-key');
      if (key) { // custom card
        if (act === 'inc' || act === 'dec') step(btn, key, act);
        else if (act === 'edit-custom' && ctx.onEditCustom) ctx.onEditCustom(key, btn);
        return;
      }
      if (act === 'inc' || act === 'dec') step(btn, keyOfCard(card), act, card);
      else if (act === 'more') openMoreDialog(card, btn);
    });

    // ---------------- "More options": a small popup with the details (size, dismantled parts, handling) ----------------
    function openMoreDialog(card, opener) {
      var item = catalogue.getItem(card.getAttribute('data-item')); if (!item) return;
      var variant = currentVariant(item);
      $('more-title').textContent = item.name + (item.variants.length > 1 ? ', ' + variant.label : '');
      $('more-body').innerHTML = moreHtml(item, variant);
      moreOpener = opener;
      moreDlg.showModal();
    }
    function afterMoreClose() {
      var o = moreOpener; moreOpener = null;
      if (o && o.focus && document.contains(o)) o.focus({ preventScroll: true });
    }
    function closeMore() { if (moreDlg.open) { moreDlg.close(); afterMoreClose(); } }
    moreDlg.addEventListener('click', function (e) {
      if (e.target === moreDlg || (e.target.closest && e.target.closest('[data-close]'))) closeMore();
    });
    moreDlg.addEventListener('close', afterMoreClose);
    UI.protectStepper(grid);
    /** + / - on a card. A number typed in the box counts even if the box was never left. 0 means "not selected". */
    function step(btn, key, act, card) {
      var line = inventory.getLine(key);
      var cur = line ? line.qty : 0;
      var typed = UI.typedQty(btn, cur);
      var next = (typed === null ? cur : Math.min(MAX, typed)) + (act === 'inc' ? 1 : -1);
      if (next < 1) { if (line) removeWithUndo(key); return; }
      if (!line && card) {
        var item = catalogue.getItem(card.getAttribute('data-item')), variant = currentVariant(item);
        inventory.add(item.id, variant.id, next);
        UI.announce('Added ' + item.name + '. ' + inventory.totalUnits() + ' items selected.', 300);
      } else inventory.setQty(key, next);
    }
    function removeWithUndo(key) {
      if (ctx.onRemoveLine) ctx.onRemoveLine(key); else inventory.remove(key);
    }
    grid.addEventListener('change', function (e) {
      var t = e.target;
      var card = cardOf(t); if (!card) return;
      if (t.matches('select[data-act="variant"]')) {
        var item = catalogue.getItem(card.getAttribute('data-item'));
        cardVariant[item.id] = t.value;
        var variant = currentVariant(item);
        card.querySelector('.ic-meta').innerHTML = metaHtml(item, variant, !!query.trim());
        refresh();
      } else if (t.matches('input[data-act="qty"]')) {
        var key = card.getAttribute('data-key') || keyOfCard(card);
        var line = inventory.getLine(key);
        var n = parseInt(String(t.value).replace(/[^0-9]/g, ''), 10);
        if (isNaN(n)) { t.value = line ? line.qty : 0; return; }
        if (n < 1) { if (line) removeWithUndo(key); else t.value = 0; return; }
        if (!line && card.getAttribute('data-item')) {
          var it = catalogue.getItem(card.getAttribute('data-item'));
          inventory.add(it.id, currentVariant(it).id, Math.min(MAX, n));
        } else inventory.setQty(key, n);
        var l2 = inventory.getLine(key); if (l2) t.value = l2.qty;
      }
    });
    grid.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.matches('input[data-act="qty"]')) { e.preventDefault(); e.target.blur(); }
    });
    grid.addEventListener('focusin', function (e) { if (e.target.matches('input[data-act="qty"]')) e.target.select(); });

    function selectCategory(id, btn) {
      if (id === ALL) { searchAll = true; }
      else { activeCat = id; searchAll = false; }   // the search text is kept: the category now filters the matches
      if (!query.trim()) searchAll = true;
      render();
      scrollChipIntoView(btn);
      // on a long page, bring the top of the item list back into view so the new category is visible
      var panel = $('catalogue'), top = panel.getBoundingClientRect().top;
      if (top < 0) panel.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
    if (catSelect) catSelect.addEventListener('change', function () {
      selectCategory(catSelect.value, null);
      UI.announce(titleEl.textContent + ', ' + countEl.textContent, 150);
    });
    catList.addEventListener('click', function (e) {
      var b = e.target.closest('.cat-btn'); if (!b) return;
      selectCategory(b.getAttribute('data-cat'), b);
      UI.announce(titleEl.textContent + ', ' + countEl.textContent, 150);
    });

    function setQuery(v) {
      var had = !!query.trim();
      query = v;
      clearBtn.hidden = !v;
      if (v.trim() && !had) searchAll = true;   // a new search starts across all categories
      render();
    }
    input.addEventListener('input', function () {
      clearBtn.hidden = !input.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { setQuery(input.value); }, 120);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) { e.preventDefault(); input.value = ''; setQuery(''); }
      if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchTimer); setQuery(input.value); }
    });
    clearBtn.addEventListener('click', function () { input.value = ''; setQuery(''); input.focus(); });

    $('custom-open').addEventListener('click', function () { ctx.onAddCustom('', $('custom-open')); });
    $('no-results-add').addEventListener('click', function () { ctx.onAddCustom(query.trim(), $('no-results-add')); });
    $('no-results-all').addEventListener('click', function () { searchAll = true; render(); });

    inventory.subscribe(refresh);
    renderCategoryNav();
    render();

    return {
      showCategory: function (id) { activeCat = id; searchAll = false; if (!query.trim()) searchAll = true; render(); },
      getQuery: function () { return query; },
      setQuery: function (v) { input.value = v; setQuery(v); },
      activeCategory: function () { return activeCat; },
      searchScope: function () { return query.trim() ? (searchAll ? 'all' : 'category') : 'none'; },
      refresh: refresh, render: render
    };
  }

  TSE.UICatalogue = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
