/*
 * estimator.js - volume and truck-recommendation rules (no DOM, no drawing).
 *
 * RULES (all numbers come from the JSON files, nothing is hard-coded here):
 *   1. line volume          = unit volume x counted quantity
 *   2. inventory volume     = sum of all line volumes (cubic feet)
 *   3. vehicle usable volume= length x width x height x loadingEfficiency
 *   4. utilisation          = inventory volume / usable volume
 *   5. fits                 = utilisation <= 100 %      (exactly 100 % still fits)
 *      near capacity        = utilisation >= nearCapacityThreshold (default 80 %, exactly 80 % counts as near)
 *   6. recommended vehicle  = smallest ACTIVE vehicle that fits; none fits -> "multiple trucks / manual review"
 *   7. a bundle (e.g. "Bed set") is counted once; separately added copies of its parts are not counted
 *      again until the quantity exceeds what the bundle already contains.
 *   8. Items with an unknown size are listed but contribute 0 and are flagged - the estimate is then partial.
 *   9. Weight is never verified here (demo data has no payload limits) and the result says so.
 *
 * The numbers are ILLUSTRATIVE. They are not verified truck specifications and do not prove physical fit.
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});

  var DEFAULT_NEAR = 0.8;

  function isPosNum(n) { return typeof n === 'number' && isFinite(n) && n > 0; }

  /** Validate vehicles.json and compute usable volumes. Invalid or inactive profiles are skipped (fail closed). */
  function prepareVehicles(vehiclesData) {
    var problems = [];
    var list = [];
    var raw = vehiclesData && Array.isArray(vehiclesData.vehicles) ? vehiclesData.vehicles : [];
    raw.forEach(function (v) {
      if (!v || v.active !== true) return;
      var d = v.internalDimensionsFt || {};
      var eff = v.loadingEfficiency;
      if (!isPosNum(d.length) || !isPosNum(d.width) || !isPosNum(d.height) || !isPosNum(eff) || eff > 1) {
        problems.push('Vehicle "' + (v.id || '?') + '" has missing or invalid dimensions / efficiency and was ignored.');
        return;
      }
      var gross = d.length * d.width * d.height;
      list.push({
        id: v.id, name: v.name, shortName: v.shortName || v.name, cls: v.class, model: v.model || v.class, classExamples: v.classExamples || '', description: v.description,
        dataStatus: v.dataStatus || 'unknown', sortOrder: v.sortOrder || 0,
        internalDimensionsFt: { length: d.length, width: d.width, height: d.height },
        loadingEfficiency: eff,
        grossVolumeFt3: gross,
        usableVolumeFt3: gross * eff,
        payloadLimitKg: isPosNum(v.payloadLimitKg) ? v.payloadLimitKg : null
      });
    });
    list.sort(function (a, b) { return a.usableVolumeFt3 - b.usableVolumeFt3; });
    return {
      vehicles: list,
      problems: problems,
      nearThreshold: vehiclesData && isPosNum(vehiclesData.nearCapacityThreshold) && vehiclesData.nearCapacityThreshold < 1 ? vehiclesData.nearCapacityThreshold : DEFAULT_NEAR,
      estimateVersion: (vehiclesData && vehiclesData.estimateVersion) || 'unversioned',
      dataStatus: (vehiclesData && vehiclesData.dataStatus) || 'unknown',
      notice: (vehiclesData && vehiclesData.notice) || ''
    };
  }

  /** Add the 3D blocks of one catalogue unit: one box from the variant's dimensions, or its flat parts when dismantled. */
  function pushBlocks(blocks, catalogue, id, item, variant, label) {
    var flags = item.flags || [];
    var fragile = flags.indexOf('fragile') !== -1, heavy = flags.indexOf('heavy') !== -1;
    var manual = catalogue.variantNeedsReview(item, variant);
    var geo = catalogue.variantGeometry(item, variant);
    if (geo && geo.dismantled) {
      geo.parts.forEach(function (p, pi) {
        for (var q = 0; q < p.qty; q++) {
          blocks.push({
            id: id + '.p' + pi + '.' + q, shape: item.shape, visualType: p.type, dimsM: p.dimsM, dimsExact: true, dimsSource: 'part',
            itemId: item.id, custom: false, volumeFt3: p.dimsM[0] * p.dimsM[1] * p.dimsM[2] / 0.0283168, label: label + ' - ' + p.label,
            manual: manual, fragile: false, heavy: false, part: true, dismantled: true, parentId: id
          });
        }
      });
      return;
    }
    blocks.push({
      id: id, shape: item.shape, visualType: item.visualType || item.shape || 'box', dimsM: geo ? geo.dimsM : (item.visualDimsM || null), dimsExact: !!geo,
      dimsSource: geo ? 'variant' : 'fallback', itemId: item.id, custom: false, volumeFt3: catalogue.variantVolume(item, variant), label: label,
      manual: manual, fragile: fragile, heavy: heavy
    });
  }

  /**
   * Work out volumes for every selected line.
   * @returns {object} the full estimate (see bottom of this function for the shape)
   */
  function evaluate(lines, catalogue, prepared, options) {
    options = options || {};
    var vehicles = prepared.vehicles;

    // Step 1: how many units of each catalogue item+variant are already included in selected bundles
    var covered = {};
    var bundleOf = {}; // key -> name of the bundle that covers it
    lines.forEach(function (l) {
      if (l.kind !== 'catalogue') return;
      var item = catalogue.getItem(l.itemId);
      if (!item || !item.isBundle) return;
      var comps = catalogue.variantComponents(item, catalogue.getVariant(item, l.variantId)) || [];
      comps.forEach(function (c) {
        var k = c.item.id + '::' + c.variant.id;
        covered[k] = (covered[k] || 0) + c.qty * l.qty;
        bundleOf[k] = item.name;
      });
    });

    var out = [];
    var blocks = [];
    var total = 0;
    var unitCount = 0;
    var manual = [];
    var restricted = [];
    var unknown = [];
    var approxCount = 0;
    var fragileCount = 0;

    lines.forEach(function (l) {
      var rec = {
        key: l.key, kind: l.kind, qty: l.qty, countedQty: l.qty, coveredQty: 0, coveredBy: null,
        unitVolumeFt3: null, volumeFt3: 0, approx: false, unknown: false, manualReview: false,
        restricted: false, fragile: false, notes: [], name: '', variantLabel: '', shape: 'box', visualType: 'box', visualDimsM: null, dimsExact: false,
        isBundle: false, includes: null, categoryId: 'other', fragileFlag: false, heavyFlag: false
      };

      if (l.kind === 'custom') {
        rec.name = l.name;
        rec.variantLabel = l.dimsIn ? l.dimsIn.l + ' x ' + l.dimsIn.w + ' x ' + l.dimsIn.h + ' in' : 'Approx. size';
        rec.unitVolumeFt3 = typeof l.volumeFt3 === 'number' ? l.volumeFt3 : null;
        rec.approx = !!l.approx;
        rec.manualReview = !!l.oversized;
        rec.fragile = !!l.fragile;
        rec.shape = 'box';
        rec.visualType = 'custom';
        if (l.dimsIn) { // exact dimensions entered by the visitor, inches -> metres (width, depth, height)
          rec.visualDimsM = [l.dimsIn.l * 0.0254, l.dimsIn.w * 0.0254, l.dimsIn.h * 0.0254];
          rec.dimsExact = true;
        }
      } else {
        var item = catalogue.getItem(l.itemId);
        var variant = item ? catalogue.getVariant(item, l.variantId) : null;
        if (!item || !variant) {
          rec.name = 'Unknown item'; rec.unknown = true;
          rec.notes.push('This item is no longer in the catalogue.');
        } else {
          rec.name = item.name;
          rec.variantLabel = item.variants.length > 1 || item.isBundle ? variant.label : '';
          rec.shape = item.shape;
          rec.visualType = item.visualType || item.shape || 'box'; // stable 3D model key from the catalogue
          rec.visualDimsM = item.visualDimsM || null;
          rec.categoryId = item.category;
          rec.heavyFlag = (item.flags || []).indexOf('heavy') !== -1;
          rec.isBundle = !!item.isBundle;
          rec.unitVolumeFt3 = catalogue.variantVolume(item, variant);
          rec.manualReview = catalogue.variantNeedsReview(item, variant);
          rec.restricted = (item.flags || []).indexOf('restricted') !== -1;
          rec.fragile = (item.flags || []).indexOf('fragile') !== -1;
          // Every catalogue volume is a rough demo estimate (see the catalogue notice); only custom
          // items with a guessed size are flagged individually as "approximate".
          if (item.note) rec.note = item.note;
          if (item.isBundle) {
            rec.includes = (catalogue.variantComponents(item, variant) || []).map(function (c) {
              return (c.qty > 1 ? c.qty + ' x ' : '') + c.item.name + (c.item.variants.length > 1 ? ' (' + c.variant.label + ')' : '');
            });
          } else {
            // bundle coverage: only the units above what a bundle already includes are counted
            var ck = item.id + '::' + variant.id;
            var cov = covered[ck] || 0;
            if (cov > 0) {
              rec.coveredQty = Math.min(cov, l.qty);
              rec.countedQty = l.qty - rec.coveredQty;
              rec.coveredBy = bundleOf[ck];
              covered[ck] = cov - rec.coveredQty;
            }
          }
        }
      }

      if (rec.unitVolumeFt3 === null) rec.unknown = true;
      if (rec.unknown) unknown.push(rec.name);
      if (rec.approx) approxCount += 1;
      if (rec.manualReview) manual.push(rec.name);
      if (rec.restricted) restricted.push(rec.name);
      if (rec.fragile) fragileCount += 1;

      rec.volumeFt3 = rec.unknown ? 0 : rec.unitVolumeFt3 * rec.countedQty;
      total += rec.volumeFt3;
      unitCount += rec.countedQty;

      // Drawing / loading instructions for the truck: one block per counted unit (bundles are expanded into their parts,
      // dismantled variants into their flat components). Sizes come from the variant's configured dimensions.
      if (!rec.unknown) {
        for (var u = 0; u < rec.countedQty; u++) {
          if (rec.isBundle) {
            var item2 = catalogue.getItem(l.itemId);
            var comps2 = catalogue.variantComponents(item2, catalogue.getVariant(item2, l.variantId)) || [];
            comps2.forEach(function (c, ci) {
              for (var k = 0; k < c.qty; k++) {
                pushBlocks(blocks, catalogue, l.key + '#' + u + '.' + ci + '.' + k, c.item, c.variant, c.item.name);
              }
            });
          } else if (l.kind === 'custom') {
            blocks.push({
              id: l.key + '#' + u, shape: rec.shape, volumeFt3: rec.unitVolumeFt3, visualType: rec.visualType,
              dimsM: rec.visualDimsM, dimsExact: rec.dimsExact, dimsSource: rec.dimsExact ? 'entered' : 'approximate', itemId: null, custom: true,
              label: rec.name + (rec.variantLabel ? ' (' + rec.variantLabel + ')' : ''), manual: rec.manualReview, fragile: rec.fragile, heavy: false
            });
          } else {
            pushBlocks(blocks, catalogue, l.key + '#' + u, catalogue.getItem(l.itemId), catalogue.getVariant(catalogue.getItem(l.itemId), l.variantId),
              rec.name + (rec.variantLabel ? ' (' + rec.variantLabel + ')' : ''));
          }
        }
      }
      out.push(rec);
    });

    // Step 2: compare against every vehicle
    var vehicleResults = vehicles.map(function (v) {
      var util = total / v.usableVolumeFt3 * 100;
      return {
        id: v.id, name: v.name, cls: v.cls, usableVolumeFt3: v.usableVolumeFt3,
        utilisationPercent: util, fits: total > 0 && util <= 100 + 1e-9
      };
    });

    var isEmpty = lines.length === 0;
    var noKnownVolume = !isEmpty && total <= 0;
    var rec2;
    var recommendedIdx = -1;
    vehicleResults.forEach(function (v, i) { if (recommendedIdx < 0 && v.fits) recommendedIdx = i; });

    if (!vehicles.length) {
      rec2 = { kind: 'unavailable', reason: 'no-vehicles', vehicleId: null };
    } else if (isEmpty) {
      rec2 = { kind: 'none', reason: 'empty', vehicleId: null };
    } else if (noKnownVolume) {
      rec2 = { kind: 'unavailable', reason: 'no-known-volume', vehicleId: null };
    } else if (recommendedIdx >= 0) {
      var next = vehicleResults[recommendedIdx + 1] || null;
      rec2 = { kind: 'single', reason: 'smallest-fit', vehicleId: vehicleResults[recommendedIdx].id, nextVehicleId: next ? next.id : null };
    } else {
      var largest = vehicleResults[vehicleResults.length - 1];
      rec2 = { kind: 'multiple', reason: 'exceeds-largest', vehicleId: largest.id, ratio: total / largest.usableVolumeFt3 };
    }
    rec2.provisional = true; // weight and exact fit are never verified in this mockup
    rec2.manualReview = manual.length > 0;
    rec2.partial = unknown.length > 0 && total > 0;

    // Step 3: which vehicle is shown, and what state is it in?
    var displayId = null, pinned = false, planAdjusted = false;
    if (options.pinnedVehicleId) {
      for (var i = 0; i < vehicleResults.length; i++) if (vehicleResults[i].id === options.pinnedVehicleId) { displayId = options.pinnedVehicleId; pinned = true; }
    }
    if (!displayId && options.planVehicleId && rec2.kind === 'single') {
      // the 3D loading plan found that the volume-based vehicle cannot physically take every item: show the next one that can
      var ri = -1, pi2 = -1;
      vehicleResults.forEach(function (v, i) { if (v.id === rec2.vehicleId) ri = i; if (v.id === options.planVehicleId) pi2 = i; });
      if (pi2 > ri && ri >= 0) { displayId = options.planVehicleId; planAdjusted = true; }
    }
    if (!displayId) displayId = rec2.vehicleId || (vehicleResults[0] && vehicleResults[0].id) || null;
    var disp = null;
    vehicleResults.forEach(function (v) { if (v.id === displayId) disp = v; });

    var state;
    if (!vehicles.length) state = 'unavailable';
    else if (isEmpty) state = 'empty';
    else if (noKnownVolume) state = 'unavailable';
    else if (disp.utilisationPercent > 100 + 1e-9) state = 'over';
    else if (disp.utilisationPercent / 100 >= prepared.nearThreshold - 1e-9) state = 'near';
    else state = 'comfortable';

    return {
      estimateVersion: prepared.estimateVersion,
      isEmpty: isEmpty,
      lineCount: lines.length,
      unitCount: unitCount,
      totalVolumeFt3: total,
      lines: out,
      blocks: blocks,
      warnings: {
        manualReview: manual, restricted: restricted, unknown: unknown,
        approximateCount: approxCount, fragileCount: fragileCount, weightVerified: false
      },
      vehicles: vehicleResults,
      recommendation: rec2,
      display: {
        vehicleId: displayId, pinned: pinned, state: state,
        planAdjusted: planAdjusted,
        utilisationPercent: disp ? disp.utilisationPercent : null,
        usableVolumeFt3: disp ? disp.usableVolumeFt3 : null,
        vehicleName: disp ? disp.name : null
      },
      nearThreshold: prepared.nearThreshold
    };
  }

  /** Whole numbers from 10 up, one decimal below, so "3.5 ft3" is not shown as "4". */
  function formatVolume(v) {
    if (!isFinite(v) || v <= 0) return '0';
    if (v < 0.05) return '<0.1'; // a tiny custom item should not read as zero
    if (v >= 10) return String(Math.round(v));
    return String(Math.round(v * 10) / 10);
  }

  TSE.Estimator = { prepareVehicles: prepareVehicles, evaluate: evaluate, formatVolume: formatVolume, MAX_QTY: 99 };
})(typeof window !== 'undefined' ? window : globalThis);
