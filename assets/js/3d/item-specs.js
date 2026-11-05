/*
 * item-specs.js - physical handling rules and fallback proportions for each catalogue "visualType" (pure data, no Three.js).
 *
 * SIZE OF A DRAWN ITEM
 *   Every catalogue variant carries its own packed width x depth x height (data/household-items.json, "dimsCm").
 *   dimsFor() returns exactly that. Nothing in the 3D view ever scales an item to make it fit; if it does not fit it is
 *   shown outside the vehicle. The "dims" in SPECS below are only a FALLBACK proportion for a block that arrives
 *   without configured dimensions (for example a custom item with a rough size): it is scaled once to the item's volume.
 *   These sizes are approximate planning sizes (the item plus a packing allowance). They are not measured or verified.
 *
 * HANDLING RULES (used by cargo-layout.js)
 *   floor   = must stand on the vehicle floor (heavy or tall furniture and appliances); never placed on top of another item.
 *   upright = must keep its natural top up (never laid on its side). Fragile items are always treated as upright.
 *   load    = what the TOP of this item can carry:
 *               'rigid'  - flat, strong top (cabinets, wardrobes, appliances): carries any non-floor item
 *               'carton' - boxes and cases: carry other non-heavy items
 *               'light'  - soft or uneven top (mattress, bags, tables): carry only light, non-fragile items
 *               'none'   - carries nothing (sofas, plants, lamps, electronics ...)
 *             An item flagged "fragile" in the catalogue never carries anything, whatever its type.
 */
export const FT3_TO_M3 = 0.0283168;
export const FT_TO_M = 0.3048;

const F = true;
export const SPECS = {
  sofa: { dims: [1.9, 0.9, 0.85], floor: F, upright: F, load: 'none' },
  sofa_l: { dims: [2.4, 1.6, 0.85], floor: F, upright: F, load: 'none' },
  armchair: { dims: [0.85, 0.85, 0.9], floor: F, upright: F, load: 'none' },
  bed: { dims: [1.6, 2.1, 0.8], floor: F, upright: F, load: 'light' },
  bunk_bed: { dims: [1.0, 2.0, 1.7], floor: F, upright: F, load: 'none' },
  mattress: { dims: [1.5, 2.0, 0.22], load: 'light' },
  wardrobe: { dims: [1.2, 0.55, 2.0], floor: F, load: 'rigid' },
  almirah: { dims: [0.9, 0.5, 1.8], floor: F, load: 'rigid' },
  drawers: { dims: [0.8, 0.45, 1.0], floor: F, load: 'rigid' },
  table: { dims: [1.5, 0.9, 0.76], floor: F, upright: F, load: 'light' },
  coffeetable: { dims: [1.0, 0.55, 0.45], upright: F, load: 'light' },
  chair: { dims: [0.45, 0.5, 0.9], upright: F, load: 'none' },
  stool: { dims: [0.4, 0.4, 0.5], upright: F, load: 'light' },
  bench: { dims: [1.4, 0.4, 0.5], upright: F, load: 'light' },
  desk: { dims: [1.2, 0.6, 0.75], floor: F, upright: F, load: 'light' },
  cabinet: { dims: [0.9, 0.45, 1.6], floor: F, load: 'rigid' },
  shelf: { dims: [0.8, 0.35, 1.7], floor: F, load: 'rigid' },
  rack: { dims: [0.8, 0.4, 1.7], load: 'light' },
  trolley: { dims: [0.8, 0.45, 0.85], upright: F, load: 'light' },
  mandir: { dims: [0.7, 0.4, 1.1], floor: F, upright: F, load: 'none' },
  cot: { dims: [1.3, 0.7, 0.95], floor: F, upright: F, load: 'none' },
  swing: { dims: [1.5, 0.7, 1.4], floor: F, upright: F, load: 'none' },
  panel: { dims: [1.2, 0.12, 0.9], load: 'rigid' },
  frame: { dims: [0.7, 0.05, 0.55], load: 'none' },
  mirror: { dims: [0.5, 0.06, 1.6], load: 'none' },
  lamp: { dims: [0.4, 0.4, 1.6], upright: F, load: 'none' },
  roll: { dims: [1.5, 0.3, 0.3], load: 'light' },
  plant: { dims: [0.5, 0.5, 1.0], upright: F, load: 'none' },
  fridge: { dims: [0.7, 0.7, 1.7], floor: F, upright: F, load: 'rigid' },
  washer: { dims: [0.6, 0.6, 0.9], floor: F, upright: F, load: 'rigid' },
  acsplit: { dims: [0.9, 0.22, 0.3], load: 'none' },
  acwindow: { dims: [0.65, 0.6, 0.4], upright: F, load: 'light' },
  cooler: { dims: [0.6, 0.5, 1.1], floor: F, upright: F, load: 'light' },
  microwave: { dims: [0.5, 0.4, 0.3], upright: F, load: 'light' },
  appliance: { dims: [0.3, 0.25, 0.35], load: 'carton' },
  stove: { dims: [0.6, 0.5, 0.15], load: 'light' },
  cylinder: { dims: [0.3, 0.3, 0.55], upright: F, load: 'none' },
  purifier: { dims: [0.35, 0.18, 0.55], load: 'none' },
  dispenser: { dims: [0.35, 0.38, 1.05], floor: F, upright: F, load: 'none' },
  geyser: { dims: [0.35, 0.35, 0.5], upright: F, load: 'none' },
  fan: { dims: [0.45, 0.45, 1.2], load: 'none' },
  tv: { dims: [1.0, 0.2, 0.65], upright: F, load: 'none' },
  computer: { dims: [0.5, 0.35, 0.5], upright: F, load: 'none' },
  printer: { dims: [0.45, 0.4, 0.25], upright: F, load: 'none' },
  speaker: { dims: [0.25, 0.25, 0.9], upright: F, load: 'none' },
  battery: { dims: [0.3, 0.2, 0.25], upright: F, load: 'carton' },
  sewing: { dims: [0.5, 0.2, 0.4], load: 'carton' },
  safe: { dims: [0.5, 0.5, 0.6], floor: F, upright: F, load: 'rigid' },
  piano: { dims: [1.5, 0.65, 1.25], floor: F, upright: F, load: 'none' },
  aquarium: { dims: [0.9, 0.4, 0.6], upright: F, load: 'none' },
  keyboard: { dims: [1.0, 0.3, 0.15], load: 'none' },
  guitar: { dims: [0.4, 0.15, 1.05], load: 'none' },
  tabla: { dims: [0.5, 0.25, 0.3], load: 'none' },
  treadmill: { dims: [1.7, 0.75, 1.3], floor: F, upright: F, load: 'none' },
  bicycle: { dims: [1.7, 0.55, 1.0], floor: F, load: 'none' },
  dumbbell: { dims: [0.5, 0.2, 0.2], load: 'carton' },
  board: { dims: [0.9, 0.05, 0.7], load: 'light' },
  stroller: { dims: [0.6, 0.9, 1.0], upright: F, load: 'none' },
  carton: { dims: [0.5, 0.4, 0.4], load: 'carton' },
  box: { dims: [0.5, 0.4, 0.4], load: 'carton' },
  suitcase: { dims: [0.5, 0.3, 0.7], load: 'carton' },
  bag: { dims: [0.6, 0.3, 0.35], load: 'light' },
  bucket: { dims: [0.3, 0.3, 0.3], load: 'light' },
  tub: { dims: [0.5, 0.4, 0.3], load: 'carton' },
  clothes: { dims: [0.5, 0.4, 0.4], load: 'light' },
  books: { dims: [0.4, 0.3, 0.3], load: 'carton' },
  utensils: { dims: [0.4, 0.4, 0.3], load: 'carton' },
  toy: { dims: [0.4, 0.3, 0.4], load: 'light' },
  ladder: { dims: [0.5, 0.06, 1.8], load: 'none' },
  // dismantled furniture: components are drawn flat. [length, width, thickness]; thickness is the natural height.
  flatpack: { dims: [1.5, 0.9, 0.25], flat: F, load: 'rigid' },   // wrapped stack of boards/panels
  flatpanel: { dims: [1.5, 0.9, 0.04], flat: F, load: 'rigid' },  // one board (headboard, side panel, door, table top)
  rails: { dims: [2.0, 0.18, 0.05], flat: F, load: 'light' },     // long beams: bed rails, table legs, posts
  slats: { dims: [1.4, 1.9, 0.05], flat: F, load: 'rigid' },      // bed slats / plywood base
  hardware: { dims: [0.45, 0.25, 0.2], flat: F, load: 'carton' }, // bag or box of bolts, legs and fittings
  custom: { dims: [0.6, 0.5, 0.5], load: 'carton' }
};

