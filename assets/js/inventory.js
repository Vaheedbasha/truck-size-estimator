/*
 * inventory.js - the visitor's selected items (state only, no DOM).
 *
 * A "line" is one row of the selected list:
 *   catalogue line: { key: "sofa::3-seater", kind: "catalogue", itemId, variantId, qty }
 *   custom line:    { key: "custom-1", kind: "custom", name, qty, sizeId, volumeFt3, approx, dimsIn, fragile, oversized }
 * The inventory never calculates volume; estimator.js does that.
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});

  var MAX_QTY = 99;
  var MAX_CUSTOM_NAME = 60;
  var MAX_DIM_IN = 300;

  function clampQty(n) {
    n = Math.floor(Number(n));
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.min(MAX_QTY, n));
  }

  function create(catalogue) {
    var lines = []; // insertion order is the display order
    var listeners = [];
    var customCounter = 0;

    function emit(change) {
      listeners.slice().forEach(function (fn) { fn(change || {}); });
    }
    function find(key) {
      for (var i = 0; i < lines.length; i++) if (lines[i].key === key) return lines[i];
      return null;
    }
    function indexOf(key) {
      for (var i = 0; i < lines.length; i++) if (lines[i].key === key) return i;
      return -1;
    }
    function keyFor(itemId, variantId) { return itemId + '::' + variantId; }

    function add(itemId, variantId, qty) {
      var item = catalogue.getItem(itemId);
      if (!item) return null;
      var variant = catalogue.getVariant(item, variantId || catalogue.defaultVariant(item).id);
      if (!variant) return null;
      var amount = qty === undefined ? 1 : clampQty(qty);
      if (amount < 1) return null;
      var key = keyFor(itemId, variant.id);
      var line = find(key);
      if (line) line.qty = clampQty(line.qty + amount);
      else lines.push({ key: key, kind: 'catalogue', itemId: itemId, variantId: variant.id, qty: amount });
      emit({ type: 'add', key: key, itemId: itemId });
      return key;
    }

    function setQty(key, qty) {
      var i = indexOf(key);
      if (i < 0) return false;
      var q = clampQty(qty);
      var itemId = lines[i].itemId;
      if (q < 1) lines.splice(i, 1);
      else lines[i].qty = q;
      emit({ type: q < 1 ? 'remove' : 'qty', key: key, itemId: itemId });
      return true;
    }
    function changeQty(key, delta) {
      var line = find(key);
      return line ? setQty(key, line.qty + delta) : false;
    }
    function remove(key) { return setQty(key, 0); }

    /** Switch a line to another variant. The quantity moves across; it is never added on top. */
    function setVariant(key, variantId) {
      var line = find(key);
      if (!line || line.kind !== 'catalogue' || line.variantId === variantId) return null;
      var item = catalogue.getItem(line.itemId);
      if (!catalogue.getVariant(item, variantId)) return null;
      var newKey = keyFor(line.itemId, variantId);
      var existing = find(newKey);
      if (existing) {
        existing.qty = clampQty(existing.qty + line.qty);
        lines.splice(indexOf(key), 1);
      } else {
        line.variantId = variantId;
        line.key = newKey;
      }
      emit({ type: 'variant', key: newKey, itemId: line.itemId });
      return newKey;
    }

    var MAX_NOTES = 120, MAX_WEIGHT_KG = 5000;
    function cleanText(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
    function normName(v) { return catalogue.norm ? catalogue.norm(v) : String(v).toLowerCase(); }

    /** Validate a custom-item form. Returns { errors, fields } (fields only when there are no errors). */
    function validateCustom(spec, selfKey) {
      var errors = {};
      var name = cleanText(spec && spec.name, 400);
      if (!name) errors.name = 'Enter a name for the item, for example "Treadmill desk".';
      else if (name.length > MAX_CUSTOM_NAME) errors.name = 'Use ' + MAX_CUSTOM_NAME + ' characters or fewer.';
      // a custom record lives in its own "custom" lines: it can never overwrite or replace a catalogue entry

      var qtyRaw = spec && spec.qty;
      var qty = Number(qtyRaw);
      if (qtyRaw === '' || qtyRaw === undefined || qtyRaw === null || !isFinite(qty) || qty < 1 || Math.floor(qty) !== qty || qty > MAX_QTY) {
        errors.qty = 'Enter a whole number from 1 to ' + MAX_QTY + '.';
      }

      var dims = null;
      var d = spec && spec.dimsIn;
      var givenDims = d ? [d.l, d.w, d.h].filter(function (x) { return x !== '' && x !== undefined && x !== null; }) : [];
      if (givenDims.length) {
        var l = Number(d.l), w = Number(d.w), h = Number(d.h);
        var okNum = function (n) { return isFinite(n) && n > 0 && n <= MAX_DIM_IN; };
        if (givenDims.length < 3) errors.dims = 'Enter length, width and height together, or leave all three empty.';
        else if (!okNum(l) || !okNum(w) || !okNum(h)) errors.dims = 'Each size must be a number between 1 and ' + MAX_DIM_IN + ' inches.';
        else dims = { l: l, w: w, h: h };
      }

      var preset = null;
      var presets = catalogue.customSizePresets;
      for (var i = 0; i < presets.length; i++) if (presets[i].id === (spec && spec.sizeId)) preset = presets[i];
      if (!dims && !preset) errors.size = 'Choose an approximate size, or enter all three dimensions.';

      var weightKg = null, wRaw = spec && spec.weightKg;
      if (wRaw !== '' && wRaw !== undefined && wRaw !== null) {
        var wn = Number(wRaw);
        if (!isFinite(wn) || wn <= 0 || wn > MAX_WEIGHT_KG) errors.weight = 'Enter the weight in kilograms (between 0.1 and ' + MAX_WEIGHT_KG + '), or leave it empty.';
        else weightKg = Math.round(wn * 10) / 10;
      }
      var notes = cleanText(spec && spec.notes, MAX_NOTES);

      if (Object.keys(errors).length) return { errors: errors };

      var volumeFt3, approx, review = false, sizeId = null;
      if (dims) {
        volumeFt3 = (dims.l * dims.w * dims.h) / 1728; // cubic inches -> cubic feet
        approx = false;
        if (Math.max(dims.l, dims.w, dims.h) >= 84 || volumeFt3 >= 60) review = true; // 7 ft+ or very large
      } else {
        volumeFt3 = typeof preset.volumeFt3 === 'number' ? preset.volumeFt3 : null; // "Not sure" -> unknown
        approx = true;
        sizeId = preset.id;
        review = !!preset.manualReview;
      }
      return { errors: {}, fields: {
        name: name, qty: clampQty(qty), sizeId: sizeId, volumeFt3: volumeFt3, approx: approx, dimsIn: dims,
        fragile: !!(spec && spec.fragile), oversized: !!(spec && spec.oversized) || review, dismantled: !!(spec && spec.dismantled),
        weightKg: weightKg, notes: notes
      } };
    }
    function sameCustom(a, b) {
      return normName(a.name) === normName(b.name) && a.sizeId === b.sizeId && JSON.stringify(a.dimsIn) === JSON.stringify(b.dimsIn) &&
        !!a.fragile === !!b.fragile && !!a.dismantled === !!b.dismantled && a.weightKg === b.weightKg && (a.notes || '') === (b.notes || '');
    }

    /**
     * Validate and add a custom item. Adding the same item again (same name, size and flags) raises the quantity instead of
     * creating a duplicate line.
     * @returns {{ok:boolean, errors:object, key?:string, merged?:boolean}}
     */
    function addCustom(spec) {
      var r = validateCustom(spec);
      if (r.errors && Object.keys(r.errors).length) return { ok: false, errors: r.errors };
      var f = r.fields;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].kind === 'custom' && sameCustom(lines[i], f)) {
          lines[i].qty = clampQty(lines[i].qty + f.qty);
          emit({ type: 'qty', key: lines[i].key });
          return { ok: true, errors: {}, key: lines[i].key, merged: true };
        }
      }
      customCounter += 1;
      var key = 'custom-' + customCounter;
      lines.push({
        key: key, kind: 'custom', name: f.name, qty: f.qty, sizeId: f.sizeId,
        volumeFt3: f.volumeFt3, approx: f.approx, dimsIn: f.dimsIn,
        fragile: f.fragile, oversized: f.oversized, dismantled: f.dismantled, weightKg: f.weightKg, notes: f.notes
      });
      emit({ type: 'add', key: key });
      return { ok: true, errors: {}, key: key };
    }

    /** Change an existing custom line. Same validation as adding; the line keeps its place and key. */
    function updateCustom(key, spec) {
      var line = find(key);
      if (!line || line.kind !== 'custom') return { ok: false, errors: { name: 'This item is no longer in your list.' } };
      var r = validateCustom(spec, key);
      if (r.errors && Object.keys(r.errors).length) return { ok: false, errors: r.errors };
      var f = r.fields;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].key !== key && lines[i].kind === 'custom' && sameCustom(lines[i], f)) return { ok: false, errors: { name: 'You already have this item in your list. Change its quantity there instead.' } };
      }
      Object.keys(f).forEach(function (k) { line[k] = f[k]; });
      emit({ type: 'edit', key: key });
      return { ok: true, errors: {}, key: key };
    }

    /** Put a removed line back where it was (used by Undo). If the same line was re-added meanwhile, quantities merge. */
    function reinsert(line, index) {
      var copy = JSON.parse(JSON.stringify(line));
      var existing = find(copy.key);
      if (existing) existing.qty = clampQty(existing.qty + copy.qty);
      else lines.splice(Math.max(0, Math.min(index, lines.length)), 0, copy);
      emit({ type: 'restore', key: copy.key });
    }

    function clear() { lines = []; emit({ type: 'clear' }); }
    function snapshot() { return { lines: JSON.parse(JSON.stringify(lines)), customCounter: customCounter }; }
    function restore(snap) {
      lines = JSON.parse(JSON.stringify(snap.lines));
      customCounter = Math.max(customCounter, snap.customCounter || 0);
      emit({ type: 'restore' });
    }
    /** Replace everything in one step (used by the demo loaders). items: [[itemId, variantId, qty], ...] */
    function load(items) {
      lines = [];
      var saved = listeners; listeners = [];
      items.forEach(function (r) { add(r[0], r[1], r[2]); });
      listeners = saved;
      emit({ type: 'load' });
    }

    function getQty(itemId, variantId) {
      var l = find(keyFor(itemId, variantId));
      return l ? l.qty : 0;
    }
    function getItemQty(itemId) {
      return lines.reduce(function (n, l) { return n + (l.kind === 'catalogue' && l.itemId === itemId ? l.qty : 0); }, 0);
    }
    function countsByCategory() {
      var out = {};
      lines.forEach(function (l) {
        var cat = 'other';
        if (l.kind === 'catalogue') { var it = catalogue.getItem(l.itemId); cat = it ? it.category : 'other'; }
        out[cat] = (out[cat] || 0) + l.qty;
      });
      return out;
    }

    return {
      MAX_QTY: MAX_QTY,
      add: add, setQty: setQty, updateCustom: updateCustom, changeQty: changeQty, remove: remove, setVariant: setVariant,
      addCustom: addCustom, reinsert: reinsert, indexOfKey: indexOf, clear: clear, snapshot: snapshot, restore: restore, load: load,
      getLines: function () { return lines.slice(); },
      getLine: find, getQty: getQty, getItemQty: getItemQty, countsByCategory: countsByCategory,
      totalUnits: function () { return lines.reduce(function (n, l) { return n + l.qty; }, 0); },
      isEmpty: function () { return lines.length === 0; },
      subscribe: function (fn) {
        listeners.push(fn);
        return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
      }
    };
  }

  TSE.Inventory = { create: create, MAX_QTY: MAX_QTY, clampQty: clampQty };
})(typeof window !== 'undefined' ? window : globalThis);
