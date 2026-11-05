/*
 * quote-form.js - the "Get a quote for your move" dialog.
 * It validates the fields in the browser, then POSTs the request to api/quote.php. The server validates again, recomputes the
 * estimate and saves the request. "Received" is shown ONLY after the server answers {"ok":true}. Idle, sending, validation-error,
 * server-error and success states are all handled. The inventory is never touched here, so closing the dialog or a failed
 * attempt keeps the visitor's items, and a request id stops a double click from saving the request twice.
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});
  var UI = TSE.UI, Est = TSE.Estimator;
  var esc = UI.esc;

  // ---------- validation (pure functions, also used by the tests) ----------
  function normalisePhone(raw) {
    var d = String(raw || '').replace(/[\s\-().]/g, '');
    if (/^\+91/.test(d)) d = d.slice(3);
    else if (/^91\d{10}$/.test(d)) d = d.slice(2);
    else if (/^0\d{10}$/.test(d)) d = d.slice(1);
    return d;
  }
  function validatePhone(raw) {
    var v = String(raw || '').trim();
    if (!v) return 'Enter your 10-digit mobile number.';
    var d = normalisePhone(v);
    if (/[^0-9]/.test(d)) return 'Use digits only, for example 98765 43210.';
    if (d.length !== 10) return 'A mobile number has 10 digits. You entered ' + d.length + '.';
    if (!/^[6-9]/.test(d)) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
    return '';
  }
  function validatePlace(raw, label) {
    var v = String(raw || '').trim();
    if (!v) return 'Enter the ' + label + ' city or 6-digit PIN code.';
    if (/^\d+$/.test(v)) return /^[1-9]\d{5}$/.test(v) ? '' : 'A PIN code has 6 digits and does not start with 0, for example 560001.';
    if (!/^\p{L}[\p{L}\p{M} .,'()\-]{1,58}$/u.test(v)) return 'Enter a city name using letters only, or a 6-digit PIN code such as 560001.';
    return '';
  }
  function validateName(raw) {
    var v = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!v) return 'Enter your full name.';
    if (v.length < 2) return 'Enter at least 2 letters.';
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .'\-]{1,79}$/u.test(v)) return 'Use letters only (spaces, full stops and hyphens are fine).';
    return '';
  }
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function validateDate(raw) {
    var v = String(raw || '').trim();
    if (!v) return ''; // optional
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v + 'T00:00:00').getTime())) return 'Choose a valid date.';
    if (v < todayIso()) return 'Choose today or a future date.';
    return '';
  }
  function validateAll(values) {
    var e = {};
    var r;
    if ((r = validateName(values.name))) e.name = r;
    if ((r = validatePhone(values.phone))) e.phone = r;
    if ((r = validatePlace(values.pickup, 'pickup'))) e.pickup = r;
    if ((r = validatePlace(values.destination, 'destination'))) e.destination = r;
    if ((r = validateDate(values.movingDate))) e.date = r;
    if (String(values.notes || '').length > 500) e.notes = 'Use 500 characters or fewer.';
    if (!values.consent) e.consent = 'Please tick the box to agree to be contacted about this request.';
    return e;
  }

  function init(ctx) {
    var $ = function (id) { return document.getElementById(id); };
    var dlg = $('quote-dialog'), form = $('quote-form');
    var fields = {
      name: $('q-name'), phone: $('q-phone'), pickup: $('q-pickup'), destination: $('q-drop'),
      date: $('q-date'), notes: $('q-notes'), consent: $('q-consent')
    };
    var errEls = { name: $('q-name-err'), phone: $('q-phone-err'), pickup: $('q-pickup-err'), destination: $('q-drop-err'), date: $('q-date-err'), notes: $('q-notes-err'), consent: $('q-consent-err') };
    var order = ['name', 'phone', 'pickup', 'destination', 'date', 'notes', 'consent'];
    var labels = { name: 'Full name', phone: 'Mobile number', pickup: 'Pickup city or PIN', destination: 'Destination city or PIN', date: 'Moving date', notes: 'Notes', consent: 'Consent' };
    var viewForm = $('quote-view-form'), viewOk = $('quote-view-success');
    var submitBtn = $('quote-submit'), timer = null, submittedOk = false, opener = null, lastPayload = null, requestId = '', inFlight = false;

    function values() {
      return {
        name: fields.name.value, phone: fields.phone.value, pickup: fields.pickup.value, destination: fields.destination.value,
        movingDate: fields.date.value, notes: fields.notes.value, consent: fields.consent.checked
      };
    }
    function showFieldErrors(errors) {
      order.forEach(function (k) {
        var el = errEls[k], input = fields[k], msg = errors[k === 'date' ? 'date' : k];
        if (msg) { el.textContent = msg; el.hidden = false; input.setAttribute('aria-invalid', 'true'); }
        else { el.textContent = ''; el.hidden = true; input.removeAttribute('aria-invalid'); }
      });
    }
    function clearErrors() {
      showFieldErrors({});
      var s = $('quote-summary-errors'); s.hidden = true; s.innerHTML = '';
      $('quote-error').hidden = true;
    }

    // ---------- the estimate that is attached automatically ----------
    function summaryHtml(est, withItems) {
      var d = est.display, rec = est.recommendation;
      var recName = rec.kind === 'single' ? ctx.vehicleName(d.planAdjusted ? d.vehicleId : rec.vehicleId) : rec.kind === 'multiple' ? 'Multiple trucks / manual assessment' : 'Manual estimate';
      var pct = (d.state === 'comfortable' || d.state === 'near' || d.state === 'over') ? Math.round(d.utilisationPercent) + '% of the ' + (d.vehicleName || 'vehicle') : 'Not available';
      var units = ctx.inventory.totalUnits();
      var html = '<div class="attached-head"><strong>Included automatically.</strong> <span class="muted">You do not need to re-enter your items.</span></div>' +
        '<dl class="attached-grid">' +
        (ctx.getHouseSize && ctx.getHouseSize() ? '<div><dt>House size</dt><dd>' + esc(ctx.getHouseSize().label) + '</dd></div>' : '') +
        '<div><dt>Items</dt><dd>' + units + (units === 1 ? ' item' : ' items') + '</dd></div>' +
        '<div><dt>Estimated volume</dt><dd>' + (est.totalVolumeFt3 > 0 ? Est.formatVolume(est.totalVolumeFt3) + ' ft³' : 'To be confirmed') + '</dd></div>' +
        '<div><dt>Suggested vehicle</dt><dd>' + esc(recName) + '</dd></div>' +
        '<div><dt>Capacity used</dt><dd>' + esc(pct) + '</dd></div></dl>';
      if (withItems) {
        html += '<details class="attached-items"><summary>View selected items <svg class="ui-icon chev" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary><ul>' +
          est.lines.map(function (l) {
            return '<li><span>' + l.qty + ' × ' + esc(l.name) + (l.variantLabel ? ' (' + esc(l.variantLabel) + ')' : '') + '</span><span class="muted">' +
              (l.unknown ? 'size unknown' : Est.formatVolume(l.volumeFt3) + ' ft³') + '</span></li>';
          }).join('') + '</ul></details>';
      }
      if (est.warnings.manualReview.length) {
        html += '<p class="attached-flag">' + '<strong>Flagged for review:</strong> ' + esc(est.warnings.manualReview.join(', ')) + '</p>';
      }
      return html;
    }

    function newRequestId() {
      try { if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID(); } catch (e) { /* fall through */ }
      return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
    /** Everything the server needs. It recomputes the estimate from these lines; the numbers below are only recorded for comparison. */
    function buildPayload(est, v) {
      var hs = ctx.getHouseSize && ctx.getHouseSize();
      var plan = ctx.getPlanNote ? ctx.getPlanNote() : null;
      return {
        requestId: requestId,
        website: $('q-website').value,
        name: v.name.trim().replace(/\s+/g, ' '),
        phone: v.phone,
        pickup: v.pickup.trim(),
        destination: v.destination.trim(),
        movingDate: v.movingDate || '',
        notes: v.notes.trim(),
        consent: !!v.consent,
        homeSize: hs ? hs.id : null,
        items: ctx.inventory.getLines().map(function (l) {
          if (l.kind === 'custom') {
            return { kind: 'custom', name: l.name, qty: l.qty, sizeId: l.sizeId, dimsIn: l.dimsIn, fragile: !!l.fragile, oversized: !!l.oversized, dismantled: !!l.dismantled, weightKg: l.weightKg || null, notes: l.notes || '' };
          }
          return { kind: 'catalogue', itemId: l.itemId, variantId: l.variantId, qty: l.qty };
        }),
        clientEstimate: { totalVolumeFt3: Math.round(est.totalVolumeFt3 * 10) / 10, vehicleId: est.display.vehicleId, planNote: plan ? plan.kind : null }
      };
    }

    // ---------- open / close ----------
    function resetForm() {
      form.reset(); clearErrors(); submittedOk = false;
    }
    function open(openerEl) {
      var est = ctx.getEstimate();
      if (est.lineCount === 0) return;
      opener = openerEl || document.activeElement;
      if (submittedOk) resetForm();
      clearErrors();
      if (!requestId || submittedOk) requestId = newRequestId();
      viewForm.hidden = false; viewOk.hidden = true;
      setBusy(false);
      $('quote-attached').innerHTML = summaryHtml(est, true);
      fields.date.min = todayIso();
      if (!dlg.open) dlg.showModal();
    }
    function close() { if (dlg.open) dlg.close(); }
    dlg.addEventListener('close', function () {
      clearTimeout(timer); setBusy(false);
      if (opener && document.contains(opener) && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    });
    dlg.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-close]')) close();
    });

    UI.closeOnBackdrop(dlg);

    function setBusy(on) {
      form.setAttribute('aria-busy', on ? 'true' : 'false');
      submitBtn.disabled = on;
      submitBtn.classList.toggle('loading', on);
      submitBtn.querySelector('span').textContent = on ? 'Sending…' : 'Request my quote';
      var r = $('quote-retry'); if (r) r.disabled = on;
    }

    // ---------- submit ----------
    function submit() {
      var v = values();
      var errors = validateAll(v);
      showFieldErrors(errors);
      var keys = order.filter(function (k) { return errors[k]; });
      var sum = $('quote-summary-errors');
      if (keys.length) {
        sum.innerHTML = '<svg class="ui-icon" aria-hidden="true"><use href="#i-stop"/></svg><div><strong>Please fix ' + keys.length + (keys.length === 1 ? ' field' : ' fields') + ' to continue:</strong><ul>' +
          keys.map(function (k) { return '<li><a href="#' + fields[k].id + '" data-focus="' + k + '">' + esc(labels[k]) + '</a>: ' + esc(errors[k]) + '</li>'; }).join('') + '</ul></div>';
        sum.hidden = false;
        $('quote-error').hidden = true;
        fields[keys[0]].focus();
        return;
      }
      sum.hidden = true; sum.innerHTML = '';
      $('quote-error').hidden = true;
      if (inFlight) return;               // a second click while sending does nothing
      var failBox = $('q-simulate-fail');
      if (failBox.checked) {              // testing aid: show the error state without sending anything
        failBox.checked = false;
        showServerError('This is the test error state. Nothing was sent.');
        return;
      }
      inFlight = true; setBusy(true);
      UI.announce('Sending your request.', 100);
      var est = ctx.getEstimate();
      var payload = buildPayload(est, v);
      var url = ctx.endpoint || 'api/quote.php';
      var ctl = root.AbortController ? new root.AbortController() : null;
      var to = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin', signal: ctl ? ctl.signal : undefined })
        .then(function (res) {
          return res.text().then(function (txt) {
            var data = null; try { data = JSON.parse(txt); } catch (e) { /* not JSON */ }
            return { status: res.status, ok: res.ok, data: data };
          });
        })
        .then(function (r) {
          clearTimeout(to); inFlight = false; setBusy(false);
          if (r.status === 422 && r.data && r.data.errors) { showServerFieldErrors(r.data.errors); return; }
          if (r.ok && r.data && r.data.ok === true && r.data.reference) { showSuccess(r.data, payload, est); return; }
          var msg = r.data && r.data.error ? r.data.error
            : (r.status === 404 || r.status === 405 ? 'This website has no quote service running (the server address was not found). Your list is safe.' : 'The server did not confirm your request.');
          showServerError(msg);
        })
        .catch(function (err) {
          clearTimeout(to); inFlight = false; setBusy(false);
          showServerError(err && err.name === 'AbortError' ? 'The server took too long to answer.' : 'We could not reach the server. Check your connection and try again.');
        });
    }
    function showServerError(text) {
      $('quote-error-text').textContent = text + ' Your details and your selected items are still here, so nothing needs to be entered again.';
      var box = $('quote-error'); box.hidden = false;
      box.scrollIntoView({ block: 'nearest' });
      box.focus();
    }
    function showServerFieldErrors(errs) {
      var mapped = {}; Object.keys(errs).forEach(function (k) { mapped[k === 'movingDate' ? 'date' : k] = errs[k]; });
      showFieldErrors(mapped);
      var keys = order.filter(function (k) { return mapped[k]; });
      if (keys.length) { fields[keys[0]].focus(); return; }
      showServerError(errs.items || 'The server could not accept the request.');
    }
    function showSuccess(data, payload, est) {
      lastPayload = payload;
      $('success-ref').textContent = data.reference;
      var summary = summaryHtml(est, false);
      if (data.estimate && data.estimate.totalVolumeFt3 !== undefined && data.estimate.totalVolumeFt3 !== null) {
        summary += '<p class="attached-flag">Server estimate: ' + esc(Est.formatVolume(data.estimate.totalVolumeFt3)) + ' ft³' + (data.estimate.vehicleName ? ', ' + esc(data.estimate.vehicleName) : '') + '. Volume only: placement and payload were not validated.</p>';
      }
      $('success-summary').innerHTML = summary;
      var shown = JSON.parse(JSON.stringify(payload)); delete shown.website;
      $('success-json').textContent = JSON.stringify(shown, null, 2);
      viewForm.hidden = true; viewOk.hidden = false;
      submittedOk = true;
      $('success-title').focus();
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    $('quote-retry').addEventListener('click', submit);
    $('quote-summary-errors').addEventListener('click', function (e) {
      var a = e.target.closest('a[data-focus]'); if (!a) return;
      e.preventDefault(); fields[a.getAttribute('data-focus')].focus();
    });
    // fix-as-you-type: clear a field's error once it becomes valid
    var single = {
      name: function () { return validateName(fields.name.value); },
      phone: function () { return validatePhone(fields.phone.value); },
      pickup: function () { return validatePlace(fields.pickup.value, 'pickup'); },
      destination: function () { return validatePlace(fields.destination.value, 'destination'); },
      date: function () { return validateDate(fields.date.value); }
    };
    Object.keys(single).forEach(function (k) {
      var recheck = function () {
        if (fields[k].getAttribute('aria-invalid') !== 'true') return;
        var msg = single[k]();
        errEls[k].textContent = msg; errEls[k].hidden = !msg;
        if (!msg) fields[k].removeAttribute('aria-invalid');
      };
      fields[k].addEventListener('blur', recheck);
      fields[k].addEventListener('input', recheck);
    });
    fields.consent.addEventListener('change', function () {
      if (fields.consent.checked) { errEls.consent.hidden = true; fields.consent.removeAttribute('aria-invalid'); }
    });
    $('success-new').addEventListener('click', function () { close(); resetForm(); ctx.onNewEstimate(); });

    return { open: open, close: close, isOpen: function () { return dlg.open; } };
  }

  TSE.QuoteForm = {
    init: init,
    validate: { phone: validatePhone, place: validatePlace, name: validateName, date: validateDate, all: validateAll, normalisePhone: normalisePhone }
  };
})(typeof window !== 'undefined' ? window : globalThis);
