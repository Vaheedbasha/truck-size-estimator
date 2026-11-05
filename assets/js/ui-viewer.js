/*
 * ui-viewer.js - the 3D truck viewer: a permanent live panel beside the inventory on desktop (1024px and wider) and a
 * full-screen dialog on phones and tablets. It is one viewer: the same panel (canvas, controls, capacity summary) is moved
 * between the desktop dock and the dialog, so there is only ever one WebGL scene. On desktop the dialog is the optional
 * "Expand view" for a closer look; closing it puts the panel back in the dock.
 *
 * The 3D module (Three.js) is loaded the first time the viewer is needed (the desktop panel showing, or the dialog opening), so the estimator itself stays light.
 * Controls are limited to Rotate (auto-turn on/off; dragging also rotates), Zoom in, Zoom out, Reset view and Close.
 * The modal is a native <dialog>: focus is trapped, Esc closes it, the page behind is inert, focus returns to the opener.
 * If WebGL or the 3D module is unavailable the 2D illustration and a text summary are shown, with a "Try again" button.
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});
  var UI = TSE.UI, esc = UI.esc;

  function init(ctx) {
    ctx = ctx || {};
    var $ = function (id) { return document.getElementById(id); };
    var dlg = $('viewer-dialog'), stage = $('truck-stage'), controls = $('v3-controls'), fallback = $('v3-fallback');
    var shell = $('v3-shell'), slot = $('v3-slot'), dock = $('v3-dock');
    var desk = root.matchMedia ? root.matchMedia('(min-width: 1024px)') : { matches: false };
    var docked = false;
    var v3 = null, viz2d = null, mode = 'none', lastModel = null, lastStats = null, opener = null, loading = false, retryCount = 0, dirty = true;
    var coarse = !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches);
    var vehicles = ctx.vehicles || [];

    $('v3-hint').textContent = coarse ? 'Drag with one finger to turn the view. Pinch to zoom.' : 'Drag to turn the view. Scroll or use the zoom buttons.';

    // ---------------- where the panel lives ----------------
    /** The desktop panel is "active" while it is on screen (the workspace is open at 1024px or wider). */
    function dockShown() { return !!dock && desk.matches && dock.getClientRects().length > 0; }
    function isActive() { return dlg.open || (docked && dockShown()); }
    /**
     * On desktop there is no bottom bar. Everything the "Your estimate" sheet shows is laid out under the 3D view instead:
     * the truck-size row goes above the view, and the notices, the selected-items list and the Get Quote button go below it.
     * These are the same elements (same ids and handlers), moved, so nothing is duplicated and nothing else has to know where
     * they are. On phones and tablets they go back into the sheet and the fixed bottom bar.
     */
    function placeDetail(inPanel) {
      var stack = document.querySelector('#review-dialog .sheet-stack'), bar = $('action-bar');
      var pick = $('vehicle-pick'), notices = $('notices'), selected = $('selected');
      var pSlot = $('v3-pick-slot'), dSlot = $('v3-detail-slot'), aSlot = $('v3-actions-slot'), info = $('v3-info');
      if (!stack || !bar || !pick || !notices || !selected || !pSlot || !dSlot || !aSlot) return;
      var actions = bar.querySelector('.ab-actions') || aSlot.querySelector('.ab-actions'), inner = bar.querySelector('.ab-inner');
      var tail = stack.querySelector('.disclaimer-short');
      if (!actions || !inner) return;
      if (inPanel) {
        if (pick.parentNode !== pSlot) pSlot.appendChild(pick);
        if (notices.parentNode !== dSlot) dSlot.appendChild(notices);
        if (selected.parentNode !== dSlot) dSlot.appendChild(selected);
        if (actions.parentNode !== aSlot) aSlot.appendChild(actions);
      } else {
        if (pick.parentNode !== stack) stack.insertBefore(pick, stack.firstChild);
        if (notices.parentNode !== stack) stack.insertBefore(notices, tail);
        if (selected.parentNode !== stack) stack.insertBefore(selected, tail);
        if (actions.parentNode !== inner) inner.appendChild(actions);
      }
      info.classList.toggle('in-panel', !!inPanel);
      shell.classList.toggle('has-detail', !!inPanel);
    }
    function setTitles() {
      $('v3-title').textContent = docked ? 'Your load in 3D' : '3D truck preview';
    }
    function mountTo(intoDock) {
      var target = intoDock ? dock : slot;
      if (!target) return;
      if (shell.parentNode !== target) { target.appendChild(shell); if (v3) v3.refresh(); }
      docked = !!intoDock;
      shell.classList.toggle('is-docked', docked);
      setTitles();
    }
    /** Called when the screen size changes or the workspace appears: dock the panel on desktop, otherwise keep it in the dialog. */
    function syncPlace() {
      placeDetail(desk.matches && !!dock);
      if (dlg.open) return;
      if (desk.matches && dock) {
        mountTo(true);
        if (dockShown()) {
          if (lastModel) renderInfo(lastModel, lastStats);
          if (v3) { v3.refresh(); if (dirty) push(); } else if (mode === '2d') push(); else start();
        }
      } else {
        if (v3) v3.setAutoRotate(false);
        setPressed(controls.querySelector('[data-act="rotate"]'), false);
        mountTo(false);
      }
    }

    // ---------------- text summary (always available, also when WebGL is not) ----------------
    function ftText(v) {
      var d = v.internalDimensionsFt; return d.length + ' × ' + d.width + ' × ' + d.height + ' ft internal (class-typical, unverified)';
    }
    function nextLarger(v) {
      for (var i = 0; i < vehicles.length; i++) if (vehicles[i].usableVolumeFt3 > v.usableVolumeFt3 + 1e-9) return vehicles[i];
      return null;
    }
    function groupedItems(blocks) {
      var order = [], map = {};
      blocks.forEach(function (b) {
        var k = b.label || b.visualType;
        if (!map[k]) { map[k] = 0; order.push(k); }
        map[k] += 1;
      });
      return order.map(function (k) { return k + (map[k] > 1 ? ' × ' + map[k] : ''); });
    }
    function renderInfo(m, stats) {
      var v = m.vehicle;
      $('v3-vehicle').textContent = v ? v.name : 'No vehicle data';
      $('v3-vehicle-dims').textContent = v ? ' ' + ftText(v) : '';
      var meter = $('v3-meter'), fill = $('v3-meter-fill');
      var hasNum = m.state === 'comfortable' || m.state === 'near' || m.state === 'over';
      meter.setAttribute('data-state', m.state);
      fill.style.width = (hasNum ? Math.min(100, m.percent || 0) : 0).toFixed(1) + '%';
      var label = { comfortable: 'Room available', near: 'Near capacity', over: 'Over capacity' }[m.state];
      var overflowNote = stats && stats.overflow > 0 && m.state !== 'over' ? 'volume fits, but not every item has a place' : label;
      $('v3-meter-text').textContent = hasNum ? Math.round(m.percent) + '% of the estimated usable space · ' + overflowNote : (m.state === 'empty' ? 'No items yet' : 'No estimate yet');

      var plan = $('v3-plan'), title = $('v3-plan-title'), text = $('v3-plan-text');
      var blocks = m.state === 'empty' || m.state === 'unavailable' ? [] : (m.blocks || []);
      if (!blocks.length) {
        plan.setAttribute('data-state', 'empty'); title.textContent = 'Nothing loaded yet'; text.textContent = 'Add items to see them placed in the vehicle.';
      } else if (stats && stats.overflow > 0) {
        var nl = v ? nextLarger(v) : null;
        plan.setAttribute('data-state', 'over');
        title.textContent = stats.overflow + (stats.overflow === 1 ? ' item does' : ' items do') + ' not fit in this vehicle';
        text.textContent = 'Nothing is shrunk or hidden: ' + (stats.overflow === 1 ? 'it is' : 'they are') + ' shown outside the vehicle. ' +
          (stats.tooBig ? stats.tooBig + ' ' + (stats.tooBig === 1 ? 'is' : 'are') + ' larger than the cargo space in at least one direction. ' : '') +
          (nl ? 'Try the ' + nl.name + ' or plan an additional vehicle.' : 'Plan an additional vehicle or ask for a manual survey.');
      } else if (stats) {
        plan.setAttribute('data-state', m.state === 'near' ? 'near' : 'ok');
        title.textContent = 'All ' + stats.placed + (stats.placed === 1 ? ' item has' : ' items have') + ' a place in this plan';
        text.textContent = 'Items keep their packed sizes. Fragile items have nothing stacked on them. This is a visual guide, not a guarantee: weight, access and loading order are not checked.';
      } else {
        plan.setAttribute('data-state', 'empty'); title.textContent = 'Loading plan not drawn'; text.textContent = 'The 3D view is not available, so the loading plan was not drawn. Your volume estimate is not affected.';
      }
      var over = stats && stats.overflow > 0;
      var pill = { comfortable: 'Room available', near: 'Near capacity', over: 'Over capacity', empty: 'Empty truck', unavailable: 'No estimate yet' }[m.state] || '';
      $('v3-status-text').textContent = over && m.state !== 'over' ? 'Some items do not fit' : pill;
      $('v3-status').setAttribute('data-state', over ? 'over' : m.state);
      $('v3-info').setAttribute('data-state', over ? 'over' : m.state);
      var list = $('v3-items');
      var parts = groupedItems(blocks);
      list.innerHTML = parts.length ? parts.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') : '<li>No items</li>';
    }

    // ---------------- fallback ----------------
    function showFallback(reason) {
      mode = '2d';
      controls.hidden = true; $('v3-hint').hidden = true;
      fallback.hidden = false;
      $('v3-fallback-text').textContent = (reason ? reason + ' ' : '') + 'A 2D picture and the item list are shown instead. Your estimate is not affected.';
      try {
        stage.innerHTML = '';
        if (TSE.TruckVisualizer) { viz2d = TSE.TruckVisualizer.mount(stage); if (lastModel) viz2d.update(lastModel); }
      } catch (e) { /* the text summary below remains */ }
      if (lastModel) renderInfo(lastModel, null);
    }
    function hideFallback() { fallback.hidden = true; $('v3-hint').hidden = false; }

    // ---------------- loading the 3D module ----------------
    function loadModule() {
      if (TSE.Viewer3D) return Promise.resolve(TSE.Viewer3D);
      var src = document.body.getAttribute('data-viewer-src');
      if (!src) return Promise.reject(new Error('The 3D module address is missing.'));
      var url = new URL(src, document.baseURI).href + (retryCount ? '&retry=' + retryCount : '');
      return import(url).then(function () { if (!TSE.Viewer3D) throw new Error('The 3D module did not register.'); return TSE.Viewer3D; });
    }
    function createViewer(V) {
      if (/[?&]no3d(=|&|$)/.test(root.location.search)) throw new Error('The 3D view was switched off with ?no3d in the address.');
      if (!V.supported()) throw new Error('WebGL is not available in this browser.');
      stage.innerHTML = '';
      v3 = V.create(stage, { onFail: function (why) { dispose3D(); showFallback(why); } });
      mode = '3d'; hideFallback(); controls.hidden = false;
    }
    function dispose3D() { if (v3) { try { v3.dispose(); } catch (e) { /* ignore */ } v3 = null; } }
    function start() {
      if (v3 || loading) return;
      loading = true;
      stage.setAttribute('aria-busy', 'true');
      loadModule().then(function (V) {
        loading = false; stage.removeAttribute('aria-busy');
        if (!isActive()) return;
        createViewer(V);
        push();
      }).catch(function (e) {
        loading = false; stage.removeAttribute('aria-busy');
        dispose3D();
        showFallback(e && e.message ? e.message : '3D graphics could not start.');
      });
    }
    function push() {
      if (!lastModel) return;
      if (v3) { lastStats = v3.update(lastModel); dirty = false; renderInfo(lastModel, lastStats); }
      else if (viz2d) { viz2d.update(lastModel); renderInfo(lastModel, null); }
    }

    // ---------------- open / close ----------------
    function open(openerEl) {
      if (dlg.open) return;
      opener = openerEl || document.activeElement;
      mountTo(false);   // on desktop the panel leaves the dock for the expanded view and comes back on close
      dlg.showModal();
      document.body.classList.add('viewer-open');
      if (lastModel) renderInfo(lastModel, lastStats);
      if (v3) { v3.refresh(); if (dirty) push(); } else if (mode === '2d') { push(); } else start();
    }
    /** Runs once per closing, whether the visitor used Close, Esc or the backdrop (the native "close" event may arrive late). */
    function afterClose() {
      document.body.classList.remove('viewer-open');
      if (v3) { v3.setAutoRotate(false); setPressed(controls.querySelector('[data-act="rotate"]'), false); }
      var o = opener; opener = null;
      if (desk.matches && dock) { mountTo(true); if (v3) { v3.refresh(); push(); } else if (mode === '2d') push(); else if (dockShown()) start(); }
      if (o && o.focus && document.contains(o)) o.focus({ preventScroll: true });
    }
    function close() { if (dlg.open) { dlg.close(); afterClose(); } }
    dlg.addEventListener('close', afterClose);
    document.addEventListener('tse:workspace', syncPlace);
    var resizeTimer = 0;
    root.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(syncPlace, 120); });   // belt and braces next to the media-query listener
    $('v3-expand').addEventListener('click', function () { open($('v3-expand')); });
    placeDetail(desk.matches && !!dock);
    if (desk.addEventListener) desk.addEventListener('change', syncPlace); else if (desk.addListener) desk.addListener(syncPlace);
    if (dock && root.IntersectionObserver) new root.IntersectionObserver(function (en) { if (en[0].isIntersecting) syncPlace(); }, { threshold: 0 }).observe(dock);
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { close(); return; } // click on the dark backdrop
      if (e.target.closest && e.target.closest('[data-close]')) close();
    });

    function setPressed(btn, on) { if (btn) btn.setAttribute('aria-pressed', String(on)); }
    controls.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b || !v3) return;
      var act = b.getAttribute('data-act');
      if (act === 'zoom-in') v3.zoom(0.8);
      else if (act === 'zoom-out') v3.zoom(1.25);
      else if (act === 'reset') { v3.setAutoRotate(false); setPressed(controls.querySelector('[data-act="rotate"]'), false); v3.reset(); UI.announce('View reset', 100); }
      else if (act === 'rotate') { var on = b.getAttribute('aria-pressed') !== 'true'; var actual = v3.setAutoRotate(on); setPressed(b, actual); UI.announce(actual ? 'Rotating' : 'Rotation stopped', 100); }
    });
    $('v3-retry').addEventListener('click', function () {
      retryCount += 1; dispose3D(); viz2d = null; stage.innerHTML = ''; mode = 'none'; hideFallback(); start();
    });

    return {
      open: open, close: close,
      isOpen: function () { return dlg.open; },
      isDocked: function () { return docked && dockShown(); },
      /** Receives every new estimate. The 3D scene is only updated while the modal is open (or when it next opens). */
      update: function (model) {
        lastModel = model; dirty = true;
        if (!docked && !dlg.open && dockShown()) syncPlace();   // do not rely only on the observer
        else if (isActive()) push();
        return lastStats;
      },
      mode: function () { return mode; },
      viewer: function () { return v3; },
      stats: function () { return lastStats; }
    };
  }

  TSE.UIViewer = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
