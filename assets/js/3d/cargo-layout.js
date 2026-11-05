/*
 * cargo-layout.js - deterministic 3D loading plan for household items inside a cargo bay (pure maths, no Three.js).
 *
 * Bay frame (metres): x = along the vehicle, 0 at the FRONT wall (cab side) growing towards the tailgate;
 *                     y = up from the floor; z = across the bay, 0..W.
 *
 * WHAT THIS DOES
 *   - Every counted item is one box whose width x depth x height are the DATA values of its variant (item-specs.js
 *     dimsFor). Boxes are never scaled, shrunk, merged or hidden to make things fit.
 *   - Boxes are placed with a height-map so that nothing intersects, nothing floats over empty space (at least 70 % of
 *     the base must rest on what is below) and nothing leaves the bay.
 *   - Handling rules (item-specs.js handlingFor):
 *       floor-only items (heavy / tall furniture, appliances) stay on the vehicle floor;
 *       upright-only items (fragile items, fridges, plants, flat-pack panels ...) are never laid on their side;
 *       an item may only rest on something whose top can carry it (rigid > carton > light > none);
 *       a FRAGILE item (or any item whose type carries nothing) never has anything on top of it, but it may sit
 *       on a suitable non-fragile item. Fragile items are therefore placed last among stackable items.
 *   - Order: floor-only items first (largest footprint first), then stackable carriers, then no-top items. If the
 *     first order leaves items outside, two other orders are tried and the best result is kept.
 *   - Whatever still has no valid place is returned as OVERFLOW (drawn outside the vehicle, with a reason), so the
 *     caller can recommend a larger or additional vehicle. Nothing is dropped.
 *
 * It is a planning illustration. It does not know weights, axle loads, lashing, door/lift clearances or how things are
 * really loaded, so a "fits" result is not a guarantee. The same input always gives the same layout.
 */
import { dimsFor, handlingFor, FT_TO_M } from './item-specs.js';

const CELL = 0.05;        // height-map resolution, metres
const STEP = 2;           // candidate positions are tried every STEP cells
const EPS = 1e-6;
const MIN_SUPPORT = 0.7;  // share of a stacked box's footprint that must be supported

// natural axes of a model: 0 = width, 1 = depth, 2 = height. perm[bayAxis] = natural axis that runs along bay x, y (up), z.
const UPRIGHT = [[0, 2, 1], [1, 2, 0]];                       // keep the natural top up, 2 rotations
const LAID = [[0, 1, 2], [2, 1, 0], [1, 0, 2], [2, 0, 1]];    // lay it down

/** Bay size in metres from a prepared vehicle (internal dimensions are stored in feet). */
export function bayFromVehicle(vehicle) {
  const d = vehicle.internalDimensionsFt;
  return { L: d.length * FT_TO_M, W: d.width * FT_TO_M, H: d.height * FT_TO_M };
}

function makeUnits(blocks) {
  return blocks.map((b) => {
    const d = dimsFor(b), hd = handlingFor(b);
    const dims = [d.w, d.d, d.h];
    return { block: b, id: b.id, dims, hd, volume: d.w * d.d * d.h,
      footprint: Math.max(d.w, d.d) * Math.min(d.w, d.d), longest: Math.max(d.w, d.d, d.h),
      sig: dims.map((x) => x.toFixed(3)).join('x') + '|' + (hd.floor ? 'F' : '') + (hd.upright ? 'U' : '') + (hd.noTop ? 'N' : '') + hd.load + (hd.heavy ? 'H' : '') };
  });
}

const phaseOf = (u) => (u.hd.floor ? 0 : (u.hd.noTop ? 2 : 1));
const ORDERS = [
  (a, b) => phaseOf(a) - phaseOf(b) || b.footprint - a.footprint || b.dims[2] - a.dims[2] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  (a, b) => phaseOf(a) - phaseOf(b) || b.volume - a.volume || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  (a, b) => phaseOf(a) - phaseOf(b) || b.longest - a.longest || b.footprint - a.footprint || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
];