export function specFor(type) { return SPECS[type] || SPECS.box; }
export function isKnownType(type) { return Object.prototype.hasOwnProperty.call(SPECS, type); }

/**
 * Visual size of ONE drawn item, in metres: { w, d, h, exact }.
 * exact = true when the block carries configured dimensions (catalogue variant, dismantled part, or exact custom size).
 * Without them the fallback proportions of the visualType are scaled once to the block's volume.
 */
export function dimsFor(block) {
  if (block.dimsM && block.dimsM.length === 3 && block.dimsM.every((x) => x > 0)) {
    return { w: block.dimsM[0], d: block.dimsM[1], h: block.dimsM[2], exact: true };
  }
  const spec = specFor(block.visualType);
  const volM3 = Math.max(block.volumeFt3 || 0, 0.01) * FT3_TO_M3;
  const base = spec.dims;
  const s = Math.cbrt(volM3 / (base[0] * base[1] * base[2]));
  return { w: base[0] * s, d: base[1] * s, h: base[2] * s, exact: false };
}

/**
 * Handling rules for one block, combining the type's rules with the catalogue flags carried by the block.
 * Returns { floor, upright, flat, load, fragile, heavy, noTop }.
 */
export function handlingFor(block) {
  const spec = specFor(block.visualType);
  const fragile = !!block.fragile, heavy = !!block.heavy;
  return {
    floor: !!spec.floor || !!block.floorOnly,
    flat: !!spec.flat,
    upright: !!spec.upright || fragile || !!spec.flat,
    load: fragile ? 'none' : (spec.load || 'carton'),
    fragile, heavy,
    noTop: fragile || spec.load === 'none'
  };
}
