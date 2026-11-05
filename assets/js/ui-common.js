/*
 * ui-common.js - small DOM helpers shared by the UI modules:
 * HTML escaping, the quantity stepper markup, item tags, the toast and the screen-reader announcer.
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});
  var Icons = TSE.Icons;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Quantity control: minus, number box, plus. `data-act` values are handled by event delegation. */
  function stepperHtml(name, qty, max, opts) {
    var n = esc(name), zero = !!(opts && opts.zero);
    // zero:true = catalogue cards, where 0 means "not selected": minus is disabled at 0 and never shows a bin.
    var decLabel = zero ? 'Decrease quantity of ' + n : (qty <= 1 ? 'Remove ' + n + ' from list' : 'Decrease quantity of ' + n);
    return '<div class="stepper' + (zero && qty === 0 ? ' is-zero' : '') + '" role="group" aria-label="Quantity of ' + n + '">' +
      '<button type="button" class="step-btn" data-act="dec" aria-label="' + decLabel + '"' + (zero && qty <= 0 ? ' disabled' : '') + '>' +
      Icons.ui(!zero && qty <= 1 ? 'trash' : 'minus') + '</button>' +
      '<input class="step-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-act="qty" value="' + qty + '" aria-label="Quantity of ' + n + '">' +
      '<button type="button" class="step-btn" data-act="inc" aria-label="Increase quantity of ' + n + '"' + (qty >= max ? ' disabled' : '') + '>' + Icons.ui('plus') + '</button>' +
      '</div>';
  }

  var TAGS = {
    fragile: { text: 'Fragile', icon: 'alert', cls: 'tag-warn' },
    heavy: { text: 'Heavy', icon: 'scale', cls: 'tag-info' },
    bulky: { text: 'Bulky', icon: 'box', cls: 'tag-info' },
    restricted: { text: 'Restricted: needs confirmation', icon: 'stop', cls: 'tag-error' },
    manual: { text: 'Manual check', icon: 'alert', cls: 'tag-warn' },
    bundle: { text: 'Bundle', icon: 'box', cls: 'tag-info' },
    fitnotvalidated: { text: 'Fit not validated', icon: 'info', cls: 'tag-info' },
    nopayload: { text: 'Payload not checked', icon: 'scale', cls: 'tag-warn' },
    dismantled: { text: 'Dismantled: flat parts', icon: 'box', cls: 'tag-info' },
    approx: { text: 'Approximate size', icon: 'info', cls: 'tag-info' },
    unknown: { text: 'Size unknown', icon: 'help', cls: 'tag-warn' }
  };
  function tagHtml(key) {
    var t = TAGS[key];
    return t ? '<span class="tag ' + t.cls + '">' + Icons.ui(t.icon) + esc(t.text) + '</span>' : '';
  }

  // ---------- announcer (screen readers) ----------
  var liveEl = null, liveTimer = null;
  function announce(message, delay) {
    liveEl = liveEl || document.getElementById('sr-live');
    if (!liveEl) return;
    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () {
      liveEl.textContent = '';
      // a tick later so the same message can be announced twice
      setTimeout(function () { liveEl.textContent = message; }, 30);
    }, delay === undefined ? 400 : delay);
  }

  // ---------- toast ----------
  var toastTimer = null, toastActionHandler = null, toastPaused = false;
  function toast(text, opts) {
    opts = opts || {};
    var el = document.getElementById('toast');
    var t = document.getElementById('toast-text');
    var btn = document.getElementById('toast-action');
    t.textContent = text;
    toastActionHandler = opts.onAction || null;
    if (opts.actionLabel) { btn.hidden = false; btn.textContent = opts.actionLabel; } else { btn.hidden = true; }
    el.hidden = false;
    el.classList.add('show');
    // popover = top layer, so the message (and its Undo) also shows above an open dialog such as the estimate sheet
    try { if (el.showPopover) { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } } catch (e) { /* older browsers: the fixed position still works outside dialogs */ }
    clearTimeout(toastTimer);
    startToastTimer(opts.timeout || (opts.actionLabel ? 12000 : 6000));
  }
  function startToastTimer(ms) {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (toastPaused) startToastTimer(3000); else hideToast(); }, ms);
  }
  function hideToast() {
    var el = document.getElementById('toast');
    if (!el) return;
    el.classList.remove('show');
    try { if (el.hidePopover && el.matches(':popover-open')) el.hidePopover(); } catch (e) { /* ignore */ }
    el.hidden = true;
    toastActionHandler = null;
  }
  function initToast() {
    var el = document.getElementById('toast');
    // the message stays while the pointer is over it or keyboard focus is inside it
    el.addEventListener('mouseenter', function () { toastPaused = true; });
    el.addEventListener('mouseleave', function () { toastPaused = false; });
    el.addEventListener('focusin', function () { toastPaused = true; });
    el.addEventListener('focusout', function () { toastPaused = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !el.hidden && !document.querySelector('dialog[open]')) hideToast(); });
    document.getElementById('toast-close').addEventListener('click', hideToast);
    document.getElementById('toast-action').addEventListener('click', function () {
      var h = toastActionHandler;
      hideToast();
      if (h) h();
    });
  }

  /**
   * Re-render a container but keep keyboard focus on the "same" control afterwards.
   * `selector` receives the data-act / data-key of the previously focused element.
   */
  function keepFocus(container, render, fallbackSelectors) {
    var a = document.activeElement;
    var inside = a && container.contains(a);
    var act = inside ? a.getAttribute('data-act') : null;
    var holder = inside ? a.closest('[data-key],[data-item]') : null;
    var holderAttr = holder ? (holder.hasAttribute('data-key') ? 'data-key' : 'data-item') : null;
    var holderVal = holder ? holder.getAttribute(holderAttr) : null;
    render();
    if (!inside) return;
    var scope = container;
    if (holder) {
      var found = container.querySelector('[' + holderAttr + '="' + (root.CSS && CSS.escape ? CSS.escape(holderVal) : holderVal) + '"]');
      if (found) scope = found;
    }
    var target = act ? scope.querySelector('[data-act="' + act + '"]') : null;
    if (!target || target.disabled) {
      (fallbackSelectors || []).some(function (sel) { target = scope.querySelector(sel); return target && !target.disabled; });
    }
    if (target && target.focus) target.focus({ preventScroll: true });
  }

  /**
   * If the visitor typed a quantity and then pressed + or - without leaving the box first, use the typed number
   * as the starting point. Returns a whole number or null when the box is untouched/invalid.
   */
  function typedQty(btn, currentQty) {
    var box = btn.parentNode && btn.parentNode.querySelector('input[data-act="qty"]');
    if (!box) return null;
    var n = parseInt(String(box.value).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) || n === currentQty ? null : n;
  }
  /** Keep a focused number box focused when +/- is pressed, so no re-render happens in the middle of the click. */
  function protectStepper(container) {
    container.addEventListener('mousedown', function (e) { if (e.target.closest && e.target.closest('.step-btn')) e.preventDefault(); });
  }

  /** Close a <dialog> when the dark backdrop is clicked, but not when a drag that started inside ends on it. */
  function closeOnBackdrop(dlg) {
    var downOnBackdrop = false;
    dlg.addEventListener('mousedown', function (e) { downOnBackdrop = e.target === dlg; });
    dlg.addEventListener('click', function (e) { if (e.target === dlg && downOnBackdrop) dlg.close(); downOnBackdrop = false; });
  }

  function onDesktop() { return root.matchMedia && root.matchMedia('(min-width: 1000px)').matches; }

  TSE.UI = {
    esc: esc, stepperHtml: stepperHtml, tagHtml: tagHtml, announce: announce, toast: toast, hideToast: hideToast,
    initToast: initToast, keepFocus: keepFocus, typedQty: typedQty, protectStepper: protectStepper, closeOnBackdrop: closeOnBackdrop, onDesktop: onDesktop
  };
})(typeof window !== 'undefined' ? window : globalThis);