/** Can the top of `sup` (already placed) carry `u`? */
function canCarry(sup, u) {
  if (sup.hd.noTop) return false;
  switch (sup.hd.load) {
    case 'rigid': return !u.hd.floor && (!u.hd.heavy || sup.hd.heavy || sup.hd.floor);
    case 'carton': return !u.hd.floor && !u.hd.heavy;
    case 'light': return !u.hd.floor && !u.hd.heavy && !u.hd.fragile;
    default: return false;
  }
}

class HeightMap {
  constructor(L, W) {
    this.nx = Math.floor(L / CELL + EPS); this.nz = Math.floor(W / CELL + EPS);
    this.h = new Float32Array(this.nx * this.nz);
    this.own = new Int32Array(this.nx * this.nz).fill(-1);
  }
  /** Highest surface under a footprint, the share of it that is supported, and whether every supporter can carry `u`. */
  probe(cx, cz, fx, fz, limit, u, placed) {
    const { nz, h, own } = this;
    let top = 0;
    for (let x = cx; x < cx + fx; x++) {
      const row = x * nz;
      for (let z = cz; z < cz + fz; z++) { const v = h[row + z]; if (v > top) { top = v; if (top > limit) return { top, support: 0, ok: false }; } }
    }
    if (top < EPS) return { top: 0, support: 1, ok: true };
    let sup = 0, ok = true;
    for (let x = cx; x < cx + fx && ok; x++) {
      const row = x * nz;
      for (let z = cz; z < cz + fz; z++) {
        if (h[row + z] >= top - 0.02) { sup++; const o = own[row + z]; if (o >= 0 && !canCarry(placed[o], u)) { ok = false; break; } }
      }
    }
    return { top, support: sup / (fx * fz), ok };
  }
  raise(cx, cz, fx, fz, top, idx) {
    const { nz, h, own } = this;
    for (let x = cx; x < cx + fx; x++) { const row = x * nz; for (let z = cz; z < cz + fz; z++) { h[row + z] = top; own[row + z] = idx; } }
  }
  supporters(cx, cz, fx, fz, top, placed) {
    const { nz, h, own } = this, ids = new Set();
    for (let x = cx; x < cx + fx; x++) { const row = x * nz; for (let z = cz; z < cz + fz; z++) if (h[row + z] >= top - 0.02 && own[row + z] >= 0) ids.add(placed[own[row + z]].id); }
    return Array.from(ids);
  }
}

function tryPlace(map, bay, u, orientations, placed, step) {
  let best = null, tooBig = true;
  for (let o = 0; o < orientations.length; o++) {
    const perm = orientations[o];
    const ex = u.dims[perm[0]], ey = u.dims[perm[1]], ez = u.dims[perm[2]];
    if (ey > bay.H + EPS || ex > bay.L + EPS || ez > bay.W + EPS) continue;
    const fx = Math.ceil(ex / CELL - 1e-6), fz = Math.ceil(ez / CELL - 1e-6);
    if (fx > map.nx || fz > map.nz) continue;
    tooBig = false;
    const limit = u.hd.floor ? EPS : bay.H - ey + EPS;
    for (let cx = 0; cx + fx <= map.nx; cx += step) {
      if (best && best.base < EPS && best.cx <= cx) break; // cannot beat an earlier floor position
      for (let cz = 0; cz + fz <= map.nz; cz += step) {
        const p = map.probe(cx, cz, fx, fz, limit, u, placed);
        if (u.hd.floor && p.top > EPS) continue;
        if (p.top > limit || !p.ok) continue;
        if (p.top > EPS && p.support < MIN_SUPPORT) continue;
        const score = p.top * 1000 + cx * 2 + cz * 0.01 + o * 0.5;
        if (!best || score < best.score) best = { score, cx, cz, fx, fz, base: p.top, support: p.support, perm, ex, ey, ez };
        if (p.top < EPS) break; // first free floor position along this row is the best for this x
      }
    }
    if (best && best.base < EPS) break; // a floor position in an earlier (more natural) orientation beats the rest
  }
  return { best, tooBig };
}

