/*
 * app.js - start-up and coordination.
 * Loads the data embedded by index.php, creates the modules and connects them:
 *   inventory changes -> estimator.evaluate() -> UI (list, panel, truck)
 * Also owns the small dialogs (custom item, confirm) and the demo-inventory shortcuts.
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});
  var UI = TSE.UI, Est = TSE.Estimator;
  var $ = function (id) { return document.getElementById(id); };

  function showAppError(msg) {
    var box = $('app-error');
    if (!box) return;
    var est = $('estimator'); if (est) est.classList.add('is-broken'); // hides the steps that cannot work
    if (!msg) return;               // the server already printed the reason (data file errors)
    $('app-error-text').innerHTML = '<strong>The estimator could not start.</strong> ' + UI.esc(msg);
    box.hidden = false;
  }

  // ---------------- demo inventories (prototype shortcuts) ----------------
  // [itemId, variantId, quantity]. Volumes are checked by tests/estimator-tests.js so each label stays true.
  var DEMOS = [
    { id: 'small', label: 'Small load', hint: 'Comfortable in the mini goods vehicle', items: [
      ['mattress', 'single', 1], ['bed', 'single-dismantled', 1], ['carton', 'medium', 4], ['carton', 'large', 2],
      ['suitcase', 'medium', 2], ['television', '32-inch', 1], ['clothes-packed', 'one-wardrobe-load', 1]] },
    { id: 'medium', label: 'Medium load', hint: 'Comfortable in the 14 ft truck', items: [
      ['bed', 'double-dismantled', 1], ['mattress', 'double', 1], ['wardrobe', '3-door-dismantled', 1], ['sofa', '3-seater', 2],
      ['refrigerator', 'double-door', 1], ['washing-machine', 'top-load-fully-automatic', 1], ['television', '43-inch', 1],
      ['carton', 'medium', 8], ['carton', 'large', 4], ['utensil-carton', 'medium', 3], ['dining-table', '4-seater-dismantled', 1]] },
    { id: 'near', label: 'Near capacity', hint: 'Near capacity by volume in the 14 ft truck (the 3D check may suggest more room)', items: [
      ['bed', 'queen-assembled', 1], ['mattress', 'queen', 1], ['sofa', '3-seater', 1], ['refrigerator', 'double-door', 1],
      ['washing-machine', 'front-load', 1], ['television', '55-inch', 1], ['carton', 'medium', 10], ['carton', 'large', 6], ['utensil-carton', 'large', 2],
      ['wardrobe', '2-door-compact-assembled', 1]] },
    { id: 'over', label: 'Over capacity', hint: 'More than the largest (22 ft) truck', items: [
      ['bed-set-bundle', 'king-bed-mattress-2-bedside-tables', 2], ['wardrobe', '4-door-large-assembled', 2], ['steel-almirah', 'large', 1],
      ['sofa-set-bundle', '3-2-1', 1], ['refrigerator', 'side-by-side', 1], ['deep-freezer', '300-l', 1], ['washing-machine', 'front-load', 1],
      ['split-ac', '1-5-ton', 3], ['television', '65-inch', 2], ['dining-set-bundle', '8-seater-table-8-chairs', 1], ['crockery-unit', 'standard', 1],
      ['carton', 'large', 10], ['utensil-carton', 'large', 4]] },
    { id: 'special', label: 'Special items', hint: 'Piano, safe, LPG cylinder, glass', items: [
      ['upright-piano', 'upright-piano', 1], ['safe-locker', 'large-godrej-type-safe', 1], ['lpg-gas-cylinder', 'domestic-14-2-kg', 1],
      ['glass-table', 'large-glass-dining-table', 1], ['sofa', '3-seater', 1], ['carton', 'medium', 6]] },
    { id: 'dismantled', label: 'Dismantled furniture', hint: 'Bed, wardrobe and table shown as flat parts', items: [
      ['bed', 'queen-dismantled', 1], ['mattress', 'queen', 1], ['wardrobe', '3-door-dismantled', 1], ['dining-table', '6-seater-dismantled', 1],
      ['carton', 'medium', 6], ['suitcase', 'medium', 2]] },
    { id: 'fragile', label: 'Fragile items', hint: 'Nothing is stacked on TVs, glass or mirrors', items: [
      ['television', '55-inch', 1], ['glass-table', 'small-glass-table', 1], ['standing-mirror', 'full-length', 1], ['crockery-and-glass-carton', 'dish-pack', 3],
      ['carton', 'medium', 10], ['carton', 'large', 4], ['refrigerator', 'double-door', 1], ['sofa', '2-seater', 1]] },
    { id: 'unknown', label: 'Unknown size', hint: 'Only an item with no size yet', custom: [{ name: 'Antique wooden swing', qty: 1, sizeId: 'unknown', fragile: true }], items: [] }
  ];

  function start() {
    var dataEl = $('tse-data');
    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { showAppError('The data block on the page could not be read.'); return; }
    if (data.errors && data.errors.length) { showAppError(''); return; }
    if (!data.items || !data.categories || !data.vehicles || !data.presets) { showAppError('A data file is missing.'); return; }

    UI.initToast();
    var catalogue = TSE.Catalogue.create(data.items, data.categories);
    if (catalogue.problems.length && root.console) console.warn('Catalogue problems:', catalogue.problems);
    var prepared = Est.prepareVehicles(data.vehicles);
    if (prepared.problems.length && root.console) console.warn('Vehicle problems:', prepared.problems);
    var inventory = TSE.Inventory.create(catalogue);
    var presetProblems = TSE.UIHouseSize.validate(data.presets);
    if (presetProblems.length && root.console) console.warn('House-size preset problems:', presetProblems);

    var pinnedVehicleId = null;
    // 3D loading check (runs in the background once the small packing module has loaded): can the volume-based vehicle
    // physically take every item? planVehicleId / planNote carry the answer back into the estimate.
    var planVehicleId = null, planNote = null, planTimer = null;
    function evaluate() { return Est.evaluate(inventory.getLines(), catalogue, prepared, { pinnedVehicleId: pinnedVehicleId, planVehicleId: planVehicleId }); }
    function vehicleIndex(id) { for (var i = 0; i < prepared.vehicles.length; i++) if (prepared.vehicles[i].id === id) return i; return -1; }
    function runPlan() {
      var P = TSE.Packing; if (!P) return;
      var base = Est.evaluate(inventory.getLines(), catalogue, prepared, {});
      var rk = base.recommendation, list = prepared.vehicles, nextId = null, note = null;
      if (!base.isEmpty && base.blocks.length && list.length && (rk.kind === 'single' || rk.kind === 'multiple')) {
        var start = vehicleIndex(rk.vehicleId);
        if (start >= 0) {
          var plan = P.planVehicles(base.blocks, list, start);
          var from = list[start];
          if (plan.fitIndex === start) note = { kind: 'ok', fromName: from.name, count: base.blocks.length };
          if (plan.fitIndex > start) {
            nextId = plan.fitVehicleId;
            note = { kind: 'adjusted', fromName: from.name, toName: list[plan.fitIndex].name, overflowCount: plan.tried[0].overflow, tooBig: plan.tried[0].tooBig };
          } else if (plan.fitIndex < 0 && plan.largestOverflow) {
            var big = list[list.length - 1];
            if (start < list.length - 1) nextId = big.id;
            var ex = plan.extra && plan.extra.vehicleId ? list[vehicleIndex(plan.extra.vehicleId)] : null;
            note = { kind: 'multiple', fromName: big.name, overflowCount: plan.largestOverflow.count, tooBig: plan.largestOverflow.tooBig, extraName: ex ? ex.name : '' };
          }
        }
      }
      if (nextId !== planVehicleId || JSON.stringify(note) !== JSON.stringify(planNote)) { planVehicleId = nextId; planNote = note; summary.render(evaluate()); }
    }
    function schedulePlan() { clearTimeout(planTimer); planTimer = setTimeout(runPlan, 250); }

    // ----- remove with an Undo toast -----
    function removeLine(key) {
      var line = inventory.getLine(key); if (!line) return;
      var name = line.kind === 'custom' ? line.name : (catalogue.getItem(line.itemId) || {}).name || 'item';
      var listEl = $('sel-list');
      var inList = listEl.contains(document.activeElement);
      // remember the neighbouring row so keyboard focus lands there afterwards
      var rows = Array.prototype.map.call(listEl.querySelectorAll('.sel-row'), function (r) { return r.getAttribute('data-key'); });
      var at = rows.indexOf(key);
      var neighbour = rows[at + 1] || rows[at - 1] || null;
      var saved = JSON.parse(JSON.stringify(line)), index = inventory.indexOfKey(key);
      inventory.remove(key);
      // Undo puts back only this line, so anything changed since then is kept
      UI.toast('Removed “' + name + '”.', { actionLabel: 'Undo', onAction: function () { inventory.reinsert(saved, index); UI.announce('Restored ' + name + '.', 100); } });
      UI.announce('Removed ' + name + '. ' + inventory.totalUnits() + ' items left.', 100);
      if (inList) {
        var target = neighbour && listEl.querySelector('[data-key="' + (root.CSS && CSS.escape ? CSS.escape(neighbour) : neighbour) + '"] [data-act="remove"]');
        (target || $('selected')).focus({ preventScroll: true });
      }
    }

    // ----- UI modules -----
    var summary = TSE.UISummary.init({
      catalogue: catalogue, inventory: inventory, prepared: prepared, evaluate: evaluate,
      onRemoveLine: removeLine, onEditCustom: function (key, btn) { openCustom('', btn, key); }, getPlan: function () { return planNote; },
      onPinChange: function (id) { pinnedVehicleId = id; summary.render(evaluate()); }
    });
    var cat = TSE.UICatalogue.init({ catalogue: catalogue, inventory: inventory, onAddCustom: openCustom, onEditCustom: function (key, btn) { openCustom('', btn, key); }, onRemoveLine: removeLine });
    var vehicleName = function (id) { var v = prepared.vehicles.filter(function (x) { return x.id === id; })[0]; return v ? v.name : 'Truck'; };
    var houseSize = TSE.UIHouseSize.init({ inventory: inventory, catalogue: catalogue, presets: data.presets });
    var quote = TSE.QuoteForm.init({
      inventory: inventory, getEstimate: evaluate, getHouseSize: houseSize.getChosen, getPlanNote: function () { return planNote; }, endpoint: document.body.getAttribute('data-quote-endpoint') || 'api/quote.php', vehicleName: vehicleName, catalogueVersion: catalogue.version,
      onNewEstimate: function () { pinnedVehicleId = null; summary.setPinned(null); houseSize.reset(); planVehicleId = null; planNote = null; summary.render(evaluate()); var r = document.querySelector('#size-grid input[type=radio]'); if (r) r.focus(); }
    });

    inventory.subscribe(function () { summary.render(evaluate()); schedulePlan(); });
    summary.render(evaluate());
    if (TSE.Packing) schedulePlan(); else root.addEventListener('tse-pack-ready', schedulePlan, { once: true });

    // ----- buttons -----
    $('quote-btn').addEventListener('click', function () { quote.open($('quote-btn')); });

    // ----- start over (confirm when the list is large) -----
    var confirmDlg = $('confirm-dialog');
    function clearAll() {
      var snap = inventory.snapshot(), n = inventory.totalUnits();
      inventory.clear();
      pinnedVehicleId = null; summary.setPinned(null); summary.render(evaluate());
      UI.toast('Removed all ' + n + ' items.', { actionLabel: 'Undo', onAction: function () { inventory.restore(snap); } });
    }
    $('sel-clear').addEventListener('click', function () {
      var lines = inventory.getLines().length;
      if (lines >= 4) {
        $('confirm-text').textContent = 'This removes all ' + inventory.totalUnits() + ' items (' + lines + ' lines) from your list. You can undo this straight afterwards.';
        confirmDlg.showModal();
      } else clearAll();
    });
    $('confirm-yes').addEventListener('click', function () { confirmDlg.close(); clearAll(); });
    $('confirm-no').addEventListener('click', function () { confirmDlg.close(); });
    UI.closeOnBackdrop(confirmDlg);

    // ----- custom item dialog -----
    var customDlg = $('custom-dialog'), customForm = $('custom-form');
    var cEls = { name: $('c-name'), qty: $('c-qty'), l: $('c-l'), w: $('c-w'), h: $('c-h'), fragile: $('c-fragile'), oversized: $('c-oversized'), dismantled: $('c-dismantled'), weight: $('c-weight'), notes: $('c-notes') };
    var customEditKey = null, customOpener = null;
    var cErr = { name: $('c-name-err'), qty: $('c-qty-err'), size: $('c-size-err'), dims: $('c-dims-err'), weight: $('c-weight-err') };
    $('c-sizes').innerHTML = catalogue.customSizePresets.map(function (p, i) {
      var vol = typeof p.volumeFt3 === 'number' ? '≈ ' + p.volumeFt3 + ' ft³' : 'Details needed';
      return '<label class="size-opt"><input type="radio" name="c-size" value="' + UI.esc(p.id) + '"' + (p.id === 'medium' ? ' checked' : '') + '>' +
        '<span class="size-card"><strong>' + UI.esc(p.label) + '</strong><small>' + UI.esc(p.example) + '</small><em>' + vol + '</em></span></label>';
    }).join('');
    /** Open the custom-item dialog to add an item, or (editKey given) to edit one already in the list. */
    function openCustom(prefill, opener, editKey) {
      customForm.reset();
      customEditKey = editKey || null; customOpener = opener || null;
      Object.keys(cErr).forEach(function (k) { cErr[k].hidden = true; cErr[k].textContent = ''; });
      [cEls.name, cEls.qty, cEls.l, cEls.w, cEls.h, cEls.weight].forEach(function (el) { el.removeAttribute('aria-invalid'); });
      customForm.querySelector('input[name="c-size"][value="medium"]').checked = true;
      cEls.name.value = prefill || '';
      var line = customEditKey ? inventory.getLine(customEditKey) : null;
      if (line && line.kind === 'custom') {
        cEls.name.value = line.name; cEls.qty.value = line.qty;
        if (line.dimsIn) { cEls.l.value = line.dimsIn.l; cEls.w.value = line.dimsIn.w; cEls.h.value = line.dimsIn.h; }
        else { var r = customForm.querySelector('input[name="c-size"][value="' + line.sizeId + '"]'); if (r) r.checked = true; }
        cEls.fragile.checked = !!line.fragile; cEls.dismantled.checked = !!line.dismantled; cEls.oversized.checked = !!line.oversized;
        cEls.weight.value = line.weightKg || ''; cEls.notes.value = line.notes || '';
      } else customEditKey = null;
      $('custom-title').textContent = customEditKey ? 'Edit custom item' : 'Add a custom item';
      $('custom-submit').querySelector('span').textContent = customEditKey ? 'Save changes' : 'Add to my list';
      customDlg.showModal();
      cEls.name.focus();
    }
    customForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var sizeInput = customForm.querySelector('input[name="c-size"]:checked');
      var spec = {
        name: cEls.name.value, qty: cEls.qty.value, sizeId: sizeInput ? sizeInput.value : '',
        dimsIn: { l: cEls.l.value, w: cEls.w.value, h: cEls.h.value }, fragile: cEls.fragile.checked, oversized: cEls.oversized.checked,
        dismantled: cEls.dismantled.checked, weightKg: cEls.weight.value, notes: cEls.notes.value
      };
      var res = customEditKey ? inventory.updateCustom(customEditKey, spec) : inventory.addCustom(spec);
      var map = { name: cEls.name, qty: cEls.qty, size: customForm.querySelector('input[name="c-size"]'), dims: cEls.l, weight: cEls.weight };
      var firstBad = null;
      Object.keys(cErr).forEach(function (k) {
        var msg = res.errors[k];
        cErr[k].textContent = msg || ''; cErr[k].hidden = !msg;
        if (map[k] && k !== 'size') { if (msg) map[k].setAttribute('aria-invalid', 'true'); else map[k].removeAttribute('aria-invalid'); }
        if (msg && !firstBad) firstBad = map[k];
      });
      if (!res.ok) { if (firstBad) firstBad.focus(); UI.announce('Please fix the highlighted fields.', 100); return; }
      var line = inventory.getLine(res.key);
      var wasEdit = !!customEditKey;
      customDlg.close(); afterCustomClose();
      if (res.merged) UI.toast('“' + line.name + '” is already in your list, so its quantity is now ' + line.qty + '.');
      else UI.toast((wasEdit ? 'Saved changes to “' : 'Added “') + line.name + '”' + (line.approx ? ' (approximate size).' : '.'));
      UI.announce((wasEdit ? 'Saved ' : 'Added custom item ') + line.name + '.', 200);
    });
    // soft hint: the catalogue may already have this item with a standard size (the custom item is still allowed)
    cEls.name.addEventListener('input', function () {
      var hint = $('c-name-hint'), n = catalogue.norm(cEls.name.value), hit = null;
      if (n.length >= 3) catalogue.items.some(function (it) { if (catalogue.norm(it.name) === n) { hit = it; return true; } return false; });
      hint.hidden = !hit;
      hint.textContent = hit ? 'The catalogue already has “' + hit.name + '” with standard sizes. Search for it to use those, or continue to add your own.' : '';
    });
    function afterCustomClose() {
      var o = customOpener; customOpener = null;
      if (o && o.focus && document.contains(o)) o.focus({ preventScroll: true });
    }
    customDlg.addEventListener('close', afterCustomClose);
    UI.closeOnBackdrop(customDlg);
    customDlg.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-close]')) customDlg.close(); });

    // ----- demo shortcuts -----
    var demoBox = $('demo-buttons');
    demoBox.innerHTML = DEMOS.map(function (d) {
      return '<button type="button" class="btn btn-secondary btn-sm" data-demo="' + d.id + '" title="' + UI.esc(d.hint) + '">' + UI.esc(d.label) + '</button>';
    }).join('') + '<button type="button" class="btn btn-text btn-sm" data-demo="">Empty</button>';
    demoBox.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-demo]'); if (!b) return;
      var id = b.getAttribute('data-demo');
      var d = DEMOS.filter(function (x) { return x.id === id; })[0];
      pinnedVehicleId = null; summary.setPinned(null);
      houseSize.ensureStarted();
      inventory.load(d ? d.items : []);
      if (d && d.custom) d.custom.forEach(function (c) { inventory.addCustom(c); });
      UI.toast(d ? 'Loaded demo: ' + d.label + ' (' + d.hint.toLowerCase() + ').' : 'List emptied.');
    });

    // ----- responsive helpers -----
    var mq = root.matchMedia('(min-width: 1024px)');

    // hide the bottom bar while a text field is focused on a phone, so the keyboard never covers inputs
    var typing = function (el) { return el && el.matches && el.matches('input:not([type=checkbox]):not([type=radio]), textarea, select'); };
    document.addEventListener('focusin', function (e) { if (typing(e.target) && !mq.matches) document.body.classList.add('kb-open'); });
    document.addEventListener('focusout', function (e) {
      if (!typing(e.target)) return;
      setTimeout(function () { if (!typing(document.activeElement)) document.body.classList.remove('kb-open'); }, 60);
    });

    // handle for developers / automated checks (not used by the page itself)
    TSE.app = { viewer: summary.viewer, houseSize: houseSize, presets: data.presets, catalogue: catalogue, inventory: inventory, prepared: prepared, evaluate: evaluate, summary: summary, catalogueUI: cat, quote: quote, demos: DEMOS };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
