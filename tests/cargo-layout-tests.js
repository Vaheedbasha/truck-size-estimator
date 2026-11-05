/*
 * cargo-layout-tests.js (ES module) - checks for the 3D data flow: configured item sizes, the loading plan (no shrinking,
 * fragile / stacking rules, overflow), dismantled furniture, vehicle profiles and the 3D models.
 * Loaded by tests/estimator-tests.html (needs its import map for 'three'). Returns { results, passed, failed }.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createItemFactory } from '../assets/js/3d/item-models.js';
import { buildTruck } from '../assets/js/3d/truck-model.js';
import { SPECS, specFor, isKnownType, dimsFor, handlingFor, FT3_TO_M3 } from '../assets/js/3d/item-specs.js';
import { packCargo, packOverflow, validatePlacements, bayFromVehicle, planVehicles } from '../assets/js/3d/cargo-layout.js';

export function runLayoutTests(data, TSE, demos) {
  const results = [];
  const t = (name, fn) => { try { fn(); results.push({ name, ok: true }); } catch (e) { results.push({ name, ok: false, error: e && e.message ? e.message : String(e) }); } };
  const ok = (c, m) => { if (!c) throw new Error(m || 'condition is false'); };
  const eq = (a, b, m) => { if (a !== b) throw new Error((m || 'differs') + ': expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)); };
  const sorted3 = (a) => a.slice().sort((x, y) => x - y).map((x) => Math.round(x * 1000) / 1000);

  const catalogue = TSE.Catalogue.create(data.items, data.categories);
  const prepared = TSE.Estimator.prepareVehicles(data.vehicles);
  const evalLines = (rows, custom) => { const inv = TSE.Inventory.create(catalogue); inv.load(rows); (custom || []).forEach((c) => inv.addCustom(c)); return TSE.Estimator.evaluate(inv.getLines(), catalogue, prepared, {}); };
  const bays = prepared.vehicles.map((v) => ({ id: v.id, bay: bayFromVehicle(v), usable: v.usableVolumeFt3 }));
  const bay = (id) => bays.find((b) => b.id === id);
  const pack = (blocks, b) => packCargo(JSON.parse(JSON.stringify(blocks)), b.bay);
  const factory = createItemFactory(THREE, RoundedBoxGeometry);
  const partTypes = new Set();
  catalogue.items.forEach((i) => i.variants.forEach((v) => (v.parts || []).forEach((p) => partTypes.add(p.type))));

  // ---------------- models and specs ----------------
  t('Every catalogue item and dismantled part has a stable visualType with a spec and a 3D model', () => {
    const missing = [];
    catalogue.items.forEach((i) => { if (!i.visualType) missing.push(i.id + ' (no visualType)'); else if (!isKnownType(i.visualType)) missing.push(i.id + ' (' + i.visualType + ' has no spec)'); else if (!factory.hasModel(i.visualType)) missing.push(i.id + ' (' + i.visualType + ' has no 3D model)'); });
    partTypes.forEach((p) => { if (!isKnownType(p) || !factory.hasModel(p)) missing.push('part type ' + p); });
    ok(!missing.length, missing.slice(0, 5).join('; '));
  });
  t('Unknown visual types fall back to a placeholder crate (never nothing)', () => {
    const g = factory.build('no_such_type', 0.6, 0.5, 0.5, {});
    ok(g.children.length > 0 && g.userData.placeholder === true, 'placeholder missing');
    ok(specFor('no_such_type') === SPECS.box, 'spec fallback');
  });
  t('Every model builds at its configured size with a sensible bounding box (flat parts stay flat)', () => {
    Object.keys(SPECS).forEach((type) => {
      const [w, d, h] = SPECS[type].dims;
      const g = factory.build(type, w, d, h, { variant: 1 });
      ok(g.children.length > 0, type + ' has no meshes');
      const box = new THREE.Box3().setFromObject(g), s = box.getSize(new THREE.Vector3());
      ok(s.x > 0 && s.y > 0 && s.z > 0, type + ' has an empty box');
      ok(s.y <= h * 1.6 + 0.2 && s.x <= w * 1.7 + 0.25 && s.z <= d * 2.2 + 0.25, type + ' much larger than its slot: ' + s.toArray().map((v) => v.toFixed(2)).join('x'));
    });
    ['flatpanel', 'rails', 'slats'].forEach((type) => { const [w, d, h] = SPECS[type].dims; const s = new THREE.Box3().setFromObject(factory.build(type, w, d, h, {})).getSize(new THREE.Vector3()); ok(s.y < 0.12, type + ' is not flat: ' + s.y); });
  });

  // ---------------- configured sizes ----------------
  t('Every variant has configured dimensions (cm) that match its stated volume within 8 %, or lists flat parts', () => {
    const bad = [];
    catalogue.items.forEach((it) => { if (it.isBundle) return; it.variants.forEach((v) => {
      if (v.parts) { ok(v.dismantled === true && v.parts.length >= 3, it.id + '/' + v.id + ' parts'); v.parts.forEach((p) => { ok(p.dimsCm.length === 3 && p.dimsCm.every((x) => x > 0) && p.qty >= 1 && isKnownType(p.type), it.id + '/' + v.id + ' part ' + p.id); }); return; }
      if (!v.dimsCm || v.dimsCm.length !== 3 || v.dimsCm.some((x) => !(x > 0))) { bad.push(it.id + '/' + v.id + ' has no dimsCm'); return; }
      const ratio = (v.dimsCm[0] * v.dimsCm[1] * v.dimsCm[2] / 1e6) / (v.volumeFt3 * FT3_TO_M3);
      if (Math.abs(ratio - 1) > 0.08) bad.push(it.id + '/' + v.id + ' envelope/volume = ' + ratio.toFixed(2));
    }); });
    ok(!bad.length, bad.slice(0, 4).join('; '));
  });
  t('Block dimensions come from the selected variant, and differ between variants of the same item', () => {
    const a = evalLines([['sofa', '1-seater', 1]]).blocks[0], b = evalLines([['sofa', '3-seater', 1]]).blocks[0];
    const it = catalogue.getItem('sofa'), va = catalogue.getVariant(it, '1-seater'), vb = catalogue.getVariant(it, '3-seater');
    ok(JSON.stringify(a.dimsM) === JSON.stringify(va.dimsCm.map((x) => x / 100)) && JSON.stringify(b.dimsM) === JSON.stringify(vb.dimsCm.map((x) => x / 100)), 'dims not taken from the variant');
    ok(b.dimsM[0] > a.dimsM[0] * 1.5, '3-seater should be much wider than 1-seater');
    const d = dimsFor(b); ok(d.exact && Math.abs(d.w - b.dimsM[0]) < 1e-9, 'dimsFor must return the configured size');
  });
  t('Estimator blocks carry visualType, including bundle parts and custom items', () => {
    const e = evalLines([['dining-set-bundle', '4-seater-table-4-chairs', 1], ['sofa', '3-seater', 1]], [{ name: 'Rangoli stand', qty: 2, sizeId: 'medium' }]);
    ok(e.blocks.every((b) => b.visualType), 'a block has no visualType');
    ok(e.blocks.filter((b) => b.visualType === 'chair').length === 4 && e.blocks.some((b) => b.visualType === 'table'), 'bundle not expanded into table + 4 chairs');
    ok(e.blocks.filter((b) => b.custom && b.visualType === 'custom').length === 2, 'custom items should use the custom placeholder type');
    ok(e.blocks.filter((b) => b.visualType === 'chair').every((b) => b.dimsM && b.dimsExact), 'bundle parts must carry configured sizes');
  });
  t('Exact custom dimensions are used as entered (inches -> metres); approximate custom sizes are not exact', () => {
    const e = evalLines([], [{ name: 'Shelf', qty: 1, dimsIn: { l: 36, w: 12, h: 60 } }]);
    const d = dimsFor(e.blocks[0]);
    ok(d.exact && Math.abs(d.w - 0.9144) < 1e-6 && Math.abs(d.d - 0.3048) < 1e-6 && Math.abs(d.h - 1.524) < 1e-6, JSON.stringify(d));
    ok(dimsFor(evalLines([], [{ name: 'Thing', qty: 1, sizeId: 'large' }]).blocks[0]).exact === false);
  });

  // ---------------- no shrinking ----------------
  const demoSets = (demos || []).filter((d) => d.items && d.items.length);
  const expectedDims = (b) => { const d = dimsFor(b); return sorted3([d.w, d.d, d.h]); };
  t('NO SHRINKING: every placed box keeps exactly its configured dimensions, in every demo and every vehicle', () => {
    demoSets.forEach((d) => { const e = evalLines(d.items, d.custom); bays.forEach((b) => {
      const r = pack(e.blocks, b);
      r.placed.forEach((p) => eq(JSON.stringify(sorted3([p.ex, p.ey, p.ez])), JSON.stringify(expectedDims(p.block)), d.id + ' in ' + b.id + ': ' + p.id + ' changed size'));
    }); });
  });
  t('NO SHRINKING: adding items never changes the size of items that were already there (sofas, beds, wardrobes)', () => {
    const base = [['sofa', '3-seater', 2], ['bed', 'queen-assembled', 1], ['wardrobe', '3-door-standard-assembled', 1]];
    const b = bay('truck-19ft');
    const small = pack(evalLines(base).blocks, b);
    const big = pack(evalLines(base.concat([['carton', 'medium', 20], ['suitcase', 'medium', 6], ['refrigerator', 'double-door', 1], ['plastic-chair', 'standard', 12], ['books', 'about-100-books', 6]])).blocks, b);
    const dimsOf = (r) => { const m = {}; r.placed.concat(r.overflow.map((o) => ({ id: o.id, ex: o.dims[0], ey: o.dims[1], ez: o.dims[2] }))).forEach((p) => { m[p.id] = JSON.stringify(sorted3([p.ex, p.ey, p.ez])); }); return m; };
    const a = dimsOf(small), c = dimsOf(big);
    Object.keys(a).forEach((id) => eq(c[id], a[id], id + ' changed size when items were added'));
    ok(Object.keys(c).length > Object.keys(a).length + 30, 'the larger load should contain many more boxes');
    const sofa = small.placed.find((p) => p.block.visualType === 'sofa'); const it = catalogue.getItem('sofa'), v = catalogue.getVariant(it, '3-seater');
    eq(JSON.stringify(sorted3([sofa.ex, sofa.ey, sofa.ez])), JSON.stringify(sorted3(v.dimsCm.map((x) => x / 100))), 'sofa differs from the catalogue size');
  });
  t('Every unit is drawn: nothing is pooled, merged or hidden (99 small items stay 99 boxes)', () => {
    const e = evalLines([['hand-blender', 'standard', 99], ['mixer-grinder', '2-jar', 40], ['carton', 'medium', 60]]);
    const r = pack(e.blocks, bay('truck-19ft'));
    eq(r.placed.length + r.overflow.length, e.blocks.length, 'units lost');
    eq(r.hidden, 0, 'hidden units');
    ok(r.placed.every((p) => p.block.label && !/pooled|Small items packed/.test(p.block.label)), 'a pooled stand-in box was drawn');
    const z = packOverflow(r.overflow, 2.6); eq(z.placed.length, r.overflow.length, 'overflow boxes not all shown');
  });

  // ---------------- placement rules ----------------
  t('Layout: every demo load is valid in every vehicle (inside the bay, no overlaps, nothing floating, floor items on the floor)', () => {
    demoSets.forEach((d) => { const e = evalLines(d.items, d.custom); bays.forEach((b) => {
      const r = pack(e.blocks, b); const problems = validatePlacements(r.placed, b.bay); ok(!problems.length, d.id + ' in ' + b.id + ': ' + problems.slice(0, 3).join(', '));
      eq(r.placed.length + r.overflow.length, e.blocks.length, d.id + ' in ' + b.id + ': units lost');
    }); });
  });
  t('FRAGILE: nothing is ever stacked on a fragile item (checked geometrically over a mixed, crowded load)', () => {
    const rows = [['television', '55-inch', 2], ['glass-table', 'small-glass-table', 1], ['standing-mirror', 'full-length', 1], ['crockery-and-glass-carton', 'dish-pack', 3], ['carton', 'medium', 14], ['carton', 'large', 6], ['suitcase', 'medium', 4],
      ['plastic-storage-tub', 'large', 4], ['books', 'about-100-books', 4], ['refrigerator', 'double-door', 1], ['washing-machine', 'front-load', 1], ['sofa', '2-seater', 1]];
    const e = evalLines(rows);
    [bay('pickup-8ft'), bay('lcv-14ft'), bay('truck-17ft')].forEach((b) => {
      const r = pack(e.blocks, b); ok(!validatePlacements(r.placed, b.bay).length, 'invalid layout in ' + b.id);
      const frag = r.placed.filter((p) => p.hd.noTop);
      ok(frag.length >= (b.id === 'pickup-8ft' ? 1 : 3), 'expected fragile items to be placed in ' + b.id);
      frag.forEach((f) => r.placed.forEach((o) => {
        if (o === f) return;
        const sits = Math.abs(o.y - (f.y + f.ey)) < 0.011 && Math.min(o.x + o.ex, f.x + f.ex) - Math.max(o.x, f.x) > 1e-4 && Math.min(o.z + o.ez, f.z + f.ez) - Math.max(o.z, f.z) > 1e-4;
        ok(!sits, o.id + ' is stacked on fragile ' + f.id + ' in ' + b.id);
      }));
    });
  });
  t('FRAGILE: validatePlacements flags an item placed on top of a fragile one', () => {
    const fr = { id: 'tv', x: 0, y: 0, z: 0, ex: 1, ey: 0.2, ez: 0.6, support: 1, hd: { noTop: true, floor: false } };
    const box = { id: 'box', x: 0.1, y: 0.2, z: 0.1, ex: 0.4, ey: 0.3, ez: 0.4, support: 1, hd: { noTop: false, floor: false } };
    ok(validatePlacements([fr, box], { L: 5, W: 2, H: 2 }).some((p) => /fragile/.test(p)), 'the rule check did not fire');
  });
  t('FRAGILE: a fragile item may sit on a suitable non-fragile item (e.g. a TV on a carton or wardrobe) when the floor is full', () => {
    // fill the floor of the mini vehicle with floor-only appliances so the TV has to go on top of something
    const e = evalLines([['refrigerator', 'single-door', 1], ['washing-machine', 'front-load', 1], ['steel-almirah', 'small', 1], ['television', '32-inch', 1]]);
    const b = bay('mini-goods'); const r = pack(e.blocks, b); ok(!validatePlacements(r.placed, b.bay).length);
    const tv = r.placed.find((p) => p.block.visualType === 'tv');
    if (tv && tv.y > 1e-6) ok(tv.restsOn.length > 0 && tv.restsOn.every((id) => { const s = r.placed.find((p) => p.id === id); return s && !s.hd.noTop; }), 'TV rests on something that cannot carry it');
  });
  t('STACKING: items rest only on supports that can carry them; heavy items stay on the floor or on rigid supports', () => {
    const e = evalLines([['carton', 'medium', 10], ['book-carton-heavy-duty', 'small-heavy-duty', 4], ['steel-almirah', 'standard', 1], ['bean-bag', 'large', 2], ['mattress', 'queen', 1], ['toolbox', 'standard', 2], ['sofa', '3-seater', 1]]);
    const b = bay('lcv-14ft'); const r = pack(e.blocks, b); ok(!validatePlacements(r.placed, b.bay).length);
    const by = {}; r.placed.forEach((p) => { by[p.id] = p; });
    r.placed.forEach((p) => p.restsOn.forEach((id) => {
      const s = by[id]; ok(s && !s.hd.noTop && s.hd.load !== 'none', p.id + ' sits on a support that carries nothing: ' + id);
      if (p.hd.heavy) ok(s.hd.load === 'rigid' && (s.hd.heavy || s.hd.floor), 'heavy ' + p.id + ' rests on a weak support ' + id);
    }));
  });
  t('ORIENTATION: upright-only items (fridge, plants, TVs, LPG cylinder) are never laid on their side', () => {
    const e = evalLines([['refrigerator', 'double-door', 1], ['lpg-gas-cylinder', 'domestic-14-2-kg', 2], ['television', '43-inch', 1], ['indoor-plant', 'large-pot', 1], ['carton', 'large', 6]]);
    const r = pack(e.blocks, bay('lcv-14ft'));
    r.placed.filter((p) => handlingFor(p.block).upright).forEach((p) => { const spec = dimsFor(p.block); ok(Math.abs(p.ey - spec.h) < 1e-6, p.id + ' was laid down (height ' + p.ey + ' vs ' + spec.h + ')'); });
  });
  t('ORIENTATION: tall furniture that cannot stand in a low vehicle is laid down inside the bay, otherwise reported as overflow', () => {
    const e = evalLines([['wardrobe', '4-door-large-assembled', 1]]); const small = bay('mini-goods');
    const r = pack(e.blocks, small); const p = r.placed[0];
    if (p) ok(p.y + p.ey <= small.bay.H + 1e-6 && p.x + p.ex <= small.bay.L + 1e-6 && p.z + p.ez <= small.bay.W + 1e-6, 'wardrobe outside the bay');
    else eq(r.overflow.length, 1, 'wardrobe neither placed nor overflowed');
  });
  t('OVERFLOW: an upright-only item taller than the vehicle is reported as too big (not shrunk, not hidden)', () => {
    const e = evalLines([['refrigerator', 'french-multi-door', 1]]); const r = pack(e.blocks, bay('mini-goods'));
    eq(r.placed.length, 0, 'the fridge cannot stand in a 4.5 ft high body'); eq(r.overflow.length, 1); eq(r.overflow[0].reason, 'too-big');
  });
  t('OVERFLOW: over capacity returns overflow boxes (never silently dropped) and they do not overlap behind the vehicle', () => {
    const d = demoSets.find((x) => x.id === 'over'); const e = evalLines(d.items, d.custom); const b = bay('truck-19ft');
    const r = pack(e.blocks, b); ok(r.overflow.length > 0, 'expected overflow'); eq(r.placed.length + r.overflow.length, e.blocks.length, 'units lost');
    const z = packOverflow(r.overflow, 2.6); ok(!validatePlacements(z.placed, { L: 99, W: 99, H: 99 }).length, 'overflow boxes overlap'); eq(z.placed.length, r.overflow.length);
  });
  t('PLAN: planVehicles returns the first vehicle that physically takes everything, or says which vehicle could take the leftovers', () => {
    const e = evalLines([['sofa', '3-seater', 2], ['bed', 'queen-assembled', 1], ['carton', 'medium', 6]]);
    const fit = planVehicles(e.blocks, prepared.vehicles, 0);
    ok(fit.fitIndex >= 0, 'a modest load should fit somewhere'); eq(fit.tried[fit.tried.length - 1].overflow, 0);
    const d = demoSets.find((x) => x.id === 'over'); const big = evalLines(d.items, d.custom);
    const plan = planVehicles(big.blocks, prepared.vehicles, prepared.vehicles.length - 1);
    eq(plan.fitIndex, -1, 'over-capacity demo must not fit the largest vehicle'); ok(plan.extra && plan.extra.count > 0, 'no extra-vehicle suggestion'); ok(plan.largestOverflow.count > 0);
  });
  t('Layout: deterministic (same input, identical placements)', () => {
    const d = demoSets.find((x) => x.id === 'near'); const e = evalLines(d.items); const b = bay('lcv-14ft');
    eq(JSON.stringify(pack(e.blocks, b).placed.map((p) => [p.id, p.x, p.y, p.z, p.perm])), JSON.stringify(pack(e.blocks, b).placed.map((p) => [p.id, p.x, p.y, p.z, p.perm])));
  });
  t('Layout: every single catalogue item in every vehicle is valid (placed or overflowed, never lost)', () => {
    let n = 0;
    catalogue.items.forEach((it) => it.variants.forEach((v) => {
      const e = evalLines([[it.id, v.id, 1]]);
      bays.forEach((b) => { const r = pack(e.blocks, b); const p = validatePlacements(r.placed, b.bay); ok(!p.length, it.id + '/' + v.id + ' in ' + b.id + ': ' + p[0]); eq(r.placed.length + r.overflow.length, e.blocks.length, it.id + ' units lost'); n++; });
    }));
    ok(n > 1000, 'only ' + n + ' combinations');
  });
  t('Layout: a large, mixed load (200+ boxes) packs quickly', () => {
    const rows = [['carton', 'medium', 40], ['carton', 'large', 20], ['suitcase', 'medium', 8], ['sofa', '3-seater', 2], ['bed', 'queen-assembled', 2], ['wardrobe', '3-door-standard-assembled', 3], ['refrigerator', 'double-door', 2], ['plastic-chair', 'standard', 20], ['books', 'about-100-books', 10], ['hand-blender', 'standard', 60], ['mixer-grinder', '2-jar', 40]];
    const e = evalLines(rows); const t0 = performance.now(); const r = pack(e.blocks, bay('truck-19ft')); const ms = performance.now() - t0;
    ok(ms < 4000, 'took ' + Math.round(ms) + ' ms'); ok(r.placed.length + r.overflow.length > 200, 'units ' + (r.placed.length + r.overflow.length));
  });

  // ---------------- dismantled furniture ----------------
  const partsOf = (itemId, variantId) => { const it = catalogue.getItem(itemId), v = catalogue.getVariant(it, variantId); return v.parts.reduce((a, p) => a + p.qty, 0); };
  t('DISMANTLED: a dismantled bed becomes flat components, never an assembled bed model', () => {
    const e = evalLines([['bed', 'queen-dismantled', 1], ['mattress', 'queen', 1]]);
    ok(!e.blocks.some((b) => b.visualType === 'bed' || b.visualType === 'bunk_bed'), 'an assembled bed was drawn for a dismantled variant');
    const bedBlocks = e.blocks.filter((b) => b.part); eq(bedBlocks.length, partsOf('bed', 'queen-dismantled'), 'part count');
    ['headboard', 'footboard', 'side rail', 'Slat set', 'Legs and fittings'].forEach((label) => ok(bedBlocks.some((b) => b.label.toLowerCase().indexOf(label.toLowerCase()) !== -1), 'missing part: ' + label));
    ok(bedBlocks.every((b) => b.dismantled && ['flatpanel', 'rails', 'slats', 'hardware'].indexOf(b.visualType) !== -1), 'unexpected part types');
    ok(e.blocks.some((b) => b.visualType === 'mattress' && !b.part), 'the separately selected mattress must still be drawn');
    const r = pack(e.blocks, bay('lcv-14ft')); eq(r.overflow.length, 0); r.placed.filter((p) => p.block.part).forEach((p) => ok(Math.min(p.ex, p.ey, p.ez) <= 0.21, p.id + ' is not a flat part'));
  });
  t('DISMANTLED: assembled variants of the same furniture still draw the assembled model', () => {
    ok(evalLines([['bed', 'queen-assembled', 1]]).blocks.every((b) => b.visualType === 'bed' && !b.part), 'bed');
    ok(evalLines([['wardrobe', '3-door-standard-assembled', 1]]).blocks.every((b) => b.visualType === 'wardrobe'), 'wardrobe');
  });
  t('DISMANTLED: wardrobes, tables and bunk beds are components too, with sizes from the variant data (not volume-scaled)', () => {
    [['wardrobe', '3-door-dismantled', 'wardrobe'], ['dining-table', '6-seater-dismantled', 'table'], ['bunk-bed', 'dismantled', 'bunk_bed'], ['wardrobe', '4-door-dismantled', 'wardrobe']].forEach(([id, v, asm]) => {
      const e = evalLines([[id, v, 1]]); ok(!e.blocks.some((b) => b.visualType === asm), id + '/' + v + ' drew an assembled ' + asm);
      eq(e.blocks.length, partsOf(id, v), id + '/' + v + ' blocks');
      const variant = catalogue.getVariant(catalogue.getItem(id), v);
      e.blocks.forEach((b) => ok(b.dimsExact && b.dimsSource === 'part' && b.dimsM.every((x) => x > 0), 'part without configured size'));
      const dims = e.blocks.map((b) => JSON.stringify(b.dimsM)).sort(); const want = variant.parts.flatMap((p) => Array(p.qty).fill(JSON.stringify(p.dimsCm.map((x) => x / 100)))).sort();
      eq(JSON.stringify(dims), JSON.stringify(want), id + '/' + v + ' sizes');
    });
  });
  t('DISMANTLED: a dismantled item counts once in the estimate (volume from the variant, parts not double counted)', () => {
    const e = evalLines([['bed', 'double-dismantled', 1]]); eq(e.unitCount, 1); ok(Math.abs(e.totalVolumeFt3 - 24) < 1e-9, 'volume ' + e.totalVolumeFt3);
  });
  t('DISMANTLED: bundles that contain assembled beds still expand into the assembled bed + mattress + bedside tables', () => {
    const e = evalLines([['bed-set-bundle', 'queen-bed-mattress-2-bedside-tables', 1]]);
    ok(e.blocks.some((b) => b.visualType === 'bed') && e.blocks.some((b) => b.visualType === 'mattress') && e.blocks.filter((b) => b.visualType === 'drawers').length === 2, 'bundle not expanded');
  });

  // ---------------- vehicles ----------------
  t('VEHICLES: Indian goods-vehicle classes, ascending capacity, clearly labelled as class-typical (no invented payloads)', () => {
    ok(prepared.vehicles.length >= 4, 'expected several vehicle classes');
    for (let i = 1; i < prepared.vehicles.length; i++) ok(prepared.vehicles[i].usableVolumeFt3 > prepared.vehicles[i - 1].usableVolumeFt3, 'not ascending');
    ok(/NOT manufacturer specifications/i.test(prepared.notice), 'the notice must say these are not manufacturer specifications');
    ok(/unverified/.test(prepared.dataStatus), 'data status must say unverified');
    prepared.vehicles.forEach((v) => { eq(v.dataStatus, 'class-typical', v.id); eq(v.payloadLimitKg, null, v.id + ' must not claim a payload'); ok(v.model && v.shortName, v.id + ' model/shortName'); });
    ok(/mini/i.test(prepared.vehicles[0].name) && prepared.vehicles.some((v) => /pickup/i.test(v.name)) && prepared.vehicles.some((v) => /14 ft/.test(v.name)), 'expected mini goods vehicle, pickup and 14 ft truck');
  });
  t('VEHICLES: every vehicle class builds a 3D model with its cargo bay at the configured size and wheels at both ends', () => {
    prepared.vehicles.forEach((v) => {
      const b = bayFromVehicle(v); const tr = buildTruck(THREE, b, { kind: v.model });
      ok(tr.group.children.length > 30, v.id + ' truck is too simple');
      const box = new THREE.Box3().setFromObject(tr.group), s = box.getSize(new THREE.Vector3());
      ok(s.x >= b.L && s.x < b.L + 4, v.id + ' length ' + s.x.toFixed(2) + ' vs bay ' + b.L.toFixed(2)); ok(s.y >= b.H, v.id + ' height');
      ok(Math.abs(tr.bayToWorld(0, 0, 0).y - tr.floorY) < 1e-9 && tr.rearX < tr.frontX, v.id + ' frame');
      tr.dispose();
    });
    const sizes = new Set(prepared.vehicles.map((v) => v.model)); ok(sizes.size >= 4, 'vehicle classes should not all use one model');
  });

  factory.dispose();
  const failed = results.filter((r) => !r.ok).length;
  return { results, passed: results.length - failed, failed };
}
