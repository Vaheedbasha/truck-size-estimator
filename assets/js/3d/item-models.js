/*
 * item-models.js - reusable procedural 3D models for household goods (Three.js).
 *
 * createItemFactory(THREE, RoundedBoxGeometry) returns { build(type, w, d, h, opts), dispose() }.
 *   - Every model is built from a handful of SHARED unit geometries (box, rounded box, cylinder, sphere ...) that are
 *     scaled per mesh, and from SHARED materials, so adding many identical items costs almost no extra memory.
 *   - A model's local frame: X = width, Y = up (height), Z = depth, origin at the centre of its base, the "front"
 *     of the object faces +Z.
 *   - build() returns a THREE.Group sized exactly w x h x d metres.
 *   - Unknown types get a labelled-crate placeholder (the viewer adds the text label), never nothing.
 * Model keys match the catalogue's "visualType" values (see item-specs.js).
 */
export function createItemFactory(THREE, RoundedBoxGeometry) {
  const geos = {
    box: new THREE.BoxGeometry(1, 1, 1),
    rbox: new RoundedBoxGeometry(1, 1, 1, 3, 0.07),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
    taper: new THREE.CylinderGeometry(0.5, 0.36, 1, 24),
    shade: new THREE.CylinderGeometry(0.3, 0.5, 1, 24, 1, true),
    sph: new THREE.SphereGeometry(0.5, 20, 14),
    hemi: new THREE.SphereGeometry(0.5, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    cone4: new THREE.ConeGeometry(0.5, 1, 4),
    torus: new THREE.TorusGeometry(0.5, 0.045, 8, 28)
  };
  geos.cone4.rotateY(Math.PI / 4);

  const PALETTE = {
    wood: '#C9A27A', woodDark: '#8A5A3B', woodLight: '#E3C9A4', fabric: '#4A6597', fabricLight: '#6D87B8', fabricWarm: '#E9A93B',
    cream: '#F4EEE2', white: '#F4F6F8', offWhite: '#E6EBF0', steel: '#C5CED8', steelDark: '#8794A3', black: '#1F2937', charcoal: '#374151',
    carton: '#C89B66', carton2: '#BA8C57', carton3: '#D2A873', tape: '#E8D3A6', label: '#F3E9D2', plastic: '#3B82F6', plasticLight: '#93C5FD',
    green: '#4F9D69', greenDark: '#3A7A52', pot: '#B4663E', red: '#C2413B', redDark: '#8E2B27', gold: '#D4A937', navy: '#172554', orange: '#F59E0B',
    teal: '#2A8C8C', maroon: '#7F2A3A', soil: '#5A3F2C', skin: '#B98A62', rubber: '#2B2F36', blue: '#2563EB', pink: '#E7A4B6', lime: '#A3C94F'
  };
  const mats = {};
  function mat(name, opts) {
    const key = name + (opts ? JSON.stringify(opts) : '');
    if (!mats[key]) {
      const color = PALETTE[name] || name;
      const o = Object.assign({ color, roughness: 0.62, metalness: 0.04 }, opts || {});
      mats[key] = new THREE.MeshStandardMaterial(o);
    }
    return mats[key];
  }
  const glass = () => mat('#BFE0F5', { transparent: true, opacity: 0.38, roughness: 0.08, metalness: 0.1, depthWrite: false });
  const water = () => mat('#5AA9E6', { transparent: true, opacity: 0.4, roughness: 0.2, depthWrite: false });
  const screen = () => mat('#0B1220', { roughness: 0.25, metalness: 0.3 });
  const metal = (n) => mat(n || 'steel', { metalness: 0.65, roughness: 0.35 });

  // ---------- tiny builder helpers (all positions are the CENTRE in x/z and the BOTTOM in y) ----------
  function put(g, geo, material, sx, sy, sz, x, y, z, rot) {
    const m = new THREE.Mesh(geo, material);
    m.scale.set(sx, sy, sz); m.position.set(x, y + sy / 2, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    m.castShadow = !material.transparent; m.receiveShadow = false;
    g.add(m); return m;
  }
  const box = (g, m, sx, sy, sz, x, y, z) => put(g, geos.box, m, sx, sy, sz, x, y, z);
  const rbox = (g, m, sx, sy, sz, x, y, z) => put(g, geos.rbox, m, sx, sy, sz, x, y, z);
  const cyl = (g, m, dia, hgt, x, y, z) => put(g, geos.cyl, m, dia, hgt, dia, x, y, z);
  // cylinder lying along X (axis 'x') or Z (axis 'z'); y is the centre height for these
  function cylH(g, m, dia, len, x, yc, z, axis) {
    const mesh = put(g, geos.cyl, m, dia, len, dia, x, yc - len / 2, z, axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]);
    mesh.position.y = yc; return mesh;
  }
  const sph = (g, m, sx, sy, sz, x, y, z) => put(g, geos.sph, m, sx, sy, sz, x, y, z);
  function wheel(g, r, x, yc, z, axis) { // tyre + hub
    const t = cylH(g, mat('rubber'), r * 2, r * 0.7, x, yc, z, axis); cylH(g, metal(), r * 1.1, r * 0.74, x, yc, z, axis); return t;
  }

  // ---------- models ----------
  const M = {};

  M.sofa = (g, w, d, h, o) => {
    const fab = mat(o.fab || 'fabric'), fabL = mat(o.fabL || 'fabricLight');
    const leg = h * 0.1;
    rbox(g, fab, w, h * 0.34, d * 0.9, 0, leg, d * 0.05);                         // seat base
    rbox(g, fab, w, h * 0.62, d * 0.24, 0, leg + h * 0.1, -d * 0.38);              // backrest
    const aw = Math.min(w * 0.13, 0.22);
    rbox(g, fab, aw, h * 0.5, d * 0.9, -(w / 2 - aw / 2), leg + h * 0.02, d * 0.05);
    rbox(g, fab, aw, h * 0.5, d * 0.9, w / 2 - aw / 2, leg + h * 0.02, d * 0.05);
    const n = w > 1.5 ? 3 : w > 1.0 ? 2 : 1, cw = (w - aw * 2 - 0.04) / n;
    for (let i = 0; i < n; i++) {
      rbox(g, fabL, cw * 0.96, h * 0.14, d * 0.62, -((n - 1) / 2 - i) * cw, leg + h * 0.34, d * 0.1);   // seat cushions
      rbox(g, fabL, cw * 0.9, h * 0.34, d * 0.14, -((n - 1) / 2 - i) * cw, leg + h * 0.42, -d * 0.2);   // back cushions
    }
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cyl(g, mat('woodDark'), 0.05, leg, sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08)));
  };
  M.armchair = (g, w, d, h, o) => M.sofa(g, w, d, h, Object.assign({ fab: 'fabricWarm', fabL: '#F2C56B' }, o));
  M.sofa_l = (g, w, d, h, o) => {
    M.sofa(g, w, d * 0.56, h, o);                                                   // long back section
    const fab = mat(o.fab || 'fabric'), fabL = mat(o.fabL || 'fabricLight'), leg = h * 0.1, cw = w * 0.34;
    const g2 = new THREE.Group(); g2.position.set(w / 2 - cw / 2, 0, d * 0.28 + d * 0.1); g.add(g2);
    g2.position.set(w / 2 - cw / 2, 0, d * 0.22);
    rbox(g2, fab, cw, h * 0.34, d * 0.46, 0, leg, 0); rbox(g2, fabL, cw * 0.92, h * 0.14, d * 0.42, 0, leg + h * 0.34, 0);
    rbox(g2, fab, cw * 0.14, h * 0.5, d * 0.46, cw * 0.43, leg + h * 0.02, 0);
    g.children.forEach((c) => { if (c !== g2) c.position.z -= d * 0.22; });
  };
  M.bed = (g, w, d, h) => { // assembled bed FRAME only: the mattress is a separate catalogue item
    const rail = mat('wood'), dark = mat('woodDark'), slat = mat('woodLight');
    const lh = h * 0.3, rh = h * 0.22;
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(g, dark, 0.07, lh, 0.07, sx * (w / 2 - 0.035), 0, sz * (d / 2 - 0.035))));
    [-1, 1].forEach((sx) => box(g, rail, 0.05, rh, d, sx * (w / 2 - 0.025), lh * 0.45, 0));          // side rails
    const n = Math.max(6, Math.round(d / 0.2));
    for (let i = 0; i < n; i++) box(g, slat, w - 0.1, 0.022, 0.085, 0, lh * 0.45 + rh * 0.45, -d / 2 + 0.14 + (i * (d - 0.28)) / (n - 1)); // slats
    box(g, dark, w, h, 0.06, 0, 0, -d / 2 + 0.03);                                                    // headboard
    box(g, dark, w, h * 0.42, 0.05, 0, 0, d / 2 - 0.025);                                             // footboard
  };
  M.bunk_bed = (g, w, d, h) => {
    const wood = mat('wood'), mt = mat('cream');
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(g, mat('woodDark'), 0.07, h, 0.07, sx * (w / 2 - 0.035), 0, sz * (d / 2 - 0.035))));
    [0.1, 0.58].forEach((f) => { box(g, wood, w, 0.07, d, 0, h * f, 0); rbox(g, mt, w * 0.92, 0.14, d * 0.94, 0, h * f + 0.07, 0); });
    box(g, wood, w, h * 0.25, 0.04, 0, h * 0.7, d / 2 - 0.02);
    for (let i = 0; i < 4; i++) box(g, wood, 0.04, 0.05, 0.12, w / 2 - 0.02, h * (0.12 + i * 0.14), d / 2 - 0.14);
  };
  M.mattress = (g, w, d, h) => {
    rbox(g, mat('cream'), w, h, d, 0, 0, 0);
    box(g, mat('offWhite'), w * 1.002, h * 0.14, d * 1.002, 0, h * 0.4, 0);
    for (let i = 1; i < 4; i++) box(g, mat('#D9D2C3'), w * 0.01, 0.002 + h * 0.01, d * 0.96, -w / 2 + (w * i) / 4, h, 0);
  };
  M.wardrobe = (g, w, d, h) => {
    const body = mat('wood'), door = mat('woodLight'), plinth = mat('woodDark');
    box(g, plinth, w * 0.96, h * 0.04, d * 0.94, 0, 0, 0);
    box(g, body, w, h * 0.92, d, 0, h * 0.04, 0);
    box(g, plinth, w * 1.02, h * 0.04, d * 1.03, 0, h * 0.96, 0);
    [-1, 1].forEach((s) => {
      box(g, door, w * 0.47, h * 0.84, 0.025, s * w * 0.245, h * 0.08, d / 2 + 0.01);
      box(g, metal('steelDark'), 0.02, h * 0.16, 0.03, s * w * 0.04, h * 0.45, d / 2 + 0.035);
    });
    box(g, mat('#B58C62'), w * 0.5, 0.012, 0.03, 0, h * 0.775, d / 2 + 0.02);
  };
  M.almirah = (g, w, d, h) => {
    const body = mat('#7C8FA6', { metalness: 0.45, roughness: 0.42 }), door = mat('#8DA0B6', { metalness: 0.45, roughness: 0.4 });
    box(g, mat('charcoal'), w * 0.96, h * 0.04, d * 0.94, 0, 0, 0);
    box(g, body, w, h * 0.96, d, 0, h * 0.04, 0);
    [-1, 1].forEach((s) => {
      box(g, door, w * 0.46, h * 0.86, 0.02, s * w * 0.245, h * 0.09, d / 2 + 0.01);
      for (let i = 0; i < 4; i++) box(g, mat('#667A92'), w * 0.36, 0.012, 0.01, s * w * 0.245, h * (0.78 - i * 0.025), d / 2 + 0.025);
    });
    box(g, metal('steelDark'), 0.025, h * 0.1, 0.03, 0, h * 0.5, d / 2 + 0.035);
    box(g, door, w * 0.94, h * 0.2, 0.02, 0, h * 0.09, d / 2 + 0.012);
  };
  M.drawers = (g, w, d, h) => {
    box(g, mat('wood'), w, h * 0.93, d, 0, h * 0.07, 0);
    box(g, mat('woodDark'), w * 0.96, h * 0.07, d * 0.94, 0, 0, 0);
    for (let i = 0; i < 4; i++) {
      box(g, mat('woodLight'), w * 0.9, h * 0.2, 0.02, 0, h * (0.1 + i * 0.22), d / 2 + 0.01);
      cyl(g, metal('gold'), 0.03, 0.025, 0, h * (0.2 + i * 0.22), d / 2 + 0.035);
    }
  };
  const legs4 = (g, w, d, h, th, lw, m) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(g, m, lw, h - th, lw, sx * (w / 2 - lw), 0, sz * (d / 2 - lw)));
  M.table = (g, w, d, h) => {
    const th = Math.max(0.035, h * 0.07);
    rbox(g, mat('woodLight'), w, th, d, 0, h - th, 0); legs4(g, w, d, h, th, 0.06, mat('woodDark'));
    box(g, mat('wood'), w * 0.84, 0.06, d * 0.82, 0, h - th - 0.06, 0);
  };
  M.coffeetable = (g, w, d, h) => {
    const th = 0.035;
    rbox(g, mat('woodLight'), w, th, d, 0, h - th, 0); legs4(g, w, d, h, th, 0.04, mat('woodDark'));
    box(g, mat('wood'), w * 0.86, 0.025, d * 0.82, 0, h * 0.28, 0);
  };
  M.chair = (g, w, d, h, o) => {
    const seatY = h * 0.5, fab = mat(o.chairColor || 'wood');
    rbox(g, fab, w, h * 0.06, d, 0, seatY, 0.02);
    rbox(g, fab, w * 0.94, h * 0.42, 0.045, 0, seatY + h * 0.06, -d / 2 + 0.03);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(g, mat('woodDark'), 0.035, seatY, 0.035, sx * (w / 2 - 0.03), 0, sz * (d / 2 - 0.04)));
  };
  M.stool = (g, w, d, h) => {
    cyl(g, mat('wood'), Math.min(w, d), h * 0.12, 0, h * 0.88, 0);
    [0, 1, 2].forEach((i) => { const a = (i * Math.PI * 2) / 3; box(g, mat('woodDark'), 0.035, h * 0.88, 0.035, Math.cos(a) * w * 0.32, 0, Math.sin(a) * d * 0.32); });
  };
  M.bench = (g, w, d, h) => {
    rbox(g, mat('woodLight'), w, h * 0.12, d, 0, h * 0.88, 0);
    [-1, 1].forEach((s) => box(g, mat('woodDark'), 0.06, h * 0.88, d * 0.85, s * (w / 2 - 0.1), 0, 0));
  };
  M.desk = (g, w, d, h) => {
    const th = 0.04;
    rbox(g, mat('woodLight'), w, th, d, 0, h - th, 0);
    box(g, mat('wood'), w * 0.28, h - th, d * 0.9, -w / 2 + w * 0.15, 0, 0);
    for (let i = 0; i < 3; i++) { box(g, mat('woodLight'), w * 0.25, (h - th) * 0.27, 0.015, -w / 2 + w * 0.15, (h - th) * (0.06 + i * 0.3), d * 0.45 + 0.005); box(g, metal('gold'), 0.06, 0.012, 0.02, -w / 2 + w * 0.15, (h - th) * (0.17 + i * 0.3), d * 0.45 + 0.02); }
    box(g, mat('woodDark'), 0.05, h - th, d * 0.9, w / 2 - 0.05, 0, 0);
  };
  M.cabinet = (g, w, d, h) => {
    box(g, mat('woodDark'), w * 0.94, h * 0.05, d * 0.92, 0, 0, 0);
    box(g, mat('wood'), w, h * 0.95, d, 0, h * 0.05, 0);
    [-1, 1].forEach((s) => { box(g, mat('woodLight'), w * 0.46, h * 0.86, 0.02, s * w * 0.245, h * 0.09, d / 2 + 0.01); box(g, glass(), w * 0.34, h * 0.5, 0.012, s * w * 0.245, h * 0.34, d / 2 + 0.024); box(g, metal('gold'), 0.015, h * 0.12, 0.02, s * w * 0.03, h * 0.45, d / 2 + 0.03); });
  };
  M.shelf = (g, w, d, h) => {
    [-1, 1].forEach((s) => box(g, mat('wood'), 0.03, h, d, s * (w / 2 - 0.015), 0, 0));
    box(g, mat('woodDark'), w, h, 0.012, 0, 0, -d / 2 + 0.006);
    const rows = 5, cols = ['fabric', 'red', 'orange', 'green', 'teal', 'maroon'];
    for (let i = 0; i <= rows; i++) {
      box(g, mat('wood'), w, 0.025, d, 0, (h - 0.025) * (i / rows), 0);
      if (i < rows && i % 2 === 0) for (let k = 0; k < 5; k++) box(g, mat(cols[(i + k) % cols.length]), w * 0.1, (h / rows) * 0.7, d * 0.6, -w * 0.32 + k * w * 0.12, (h - 0.025) * (i / rows) + 0.025, 0);
    }
  };
  M.rack = (g, w, d, h) => {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(g, metal('steelDark'), 0.025, h, 0.025, sx * (w / 2 - 0.0125), 0, sz * (d / 2 - 0.0125)));
    for (let i = 0; i < 5; i++) box(g, metal(), w, 0.02, d, 0, (h - 0.02) * (i / 4), 0);
  };
  M.trolley = (g, w, d, h) => {
    [0.18, 0.88].forEach((f) => box(g, mat('steel', { metalness: 0.5 }), w, 0.03, d, 0, h * f, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { box(g, metal('steelDark'), 0.025, h * 0.88, 0.025, sx * (w / 2 - 0.02), h * 0.06, sz * (d / 2 - 0.02)); wheel(g, 0.045, sx * (w / 2 - 0.02), 0.045, sz * (d / 2 - 0.02), 'x'); });
  };
  M.mandir = (g, w, d, h) => {
    box(g, mat('woodDark'), w, h * 0.1, d, 0, 0, 0);
    box(g, mat('wood'), w * 0.92, h * 0.62, d * 0.9, 0, h * 0.1, 0);
    box(g, mat('#2B1A12'), w * 0.7, h * 0.46, 0.02, 0, h * 0.18, d * 0.45 + 0.005);
    box(g, mat('gold'), w * 0.74, 0.02, 0.03, 0, h * 0.66, d * 0.45 + 0.012);
    [-1, 1].forEach((s) => cyl(g, metal('gold'), 0.05, h * 0.46, s * w * 0.4, h * 0.18, d * 0.45 + 0.02));
    const roof = put(g, geos.cone4, mat('woodDark'), w * 1.38, h * 0.28, d * 1.28, 0, h * 0.72, 0);
    sph(g, metal('gold'), 0.06, 0.06, 0.06, 0, h * 0.98, 0);
  };
  M.cot = (g, w, d, h) => {
    box(g, mat('wood'), w, 0.05, d, 0, h * 0.2, 0);
    rbox(g, mat('cream'), w * 0.94, h * 0.1, d * 0.94, 0, h * 0.25, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(g, mat('woodDark'), 0.05, h, 0.05, sx * (w / 2 - 0.025), 0, sz * (d / 2 - 0.025)));
    [h * 0.85, h * 0.5].forEach((y) => { box(g, mat('wood'), w, 0.035, 0.035, 0, y, -d / 2 + 0.025); box(g, mat('wood'), w, 0.035, 0.035, 0, y, d / 2 - 0.025); [-1, 1].forEach((s) => box(g, mat('wood'), 0.035, 0.035, d, s * (w / 2 - 0.025), y, 0)); });
    for (let i = 1; i < 8; i++) { const x = -w / 2 + (w * i) / 8; box(g, mat('woodLight'), 0.015, h * 0.35, 0.015, x, h * 0.5, d / 2 - 0.025); box(g, mat('woodLight'), 0.015, h * 0.35, 0.015, x, h * 0.5, -d / 2 + 0.025); }
  };
  M.swing = (g, w, d, h) => {
    box(g, mat('woodDark'), w, 0.06, 0.06, 0, h - 0.06, 0);
    [-1, 1].forEach((s) => cyl(g, metal('steelDark'), 0.02, h * 0.62, s * w * 0.42, h * 0.3, 0));
    rbox(g, mat('wood'), w * 0.92, 0.07, d, 0, h * 0.26, 0);
    rbox(g, mat('woodLight'), w * 0.9, 0.18, 0.05, 0, h * 0.3, -d / 2 + 0.04);
  };
  M.panel = (g, w, d, h) => {
    box(g, mat('woodLight'), w * 0.94, h * 0.96, d, -w * 0.02, 0, -d * 0.6);
    box(g, mat('wood'), w * 0.94, h * 0.96, d, w * 0.03, 0, d * 0.6);
  };
  M.frame = (g, w, d, h) => {
    box(g, mat('charcoal'), w, h, Math.max(d, 0.03), 0, 0, 0);
    box(g, mat('#E9DFC8'), w * 0.88, h * 0.86, Math.max(d, 0.03) * 1.05, 0, h * 0.07, 0);
    put(g, geos.cone4, mat('greenDark'), w * 0.5, h * 0.3, 0.01, -w * 0.12, h * 0.2, Math.max(d, 0.03) * 0.55);
    sph(g, mat('orange'), h * 0.14, h * 0.14, 0.01, w * 0.2, h * 0.6, Math.max(d, 0.03) * 0.55);
  };
  M.mirror = (g, w, d, h) => {
    rbox(g, mat('woodDark'), w, h, Math.max(d, 0.04), 0, 0, 0);
    box(g, mat('#D9E8F2', { metalness: 0.9, roughness: 0.08 }), w * 0.84, h * 0.88, Math.max(d, 0.04) * 1.1, 0, h * 0.06, 0);
  };
  M.lamp = (g, w, d, h) => {
    cyl(g, metal('charcoal'), w * 0.7, 0.03, 0, 0, 0); cyl(g, metal('steelDark'), 0.03, h * 0.78, 0, 0.03, 0);
    put(g, geos.shade, new THREE.MeshStandardMaterial({ color: PALETTE.cream, side: THREE.DoubleSide, roughness: 0.9, emissive: '#3a3320' }), w, h * 0.22, d, 0, h * 0.78, 0);
  };
  M.roll = (g, w, d, h) => {
    cylH(g, mat('fabricWarm'), Math.min(d, h), w, 0, h / 2, 0, 'x');
    cylH(g, mat('#F7E0A8'), Math.min(d, h) * 0.5, w * 1.002, 0, h / 2, 0, 'x');
    [-1, 1].forEach((s) => cylH(g, mat('#D9A441'), Math.min(d, h) * 0.9, 0.012, s * w * 0.4, h / 2, 0, 'x'));
  };
  M.plant = (g, w, d, h) => {
    put(g, geos.taper, mat('pot'), w * 0.62, h * 0.28, d * 0.62, 0, 0, 0); cyl(g, mat('soil'), w * 0.54, 0.02, 0, h * 0.27, 0);
    [[0, 0.62, 0, 0.7], [-0.18, 0.5, 0.05, 0.5], [0.2, 0.52, -0.05, 0.52], [0.05, 0.82, 0.05, 0.4]].forEach(([x, y, z, s], i) => sph(g, mat(i % 2 ? 'greenDark' : 'green'), w * s, h * s * 0.55, d * s, x * w, h * (y - 0.12), z * d));
  };
  M.fridge = (g, w, d, h) => {
    const body = mat('#E9EEF3', { metalness: 0.25, roughness: 0.35 });
    rbox(g, body, w, h * 0.97, d, 0, h * 0.03, 0);
    box(g, mat('charcoal'), w * 0.98, 0.012, 0.012, 0, h * 0.64, d / 2 + 0.002);
    [h * 0.7, h * 0.36].forEach((y, i) => box(g, metal('steelDark'), 0.022, h * (i ? 0.2 : 0.12), 0.03, w * 0.4, y, d / 2 + 0.018));
    box(g, mat('charcoal'), w * 0.9, h * 0.03, d * 0.9, 0, 0, 0);
  };
  M.washer = (g, w, d, h) => {
    rbox(g, mat('white', { roughness: 0.3 }), w, h, d, 0, 0, 0);
    box(g, mat('#DDE5EC'), w * 0.96, h * 0.12, 0.02, 0, h * 0.86, d / 2 + 0.004);
    cylH(g, metal(), w * 0.62, 0.04, 0, h * 0.44, d / 2 + 0.01, 'z'); cylH(g, glass(), w * 0.5, 0.05, 0, h * 0.44, d / 2 + 0.03, 'z'); cylH(g, screen(), w * 0.34, 0.052, 0, h * 0.44, d / 2 + 0.032, 'z');
    [-1, 1].forEach((s) => cyl(g, mat('blue'), 0.05, 0.02, s * w * 0.3, h * 0.9, d / 2 + 0.02));
  };
  M.acsplit = (g, w, d, h) => {
    rbox(g, mat('white', { roughness: 0.3 }), w, h, d, 0, 0, 0);
    box(g, mat('#C7D1DA'), w * 0.92, h * 0.16, 0.02, 0, h * 0.12, d / 2 + 0.003);
    box(g, mat('#E3E9EE'), w * 0.92, h * 0.1, 0.01, 0, h * 0.62, d / 2 + 0.003);
    cyl(g, mat('blue'), 0.012, 0.006, w * 0.4, h * 0.76, d / 2 + 0.004);
  };
  M.acwindow = (g, w, d, h) => {
    rbox(g, mat('#E8EDF1'), w, h, d, 0, 0, 0);
    box(g, mat('#C7D1DA'), w * 0.9, h * 0.55, 0.02, 0, h * 0.35, d / 2 + 0.003);
    for (let i = 0; i < 5; i++) box(g, mat('#8794A3'), w * 0.84, 0.01, 0.012, 0, h * (0.4 + i * 0.09), d / 2 + 0.018);
    box(g, mat('charcoal'), w * 0.2, h * 0.1, 0.02, w * 0.32, h * 0.12, d / 2 + 0.004);
  };
  M.cooler = (g, w, d, h) => {
    box(g, mat('#2F6FA8'), w * 0.96, h * 0.9, d * 0.96, 0, h * 0.08, 0);
    rbox(g, mat('#3C86C6'), w, h * 0.08, d, 0, h * 0.92, 0);
    for (let i = 0; i < 6; i++) box(g, mat('#1E4E7A'), w * 0.7, 0.012, 0.012, 0, h * (0.3 + i * 0.09), d / 2 + 0.003);
    [-1, 1].forEach((s) => wheel(g, 0.04, s * w * 0.4, 0.04, 0, 'x'));
    box(g, mat('white'), w * 0.5, h * 0.12, 0.014, 0, h * 0.78, d / 2 + 0.004);
  };
  M.microwave = (g, w, d, h) => {
    rbox(g, mat('#D7DEE5', { metalness: 0.3 }), w, h, d, 0, 0, 0);
    box(g, screen(), w * 0.62, h * 0.7, 0.014, -w * 0.14, h * 0.15, d / 2 + 0.004);
    box(g, mat('charcoal'), w * 0.2, h * 0.7, 0.014, w * 0.36, h * 0.15, d / 2 + 0.004);
    cyl(g, mat('steelDark'), 0.025, 0.02, w * 0.36, h * 0.62, d / 2 + 0.018);
  };
  M.appliance = (g, w, d, h) => {
    rbox(g, mat('white'), w, h * 0.35, d, 0, 0, 0);
    put(g, geos.taper, glass(), w * 0.7, h * 0.55, d * 0.7, 0, h * 0.35, 0); cyl(g, mat('charcoal'), w * 0.5, h * 0.1, 0, h * 0.9, 0);
    cyl(g, mat('blue'), 0.03, 0.02, w * 0.32, h * 0.18, d / 2 + 0.005);
  };
  M.stove = (g, w, d, h) => {
    rbox(g, mat('#2B2F36', { metalness: 0.5, roughness: 0.3 }), w, h, d, 0, 0, 0);
    [-1, 1].forEach((s) => { cyl(g, metal('steelDark'), w * 0.3, 0.012, s * w * 0.24, h, -d * 0.12); cyl(g, mat('blue'), 0.03, 0.01, s * w * 0.24, h, -d * 0.12); });
    [-1, 0, 1].forEach((s) => cyl(g, metal(), 0.03, 0.02, s * w * 0.25, h * 0.4, d / 2 + 0.01));
  };
  M.cylinder = (g, w, d, h) => {
    const r = Math.min(w, d);
    cyl(g, mat('red', { roughness: 0.35, metalness: 0.2 }), r, h * 0.78, 0, h * 0.04, 0);
    put(g, geos.hemi, mat('red', { roughness: 0.35, metalness: 0.2 }), r, h * 0.3, r, 0, h * 0.82, 0);
    cyl(g, metal(), r * 0.34, h * 0.1, 0, h * 0.9, 0); cyl(g, mat('redDark'), r * 1.02, h * 0.04, 0, 0, 0);
    cyl(g, mat('#D9DDE2'), r * 1.01, h * 0.05, 0, h * 0.38, 0);
  };
  M.purifier = (g, w, d, h) => {
    rbox(g, mat('white', { roughness: 0.3 }), w, h * 0.88, d, 0, h * 0.12, 0);
    box(g, mat('#2A6FB8'), w * 0.7, h * 0.34, 0.01, 0, h * 0.44, d / 2 + 0.002); box(g, screen(), w * 0.5, h * 0.1, 0.012, 0, h * 0.82, d / 2 + 0.003);
    cyl(g, metal(), 0.03, h * 0.12, 0, 0, d * 0.2);
  };
  M.dispenser = (g, w, d, h) => {
    rbox(g, mat('white'), w, h * 0.7, d, 0, 0, 0);
    put(g, geos.cyl, new THREE.MeshStandardMaterial({ color: '#7FB6F0', transparent: true, opacity: 0.55, roughness: 0.15, depthWrite: false }), w * 0.7, h * 0.28, d * 0.7, 0, h * 0.72, 0);
    [-1, 1].forEach((s, i) => box(g, mat(i ? 'blue' : 'red'), 0.05, 0.04, 0.05, s * w * 0.2, h * 0.52, d / 2 + 0.02));
    box(g, mat('#D7DEE5'), w * 0.8, h * 0.22, 0.014, 0, h * 0.06, d / 2 + 0.004);
  };
  M.geyser = (g, w, d, h) => {
    cyl(g, mat('white'), Math.min(w, d), h * 0.84, 0, h * 0.16, 0); put(g, geos.hemi, mat('white'), Math.min(w, d), h * 0.14, Math.min(w, d), 0, h * 0.99, 0);
    [-1, 1].forEach((s) => cyl(g, metal(), 0.035, h * 0.16, s * w * 0.22, 0, 0)); cyl(g, mat('blue'), 0.05, 0.012, 0, h * 0.62, d / 2 - 0.002);
  };
  M.fan = (g, w, d, h) => {
    cyl(g, mat('charcoal'), w * 0.7, 0.04, 0, 0, 0); cyl(g, metal(), 0.03, h * 0.72, 0, 0.04, 0);
    sph(g, mat('charcoal'), w * 0.22, w * 0.22, w * 0.3, 0, h * 0.74, 0);
    cylH(g, new THREE.MeshStandardMaterial({ color: '#9CA3AF', transparent: true, opacity: 0.35, depthWrite: false }), w, 0.03, 0, h * 0.84, w * 0.1, 'z').scale.set(w, 0.04, w);
    [0, 1, 2].forEach((i) => box(g, mat('blue'), w * 0.1, w * 0.4, 0.01, 0, h * 0.84, w * 0.14).rotation.z = (i * Math.PI * 2) / 3);
  };
  M.tv = (g, w, d, h) => {
    const slab = Math.min(0.05, d * 0.3);
    box(g, mat('black'), w, h * 0.82, slab, 0, h * 0.18, 0); box(g, screen(), w * 0.96, h * 0.76, slab * 1.05, 0, h * 0.21, 0.001);
    box(g, metal('charcoal'), w * 0.08, h * 0.12, d * 0.2, 0, h * 0.06, 0); box(g, metal('charcoal'), w * 0.34, h * 0.04, d * 0.7, 0, 0, 0);
  };
  M.computer = (g, w, d, h) => {
    const mw = w * 0.66;
    box(g, mat('black'), mw, h * 0.66, 0.04, -w * 0.15, h * 0.3, 0); box(g, screen(), mw * 0.94, h * 0.6, 0.042, -w * 0.15, h * 0.33, 0.001);
    box(g, mat('charcoal'), mw * 0.3, h * 0.26, 0.05, -w * 0.15, 0.02, 0); box(g, mat('charcoal'), mw * 0.5, 0.02, d * 0.4, -w * 0.15, 0, 0);
    rbox(g, mat('#2A2F37'), w * 0.22, h * 0.96, d * 0.8, w * 0.38, 0, 0); box(g, mat('blue'), w * 0.1, 0.012, 0.012, w * 0.38, h * 0.82, d * 0.4 + 0.002);
  };
  M.printer = (g, w, d, h) => {
    rbox(g, mat('#E4E8EC'), w, h * 0.62, d, 0, 0, 0); box(g, mat('white'), w * 0.7, 0.012, d * 0.6, 0, h * 0.62, -d * 0.1);
    box(g, mat('charcoal'), w * 0.7, h * 0.22, 0.02, 0, h * 0.14, d / 2 + 0.003); box(g, mat('#D0D6DC'), w * 0.5, 0.01, d * 0.4, 0, h * 0.62, d * 0.28);
    cyl(g, mat('blue'), 0.015, 0.01, w * 0.4, h * 0.5, d / 2 + 0.004);
  };
  M.speaker = (g, w, d, h) => {
    rbox(g, mat('#2A2F37'), w, h, d, 0, 0, 0);
    cylH(g, mat('black'), w * 0.7, 0.03, 0, h * 0.72, d / 2, 'z'); cylH(g, mat('black'), w * 0.4, 0.03, 0, h * 0.4, d / 2, 'z');
    cylH(g, metal(), w * 0.2, 0.035, 0, h * 0.4, d / 2, 'z');
  };
  M.battery = (g, w, d, h) => {
    box(g, mat('#2B3A4A'), w, h * 0.88, d, 0, 0, 0); box(g, mat('#E5E7EB'), w * 0.5, h * 0.2, 0.01, 0, h * 0.4, d / 2 + 0.002);
    box(g, mat('red'), w * 0.14, h * 0.12, d * 0.2, -w * 0.3, h * 0.88, 0); box(g, mat('black'), w * 0.14, h * 0.12, d * 0.2, w * 0.3, h * 0.88, 0);
  };
  M.sewing = (g, w, d, h) => {
    box(g, mat('#2B2F36'), w, h * 0.16, d, 0, 0, 0); rbox(g, mat('#E8E3D6'), w * 0.9, h * 0.22, d * 0.62, 0, h * 0.16, 0);
    rbox(g, mat('#E8E3D6'), w * 0.2, h * 0.5, d * 0.62, w * 0.36, h * 0.16, 0); rbox(g, mat('#E8E3D6'), w * 0.7, h * 0.18, d * 0.62, -w * 0.05, h * 0.62, 0);
    cylH(g, metal(), w * 0.14, 0.02, w * 0.43, h * 0.7, d * 0.34, 'z');
  };
  M.safe = (g, w, d, h) => {
    rbox(g, mat('#5C6B7A', { metalness: 0.6, roughness: 0.4 }), w, h, d, 0, 0, 0);
    box(g, mat('#7A8A9A', { metalness: 0.6 }), w * 0.84, h * 0.84, 0.02, 0, h * 0.08, d / 2 + 0.005);
    cylH(g, metal('gold'), w * 0.2, 0.03, -w * 0.12, h * 0.55, d / 2 + 0.03, 'z'); box(g, metal('gold'), 0.025, h * 0.22, 0.03, w * 0.26, h * 0.4, d / 2 + 0.03);
  };
  M.piano = (g, w, d, h) => {
    rbox(g, mat('#2A1E18', { roughness: 0.3 }), w, h * 0.78, d * 0.8, 0, h * 0.18, -d * 0.1);
    box(g, mat('#3A2A20'), w * 0.96, h * 0.1, d * 0.34, 0, h * 0.36, d * 0.32);
    box(g, mat('white'), w * 0.88, 0.02, d * 0.2, 0, h * 0.46, d * 0.36);
    for (let i = 0; i < 14; i++) box(g, mat('black'), w * 0.03, 0.022, d * 0.12, -w * 0.4 + i * w * 0.062 + w * 0.03, h * 0.47, d * 0.33);
    [-1, 1].forEach((s) => box(g, mat('#2A1E18'), 0.07, h * 0.2, d * 0.7, s * (w / 2 - 0.05), 0, 0)); box(g, metal('gold'), 0.06, 0.02, 0.05, 0, 0.04, d * 0.3);
  };
  M.aquarium = (g, w, d, h) => {
    box(g, mat('woodDark'), w, h * 0.18, d, 0, 0, 0);
    box(g, glass(), w * 0.98, h * 0.8, d * 0.96, 0, h * 0.18, 0); box(g, water(), w * 0.94, h * 0.62, d * 0.92, 0, h * 0.2, 0);
    box(g, mat('#C9B48A'), w * 0.92, h * 0.05, d * 0.9, 0, h * 0.2, 0);
    sph(g, mat('orange'), 0.09, 0.05, 0.03, -w * 0.15, h * 0.52, 0); sph(g, mat('orange'), 0.07, 0.04, 0.03, w * 0.2, h * 0.62, d * 0.1);
  };
  M.keyboard = (g, w, d, h) => {
    rbox(g, mat('black'), w, h * 0.8, d, 0, h * 0.2, 0);
    box(g, mat('white'), w * 0.88, 0.012, d * 0.45, 0, h, d * 0.2); for (let i = 0; i < 20; i++) box(g, mat('black'), w * 0.02, 0.014, d * 0.26, -w * 0.4 + i * w * 0.042, h, d * 0.12);
    [-1, 1].forEach((s) => box(g, metal('steelDark'), 0.03, h * 0.2, d * 0.7, s * w * 0.4, 0, 0));
  };
  M.guitar = (g, w, d, h) => {
    const body = mat('#B5651D', { roughness: 0.35 });
    sph(g, body, w, h * 0.22, d, 0, h * 0.04, 0); sph(g, body, w * 0.78, h * 0.18, d, 0, h * 0.26, 0);
    cyl(g, mat('black'), w * 0.3, d * 1.02, 0, h * 0.1, 0).rotation.x = Math.PI / 2;
    box(g, mat('woodDark'), w * 0.14, h * 0.56, d * 0.5, 0, h * 0.4, 0); box(g, mat('black'), w * 0.2, h * 0.1, d * 0.5, 0, h * 0.9, 0);
  };
  M.tabla = (g, w, d, h) => {
    [[-1, 0.9, 'woodDark'], [1, 1, 'pot']].forEach(([s, f, c]) => { put(g, geos.taper, mat(c), w * 0.44, h * f, d * 0.8, s * w * 0.26, 0, 0); cyl(g, mat('cream'), w * 0.4, 0.015, s * w * 0.26, h * f, 0); cyl(g, mat('black'), w * 0.18, 0.018, s * w * 0.26, h * f, 0); });
  };
  M.treadmill = (g, w, d, h) => {
    rbox(g, mat('#2B2F36'), w, h * 0.12, d, 0, h * 0.08, 0); box(g, mat('charcoal'), w * 0.86, 0.015, d * 0.6, -w * 0.04, h * 0.2, 0);
    [-1, 1].forEach((s) => { box(g, metal('steelDark'), 0.04, h * 0.7, 0.04, w * 0.42, h * 0.1, s * d * 0.38); box(g, metal('steelDark'), w * 0.8, 0.03, 0.03, -w * 0.02, h * 0.26, s * d * 0.44); });
    box(g, mat('charcoal'), 0.08, h * 0.22, d * 0.92, w * 0.42, h * 0.78, 0); box(g, screen(), 0.01, h * 0.12, d * 0.5, w * 0.37, h * 0.83, 0);
  };
  M.bicycle = (g, w, d, h) => {
    const r = h * 0.4, thin = Math.max(d * 0.18, 0.04);
    [-1, 1].forEach((s) => { const t = put(g, geos.torus, mat('rubber'), r * 2, r * 2, thin * 8, s * w * 0.32, 0, 0); t.position.y = r; });
    const tube = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); const m = box(g, mat('red'), len, 0.03, 0.03, (x1 + x2) / 2, (y1 + y2) / 2 - 0.015, 0); m.rotation.z = Math.atan2(dy, dx); };
    const fx = w * 0.32, rx = -w * 0.32;
    tube(rx, r, 0, r * 1.75); tube(0, r * 1.75, fx, r * 1.7); tube(rx, r, -0.02, r * 0.55); tube(-0.02, r * 0.55, fx, r); tube(0, r * 1.75, -0.02, r * 0.55);
    box(g, mat('black'), 0.2, 0.05, 0.06, -0.02, r * 1.95, 0); box(g, mat('black'), 0.05, 0.05, d * 0.9, fx, r * 1.95, 0);
  };
  M.dumbbell = (g, w, d, h) => {
    cylH(g, metal(), 0.035, w, 0, h / 2, 0, 'x');
    [-1, 1].forEach((s) => { cylH(g, mat('black'), h, 0.06, s * w * 0.36, h / 2, 0, 'x'); cylH(g, mat('charcoal'), h * 0.8, 0.05, s * w * 0.28, h / 2, 0, 'x'); });
  };
  M.board = (g, w, d, h) => {
    box(g, mat('white'), w, h * 0.78, Math.max(d, 0.03), 0, h * 0.22, 0); box(g, metal(), w * 1.02, 0.025, Math.max(d, 0.03) * 1.2, 0, h * 0.22, 0); box(g, metal(), w * 1.02, 0.025, Math.max(d, 0.03) * 1.2, 0, h - 0.025, 0);
    [-1, 1].forEach((s) => box(g, metal('steelDark'), 0.03, h * 0.22, 0.3, s * w * 0.4, 0, 0));
    box(g, mat('blue'), w * 0.3, 0.012, 0.012, -w * 0.15, h * 0.7, Math.max(d, 0.03) / 2 + 0.002);
  };
  M.stroller = (g, w, d, h) => {
    rbox(g, mat('fabric'), w * 0.8, h * 0.14, d * 0.46, 0, h * 0.34, d * 0.1);
    put(g, geos.hemi, mat('fabricLight'), w * 0.84, h * 0.3, d * 0.5, 0, h * 0.46, -d * 0.02);
    box(g, metal(), w, 0.03, 0.03, 0, h * 0.82, -d * 0.4); [-1, 1].forEach((s) => box(g, metal(), 0.03, h * 0.5, 0.03, s * w * 0.46, h * 0.36, -d * 0.4));
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => wheel(g, sz > 0 ? 0.07 : 0.1, sx * w * 0.45, sz > 0 ? 0.07 : 0.1, sz * d * 0.38, 'x'));
  };
  M.carton = (g, w, d, h, o) => {
    const c = [mat('carton'), mat('carton2'), mat('carton3')][(o.variant || 0) % 3];
    box(g, c, w, h, d, 0, 0, 0);
    box(g, mat('tape'), w * 0.16, 0.004, d * 1.002, 0, h, 0); box(g, mat('tape'), w * 0.16, h * 0.995, 0.004, 0, 0, d / 2); box(g, mat('tape'), 0.004, h * 0.995, d * 0.16, w / 2, 0, 0).position.x += 0.0005;
    box(g, mat('label'), w * 0.3, h * 0.22, 0.004, w * 0.22, h * 0.5, d / 2 + 0.001);
  };
  M.box = M.carton;
  M.suitcase = (g, w, d, h, o) => {
    const shell = mat(['teal', 'maroon', 'navy', 'fabric'][(o.variant || 0) % 4], { roughness: 0.4, metalness: 0.1 });
    rbox(g, shell, w, h * 0.88, d, 0, h * 0.1, 0);
    for (let i = 1; i < 4; i++) box(g, mat('black', { transparent: true, opacity: 0.18 }), 0.012, h * 0.84, d * 1.01, -w / 2 + (w * i) / 4, h * 0.12, 0);
    box(g, metal('steelDark'), w * 0.4, 0.04, 0.05, 0, h * 0.98, 0); box(g, metal('steelDark'), 0.025, 0.03, d * 0.6, w * 0.5, h * 0.4, 0);
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => wheel(g, 0.035, sx * (w / 2 - 0.06), 0.035, sz * (d / 2 - 0.05), 'x')));
  };
  M.bag = (g, w, d, h, o) => {
    rbox(g, mat(['fabric', 'maroon', 'teal'][(o.variant || 0) % 3]), w, h * 0.8, d, 0, 0, 0);
    box(g, mat('charcoal'), w * 0.96, 0.012, d * 1.003, 0, h * 0.42, 0);
    box(g, mat('charcoal'), w * 0.5, 0.025, 0.06, 0, h * 0.8, 0); box(g, mat('charcoal'), 0.04, h * 0.2, 0.04, -w * 0.18, h * 0.78, 0); box(g, mat('charcoal'), 0.04, h * 0.2, 0.04, w * 0.18, h * 0.78, 0);
  };
  M.bucket = (g, w, d, h) => {
    put(g, geos.taper, mat('plastic'), w, h * 0.92, d, 0, 0, 0); cyl(g, mat('#1D4ED8'), w * 1.04, h * 0.06, 0, h * 0.92, 0);
    box(g, mat('charcoal'), w * 0.9, 0.012, 0.012, 0, h * 1.02, 0);
  };
  M.tub = (g, w, d, h) => {
    box(g, new THREE.MeshStandardMaterial({ color: '#A5C8F5', transparent: true, opacity: 0.8, roughness: 0.3 }), w * 0.94, h * 0.85, d * 0.94, 0, 0, 0);
    rbox(g, mat('plastic'), w, h * 0.15, d, 0, h * 0.85, 0); box(g, mat('#1D4ED8'), w * 0.4, 0.015, 0.04, 0, h, 0);
  };
  M.clothes = (g, w, d, h, o) => {
    rbox(g, mat(['pink', 'fabricWarm', 'lime', 'fabricLight'][(o.variant || 0) % 4]), w, h * 0.6, d, 0, 0, 0);
    rbox(g, mat(['fabric', 'teal', 'orange'][(o.variant || 0) % 3]), w * 0.9, h * 0.3, d * 0.9, 0, h * 0.6, 0);
    box(g, mat('white'), w * 0.5, h * 0.12, 0.004, 0, h * 0.25, d / 2 + 0.002);
  };
  M.books = (g, w, d, h) => {
    const cols = ['fabric', 'red', 'orange', 'green', 'teal', 'maroon'];
    for (let i = 0; i < 6; i++) { const bh = h / 6; box(g, mat(cols[i % cols.length]), w * (0.9 + (i % 2) * 0.1), bh * 0.92, d * (0.9 - (i % 3) * 0.05), ((i % 2) - 0.5) * 0.02, i * bh, 0); box(g, mat('white'), w * 0.8, bh * 0.5, 0.004, 0, i * bh + bh * 0.2, d * 0.45); }
  };
  M.utensils = (g, w, d, h) => {
    cyl(g, metal(), Math.min(w, d) * 0.9, h * 0.78, 0, 0, 0); put(g, geos.hemi, metal(), Math.min(w, d) * 0.92, h * 0.2, Math.min(w, d) * 0.92, 0, h * 0.78, 0);
    [-1, 1].forEach((s) => box(g, mat('charcoal'), 0.04, 0.03, 0.05, s * Math.min(w, d) * 0.48, h * 0.55, 0)); sph(g, mat('charcoal'), 0.04, 0.04, 0.04, 0, h * 0.98, 0);
  };
  M.toy = (g, w, d, h) => {
    const fur = mat('skin');
    sph(g, fur, w * 0.7, h * 0.5, d * 0.7, 0, 0, 0); sph(g, fur, w * 0.5, h * 0.36, d * 0.5, 0, h * 0.42, 0);
    [-1, 1].forEach((s) => { sph(g, fur, w * 0.16, h * 0.12, d * 0.16, s * w * 0.2, h * 0.74, 0); sph(g, mat('black'), 0.02, 0.02, 0.02, s * w * 0.08, h * 0.62, d * 0.24); });
  };
  M.ladder = (g, w, d, h) => {
    [-1, 1].forEach((s) => box(g, metal(), 0.035, h, Math.max(d, 0.04), s * (w / 2 - 0.0175), 0, 0));
    for (let i = 1; i < 8; i++) box(g, metal('steelDark'), w, 0.025, Math.max(d, 0.04) * 0.8, 0, (h * i) / 8, 0);
  };
  M.custom = (g, w, d, h) => {
    box(g, mat('wood'), w, h, d, 0, 0, 0);
    [0.18, 0.82].forEach((f) => { box(g, mat('navy'), w * 1.01, h * 1.01, d * 0.08, 0, 0, (f - 0.5) * d); });
    box(g, mat('orange'), w * 0.4, 0.006, d * 0.3, 0, h, 0);
  };

  // ---------- dismantled furniture parts (drawn flat, exact w x d x h = length x width x thickness) ----------
  M.flatpanel = (g, w, d, h) => {
    box(g, mat('woodLight'), w, h, d, 0, 0, 0);
    box(g, mat('wood'), w * 0.96, 0.003, d * 0.94, 0, h, 0);
    box(g, mat('woodDark'), w, h, 0.012, 0, 0, d / 2 - 0.006);          // edge banding on one long side
  };
  M.rails = (g, w, d, h) => {
    box(g, mat('woodDark'), w, h, d, 0, 0, 0);
    box(g, mat('wood'), w * 0.98, 0.003, d * 0.5, 0, h, 0);
    [-1, 1].forEach((s) => box(g, mat('#E9D3B0'), 0.01, h * 0.96, d * 0.96, s * (w / 2 - 0.005), 0.0005, 0)); // lighter end grain
  };
  M.slats = (g, w, d, h) => {
    const n = Math.max(5, Math.min(26, Math.round(w / 0.085)));
    [-1, 1].forEach((s) => box(g, mat('wood'), w, h, 0.045, 0, 0, s * (d / 2 - 0.0225)));          // two frame bars
    for (let i = 0; i < n; i++) box(g, mat('woodLight'), Math.min(0.065, (w / n) * 0.7), h * 0.7, d * 0.94, -w / 2 + (w * (i + 0.5)) / n, h * 0.3, 0);
  };
  M.hardware = (g, w, d, h, o) => {
    box(g, mat('carton'), w, h, d, 0, 0, 0);
    box(g, mat('tape'), w * 0.14, 0.003, d * 1.002, 0, h, 0);
    box(g, mat('label'), w * 0.4, h * 0.3, 0.004, 0, h * 0.35, d / 2 + 0.001);
    cylH(g, metal('steelDark'), Math.min(0.018, h * 0.2), Math.min(0.12, w * 0.4), 0, h * 0.5, d / 2 + 0.004, 'x');   // bolt symbol
  };
  M.flatpack = (g, w, d, h) => {
    const n = Math.max(2, Math.min(9, Math.round(h / 0.03)));
    const ph = (h * 0.96) / n;
    for (let i = 0; i < n; i++) box(g, mat(i % 2 ? 'wood' : 'woodLight'), w * (1 - (i % 3) * 0.004), ph * 0.94, d * (1 - (i % 2) * 0.006), 0, i * ph, 0);
    [-0.28, 0.28].forEach((f) => box(g, mat('#2B2F36'), 0.025, h * 1.0, d * 1.012, f * w, 0, 0));       // two straps
    box(g, mat('#C5CED8', { transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false }), w * 1.004, h * 1.004, d * 1.004, 0, 0, 0); // wrap
  };

  // flat main colour per type for the low-detail version (many items on screen)
  const LOD_COLOR = { carton: 'carton', box: 'carton', suitcase: 'teal', bag: 'fabric', sofa: 'fabric', sofa_l: 'fabric', armchair: 'fabricWarm', bed: 'cream', mattress: 'cream',
    flatpanel: 'woodLight', rails: 'woodDark', slats: 'wood', hardware: 'carton', flatpack: 'wood', wardrobe: 'wood', almirah: '#7C8FA6', fridge: '#E9EEF3', washer: 'white', tv: 'black', custom: 'wood' };

  function build(type, w, d, h, opts) {
    const o = opts || {};
    const g = new THREE.Group();
    const fn = M[type];
    if (o.lod && fn) {
      rbox(g, mat(LOD_COLOR[type] || 'wood'), w, h, d, 0, 0, 0);
    } else if (fn) {
      fn(g, w, d, h, o);
    } else {
      M.custom(g, w, d, h, o); // unknown type: visible placeholder crate (the viewer labels it)
      g.userData.placeholder = true;
    }
    g.userData.type = type;
    g.userData.size = [w, h, d];
    return g;
  }

  function dispose() {
    Object.values(geos).forEach((x) => x.dispose());
    Object.values(mats).forEach((x) => x.dispose());
  }

  return { build, dispose, hasModel: (t) => !!M[t], types: () => Object.keys(M) };
}
