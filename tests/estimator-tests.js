/*
 * estimator-tests.js - repeatable checks for the calculation, search, inventory and layout code.
 * Open tests/estimator-tests.html through Apache to run them in the browser.
 * (Needs the shared files in assets/js to be loaded first; see the HTML page.)
 */
(function (root) {
  'use strict';
  var TSE = root.TSE;
  var results = [];

  function t(name, fn) {
    try { fn(); results.push({ name: name, ok: true }); }
    catch (e) { results.push({ name: name, ok: false, error: e && e.message ? e.message : String(e) }); }
  }
  function eq(actual, expected, msg) {
    if (actual !== expected) throw new Error((msg || 'values differ') + ': expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
  }
  function near(actual, expected, msg, eps) {
    if (Math.abs(actual - expected) > (eps || 1e-6)) throw new Error((msg || 'numbers differ') + ': expected ' + expected + ' but got ' + actual);
  }
  function ok(cond, msg) { if (!cond) throw new Error(msg || 'condition is false'); }

  function run(data) {
    results = [];
    var Est = TSE.Estimator;
    var catalogue = TSE.Catalogue.create(data.items, data.categories);
    var prepared = Est.prepareVehicles(data.vehicles);
    function fresh() { return TSE.Inventory.create(catalogue); }
    function evalInv(inv, pin) { return Est.evaluate(inv.getLines(), catalogue, prepared, { pinnedVehicleId: pin || null }); }
    function quick(items, custom) {
      var inv = fresh(); inv.load(items);
      (custom || []).forEach(function (c) { inv.addCustom(c); });
      return { inv: inv, est: evalInv(inv) };
    }

    // ---------------- data integrity ----------------
    t('Catalogue has no data problems', function () { eq(catalogue.problems.length, 0, catalogue.problems.join('; ')); });
    t('Eleven simple categories, in the agreed order, with unique ids', function () {
      eq(catalogue.categories.map(function (c) { return c.name; }).join(' | '),
        'Living Room | Bedroom | Kitchen | Dining Room | Appliances | Bathroom | Utility | Cartons & Personal Belongings | Study & Office | Balcony & Garden | Other Items');
      var ids = {}; catalogue.categories.forEach(function (c) { ids[c.id] = 1; });
      eq(Object.keys(ids).length, 11, 'unique category ids');
    });
    t('Every item sits in exactly one existing category, and every category has at least 8 items', function () {
      var count = {};
      catalogue.items.forEach(function (i) { ok(catalogue.categoryById(i.category), i.id + ' has unknown category ' + i.category); count[i.category] = (count[i.category] || 0) + 1; });
      catalogue.categories.forEach(function (c) { ok((count[c.id] || 0) >= 8, c.name + ' has only ' + (count[c.id] || 0)); });
    });
    t('Consolidating categories lost nothing: 247 items and all former ids and variants are still there', function () {
      eq(catalogue.items.length, 247, 'item count');
      ['sofa', 'bed', 'wardrobe', 'dining-table', 'refrigerator', 'lpg-gas-cylinder', 'upright-piano', 'bed-headboard', 'tv-unit-panels', 'treadmill', 'baby-cot', 'pooja-mandir-wooden'].forEach(function (id) { ok(catalogue.getItem(id), id + ' is missing'); });
      eq(catalogue.getItem('bed').variants.length, 8, 'bed variants'); eq(catalogue.getItem('wardrobe').variants.length, 7, 'wardrobe variants');
    });
    t('Search still finds items by their former category words (pooja, fitness, kids, music, electronics)', function () {
      ['pooja', 'fitness', 'kids', 'music', 'electronics', 'dismantled'].forEach(function (q) { ok(catalogue.search(q).length >= 3, q + ' finds too little'); });
    });
    t('Starter catalogue has at least 200 items and unique ids', function () {
      ok(catalogue.items.length >= 200, 'only ' + catalogue.items.length);
      var seen = {}; catalogue.items.forEach(function (i) { ok(!seen[i.id], 'duplicate ' + i.id); seen[i.id] = 1; });
    });
    t('Every item uses a drawn shape and has positive variant volumes', function () {
      catalogue.items.forEach(function (i) {
        ok(TSE.Icons.has(i.shape), i.id + ' uses unknown shape ' + i.shape);
        i.variants.forEach(function (v) { ok(catalogue.variantVolume(i, v) > 0, i.id + '/' + v.id + ' volume'); });
      });
    });
    t('Required Indian household items exist', function () {
      ['almirah', 'wardrobe', 'refrigerator', 'washing machine', 'air cooler', 'split ac', 'window ac', 'sofa', 'sofa-cum-bed', 'mattress', 'steel almirah',
        'pooja mandir', 'utensil carton', 'lpg', 'plastic chair', 'study table', 'water purifier', 'water dispenser', 'bucket', 'suitcase', 'treadmill', 'bicycle',
        'baby cot', 'stroller', 'sewing machine', 'large mirror', 'glass table'].forEach(function (q) {
        ok(catalogue.search(q).length > 0, 'nothing found for "' + q + '"');
      });
    });
    t('LPG cylinder is flagged restricted with a handling note', function () {
      var it = catalogue.getItem('lpg-gas-cylinder');
      ok(it && it.flags.indexOf('restricted') !== -1 && /confirm/i.test(it.note), 'missing flag/note');
    });

    // ---------------- search ----------------
    t('Search: fridge finds Refrigerator first', function () { eq(catalogue.search('fridge')[0].id, 'refrigerator'); });
    t('Search: refrigerator finds Refrigerator', function () { eq(catalogue.search('refrigerator')[0].id, 'refrigerator'); });
    t('Search: almirah finds both Wardrobe and Steel almirah', function () {
      var ids = catalogue.search('almirah').map(function (i) { return i.id; });
      ok(ids.indexOf('wardrobe') !== -1 && ids.indexOf('steel-almirah') !== -1, ids.join(','));
    });
    t('Search: wardrobe finds Wardrobe', function () { ok(catalogue.search('wardrobe').map(function (i) { return i.id; }).indexOf('wardrobe') !== -1); });
    t('Search: cooler finds Air cooler', function () { eq(catalogue.search('cooler')[0].id, 'air-cooler'); });
    t('Search: gas finds the LPG cylinder', function () { eq(catalogue.search('gas cylinder')[0].id, 'lpg-gas-cylinder'); });
    t('Search: tolerates a spelling mistake (refrigrator)', function () { eq(catalogue.search('refrigrator')[0].id, 'refrigerator'); });
    t('Search: plural (sofas) works', function () { ok(catalogue.search('sofas').length > 0); });
    t('Search: nonsense gives no result, empty query gives none', function () { eq(catalogue.search('zzqxjw').length, 0); eq(catalogue.search('   ').length, 0); });

    t('Search: "a/c" and "ac" find air conditioners, not the air cooler', function () {
      ['a/c', 'ac', 'A/C'].forEach(function (q) { var ids = catalogue.search(q).map(function (i) { return i.id; }); ok(ids[0] === 'split-ac' || ids[0] === 'window-ac', q + ' -> ' + ids[0]); });
    });
    t('Search: two-letter words match whole words only (ac is not "accessories")', function () {
      var names = catalogue.search('ac').map(function (i) { return i.name; });
      ok(names.indexOf('Yoga mat & accessories') === -1, names.join(', ')); ok(names.length >= 2);
    });
    t('Search: pool table finds the pool/snooker table (manual review), not table tennis', function () {
      var r = catalogue.search('pool table')[0]; eq(r.id, 'pool-snooker-table'); eq(r.manualReview, true);
    });
    t('Search: short or distant words do not produce noise (rice, fan, scooter)', function () {
      var ids = function (q) { return catalogue.search(q).map(function (i) { return i.id; }); };
      ok(ids('rice').indexOf('ride-on-toy') === -1, 'rice -> ride-on toy'); ok(ids('fan').indexOf('baby-cot') === -1, 'fan -> baby cot');
      ok(ids('scooter').indexOf('air-cooler') === -1, 'scooter -> air cooler');
    });
    t('Catalogue copy is neutral (no "mover" wording in any note or name)', function () {
      ok(!/mover|packers/i.test(JSON.stringify(catalogue.items)), 'found mover/packers wording');
    });

    // ---------------- inventory ----------------
    t('Custom items: the same item added twice merges into one line instead of duplicating', function () {
      var inv = fresh(); var spec = { name: 'Rangoli stand', qty: 1, sizeId: 'medium', fragile: true, weightKg: '4', notes: 'glass top' };
      var a = inv.addCustom(spec), b = inv.addCustom(spec);
      ok(a.ok && b.ok && b.merged === true, 'second add should merge'); eq(inv.getLines().length, 1); eq(inv.getLines()[0].qty, 2);
      var c = inv.addCustom({ name: 'Rangoli stand', qty: 1, sizeId: 'large', fragile: true, weightKg: '4', notes: 'glass top' });
      ok(c.ok && !c.merged, 'a different size is a different item'); eq(inv.getLines().length, 2);
    });
    t('Custom items: weight, dismantled flag and notes are stored; bad weight is rejected', function () {
      var inv = fresh(); var r = inv.addCustom({ name: 'Wooden swing', qty: 1, sizeId: 'large', dismantled: true, weightKg: '12.34', notes: '  needs two people  ' });
      ok(r.ok, 'add'); var l = inv.getLine(r.key); eq(l.weightKg, 12.3); eq(l.dismantled, true); eq(l.notes, 'needs two people');
      ok(!inv.addCustom({ name: 'Heavy', qty: 1, sizeId: 'small', weightKg: 'abc' }).ok, 'text weight'); ok(!inv.addCustom({ name: 'Heavy', qty: 1, sizeId: 'small', weightKg: '-3' }).ok, 'negative weight');
      ok(!inv.addCustom({ name: 'Heavy', qty: 1, sizeId: 'small', weightKg: '99999' }).ok, 'absurd weight');
    });
    t('Custom items: editing keeps the line, validates again and refuses to duplicate another custom line', function () {
      var inv = fresh(); var a = inv.addCustom({ name: 'Stand', qty: 1, sizeId: 'small' }), b = inv.addCustom({ name: 'Cabinet', qty: 1, sizeId: 'large' });
      var e1 = inv.updateCustom(a.key, { name: 'Stand XL', qty: 3, dimsIn: { l: '20', w: '10', h: '30' } });
      ok(e1.ok, 'edit'); eq(inv.getLine(a.key).name, 'Stand XL'); eq(inv.getLine(a.key).qty, 3); eq(inv.getLine(a.key).approx, false);
      ok(!inv.updateCustom(a.key, { name: '', qty: 1, sizeId: 'small' }).ok, 'empty name'); eq(inv.getLine(a.key).name, 'Stand XL', 'a failed edit changes nothing');
      var e2 = inv.updateCustom(a.key, { name: 'Cabinet', qty: 1, sizeId: 'large' }); ok(!e2.ok, 'would duplicate ' + b.key);
    });
    t('Custom items can share a name with a catalogue item without touching it (separate custom lines)', function () {
      var inv = fresh(); inv.add('stool', 'standard', 1); var r = inv.addCustom({ name: 'Stool', qty: 2, sizeId: 'small' }); ok(r.ok, 'allowed');
      eq(inv.getQty('stool', 'standard'), 1, 'catalogue line untouched'); eq(inv.getLines().filter(function (l) { return l.kind === 'custom'; }).length, 1);
    });
    t('Catalogue stepper: zero is "not selected" - minus is disabled at 0 and never shows a bin; list rows keep the remove bin', function () {
      var z = TSE.UI.stepperHtml('Sofa', 0, 99, { zero: true }), one = TSE.UI.stepperHtml('Sofa', 1, 99, { zero: true }), row = TSE.UI.stepperHtml('Sofa', 1, 99);
      ok(/data-act="dec"[^>]*disabled/.test(z), 'minus disabled at 0'); ok(!/data-act="dec"[^>]*disabled/.test(one), 'minus enabled at 1'); ok(z.indexOf('#i-trash') === -1 && one.indexOf('#i-trash') === -1, 'no bin on cards'); ok(row.indexOf('#i-trash') !== -1, 'bin in list rows');
    });
    t('Quote form: notes longer than 500 characters are rejected; the rest of the rules are unchanged', function () {
      var base = { name: 'Anita Rao', phone: '9876543210', pickup: 'Bengaluru', destination: '560001', movingDate: '', consent: true };
      eq(Object.keys(TSE.QuoteForm.validate.all(base)).length, 0, 'valid');
      var long = JSON.parse(JSON.stringify(base)); long.notes = new Array(502).join('x'); ok(TSE.QuoteForm.validate.all(long).notes, 'notes limit');
    });
    t('Inventory: add, increase, decrease, remove', function () {
      var inv = fresh();
      var k = inv.add('sofa', '3-seater');
      eq(inv.getQty('sofa', '3-seater'), 1);
      inv.changeQty(k, 1); eq(inv.getQty('sofa', '3-seater'), 2);
      inv.changeQty(k, -1); eq(inv.getQty('sofa', '3-seater'), 1);
      inv.changeQty(k, -1); eq(inv.isEmpty(), true, 'removed at 0');
    });
    t('Inventory: quantity is clamped to 99 and bad input is ignored', function () {
      var inv = fresh(); var k = inv.add('carton', 'medium');
      inv.setQty(k, 500); eq(inv.getQty('carton', 'medium'), 99);
      inv.setQty(k, 'abc'); eq(inv.isEmpty(), true, 'NaN removes');
      eq(inv.add('nope', 'x'), null, 'unknown item');
      eq(inv.add('sofa', 'nope'), null, 'unknown variant');
    });
    t('Inventory: changing variant replaces, it does not add', function () {
      var inv = fresh(); var k = inv.add('sofa', '2-seater'); inv.setQty(k, 2);
      var nk = inv.setVariant(k, '3-seater');
      eq(inv.getQty('sofa', '2-seater'), 0); eq(inv.getQty('sofa', '3-seater'), 2);
      near(evalInv(inv).totalVolumeFt3, 84);
      void nk;
    });
    t('Inventory: switching to a variant already in the list merges quantities', function () {
      var inv = fresh(); inv.add('sofa', '2-seater', 1); inv.add('sofa', '3-seater', 2);
      inv.setVariant('sofa::2-seater', '3-seater');
      eq(inv.getQty('sofa', '3-seater'), 3); eq(inv.getLines().length, 1);
    });
    t('Inventory: reinsert puts a removed line back in place and keeps later edits', function () {
      var inv = fresh(); inv.add('sofa', '3-seater'); inv.add('carton', 'medium', 2); inv.add('mattress', 'single');
      var line = JSON.parse(JSON.stringify(inv.getLine('carton::medium'))), at = inv.indexOfKey('carton::medium');
      inv.remove('carton::medium'); inv.changeQty('sofa::3-seater', 1); // an edit made after the removal
      inv.reinsert(line, at);
      eq(inv.getLines().map(function (l) { return l.key; }).join(','), 'sofa::3-seater,carton::medium,mattress::single');
      eq(inv.getQty('sofa', '3-seater'), 2, 'later edit kept'); eq(inv.getQty('carton', 'medium'), 2);
      inv.reinsert(line, 0); eq(inv.getQty('carton', 'medium'), 4, 're-added line merges instead of duplicating'); eq(inv.getLines().length, 3);
    });
    t('Inventory: undo snapshot restores', function () {
      var inv = fresh(); inv.add('sofa', '3-seater', 2); var s = inv.snapshot(); inv.clear(); eq(inv.isEmpty(), true);
      inv.restore(s); eq(inv.getQty('sofa', '3-seater'), 2);
    });
    t('Custom item: validation errors', function () {
      var inv = fresh();
      var r = inv.addCustom({ name: '   ', qty: 1, sizeId: 'medium' }); eq(r.ok, false); ok(r.errors.name);
      r = inv.addCustom({ name: 'Thing', qty: 0, sizeId: 'medium' }); ok(r.errors.qty, 'qty 0');
      r = inv.addCustom({ name: 'Thing', qty: 100, sizeId: 'medium' }); ok(r.errors.qty, 'qty 100');
      r = inv.addCustom({ name: 'Thing', qty: 1 }); ok(r.errors.size, 'no size');
      r = inv.addCustom({ name: 'Thing', qty: 1, dimsIn: { l: '10', w: '', h: '' } }); ok(r.errors.dims, 'partial dims');
      r = inv.addCustom({ name: 'Thing', qty: 1, dimsIn: { l: '10', w: '-2', h: '5' } }); ok(r.errors.dims, 'negative dims');
      eq(inv.isEmpty(), true, 'nothing added by failed attempts');
    });
    t('Custom item: size preset is marked approximate; dimensions are exact', function () {
      var a = quick([], [{ name: 'Stool', qty: 2, sizeId: 'small' }]).est.lines[0];
      eq(a.approx, true); near(a.volumeFt3, 6);
      var b = quick([], [{ name: 'Box', qty: 1, dimsIn: { l: 36, w: 24, h: 30 } }]).est.lines[0];
      eq(b.approx, false); near(b.volumeFt3, 15, 'inches to ft3 (36x24x30 / 1728)');
    });
    t('Custom item: oversized sizes need a manual review; names are not trusted as HTML', function () {
      var r = quick([], [{ name: '<img src=x onerror=alert(1)>', qty: 1, sizeId: 'xlarge' }]);
      eq(r.est.warnings.manualReview.length, 1);
      eq(r.est.lines[0].name, '<img src=x onerror=alert(1)>', 'stored as plain text (the UI escapes it)');
      var esc = TSE.UI ? TSE.UI.esc(r.est.lines[0].name) : '&lt;';
      ok(esc.indexOf('<') === -1, 'escaped');
    });

    // ---------------- estimator ----------------
    t('Empty inventory: zero volume, no recommendation, state empty', function () {
      var e = evalInv(fresh());
      eq(e.totalVolumeFt3, 0); eq(e.recommendation.kind, 'none'); eq(e.display.state, 'empty'); eq(e.blocks.length, 0);
    });
    t('Vehicle usable volume = L x W x H x efficiency', function () {
      var v = prepared.vehicles;
      eq(v.length, 7, 'seven goods-vehicle classes');
      var by = {}; v.forEach(function (x) { by[x.id] = x; });
      near(by['mini-goods'].usableVolumeFt3, 7 * 4.8 * 4.5 * 0.75); near(by['pickup-8ft'].usableVolumeFt3, 8 * 5 * 4.8 * 0.75); near(by['lcv-10ft'].usableVolumeFt3, 10 * 5.5 * 5.5 * 0.75);
      near(by['lcv-14ft'].usableVolumeFt3, 14 * 6 * 6 * 0.75); near(by['truck-17ft'].usableVolumeFt3, 17 * 6.5 * 7 * 0.75);
      near(by['truck-19ft'].usableVolumeFt3, 19 * 7 * 7 * 0.75); near(by['truck-22ft'].usableVolumeFt3, 22 * 7.5 * 7 * 0.75);
    });
    t('One item: quantity x packed volume (2 x 3-seater sofa = 84)', function () { near(quick([['sofa', '3-seater', 2]]).est.totalVolumeFt3, 84); });
    t('Two items sum (84 + 28 = 112)', function () { near(quick([['sofa', '3-seater', 2], ['refrigerator', 'double-door', 1]]).est.totalVolumeFt3, 112); });
    t('Quantity up/down reverses the volume', function () {
      var inv = fresh(); var k = inv.add('carton', 'medium', 3); near(evalInv(inv).totalVolumeFt3, 9);
      inv.changeQty(k, 2); near(evalInv(inv).totalVolumeFt3, 15); inv.changeQty(k, -2); near(evalInv(inv).totalVolumeFt3, 9);
    });
    t('Bundle is counted once (queen bed set = bed 80 + mattress 26 + 2 x 5)', function () {
      near(quick([['bed-set-bundle', 'queen-bed-mattress-2-bedside-tables', 1]]).est.totalVolumeFt3, 116);
    });
    t('Bundle + same component is NOT double counted', function () {
      var e = quick([['bed-set-bundle', 'queen-bed-mattress-2-bedside-tables', 1], ['mattress', 'queen', 1]]).est;
      near(e.totalVolumeFt3, 116, 'covered by the bundle');
      var m = e.lines.filter(function (l) { return l.name === 'Mattress'; })[0];
      eq(m.coveredQty, 1); eq(m.countedQty, 0); eq(m.coveredBy, 'Bed set (bundle)');
    });
    t('Bundle + an EXTRA component counts only the extra piece', function () {
      var e = quick([['bed-set-bundle', 'queen-bed-mattress-2-bedside-tables', 1], ['mattress', 'queen', 2]]).est;
      near(e.totalVolumeFt3, 116 + 26);
    });
    t('Two bundles cover two components', function () {
      var e = quick([['dining-set-bundle', '4-seater-table-4-chairs', 2], ['dining-chair', 'standard', 8]]).est;
      near(e.totalVolumeFt3, 2 * (28 + 20), 'chairs fully covered');
    });
    t('Bundle blocks are expanded into its parts for the truck picture', function () {
      var e = quick([['dining-set-bundle', '4-seater-table-4-chairs', 1]]).est;
      eq(e.blocks.length, 5);
    });
    t('Small load: mini goods vehicle, comfortable', function () {
      var e = quick([['carton', 'medium', 10]]).est; // 30 ft3
      eq(e.recommendation.vehicleId, 'mini-goods'); eq(e.display.state, 'comfortable');
    });
    t('Threshold: exactly 80% is "near", just under is "comfortable"', function () {
      var eightyPct = 113.4 * 0.8; // 90.72 ft3 = 54 x 54 x 53.76 in
      var e = quick([], [{ name: 'Exact', qty: 1, dimsIn: { l: 54, w: 54, h: 53.76 } }]).est;
      near(e.totalVolumeFt3, eightyPct); eq(e.display.state, 'near', 'exactly 80%');
      var under = quick([], [{ name: 'Under', qty: 1, dimsIn: { l: 54, w: 54, h: 53.7 } }]).est;
      eq(under.display.state, 'comfortable');
    });
    t('Boundary: exactly 100% still fits the mini goods vehicle; above moves to the pickup', function () {
      var full = quick([], [{ name: 'Full', qty: 1, dimsIn: { l: 63, w: 60, h: 51.84 } }]).est; // 113.4 ft3
      near(full.totalVolumeFt3, 113.4); eq(full.recommendation.vehicleId, 'mini-goods'); eq(full.display.state, 'near');
      var over = quick([], [{ name: 'Over', qty: 1, dimsIn: { l: 63, w: 60, h: 51.9 } }]).est;
      eq(over.recommendation.vehicleId, 'pickup-8ft'); eq(over.display.state, 'comfortable');
    });
    t('Near capacity: suggests the smallest truck that fits and the next size', function () {
      var e = quick([['carton', 'large', 22]]).est; // 99 ft3 => 87% of the mini goods vehicle
      eq(e.recommendation.vehicleId, 'mini-goods'); eq(e.display.state, 'near'); eq(e.recommendation.nextVehicleId, 'pickup-8ft');
    });
    t('Over the largest truck: never claims a single truck fits', function () {
      var e = quick([], [{ name: 'Huge', qty: 1, dimsIn: { l: 300, w: 300, h: 20 } }]).est; // 1041 ft3, more than the largest class
      eq(e.recommendation.kind, 'multiple'); eq(e.display.state, 'over'); ok(e.recommendation.ratio > 1);
      ok(e.vehicles.every(function (v) { return !v.fits; }), 'no vehicle fits');
    });
    t('Pinned (viewed) truck that is too small is "over" while the recommendation stays the smallest fit', function () {
      var inv = fresh(); inv.add('carton', 'large', 40); // 180 ft3
      var e = evalInv(inv, 'mini-goods');
      eq(e.recommendation.vehicleId, 'lcv-10ft'); eq(e.display.vehicleId, 'mini-goods'); eq(e.display.state, 'over'); eq(e.display.pinned, true);
    });
    t('Weight is never reported as verified', function () { eq(quick([['sofa', '3-seater', 1]]).est.warnings.weightVerified, false); });
    t('Special items: piano is flagged for manual review, recommendation is provisional', function () {
      var e = quick([['upright-piano', 'upright-piano', 1]]).est;
      eq(e.warnings.manualReview.indexOf('Upright piano') !== -1, true); eq(e.recommendation.manualReview, true); eq(e.recommendation.provisional, true);
    });
    t('Variant-level manual review (large safe) is flagged, small safe is not', function () {
      eq(quick([['safe-locker', 'large-godrej-type-safe', 1]]).est.warnings.manualReview.length, 1);
      eq(quick([['safe-locker', 'small-home-safe', 1]]).est.warnings.manualReview.length, 0);
    });
    t('LPG cylinder is listed as restricted', function () {
      eq(quick([['lpg-gas-cylinder', 'domestic-14-2-kg', 1]]).est.warnings.restricted.length, 1);
    });
    t('Unknown-size custom item: estimate unavailable, not 0%', function () {
      var e = quick([], [{ name: 'Mystery', qty: 1, sizeId: 'unknown' }]).est;
      eq(e.display.state, 'unavailable'); eq(e.recommendation.kind, 'unavailable'); eq(e.warnings.unknown.length, 1);
    });
    t('Unknown item mixed with known items: partial estimate, flagged', function () {
      var e = quick([['sofa', '3-seater', 1]], [{ name: 'Mystery', qty: 1, sizeId: 'unknown' }]).est;
      near(e.totalVolumeFt3, 42); eq(e.recommendation.partial, true); eq(e.warnings.unknown.length, 1);
    });
    t('Invalid / inactive vehicle profiles are ignored (fail closed)', function () {
      var bad = Est.prepareVehicles({ vehicles: [
        { id: 'a', name: 'A', active: false, internalDimensionsFt: { length: 10, width: 5, height: 5 }, loadingEfficiency: 0.75 },
        { id: 'b', name: 'B', active: true, internalDimensionsFt: { length: 0, width: 5, height: 5 }, loadingEfficiency: 0.75 },
        { id: 'c', name: 'C', active: true, internalDimensionsFt: { length: 10, width: 5, height: 5 }, loadingEfficiency: 1.4 }
      ] });
      eq(bad.vehicles.length, 0); eq(bad.problems.length, 2);
      var inv = fresh(); inv.add('sofa', '3-seater');
      var e = Est.evaluate(inv.getLines(), catalogue, bad, {});
      eq(e.display.state, 'unavailable'); eq(e.recommendation.kind, 'unavailable');
    });
    t('Missing vehicle file does not crash', function () {
      var p = Est.prepareVehicles(null); eq(p.vehicles.length, 0);
      var inv = fresh(); inv.add('sofa', '3-seater');
      eq(Est.evaluate(inv.getLines(), catalogue, p, {}).display.state, 'unavailable');
    });
    t('formatVolume: one decimal below 10, whole numbers above', function () { eq(Est.formatVolume(3.5), '3.5'); eq(Est.formatVolume(94.5), '95'); eq(Est.formatVolume(0.25), '0.3'); eq(Est.formatVolume(0.0006), '<0.1'); eq(Est.formatVolume(0), '0'); });

    // ---------------- demo inventories keep their promises ----------------
    var demos = {}; (TSE.app ? TSE.app.demos : (root.TSE_DEMOS || [])).forEach(function (d) { demos[d.id] = d; });
    function demoEst(id) { var d = demos[id]; ok(d, 'demo ' + id + ' missing'); return quick(d.items, d.custom); }
    if (Object.keys(demos).length) {
      t('Demo "Small load" is comfortable in the mini goods vehicle', function () { var e = demoEst('small').est; eq(e.recommendation.vehicleId, 'mini-goods'); eq(e.display.state, 'comfortable'); });
      t('Demo "Medium load" is comfortable in the 14 ft truck', function () { var e = demoEst('medium').est; eq(e.recommendation.vehicleId, 'lcv-14ft'); eq(e.display.state, 'comfortable'); });
      t('Demo "Near capacity" is near in the 14 ft truck', function () { var e = demoEst('near').est; eq(e.recommendation.vehicleId, 'lcv-14ft'); eq(e.display.state, 'near'); });
      t('Demo "Over capacity" needs more than the largest truck', function () { var e = demoEst('over').est; eq(e.recommendation.kind, 'multiple'); eq(e.display.state, 'over'); });
      t('Demo "Special items" raises manual-review and restricted warnings', function () { var w = demoEst('special').est.warnings; ok(w.manualReview.length >= 2); eq(w.restricted.length, 1); });
      t('Demo "Unknown size" shows the unavailable state', function () { eq(demoEst('unknown').est.display.state, 'unavailable'); });
    }

    // ---------------- house sizes (step 1) ----------------
    if (data.presets && TSE.UIHouseSize) {
      var sizes = data.presets.presets;
      t('House sizes: Studio/1 RK, 1/2/3 BHK and 4+ BHK are defined, with no pre-selected items in the data', function () {
        eq(sizes.map(function (p) { return p.id; }).join(','), 'studio,1bhk,2bhk,3bhk,4bhk');
        var problems = TSE.UIHouseSize.validate(data.presets); eq(problems.length, 0, problems.join('; '));
        sizes.forEach(function (p) { ok(!p.items && !p.lines, p.id + ' must not carry an item list'); });
      });
      t('House sizes: validation catches bad data', function () {
        eq(TSE.UIHouseSize.validate({}).length, 1);
        eq(TSE.UIHouseSize.validate({ presets: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B', description: 'd' }, { id: 'b', label: 'B', description: 'd' }, { id: 'custom', label: 'C', description: 'd' }] }).length, 3);
      });
    }

    // ---------------- truck layout ----------------
    var Viz = TSE.TruckVisualizer;
    function layoutFor(items, vehicleId, custom) {
      var q = quick(items, custom); var v = prepared.vehicles.filter(function (x) { return x.id === vehicleId; })[0];
      return { layout: Viz.computeLayout(q.est.blocks, Viz.geometry(v), v.usableVolumeFt3), geo: Viz.geometry(v), est: q.est };
    }
    function overlaps(a, b) { return a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01; }
    t('Layout: within capacity, every block is placed inside the cargo bay and none overlap', function () {
      [['small', 'mini-goods'], ['medium', 'lcv-14ft'], ['near', 'lcv-14ft']].forEach(function (c) {
        var r = layoutFor(demos[c[0]].items, c[1]);
        eq(r.layout.overflow.length, 0, c[0] + ' overflow'); ok(r.layout.cargo.length > 0, c[0] + ' empty');
        r.layout.cargo.forEach(function (b, i) {
          ok(b.x >= -0.01 && b.y >= -0.01 && b.x + b.w <= r.geo.innerW + 0.01 && b.y + b.h <= r.geo.innerH + 0.01, c[0] + ' block ' + b.id + ' outside bay');
          for (var j = i + 1; j < r.layout.cargo.length; j++) ok(!overlaps(b, r.layout.cargo[j]), c[0] + ': ' + b.id + ' overlaps ' + r.layout.cargo[j].id);
        });
      });
    });
    t('Layout: a single item larger than the whole truck is clamped inside the bay', function () {
      var inv = fresh(); inv.add('pool-snooker-table', 'snooker-table', 1); var e = evalInv(inv); var v = prepared.vehicles[0]; var geo = Viz.geometry(v);
      var L = Viz.computeLayout(e.blocks, geo, v.usableVolumeFt3); eq(L.cargo.length, 1);
      var b = L.cargo[0]; ok(b.y >= 0 && b.x >= 0 && b.x + b.w <= geo.innerW + 0.01 && b.y + b.h <= geo.innerH + 0.01, 'block outside bay');
    });
    t('Layout: deterministic (same input twice gives identical output)', function () {
      var a = JSON.stringify(layoutFor(demos.medium.items, 'lcv-14ft').layout), b = JSON.stringify(layoutFor(demos.medium.items, 'lcv-14ft').layout);
      eq(a, b);
    });
    t('Layout: adding an item does not remove or reorder existing blocks arbitrarily', function () {
      var base = layoutFor([['sofa', '3-seater', 1], ['refrigerator', 'double-door', 1]], 'lcv-14ft').layout;
      var more = layoutFor([['sofa', '3-seater', 1], ['refrigerator', 'double-door', 1], ['carton', 'medium', 2]], 'lcv-14ft').layout;
      var ids = more.cargo.map(function (b) { return b.id; });
      base.cargo.forEach(function (b) { ok(ids.indexOf(b.id) !== -1, b.id + ' disappeared'); });
    });
    t('Layout: over capacity draws overflow blocks outside the truck', function () {
      var r = layoutFor(demos.over.items, 'truck-19ft'); ok(r.layout.overflowCount > 0, 'expected overflow');
    });
    t('Layout: filled area follows utilisation (fuller load covers more of the bay)', function () {
      function covered(items, vid) { var r = layoutFor(items, vid); return r.layout.cargo.reduce(function (s, b) { return s + b.w * b.h; }, 0) / (r.geo.innerW * r.geo.innerH); }
      var low = covered([['carton', 'medium', 6]], 'lcv-14ft'), mid = covered(demos.medium.items, 'lcv-14ft'), hi = covered(demos.near.items, 'lcv-14ft');
      ok(low < mid && mid < hi, 'coverage ' + low.toFixed(2) + ' < ' + mid.toFixed(2) + ' < ' + hi.toFixed(2));
    });
    t('Layout: very many small items are pooled into a bounded number of blocks', function () {
      var r = layoutFor([['hand-blender', 'standard', 99], ['mixer-grinder', '2-jar', 99]], 'truck-19ft'); ok(r.layout.cargo.length + r.layout.overflow.length <= 250);
    });

    // ---------------- quote form validation ----------------
    var V = TSE.QuoteForm && TSE.QuoteForm.validate;
    if (V) {
      t('Mobile: valid formats accepted', function () {
        ['9876543210', '98765 43210', '+91 98765 43210', '+919876543210', '919876543210', '09876543210', '6000000000', '98765-43210'].forEach(function (p) { eq(V.phone(p), '', p); });
      });
      t('Mobile: invalid formats rejected with a helpful message', function () {
        ['', '12345', '5876543210', '98765432101', 'abcdefghij', '+91 12345 67890', '98765 4321x'].forEach(function (p) { ok(V.phone(p) !== '', 'accepted ' + p); });
        ok(/10 digits/.test(V.phone('12345')), 'mentions 10 digits');
      });
      t('Pickup / destination: city or 6-digit PIN', function () {
        ['Bengaluru', 'New Delhi', '560001', "St. John's Wood", 'Navi Mumbai (Vashi)'].forEach(function (p) { eq(V.place(p, 'pickup'), '', p); });
        ['', '5600', '056001', '56000a', '12', '@@@', 'x'].forEach(function (p) { ok(V.place(p, 'pickup') !== '', 'accepted ' + p); });
      });
      t('Names and places in Indian scripts are accepted', function () {
        eq(V.name('अनीता राव'), ''); eq(V.place('बेंगलुरु', 'pickup'), ''); eq(V.name('தமிழ் செல்வன்'), '');
      });
      t('Name rules', function () {
        eq(V.name('Anita Rao'), ''); eq(V.name("Ravi O'Neil-Kumar"), ''); ok(V.name('') !== ''); ok(V.name('A') !== ''); ok(V.name('1234') !== ''); ok(V.name('<b>x</b>') !== '');
      });
      t('Moving date: optional, but never in the past', function () {
        eq(V.date(''), ''); ok(V.date('2001-01-01') !== ''); ok(V.date('not-a-date') !== '');
        var d = new Date(); d.setDate(d.getDate() + 3);
        var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        eq(V.date(iso), '');
      });
      t('validateAll collects every error and requires consent', function () {
        var e = V.all({ name: '', phone: '123', pickup: '', destination: '', movingDate: '', consent: false });
        eq(Object.keys(e).sort().join(','), 'consent,destination,name,phone,pickup');
        eq(Object.keys(V.all({ name: 'Anita Rao', phone: '9876543210', pickup: 'Pune', destination: '400001', movingDate: '', consent: true })).length, 0);
      });
    }

    var failed = results.filter(function (r) { return !r.ok; });
    return { results: results, passed: results.length - failed.length, failed: failed.length };
  }

  root.TSE_TESTS = { run: run };
})(typeof window !== 'undefined' ? window : globalThis);