/** One packing attempt in a given order. */
function packOnce(units, bay, order) {
  const map = new HeightMap(bay.L, bay.W), placed = [], rest = [], failed = new Set();
  units.slice().sort(order).forEach((u) => {
    if (failed.has(u.sig)) { rest.push({ u, reason: u.tooBig ? 'too-big' : 'no-space' }); return; }
    // upright-only: keep the natural top up. Otherwise try upright first, then laid down.
    let r = tryPlace(map, bay, u, UPRIGHT, placed, STEP);
    let tooBig = r.tooBig;
    if (!r.best && !u.hd.upright) { const r2 = tryPlace(map, bay, u, LAID, placed, STEP); r = r2; tooBig = tooBig && r2.tooBig; }
    // nothing fits on the coarse 10 cm grid: look again on the fine 5 cm grid before giving up (a tight but real gap)
    if (!r.best && !tooBig) {
      r = tryPlace(map, bay, u, UPRIGHT, placed, 1);
      if (!r.best && !u.hd.upright) r = tryPlace(map, bay, u, LAID, placed, 1);
    }
    const best = r.best;
    if (!best) { failed.add(u.sig); u.tooBig = tooBig; rest.push({ u, reason: tooBig ? 'too-big' : 'no-space' }); return; }
    const top = best.base + best.ey;
    const restsOn = best.base > EPS ? map.supporters(best.cx, best.cz, best.fx, best.fz, best.base, placed) : [];
    const idx = placed.length;
    placed.push({
      id: u.id, block: u.block, perm: best.perm, exact: true, hd: u.hd,
      x: best.cx * CELL, y: best.base, z: best.cz * CELL, ex: best.ex, ey: best.ey, ez: best.ez, support: best.support, restsOn
    });
    map.raise(best.cx, best.cz, best.fx, best.fz, top, idx);
  });
  return { placed, rest };
}

function score(res) {
  let vol = 0; res.rest.forEach((r) => { vol += r.u.volume; });
  return [res.rest.length, vol];
}

/**
 * Place blocks (from Estimator.evaluate().blocks) into a bay. No item is ever resized.
 * @returns {{placed:Array, overflow:Array, hidden:number, totalCount:number, placedVolumeM3:number, overflowVolumeM3:number}}
 *   overflow entries: { id, block, dims:[w,d,h], reason: 'too-big' | 'no-space', hd }
 */
export function packCargo(blocks, bay) {
  const units = makeUnits(blocks);
  let res = packOnce(units, bay, ORDERS[0]);
  for (let i = 1; i < ORDERS.length && res.rest.length; i++) {
    const alt = packOnce(units, bay, ORDERS[i]);
    const a = score(alt), b = score(res);
    if (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1] - 1e-9)) res = alt;
  }
  let pv = 0, ov = 0;
  res.placed.forEach((p) => { pv += p.ex * p.ey * p.ez; });
  res.rest.forEach((r) => { ov += r.u.volume; });
  return {
    placed: res.placed,
    overflow: res.rest.map((r) => ({ id: r.u.id, block: r.u.block, dims: r.u.dims, exact: true, reason: r.reason, hd: r.u.hd })),
    hidden: 0, totalCount: units.length, placedVolumeM3: pv, overflowVolumeM3: ov
  };
}

/**
 * Lay overflow boxes on the ground in rows behind the vehicle (zone x runs away from the tailgate). Every box is shown.
 * Returns placements in zone frame: x = distance behind the tailgate, z across, y = 0 (all on the ground).
 */
export function packOverflow(items, zoneW) {
  const placed = []; let x = 0, z = 0, rowDepth = 0;
  items.forEach((it) => {
    const ex = it.dims[0], ez = it.dims[1], ey = it.dims[2]; // natural upright orientation, on the ground
    if (z + ez > zoneW && z > 0) { z = 0; x += rowDepth + 0.08; rowDepth = 0; }
    placed.push({ id: it.id, block: it.block, perm: UPRIGHT[0], exact: true, x, y: 0, z, ex, ey, ez, support: 1, restsOn: [], hd: it.hd });
    z += ez + 0.08; rowDepth = Math.max(rowDepth, ex);
  });
  return { placed, hidden: 0, depth: x + rowDepth };
}

