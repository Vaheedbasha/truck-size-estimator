/*
 * ui-summary.js - everything that SHOWS the estimate: the persistent bottom action bar (estimated truck size, View 3D Truck,
 * Get Quote), the "Your estimate" sheet (status, volume, capacity, notices, selected-items list) and the feed to the 3D modal.
 * It only displays what estimator.js calculated.
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});
  var Icons = TSE.Icons, UI = TSE.UI, Est = TSE.Estimator;
  var esc = UI.esc;

  function init(ctx) {
    var catalogue = ctx.catalogue, inventory = ctx.inventory, prepared = ctx.prepared;
    var MAX = inventory.MAX_QTY;
    var $ = function (id) { return document.getElementById(id); };

    var list = $('sel-list'), emptyNote = $('sel-empty'), totalEl = $('sel-total');
    var vehicleById = {};
    prepared.vehicles.forEach(function (v) { vehicleById[v.id] = v; });
    var viz = TSE.UIViewer.init({ vehicles: prepared.vehicles }); // 3D modal (loaded on demand), 2D picture as the fallback
    var reviewDlg = $('review-dialog'), bar = $('action-bar');
    var lastEstimate = null;
    var lastAnnounced = '';

    // ---------------- vehicle picker ("compare truck options") ----------------
    var pinned = null; // vehicle id the visitor chose to view, or null = follow the recommendation
    var pickEl = $('vehicle-pick');
    function renderPicker(est) {
      var recId = est ? (est.display.planAdjusted && !est.display.pinned ? est.display.vehicleId : est.recommendation.vehicleId) : null; // the vehicle that will be shown when Auto is on
      var recSingle = est && est.recommendation.kind === 'single';
      var html = '<button type="button" class="pick" data-pick="" aria-pressed="' + (pinned === null) + '"><span class="pick-name">Auto</span><small>Best fit</small></button>';
      html += prepared.vehicles.map(function (v) {
        return '<button type="button" class="pick" data-pick="' + esc(v.id) + '" aria-pressed="' + (pinned === v.id) + '">' +
          '<span class="pick-name">' + esc(v.shortName || v.name) + '</span>' +
          '<small>' + (recSingle && recId === v.id ? 'Suggested' : Est.formatVolume(v.usableVolumeFt3) + ' ft³') + '</small></button>';
      }).join('');
      pickEl.innerHTML = html;
    }
    pickEl.addEventListener('click', function (e) {
      var b = e.target.closest('.pick'); if (!b) return;
      pinned = b.getAttribute('data-pick') || null;
      ctx.onPinChange(pinned);
      var again = pickEl.querySelector('[data-pick="' + (pinned || '') + '"]');
      if (again) again.focus();
    });
    if (!prepared.vehicles.length) pickEl.hidden = true;

    // ---------------- selected list ----------------
    var focusRequest = null; // { key, act }
    function rowHtml(rec) {
      var line = inventory.getLine(rec.key);
      if (!line) return '';
      var dims = Icons.dims(rec.shape);
      var item = line.kind === 'catalogue' ? catalogue.getItem(line.itemId) : null;
      var nameFull = rec.name + (rec.variantLabel ? ', ' + rec.variantLabel : '');
      var variantUi = '';
      if (item && item.variants.length > 1) {
        variantUi = '<div class="sr-variant"><label class="sr-only" for="sv-' + esc(rec.key) + '">' + (item.isBundle ? 'Option' : 'Type or size') + ' of ' + esc(item.name) + '</label>' +
          '<select id="sv-' + esc(rec.key) + '" data-act="variant">' +
          item.variants.map(function (v) { return '<option value="' + esc(v.id) + '"' + (v.id === line.variantId ? ' selected' : '') + '>' + esc(v.label) + '</option>'; }).join('') +
          '</select></div>';
      } else if (rec.variantLabel) {
        variantUi = '<p class="sr-sub">' + esc(rec.variantLabel) + '</p>';
      }
      var tags = [];
      if (rec.isBundle) tags.push('bundle');
      if (rec.fragile) tags.push('fragile');
      if (item && (item.flags || []).indexOf('heavy') !== -1) tags.push('heavy');
      if (rec.restricted) tags.push('restricted');
      if (rec.manualReview) tags.push('manual');
      if (line.kind === 'custom') { tags.push(rec.unknown ? 'unknown' : (rec.approx ? 'approx' : null)); if (line.dismantled) tags.push('dismantled'); }
      var variantSub = (line.kind === 'custom' && (line.weightKg || line.notes)) ? '<p class="sr-sub">' + esc([line.weightKg ? line.weightKg + ' kg (not checked)' : '', line.notes || ''].filter(Boolean).join(' · ')) + '</p>' : '';
      var notes = '';
      if (rec.includes) notes += '<p class="sr-note"><strong>Includes:</strong> ' + esc(rec.includes.join(', ')) + '. Counted once.</p>';
      if (rec.coveredQty) notes += '<p class="sr-note sr-note-info">' + Icons.ui('info') + rec.coveredQty + ' of ' + rec.qty + ' already included in “' + esc(rec.coveredBy) + '”, so ' + (rec.countedQty ? 'only ' + rec.countedQty + ' extra is' : 'it is not') + ' counted.</p>';
      if (rec.note && (rec.restricted || rec.manualReview)) notes += '<p class="sr-note">' + esc(rec.note) + '</p>';
      var vol = rec.unknown ? 'Size unknown' : (rec.approx ? '≈ ' : '') + Est.formatVolume(rec.volumeFt3) + ' ft³';
      return '<li class="sel-row" data-key="' + esc(rec.key) + '">' +
        '<div class="sr-ico ' + dims.toneClass + '">' + Icons.svg(rec.shape) + '</div>' +
        '<div class="sr-main"><p class="sr-name">' + esc(rec.name) + '</p>' + variantUi + variantSub +
        (tags.filter(Boolean).length ? '<div class="tags">' + tags.filter(Boolean).map(UI.tagHtml).join('') + '</div>' : '') + notes + '</div>' +
        '<div class="sr-side"><span class="sr-vol">' + esc(vol) + '</span>' +
        '<div class="sr-controls">' + (line.kind === 'custom' ? '<button type="button" class="icon-btn" data-act="edit-custom" aria-label="Edit ' + esc(nameFull) + '">' + Icons.ui('edit') + '</button>' : '') + UI.stepperHtml(nameFull, line.qty, MAX) +
        '<button type="button" class="icon-btn" data-act="remove" aria-label="Remove ' + esc(nameFull) + ' from list">' + Icons.ui('trash') + '</button></div></div>' +
        '</li>';
    }
    function renderSelected(est) {
      var n = est.lineCount;
      var units = inventory.totalUnits();
      $('sel-count').textContent = units;
      $('sel-count').setAttribute('aria-label', units + (units === 1 ? ' item' : ' items'));
      emptyNote.hidden = n > 0;
      $('sel-clear').disabled = n === 0;
      totalEl.hidden = n === 0;
      if (n) {
        totalEl.innerHTML = '<span>' + est.lineCount + ' line' + (est.lineCount === 1 ? '' : 's') + ', ' + units + (units === 1 ? ' item' : ' items') + '</span>' +
          '<strong>Estimated volume: ' + Est.formatVolume(est.totalVolumeFt3) + ' ft³</strong>';
      }
      UI.keepFocus(list, function () { list.innerHTML = est.lines.map(rowHtml).join(''); }, ['[data-act="inc"]', '[data-act="dec"]']);
      if (focusRequest) {
        var row = list.querySelector('[data-key="' + (root.CSS && CSS.escape ? CSS.escape(focusRequest.key) : focusRequest.key) + '"]');
        var t = row && row.querySelector('[data-act="' + focusRequest.act + '"]');
        if (t) t.focus({ preventScroll: true });
        focusRequest = null;
      }
    }

    list.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]'); if (!btn || btn.disabled) return;
      var row = btn.closest('.sel-row'); var key = row.getAttribute('data-key');
      var act = btn.getAttribute('data-act');
      var line = inventory.getLine(key); if (!line) return;
      if (act === 'inc' || act === 'dec') {
        // a number typed in the box counts even if the visitor pressed + / - without leaving the box first
        var typed = UI.typedQty(btn, line.qty);
        var next = (typed === null ? line.qty : Math.min(MAX, typed)) + (act === 'inc' ? 1 : -1);
        if (next < 1) ctx.onRemoveLine(key); else inventory.setQty(key, next);
      } else if (act === 'remove') ctx.onRemoveLine(key);
      else if (act === 'edit-custom' && ctx.onEditCustom) { reviewDlg.close(); afterReviewClose(); ctx.onEditCustom(key, $('ab-summary')); }
    });
    UI.protectStepper(list);
    list.addEventListener('change', function (e) {
      var t = e.target; var row = t.closest('.sel-row'); if (!row) return;
      var key = row.getAttribute('data-key');
      if (t.matches('select[data-act="variant"]')) {
        var nk = inventory.setVariant(key, t.value);
        if (nk) { focusRequest = { key: nk, act: 'variant' }; renderSelected(lastEstimate || ctx.evaluate()); }
      } else if (t.matches('input[data-act="qty"]')) {
        var n = parseInt(String(t.value).replace(/[^0-9]/g, ''), 10);
        var line = inventory.getLine(key);
        if (isNaN(n)) { t.value = line ? line.qty : 1; return; }
        if (n < 1) { ctx.onRemoveLine(key); return; }
        inventory.setQty(key, n);
      }
    });
    list.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.matches('input[data-act="qty"]')) { e.preventDefault(); e.target.blur(); }
    });
    list.addEventListener('focusin', function (e) { if (e.target.matches('input[data-act="qty"]')) e.target.select(); });

    // ---------------- result panel ----------------
    function stateCopy(est) {
      var d = est.display, rec = est.recommendation, v = vehicleById[d.vehicleId];
      var vName = v ? v.name : 'truck';
      switch (d.state) {
        case 'empty':
          return { icon: 'info', title: 'Ready when you are', text: 'Your estimate will appear here as you add household items.' };
        case 'unavailable':
          return {
            icon: 'help', title: 'Estimate not available yet',
            text: prepared.vehicles.length ? 'We couldn’t calculate this item yet. Edit the item to choose a size, or request a manual estimate with your quote.'
              : 'Truck capacity data could not be loaded, so no recommendation can be shown. You can still request a manual estimate.'
          };
        case 'comfortable':
          return { icon: 'check-circle', title: 'Room available', text: 'There appears to be room available in the ' + vName + '. Final space and payload should be confirmed with the transport provider.' };
        case 'near': {
          var nextV = rec.nextVehicleId && !d.pinned ? vehicleById[rec.nextVehicleId] : null;
          return {
            icon: 'alert', title: 'Near estimated capacity',
            text: 'Your selected items are nearing this vehicle’s estimated capacity.' + (nextV ? ' Compare the ' + nextV.name + ' for more room, or review your items.' : ' Review your items or request a manual assessment.')
          };
        }
        case 'over':
          if (rec.kind === 'multiple') {
            return { icon: 'stop', title: 'More capacity needed', text: 'Your items are about ' + (d.utilisationPercent / 100).toFixed(1) + '× the ' + vName + '’s estimated usable space. A larger vehicle or multiple trucks may be needed; it can be confirmed with the transport provider.' };
          }
          return { icon: 'stop', title: 'More capacity needed', text: 'Your selected items exceed this ' + vName + '’s estimated usable space. Try a larger vehicle' + (rec.vehicleId && vehicleById[rec.vehicleId] ? ' (the ' + vehicleById[rec.vehicleId].name + ' looks suitable)' : '') + ' or request a review for multiple trucks.' };
      }
      return { icon: 'info', title: '', text: '' };
    }

    function recoCopy(est) {
      var rec = est.recommendation, total = Est.formatVolume(est.totalVolumeFt3);
      if (rec.kind === 'none') return { name: 'Not available yet', reason: 'Add items to see which vehicle size looks suitable.' };
      if (rec.kind === 'unavailable') return { name: 'Manual estimate needed', reason: 'We can’t suggest a vehicle without a usable size. Include the item in your quote request and the transport provider can estimate it.' };
      var v = vehicleById[rec.vehicleId];
      if (rec.kind === 'single') {
        var extra = rec.manualReview ? ' Some items need a manual check, so treat this as provisional.' : '';
        var dv = vehicleById[est.display.vehicleId] || v;
        if (est.display.planAdjusted && dv && dv.id !== v.id) {
          return {
            name: dv.name,
            reason: 'The ' + v.name + ' has enough volume (' + Est.formatVolume(v.usableVolumeFt3) + ' ft³ usable for your ' + total + ' ft³), but the 3D loading plan could not give every item a valid place in it. The next size that can is suggested.' + extra
          };
        }
        return {
          name: v.name,
          reason: 'The smallest vehicle class whose estimated usable space (' + Est.formatVolume(v.usableVolumeFt3) + ' ft³) covers your ' + total + ' ft³ load. Class-typical size, not a verified specification; weight is not checked.' + extra +
            (rec.partial ? ' Items without a size are not included.' : '')
        };
      }
      return {
        name: 'More than one vehicle, or a manual survey',
        reason: 'Your estimated ' + total + ' ft³ is more than the ' + v.name + '’s estimated usable ' + Est.formatVolume(v.usableVolumeFt3) + ' ft³. A larger vehicle, more than one truck, or a manual survey may be needed.'
      };
    }

    function noticesHtml(est) {
      var w = est.warnings, out = [];
      var add = function (cls, icon, html) { out.push('<div class="notice ' + cls + '">' + Icons.ui(icon) + '<p>' + html + '</p></div>'); };
      if (est.isEmpty) return '';
      if (w.restricted.length) add('notice-error', 'stop', '<strong>Restricted item' + (w.restricted.length > 1 ? 's' : '') + ':</strong> ' + esc(w.restricted.join(', ')) + '. Fuel, gas and chemicals are not automatically approved for transport. Please confirm with the transport provider.');
      if (w.manualReview.length) add('notice-warn', 'alert', '<strong>Manual check suggested:</strong> ' + esc(w.manualReview.join(', ')) + '. This may need a dimension or handling check before the vehicle is confirmed. Include it in your quote request.');
      if (w.unknown.length) add('notice-warn', 'help', '<strong>No size yet for:</strong> ' + esc(w.unknown.join(', ')) + '. ' + (est.totalVolumeFt3 > 0 ? 'Not included in the volume above.' : 'No volume can be calculated.') + ' Edit the item or request a manual estimate.');
      if (w.approximateCount) add('notice-info', 'info', w.approximateCount + ' custom item' + (w.approximateCount > 1 ? 's use' : ' uses') + ' an approximate size, so the volume is approximate.');
      var plan = ctx.getPlan ? ctx.getPlan() : null;
      if (plan && plan.kind === 'adjusted') {
        add('notice-warn notice-plan', 'alert', '<strong>3D loading check:</strong> the ' + esc(plan.fromName) + ' has enough volume, but ' + plan.overflowCount + (plan.overflowCount === 1 ? ' item has' : ' items have') + ' no valid place in it' + (plan.tooBig ? ' (' + plan.tooBig + ' too large for its cargo space)' : '') + '. The ' + esc(plan.toName) + ' is suggested instead.');
      } else if (plan && plan.kind === 'multiple') {
        add('notice-warn notice-plan', 'alert', '<strong>3D loading check:</strong> even the ' + esc(plan.fromName) + ' cannot take everything: ' + plan.overflowCount + (plan.overflowCount === 1 ? ' item is' : ' items are') + ' left over' + (plan.extraName ? ' (they could go in a second vehicle such as the ' + esc(plan.extraName) + ')' : '') + '. Plan an additional vehicle or ask for a manual survey.');
      }
      add('notice-info notice-weight', 'scale', 'Weight has not been checked. Vehicle sizes are class-typical, not verified specifications.');
      return out.join('');
    }

    function setText(id, v) { $(id).textContent = v; }
    /** Whole-number percentage that never contradicts the status word (e.g. 100.3 % is shown as 101 % when over). */
    function pctShown(state, p) {
      var r = Math.round(p);
      if (state === 'over' && r <= 100) r = 101;
      if (state !== 'over' && r > 100) r = 100;
      if (state === 'comfortable' && r >= est0.nearThreshold * 100) r = Math.ceil(est0.nearThreshold * 100) - 1;
      return r;
    }
    var est0 = { nearThreshold: prepared.nearThreshold };

    function render(est) {
      lastEstimate = est;
      var d = est.display, v = vehicleById[d.vehicleId];
      var state = d.state, hasNumbers = state === 'comfortable' || state === 'near' || state === 'over';

      renderSelected(est);
      renderPicker(est);

      // status
      var copy = stateCopy(est);
      var st = $('status');
      st.setAttribute('data-state', state);
      $('status-use').setAttribute('href', '#i-' + copy.icon);
      setText('status-title', copy.title);
      setText('status-text', copy.text);

      // metrics
      var partialNote = est.recommendation.partial ? 'excludes items with unknown size' : (est.warnings.approximateCount ? 'includes approximate sizes' : 'illustrative estimate');
      if (est.isEmpty) {
        setText('m-volume', '–'); setText('m-volume-unit', ''); setText('m-volume-sub', 'Add items to begin');
      } else if (est.totalVolumeFt3 <= 0) {
        setText('m-volume', 'Unknown'); setText('m-volume-unit', ''); setText('m-volume-sub', 'No size available yet');
      } else {
        setText('m-volume', (est.warnings.approximateCount ? '≈ ' : '') + Est.formatVolume(est.totalVolumeFt3)); setText('m-volume-unit', ' ft³'); setText('m-volume-sub', partialNote);
      }
      var pct = d.utilisationPercent;
      if (hasNumbers) {
        setText('m-percent', String(pctShown(state, pct))); setText('m-percent-unit', '%');
        setText('m-percent-sub', 'of the ' + v.name);
      } else {
        setText('m-percent', '–'); setText('m-percent-unit', ''); setText('m-percent-sub', est.isEmpty ? 'Shown once you add items' : 'Not available');
      }
      var meter = $('meter');
      meter.setAttribute('data-state', state);
      var shown = hasNumbers ? Math.min(100, pct) : 0;
      $('meter-fill').style.width = shown.toFixed(1) + '%';
      meter.setAttribute('aria-valuenow', String(Math.round(shown)));
      meter.setAttribute('aria-valuetext', hasNumbers
        ? pctShown(state, pct) + ' percent of the ' + v.name + '’s estimated capacity. ' + copy.title
        : 'No estimate yet');
      meter.querySelector('.meter-mark').style.left = (est.nearThreshold * 100) + '%';
      var mid = meter.querySelector('.meter-scale span:nth-child(2)');
      mid.textContent = Math.round(est.nearThreshold * 100) + '%'; mid.style.left = (est.nearThreshold * 100) + '%';

      // recommendation
      var rc = recoCopy(est);
      setText('reco-name', rc.name); setText('reco-reason', rc.reason);
      $('reco').setAttribute('data-kind', est.recommendation.kind);

      // notices
      $('notices').innerHTML = noticesHtml(est);

      // truck
      var excess = hasNumbers && state === 'over' ? Est.formatVolume(Math.max(0, est.totalVolumeFt3 - v.usableVolumeFt3)) + ' ft³' : '';
      viz.update({
        vehicle: v || null, blocks: est.blocks, state: state, percent: pct || 0, excessText: excess,
        emptyText: 'Add items to load the vehicle', unavailableText: 'No estimate available yet'
      });

      // honest checks list in the estimate sheet
      var plan0 = ctx.getPlan ? ctx.getPlan() : null;
      var nonEmpty = est.lineCount > 0;
      setText('chk-volume', !nonEmpty ? '–' : (est.totalVolumeFt3 > 0 ? 'Estimated ' + Est.formatVolume(est.totalVolumeFt3) + ' ft³' + (hasNumbers ? ', about ' + pctShown(state, pct) + '% of the ' + v.name : '') + '.' : 'No size known yet.'));
      var fitText = 'Not checked yet.';
      if (!nonEmpty) fitText = '–';
      else if (plan0 && plan0.kind === 'ok') fitText = 'Every one of the ' + plan0.count + ' items has a place in the ' + plan0.fromName + ' in the 3D plan. This is a visual check, not proof of real-world fit.';
      else if (plan0 && plan0.kind === 'adjusted') fitText = plan0.overflowCount + (plan0.overflowCount === 1 ? ' item has' : ' items have') + ' no valid place in the ' + plan0.fromName + '; the ' + plan0.toName + ' is suggested.';
      else if (plan0 && plan0.kind === 'multiple') fitText = plan0.overflowCount + (plan0.overflowCount === 1 ? ' item is' : ' items are') + ' left over even in the ' + plan0.fromName + '. More than one vehicle may be needed.';
      else if (state === 'unavailable') fitText = 'Not checked: some items have no size.';
      setText('chk-fit', fitText);
      var conf = 'Approximate: item sizes are packed-size estimates and vehicle sizes are class-typical.';
      if (est.warnings.approximateCount) conf += ' Some custom items use a rough size.';
      if (est.warnings.unknown.length) conf += ' Items without a size are not included.';
      setText('chk-confidence', conf);
      $('rv-3d').disabled = !nonEmpty; $('rv-quote').disabled = !nonEmpty;

      // bottom action bar: estimated vehicle size, View in 3D, Get Quote
      var canQuote = est.lineCount > 0, units = inventory.totalUnits();
      $('quote-btn').disabled = !canQuote;
      $('view3d-btn').disabled = !canQuote;
      $('edit-btn').disabled = !canQuote;
      var veh, sub;
      if (!canQuote) { veh = 'Add items to begin'; sub = 'No items yet'; }
      else if (est.recommendation.kind === 'multiple' && !d.pinned) { veh = 'More than one vehicle'; sub = units + (units === 1 ? ' item' : ' items') + ' · ' + Est.formatVolume(est.totalVolumeFt3) + ' ft³ · more than the ' + (v ? v.shortName : 'largest') + ' holds'; }
      else if (!d.pinned && ctx.getPlan && ctx.getPlan() && ctx.getPlan().kind === 'multiple') { var pl = ctx.getPlan(); veh = 'More than one vehicle'; sub = units + (units === 1 ? ' item' : ' items') + ' · ' + pl.overflowCount + (pl.overflowCount === 1 ? ' item' : ' items') + ' left over after the ' + (v ? v.shortName : 'largest') + ' is full'; }
      else if (state === 'unavailable') { veh = 'Size needed'; sub = units + (units === 1 ? ' item' : ' items') + ' · some sizes unknown'; }
      else {
        veh = v ? v.name : 'Vehicle';
        sub = units + (units === 1 ? ' item' : ' items') + ' · ' + Est.formatVolume(est.totalVolumeFt3) + ' ft³' + (hasNumbers ? ' · ' + pctShown(state, pct) + '% full' : '') +
          (d.planAdjusted ? ' · 3D check' : '') + (d.pinned ? ' · chosen by you' : '');
      }
      setText('ab-vehicle', veh); setText('ab-sub', sub);
      setText('v3-est-name', veh); setText('v3-est-sub', sub); setText('v3-est-why', rc.reason);   // the desktop panel shows the same summary, not as a button
      bar.setAttribute('data-state', canQuote ? state : 'empty');

      // screen-reader summary (only when something meaningful changed)
      var msg = est.isEmpty ? 'Your list is empty.' :
        inventory.totalUnits() + ' items selected. ' +
        (est.totalVolumeFt3 > 0 ? 'Estimated volume ' + Est.formatVolume(est.totalVolumeFt3) + ' cubic feet. ' : '') +
        copy.title + '. ' + (est.recommendation.kind === 'single' ? 'Suggested: ' + rc.name + '.' : '');
      if (msg !== lastAnnounced) { lastAnnounced = msg; UI.announce(msg, 900); }
    }

    // ---------------- review sheet ----------------
    var reviewOpener = null;
    function openReview(opener) {
      if (reviewDlg.open) return;
      reviewOpener = opener || document.activeElement;
      reviewDlg.showModal();
    }
    function afterReviewClose() {
      var o = reviewOpener; reviewOpener = null;
      if (o && o.focus && document.contains(o)) o.focus({ preventScroll: true });
    }
    reviewDlg.addEventListener('click', function (e) {
      if (e.target === reviewDlg || (e.target.closest && e.target.closest('[data-close]'))) { reviewDlg.close(); afterReviewClose(); }
    });
    reviewDlg.addEventListener('close', afterReviewClose);
    $('ab-summary').addEventListener('click', function () { openReview($('ab-summary')); });
    // the pencil in the bottom bar: open the sheet straight at the list of added items (change quantities, remove, edit custom items)
    $('edit-btn').addEventListener('click', function () {
      openReview($('edit-btn'));
      var sel = $('selected');
      if (sel) { sel.scrollIntoView({ block: 'start' }); sel.focus({ preventScroll: true }); }
    });
    $('rv-edit').addEventListener('click', function () { reviewDlg.close(); afterReviewClose(); });
    $('rv-3d').addEventListener('click', function () { reviewDlg.close(); reviewOpener = null; viz.open($('view3d-btn')); });
    $('rv-quote').addEventListener('click', function () { reviewDlg.close(); reviewOpener = null; $('quote-btn').click(); });
    $('view3d-btn').addEventListener('click', function () { viz.open($('view3d-btn')); });

    // keep the page's bottom padding equal to the bar height so the bar never covers an item control
    function syncBarHeight() { document.documentElement.style.setProperty('--bar-h', (bar.hidden ? 0 : Math.ceil(bar.getBoundingClientRect().height)) + 'px'); }
    if (root.ResizeObserver) new root.ResizeObserver(syncBarHeight).observe(bar);
    root.addEventListener('resize', syncBarHeight);
    new MutationObserver(syncBarHeight).observe(bar, { attributes: true, attributeFilter: ['hidden'] });
    syncBarHeight();

    return {
      render: render,
      viewer: function () { return viz; },
      openReview: function (opener) { openReview(opener); },
      setPlan: function () { /* plan is read through ctx.getPlan() on render */ },
      getPinned: function () { return pinned; },
      setPinned: function (id) { pinned = id; },
      copyFor: function (est) { return { status: stateCopy(est), reco: recoCopy(est) }; }
    };
  }

  TSE.UISummary = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
