/*
 * truck-visualizer.js - draws the 2D side-view truck and its cargo.
 *
 * This module only DRAWS. It never decides volume, percentage or which truck is
 * recommended: estimator.js supplies those numbers and this file turns them into
 * a repeatable picture. The picture is explanatory, not proof that items fit.
 *
 * How the cargo is drawn (deterministic - same input, same picture, no randomness):
 *   1. every selected unit becomes a block; very small units are pooled into carton blocks
 *   2. a block's AREA is proportional to its volume (scale = bay area x 0.82 / vehicle usable volume),
 *      so a fuller truck really looks fuller and the picture agrees with the percentage
 *   3. blocks are sorted (largest first, then by id) and packed in columns, starting at the
 *      cab end and filling towards the tailgate
 *   4. if the load is within capacity but the simple column packing cannot place everything,
 *      blocks are shrunk slightly until they fit; if the load is over capacity, blocks that do
 *      not fit are drawn faded outside the truck ("overflow")
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});
  var Icons = TSE.Icons;

  var NS = 'http://www.w3.org/2000/svg';
  var VB = { w: 800, h: 340 };
  var GROUND = 300;          // road surface y
  var FLOOR_Y = 236;         // top of the cargo floor (leaves room for full-size wheels below the chassis)
  var BAY_RIGHT = 590;       // right edge of the cargo box (cab starts just after)
  var PX_PER_FT_X = 26;
  var PX_PER_FT_Y = 30;
  var FILL_FACTOR = 0.82;    // share of the bay area covered when the truck is 100 % full
  var POOL_THRESHOLDS = [2, 4, 8, 16]; // ft3 - units smaller than this are pooled into cartons
  var POOL_CARTON_FT3 = 3;
  var MAX_BLOCKS = 120;
  var HARD_CAP = 220;
  var PAD = 2;               // gap around each block, px

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /** Bay rectangle (in SVG units) for a vehicle profile. Bigger dimensions draw a bigger box. */
  function geometry(vehicle) {
    var d = vehicle.internalDimensionsFt;
    var innerW = clamp(d.length * PX_PER_FT_X, 150, 470);
    var innerH = clamp(d.height * PX_PER_FT_Y, 120, 214);
    var outerLeft = BAY_RIGHT - innerW - 14;
    return {
      innerW: innerW, innerH: innerH,
      innerX: outerLeft + 8, innerY: FLOOR_Y - innerH,
      outerLeft: outerLeft, roofY: FLOOR_Y - innerH - 8,
      zoneRight: outerLeft - 12, zoneW: Math.max(0, outerLeft - 12 - 6)
    };
  }

  // ---------------- layout (pure functions) ----------------

  /** Turn estimator blocks into drawable units, pooling very small ones into cartons. */
  function prepareUnits(blocks) {
    var result = null;
    for (var t = 0; t < POOL_THRESHOLDS.length; t++) {
      var thr = POOL_THRESHOLDS[t], keep = [], pool = 0;
      blocks.forEach(function (b) {
        if (b.volumeFt3 < thr && !b.manual) pool += b.volumeFt3; else keep.push(b);
      });
      var n = Math.ceil(pool / POOL_CARTON_FT3 - 1e-9), pooled = [];
      for (var i = 0; i < n; i++) {
        pooled.push({ id: 'pool-' + i, shape: 'carton', volumeFt3: Math.min(POOL_CARTON_FT3, pool - POOL_CARTON_FT3 * i), label: 'Small items packed in cartons', pooled: true });
      }
      result = keep.concat(pooled);
      if (result.length <= MAX_BLOCKS) break;
    }
    var hidden = 0;
    if (result.length > HARD_CAP) {
      result.sort(function (a, b) { return b.volumeFt3 - a.volumeFt3 || (a.id < b.id ? -1 : 1); });
      hidden = result.length - HARD_CAP;
      result = result.slice(0, HARD_CAP);
    }
    return { units: result, hidden: hidden };
  }

  function sizeOf(unit, apf, scale, geo) {
    var ar = Icons.dims(unit.shape).ar;
    var area = unit.volumeFt3 * apf * scale * scale;
    var h = Math.sqrt(area / ar), w = h * ar;
    var maxH = geo.innerH * 0.96, maxW = geo.innerW * 0.9;
    if (h > maxH) { h = maxH; w = area / h; }
    if (w > maxW) { w = maxW; h = area / w; }
    // a single item bigger than the whole bay (over-capacity demo) is shown filling the bay, never beyond it
    return { w: Math.max(Math.min(w, maxW), 9), h: Math.max(Math.min(h, maxH), 9) };
  }

  /** Column packing, right to left. Returns placed boxes (x, y relative to the area's top-left) and the rest. */
  function pack(sized, W, H) {
    var cols = [], placed = [], rest = [], cursor = W;
    sized.forEach(function (b) {
      var cw = b.w + PAD * 2, ch = b.h + PAD * 2, col = null, i;
      for (i = 0; i < cols.length; i++) {
        if (cols[i].used + ch <= H + 0.5 && cw <= cols[i].w + 0.5) { col = cols[i]; break; }
      }
      if (!col) {
        if (cursor - cw < -0.5) { rest.push(b); return; }
        col = { right: cursor, w: cw, used: 0 };
        cursor -= cw;
        cols.push(col);
      }
      placed.push({
        unit: b.unit, w: b.w, h: b.h,
        x: col.right - col.w + (col.w - cw) / 2 + PAD,
        y: H - col.used - ch + PAD
      });
      col.used += ch;
    });
    return { placed: placed, rest: rest };
  }

  function sortUnits(units, apf, geo, scale) {
    var sized = units.map(function (u) {
      var s = sizeOf(u, apf, scale, geo);
      return { unit: u, w: s.w, h: s.h, area: s.w * s.h };
    });
    sized.sort(function (a, b) { return b.area - a.area || (a.unit.id < b.unit.id ? -1 : a.unit.id > b.unit.id ? 1 : 0); });
    return sized;
  }

  /**
   * @param {Array}  blocks            from Estimator.evaluate().blocks
   * @param {object} geo               geometry(vehicle)
   * @param {number} usableVolumeFt3   of the displayed vehicle
   * @returns {{cargo:Array, overflow:Array, hidden:number, overflowCount:number, shrink:number}}
   */
  function computeLayout(blocks, geo, usableVolumeFt3) {
    var prep = prepareUnits(blocks);
    var total = prep.units.reduce(function (s, u) { return s + u.volumeFt3; }, 0);
    var apf = geo.innerW * geo.innerH * FILL_FACTOR / usableVolumeFt3;
    var withinCapacity = total <= usableVolumeFt3 + 1e-9;
    var scale = 1, res = null, i;
    for (i = 0; i < 16; i++) {
      var sized = sortUnits(prep.units, apf, geo, scale);
      res = pack(sized, geo.innerW, geo.innerH);
      if (!res.rest.length || !withinCapacity) break;
      scale *= 0.94;
    }
    var cargo = res.placed.map(function (p) {
      return { id: p.unit.id, shape: p.unit.shape, label: p.unit.label, manual: !!p.unit.manual, x: p.x, y: p.y, w: p.w, h: p.h };
    });

    // Anything that did not fit is drawn faded in the open space beside the truck.
    var overflow = [], hidden = prep.hidden, overflowCount = 0;
    if (res.rest.length) {
      overflowCount = res.rest.length;
      if (geo.zoneW > 30) {
        var restSized = res.rest.map(function (b) { return { unit: b.unit, w: b.w, h: b.h }; });
        var zone = pack(restSized, geo.zoneW, geo.innerH);
        overflow = zone.placed.map(function (p) {
          return { id: p.unit.id, shape: p.unit.shape, label: p.unit.label, manual: !!p.unit.manual, x: p.x, y: p.y, w: p.w, h: p.h };
        });
        hidden += zone.rest.length;
      } else {
        hidden += res.rest.length;
      }
    }
    return { cargo: cargo, overflow: overflow, hidden: hidden, overflowCount: overflowCount, shrink: scale };
  }

  // ---------------- drawing ----------------

  /** One wheel: shadow, wheel arch over the body, tyre with tread, rim, five lug nuts and a hub. */
  function wheel(cx) {
    var R = 27, cy = GROUND - R, s = '<g class="t-wheelset">';
    s += '<ellipse class="t-shadow" cx="' + cx + '" cy="' + (GROUND + 1) + '" rx="' + (R + 3) + '" ry="3.5"/>';
    s += '<path class="t-arch" d="M' + (cx - R - 7) + ' ' + cy + 'A' + (R + 7) + ' ' + (R + 7) + ' 0 0 1 ' + (cx + R + 7) + ' ' + cy + 'Z"/>';
    s += '<circle class="t-tyre" cx="' + cx + '" cy="' + cy + '" r="' + R + '"/>';
    s += '<circle class="t-tread" cx="' + cx + '" cy="' + cy + '" r="' + (R - 3.5) + '"/>';
    s += '<circle class="t-rim" cx="' + cx + '" cy="' + cy + '" r="15"/>';
    s += '<circle class="t-rim2" cx="' + cx + '" cy="' + cy + '" r="10"/>';
    for (var k = 0; k < 5; k++) {
      var a = (k * 72 - 90) * Math.PI / 180;
      s += '<circle class="t-lug" cx="' + (cx + 6.6 * Math.cos(a)).toFixed(1) + '" cy="' + (cy + 6.6 * Math.sin(a)).toFixed(1) + '" r="1.7"/>';
    }
    return s + '<circle class="t-hub" cx="' + cx + '" cy="' + cy + '" r="3.2"/></g>';
  }

  function truckMarkup(geo) {
    var L = geo.outerLeft, outerW = BAY_RIGHT - L, s = '';
    // cargo bay background + corrugation lines (the open "transparent" side)
    s += '<rect class="t-bay" x="' + geo.innerX + '" y="' + geo.innerY + '" width="' + geo.innerW + '" height="' + geo.innerH + '"/>';
    for (var x = geo.innerX + 22; x < geo.innerX + geo.innerW - 6; x += 22) {
      s += '<path class="t-rib" d="M' + x + ' ' + geo.innerY + 'V' + FLOOR_Y + '"/>';
    }
    s += '<rect class="t-bayshade" x="' + geo.innerX + '" y="' + geo.innerY + '" width="' + geo.innerW + '" height="10"/>';
    s += '<g class="cargo-slot"></g>';
    // frame: floor, roof, rear post, front post, chassis
    s += '<rect class="t-navy" x="' + L + '" y="' + FLOOR_Y + '" width="' + outerW + '" height="10" rx="2"/>';
    s += '<rect class="t-navy" x="' + (L - 3) + '" y="' + geo.roofY + '" width="' + (outerW + 6) + '" height="8" rx="3"/>';
    s += '<rect class="t-navy" x="' + L + '" y="' + geo.roofY + '" width="8" height="' + (FLOOR_Y + 10 - geo.roofY) + '" rx="2"/>';
    s += '<rect class="t-navy" x="' + (BAY_RIGHT - 6) + '" y="' + geo.roofY + '" width="6" height="' + (FLOOR_Y + 10 - geo.roofY) + '" rx="2"/>';
    s += '<rect class="t-dark" x="' + (L + 6) + '" y="' + (FLOOR_Y + 10) + '" width="' + (738 - L - 6) + '" height="10" rx="2"/>';
    // cab (drawn for the old floor height, so lifted 12 px to sit on the chassis)
    s += '<g transform="translate(0,-12)">';
    s += '<path class="t-cab" d="M598 270V150Q598 128 620 126H674Q690 126 700 140L732 196Q738 206 738 220V270Z"/>';
    s += '<path class="t-glass" d="M610 148H668Q676 148 681 155L704 194H610Z"/>';
    s += '<path class="t-seam" d="M652 200V262"/><rect class="t-handle" x="636" y="214" width="12" height="3" rx="1.5"/>';
    s += '<rect class="t-accent" x="610" y="240" width="88" height="6" rx="3"/>';
    s += '<rect class="t-lamp" x="727" y="222" width="10" height="14" rx="3"/>';
    s += '<rect class="t-dark" x="728" y="254" width="17" height="14" rx="3"/>';
    s += '<rect class="t-dark" x="591" y="158" width="7" height="26" rx="2"/>';
    s += '</g>';
    // Real layout: the FRONT wheel sits under the cab, the REAR wheels sit at the back (tailgate end) of the body.
    // A long box gets a tandem (two-wheel) rear axle; a short one gets a single rear wheel.
    var rear = geo.innerW >= 260 ? [L + 66, L + 118] : [L + 58];
    var lastRear = rear[rear.length - 1];
    // fuel tank hanging between the axles
    s += '<rect class="t-tank" x="' + (lastRear + 60) + '" y="' + (FLOOR_Y + 20) + '" width="64" height="16" rx="6"/>';
    // rear: tail lights, step bumper and a mud flap behind the last rear wheel
    s += '<rect class="t-tail" x="' + (L - 3) + '" y="' + (FLOOR_Y - 16) + '" width="6" height="12" rx="2"/>';
    s += '<rect class="t-dark" x="' + (L - 8) + '" y="' + (FLOOR_Y + 14) + '" width="14" height="8" rx="2"/>';
    s += '<rect class="t-flap" x="' + (rear[0] - 40) + '" y="' + (FLOOR_Y + 22) + '" width="5" height="22" rx="1.5"/>';
    // wheels, rear first then front
    rear.forEach(function (cx) { s += wheel(cx); });
    s += wheel(690);
    return s;
  }

  function sceneMarkup() {
    return '<rect class="t-sky" x="0" y="0" width="' + VB.w + '" height="' + GROUND + '"/>' +
      '<rect class="t-road" x="0" y="' + GROUND + '" width="' + VB.w + '" height="' + (VB.h - GROUND) + '"/>' +
      '<path class="t-roadline" d="M0 ' + GROUND + 'H' + VB.w + '"/>' +
      '<path class="t-dash" d="M20 ' + (GROUND + 24) + 'H' + (VB.w - 20) + '"/>' +
      '<g class="overflow-slot"></g><g class="truck-slot"></g>';
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function reducedMotion() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /**
   * Mount a visualizer into `container` (an element that will hold the <svg> and HTML overlay).
   * Call .update(model) whenever the estimate changes.
   */
  function mount(container) {
    var svg = svgEl('svg', { viewBox: '0 0 ' + VB.w + ' ' + VB.h, role: 'img', 'class': 'truck-svg', preserveAspectRatio: 'xMidYMid meet', focusable: 'false' });
    svg.innerHTML = sceneMarkup();
    container.appendChild(svg);

    var overlay = document.createElement('div');
    overlay.className = 'truck-overlay';
    overlay.innerHTML = '<p class="truck-note" hidden></p><p class="truck-pill" hidden></p>';
    container.appendChild(overlay);
    var note = overlay.querySelector('.truck-note');
    var pill = overlay.querySelector('.truck-pill');

    var truckSlot = svg.querySelector('.truck-slot');
    var overflowSlot = svg.querySelector('.overflow-slot');
    var cargoSlot = null, clipRect = null;
    var geoKey = '';
    var nodes = {};      // id -> { el, shp, inner }
    var leaving = {};    // id -> timeout handle
    var clipId = 'bay-clip-' + Math.floor(Math.random() * 1e6);
    var defs = svgEl('defs');
    svg.insertBefore(defs, svg.firstChild);

    function ensureTruck(geo) {
      var key = geo.innerW + 'x' + geo.innerH;
      if (key === geoKey) return;
      geoKey = key;
      truckSlot.innerHTML = truckMarkup(geo);
      cargoSlot = truckSlot.querySelector('.cargo-slot');
      defs.innerHTML = '<clipPath id="' + clipId + '"><rect x="' + geo.innerX + '" y="' + geo.innerY + '" width="' + geo.innerW + '" height="' + geo.innerH + '"/></clipPath>';
      cargoSlot.setAttribute('clip-path', 'url(#' + clipId + ')');
      // existing blocks move into the new cargo layer so they can glide to new positions
      Object.keys(nodes).forEach(function (id) {
        if (!nodes[id].ghost) cargoSlot.appendChild(nodes[id].el);
      });
      // overflow zone outline
      overflowSlot.innerHTML = '';
    }

    function setBlock(rec, b, parent, ox, oy, ghost) {
      var d = Icons.dims(b.shape);
      rec.el.style.transform = 'translate(' + (ox + b.x).toFixed(1) + 'px,' + (oy + b.y).toFixed(1) + 'px)';
      rec.shp.style.transform = 'scale(' + (b.w / d.w).toFixed(4) + ',' + (b.h / d.h).toFixed(4) + ')';
      rec.badge.setAttribute('transform', 'translate(' + Math.max(7, b.w - 6).toFixed(1) + ',7)');
      rec.badge.style.display = b.manual ? '' : 'none';
      rec.title.textContent = b.label + (b.manual ? ' - may need a manual check' : '');
      if (rec.el.parentNode !== parent) parent.appendChild(rec.el);
      rec.el.classList.toggle('ghost', !!ghost);
      rec.ghost = !!ghost;
    }

    function createBlock(b) {
      var d = Icons.dims(b.shape);
      var el = svgEl('g', { 'class': 'blk' });
      var pop = svgEl('g', { 'class': 'pop' });
      var shp = svgEl('g', { 'class': 'shp shape ' + d.toneClass });
      shp.innerHTML = Icons.body(b.shape);
      var badge = svgEl('g', { 'class': 'blk-badge' });
      badge.innerHTML = '<circle r="6.5" class="bd-c"/><path class="bd-m" d="M0 -3.2V0.8M0 3.2V3.3"/>';
      var title = svgEl('title');
      pop.appendChild(shp); pop.appendChild(badge);
      el.appendChild(pop); el.appendChild(title);
      return { el: el, shp: shp, badge: badge, title: title, ghost: false, isNew: true };
    }

    function removeNode(id) {
      var rec = nodes[id];
      if (!rec) return;
      if (reducedMotion()) { if (rec.el.parentNode) rec.el.parentNode.removeChild(rec.el); delete nodes[id]; return; }
      rec.el.classList.add('leaving');
      leaving[id] = setTimeout(function () {
        if (rec.el.parentNode) rec.el.parentNode.removeChild(rec.el);
        delete nodes[id]; delete leaving[id];
      }, 220);
    }

    function showNote(text) { note.hidden = !text; note.textContent = text || ''; }
    function showPill(text) { pill.hidden = !text; pill.textContent = text || ''; }

    /**
     * @param {object} m
     *   vehicle  - prepared vehicle (internalDimensionsFt, usableVolumeFt3, name)
     *   blocks   - Estimator.evaluate().blocks
     *   state    - 'empty' | 'comfortable' | 'near' | 'over' | 'unavailable'
     *   percent  - utilisation of this vehicle (number) or null
     *   volumeText, emptyText
     */
    function update(m) {
      if (!m.vehicle) {
        svg.setAttribute('aria-label', 'Truck illustration unavailable because no vehicle data is loaded.');
        showNote('Truck data could not be loaded.'); showPill('');
        return null;
      }
      var geo = geometry(m.vehicle);
      ensureTruck(geo);
      var layout = computeLayout(m.state === 'empty' || m.state === 'unavailable' ? [] : m.blocks, geo, m.vehicle.usableVolumeFt3);

      var seen = {};
      layout.cargo.forEach(function (b) {
        var rec = nodes[b.id];
        if (rec && leaving[b.id]) { clearTimeout(leaving[b.id]); delete leaving[b.id]; rec.el.classList.remove('leaving'); }
        if (!rec) { rec = nodes[b.id] = createBlock(b); }
        setBlock(rec, b, cargoSlot, geo.innerX, geo.innerY, false);
        seen[b.id] = true;
      });
      layout.overflow.forEach(function (b) {
        var rec = nodes[b.id];
        if (rec && leaving[b.id]) { clearTimeout(leaving[b.id]); delete leaving[b.id]; rec.el.classList.remove('leaving'); }
        if (!rec) { rec = nodes[b.id] = createBlock(b); }
        setBlock(rec, b, overflowSlot, geo.zoneRight - geo.zoneW, geo.innerY, true);
        seen[b.id] = true;
      });
      Object.keys(nodes).forEach(function (id) { if (!seen[id] && !leaving[id]) removeNode(id); });

      // dashed outline for the overflow area, only when something is drawn there
      var outline = overflowSlot.querySelector('.zone-outline');
      if (layout.overflow.length) {
        if (!outline) { outline = svgEl('rect', { 'class': 'zone-outline', rx: 6 }); overflowSlot.insertBefore(outline, overflowSlot.firstChild); }
        outline.setAttribute('x', geo.zoneRight - geo.zoneW); outline.setAttribute('y', geo.innerY);
        outline.setAttribute('width', geo.zoneW); outline.setAttribute('height', geo.innerH);
      } else if (outline) { outline.parentNode.removeChild(outline); }

      // HTML overlay messages (kept as real text so they stay readable on phones)
      if (m.state === 'empty' || m.state === 'unavailable') {
        showNote(m.state === 'empty' ? (m.emptyText || 'Add items to load the truck') : (m.unavailableText || 'No estimate available yet'));
        if (geo.innerW >= 280) { // roomy cargo bay: put the message inside it
          place(note, geo.innerX + geo.innerW / 2, geo.innerY + geo.innerH / 2, geo.innerW * 0.8);
        } else { // small bay: use the open road space in front of the truck instead
          place(note, geo.outerLeft / 2, geo.innerY + geo.innerH / 2, Math.min(geo.outerLeft - 40, 360));
        }
      } else { showNote(''); }

      if (m.state === 'over') {
        showPill(m.excessText ? 'Over capacity by ' + m.excessText : 'Over capacity');
      } else if (layout.hidden > 0) {
        showPill('Picture shows the largest ' + (layout.cargo.length + layout.overflow.length) + ' items');
      } else { showPill(''); }

      svg.setAttribute('aria-label',
        'Side view of a ' + m.vehicle.name.toLowerCase() + (m.state === 'empty' ? ' with an empty cargo area.' :
          m.state === 'unavailable' ? ' with no estimate available.' :
            ' with a representative load, about ' + Math.round(m.percent) + ' percent of its estimated capacity. Illustration only.'));
      return layout;
    }

    function place(el, cx, cy, maxW) {
      el.style.left = (cx / VB.w * 100).toFixed(2) + '%';
      el.style.top = (cy / VB.h * 100).toFixed(2) + '%';
      el.style.maxWidth = (maxW / VB.w * 100).toFixed(2) + '%';
    }

    return { update: update, svg: svg };
  }

  TSE.TruckVisualizer = { mount: mount, computeLayout: computeLayout, geometry: geometry, prepareUnits: prepareUnits, VB: VB };
})(typeof window !== 'undefined' ? window : globalThis);