/**
 * Check a layout. Returns a list of problem strings (empty = valid): out of bounds, overlapping boxes, floating boxes,
 * floor-only items off the floor, items resting on something that cannot carry them (including anything on a fragile item).
 */
export function validatePlacements(placed, bay) {
  const problems = [], tol = 1e-4;
  placed.forEach((p) => {
    if (p.x < -tol || p.y < -tol || p.z < -tol || p.x + p.ex > bay.L + tol || p.y + p.ey > bay.H + tol || p.z + p.ez > bay.W + tol) problems.push('out of bounds: ' + p.id);
    if (p.y > tol && p.support < MIN_SUPPORT - tol) problems.push('floating: ' + p.id);
    if (p.hd && p.hd.floor && p.y > tol) problems.push('floor-only item is raised: ' + p.id);
  });
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    for (let j = i + 1; j < placed.length; j++) {
      const b = placed[j];
      const ox = Math.min(a.x + a.ex, b.x + b.ex) - Math.max(a.x, b.x);
      const oz = Math.min(a.z + a.ez, b.z + b.ez) - Math.max(a.z, b.z);
      if (ox <= tol || oz <= tol) continue;
      const oy = Math.min(a.y + a.ey, b.y + b.ey) - Math.max(a.y, b.y);
      if (oy > tol) { problems.push('overlap: ' + a.id + ' / ' + b.id); continue; }
      // touching vertically: is one directly on top of the other?
      const upper = a.y >= b.y + b.ey - 0.01 && a.y <= b.y + b.ey + 0.01 ? [a, b] : (b.y >= a.y + a.ey - 0.01 && b.y <= a.y + a.ey + 0.01 ? [b, a] : null);
      if (upper && upper[1].hd && upper[0].hd) {
        const lower = upper[1], top = upper[0];
        if (lower.hd.noTop) problems.push('item on top of a fragile / no-load item: ' + top.id + ' on ' + lower.id);
      }
    }
  }
  return problems;
}

/**
 * Loading plan across a list of vehicles (prepared by Estimator.prepareVehicles, smallest first).
 * Starts at `startIndex` (the volume-based recommendation) and returns the first vehicle that physically takes every item,
 * or -1 when none does. In that case `extra` says which vehicle could take the leftovers as a second trip/vehicle.
 */
export function planVehicles(blocks, vehicles, startIndex = 0) {
  const tried = [];
  let fitIndex = -1, lastRes = null, lastIdx = -1;
  for (let i = Math.max(0, startIndex); i < vehicles.length; i++) {
    const res = packCargo(blocks, bayFromVehicle(vehicles[i]));
    tried.push({ vehicleId: vehicles[i].id, placed: res.placed.length, overflow: res.overflow.length, tooBig: res.overflow.filter((o) => o.reason === 'too-big').length });
    lastRes = res; lastIdx = i;
    if (!res.overflow.length) { fitIndex = i; break; }
  }
  let extra = null;
  if (fitIndex < 0 && lastRes && lastRes.overflow.length) {
    const left = lastRes.overflow.map((o) => o.block);
    for (let i = 0; i < vehicles.length; i++) {
      const r2 = packCargo(left, bayFromVehicle(vehicles[i]));
      if (!r2.overflow.length) { extra = { vehicleId: vehicles[i].id, count: left.length }; break; }
    }
    if (!extra) extra = { vehicleId: null, count: left.length };
  }
  return { fitIndex, fitVehicleId: fitIndex >= 0 ? vehicles[fitIndex].id : null, tried, extra,
    largestOverflow: fitIndex < 0 && lastRes ? { vehicleId: vehicles[lastIdx].id, count: lastRes.overflow.length, tooBig: lastRes.overflow.filter((o) => o.reason === 'too-big').length } : null };
}
