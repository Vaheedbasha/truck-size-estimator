/*
 * truck-model.js - procedural 3D box truck (Three.js). No external model files.
 *
 * buildTruck(THREE, bay, { kind }) makes a goods vehicle (kind: mini | pickup | lcv | truck | truck-tandem, see data/vehicles.json "model")
 * whose cargo bay interior is exactly bay.L x bay.W x bay.H metres
 * (from data/vehicles.json). World frame: the truck faces +X, +Y is up, Z runs across the truck, ground at y = 0,
 * cargo bay centred on x = 0. The side walls and roof of the cargo body are see-through so the load stays visible.
 *
 * Returns { group, floorY, bayToWorld(bx,by,bz), rearX, bounds, setState(state), setFill(fraction, state),
 *           setWalls(clear), dispose() }.
 * Bay frame used by cargo-layout.js: x from the FRONT wall (cab side) towards the tailgate, z across, y up from the floor.
 */
// Generic, procedural stand-ins for Indian goods-vehicle CLASSES (not replicas of any manufacturer's model).
const CFG = {
  mini: { S: 0.62, wheelR: 0.3, cabLen: 1.2, cabH: 1.6, dual: false, axles: 1, cabOver: false, paint: '#E9EEF5', body: 'box' },
  pickup: { S: 0.76, wheelR: 0.36, cabLen: 1.5, cabH: 1.78, dual: false, axles: 1, cabOver: false, paint: '#F1F4F9', body: 'pickup' },
  lcv: { S: 0.88, wheelR: 0.4, cabLen: 1.5, cabH: 2.15, dual: true, axles: 1, cabOver: true, paint: '#2A4DA0', body: 'box' },
  truck: { S: 1.0, wheelR: 0.48, cabLen: 1.65, cabH: 2.45, dual: true, axles: 1, cabOver: true, paint: '#1D3A8A', body: 'box' },
  'truck-tandem': { S: 1.05, wheelR: 0.5, cabLen: 1.7, cabH: 2.55, dual: true, axles: 2, cabOver: true, paint: '#172554', body: 'box' }
};

export function buildTruck(THREE, bay, opts = {}) {
  const { L, W, H } = bay;
  const C = CFG[opts.kind] || CFG.truck;
  const group = new THREE.Group();
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const M = (color, o) => keep(new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.08 }, o || {})));
  const navy = M('#172554', { roughness: 0.32, metalness: 0.25 });
  const cabPaint = M(C.paint, { roughness: 0.28, metalness: 0.3 });
  const navyDark = M('#0F1A3D', { roughness: 0.45 });
  const white = M('#F4F6FA', { roughness: 0.4 });
  const steel = M('#AEB9C6', { metalness: 0.7, roughness: 0.3 });
  const dark = M('#1B2230', { roughness: 0.6 });
  const rubber = M('#20252E', { roughness: 0.85 });
  const orange = M('#F59E0B', { roughness: 0.4 });
  const glassCab = M('#9CC7EE', { transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2, depthWrite: false });
  const lamp = M('#FFF6D6', { emissive: '#FFE9A8', emissiveIntensity: 0.55, roughness: 0.2 });
  const tail = M('#D92D2D', { emissive: '#7A1010', emissiveIntensity: 0.4 });
  const floorMat = M('#B8A183', { roughness: 0.8 });
  const wallMat = keep(new THREE.MeshStandardMaterial({ color: '#BFD7F5', transparent: true, opacity: 0.1, roughness: 0.15, metalness: 0, depthWrite: false, side: THREE.DoubleSide }));

  const box = (sx, sy, sz, x, y, z, m, parent) => {
    const mesh = new THREE.Mesh(keep(new THREE.BoxGeometry(sx, sy, sz)), m);
    mesh.position.set(x, y, z); mesh.castShadow = !m.transparent; mesh.receiveShadow = true; (parent || group).add(mesh); return mesh;
  };
  const cylZ = (r, len, x, y, z, m, parent) => { // cylinder lying along Z
    const mesh = new THREE.Mesh(keep(new THREE.CylinderGeometry(r, r, len, 28)), m);
    mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y, z); mesh.castShadow = true; (parent || group).add(mesh); return mesh;
  };

  // ---------------- dimensions ----------------
  const S = C.S;                                            // overall size feel for cab and wheels
  const wheelR = C.wheelR;
  const frameY = wheelR + 0.32 * S;                         // underside of the cargo floor
  const floorT = 0.12;
  const floorY = frameY + floorT;                           // TOP of the cargo floor = bay y 0
  const bodyW = W + 0.16;                                   // outer body width
  const roofY = floorY + H;                                 // underside of the roof
  const cabLen = C.cabLen, cabH = Math.min(C.cabH, Math.max(roofY - 0.05, 1.4)), cabW = Math.min(bodyW, 2.1 * S + 0.1);
  const bodyFront = L / 2 + 0.06;                           // front wall x
  const bodyRear = -L / 2;                                  // tailgate x
  const cabX0 = bodyFront + 0.08;                           // rear of the cab

  // ---------------- chassis ----------------
  const railLen = (cabX0 + cabLen) - (bodyRear - 0.12);
  const railX = (cabX0 + cabLen + bodyRear - 0.12) / 2;
  [-1, 1].forEach((s) => box(railLen, 0.14, 0.1, railX, frameY - 0.1, s * (W / 2 - 0.2), dark));
  box(0.08, 0.1, bodyW, bodyRear - 0.1, frameY - 0.1, 0, dark);                                   // rear cross-member
  const bumperR = box(0.12, 0.16, bodyW * 0.92, bodyRear - 0.12, frameY - 0.24, 0, navyDark);       // rear bumper (ICC bar)
  box(0.04, 0.12, 0.04, bodyRear - 0.1, frameY - 0.1, 0, steel);
  // fuel tank between the axles
  const rearAxles = C.axles > 1 ? [bodyRear + 0.85 * S + 0.4, bodyRear + 0.85 * S + 1.45] : [bodyRear + Math.min(1.0 * S + 0.35, L * 0.3)];
  const frontAxle = cabX0 + cabLen - 0.62 * S;
  const tankX = (rearAxles[rearAxles.length - 1] + frontAxle) / 2;
  cylZ(0.22 * S, 0.9, tankX, frameY - 0.32, W / 2 - 0.5, M('#8C98A8', { metalness: 0.6, roughness: 0.4 }));

  // ---------------- cargo body ----------------
  box(L + 0.1, floorT, bodyW, 0.0, frameY + floorT / 2, 0, floorMat);                           // floor
  for (let i = 1; i < 6; i++) box(L, 0.004, 0.012, 0, floorY + 0.002, -W / 2 + (W * i) / 6, M('#9C8566'));      // floor plank lines
  box(0.06, H + 0.04, W, bodyFront - 0.03, floorY + H / 2, 0, M('#E2E8F0', { roughness: 0.6 })); // solid front wall (behind the load)
  const roof = box(L + 0.12, 0.05, bodyW, 0, roofY + 0.025, 0, wallMat);                          // see-through roof
  const sideN = box(L, H, 0.03, 0, floorY + H / 2, W / 2 + 0.06, wallMat);                         // see-through side walls
  const sideF = box(L, H, 0.03, 0, floorY + H / 2, -W / 2 - 0.06, wallMat);
  if (C.body === 'pickup') { // pickup bed: low solid side boards and tailgate, the covered cage above stays see-through
    [-1, 1].forEach((s) => box(L, 0.42, 0.05, 0, floorY + 0.21, s * (W / 2 + 0.06), navy));
    box(0.05, 0.42, W + 0.14, bodyRear + 0.02, floorY + 0.21, 0, navy);
  }
  // structural frame: corner posts, intermediate ribs, top and bottom rails
  const postN = Math.max(2, Math.round(L / 0.95));
  [-1, 1].forEach((s) => {
    for (let i = 0; i <= postN; i++) {
      const x = bodyRear + 0.02 + (L - 0.04) * (i / postN), corner = i === 0 || i === postN;
      box(corner ? 0.08 : 0.045, H + 0.14, corner ? 0.08 : 0.04, x, floorY + H / 2 + 0.02, s * (W / 2 + 0.06), corner ? navy : M('#3A4A78'));
    }
    box(L + 0.1, 0.07, 0.07, 0, roofY + 0.04, s * (W / 2 + 0.06), navy);                          // top side rails
    box(L + 0.1, 0.09, 0.08, 0, floorY + 0.01, s * (W / 2 + 0.07), navy);                         // bottom side rails
    box(0.07, 0.07, bodyW, s > 0 ? bodyFront : bodyRear + 0.02, roofY + 0.04, 0, navy);            // top cross rails
  });
  box(0.07, 0.07, bodyW, bodyRear + 0.02, roofY + 0.04, 0, navy);
  box(0.07, 0.07, bodyW, bodyFront, roofY + 0.04, 0, navy);
  // rear tail lights and door frame
  [-1, 1].forEach((s) => box(0.05, 0.22, 0.08, bodyRear - 0.04, floorY + 0.18, s * (W / 2 + 0.02), tail));
  const wallClear = { value: true };

  // ---------------- cab (extruded side profile) ----------------
  const cab = new THREE.Group(); group.add(cab);
  const y0 = frameY - 0.02;
  const prof = new THREE.Shape();
  prof.moveTo(0, y0); prof.lineTo(0, cabH);
  if (C.cabOver) { // flat-faced cab-over-engine cab
    prof.lineTo(cabLen * 0.86, cabH); prof.quadraticCurveTo(cabLen * 0.97, cabH, cabLen * 0.985, cabH - 0.3 * S);
    prof.lineTo(cabLen, y0 + 0.9 * S); prof.lineTo(cabLen, y0); prof.lineTo(0, y0);
  } else { // bonnet-style cab with a sloped windscreen
    prof.lineTo(cabLen * 0.64, cabH);
    prof.quadraticCurveTo(cabLen * 0.78, cabH, cabLen * 0.86, cabH - 0.55 * S);
    prof.lineTo(cabLen * 0.97, y0 + 1.05 * S); prof.quadraticCurveTo(cabLen, y0 + 0.9 * S, cabLen, y0 + 0.7 * S); prof.lineTo(cabLen, y0); prof.lineTo(0, y0);
  }
  const cabGeo = keep(new THREE.ExtrudeGeometry(prof, { depth: cabW - 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 10 }));
  cabGeo.translate(0, 0, -(cabW - 0.1) / 2);
  const cabMesh = new THREE.Mesh(cabGeo, cabPaint); cabMesh.castShadow = true; cabMesh.receiveShadow = true; cab.add(cabMesh);
  cab.position.set(cabX0, 0, 0);
  // windscreen (slanted) and side windows
  const wsA = C.cabOver ? { x: cabLen * 0.955, y: cabH - 0.2 * S } : { x: cabLen * 0.74, y: cabH - 0.15 * S }, wsB = C.cabOver ? { x: cabLen * 0.985, y: y0 + 1.0 * S } : { x: cabLen * 0.95, y: y0 + 1.12 * S };
  const wsLen = Math.hypot(wsB.x - wsA.x, wsB.y - wsA.y), wsAng = Math.atan2(wsB.y - wsA.y, wsB.x - wsA.x);
  const ws = box(wsLen, 0.025, cabW * 0.86, (wsA.x + wsB.x) / 2, (wsA.y + wsB.y) / 2, 0, glassCab, cab); ws.rotation.z = wsAng; ws.position.y += 0.03; ws.position.x += 0.03;
  const winShape = new THREE.Shape();
  winShape.moveTo(0.1, cabH - 0.62 * S); winShape.lineTo(0.1, cabH - 0.12 * S); winShape.lineTo(cabLen * 0.62, cabH - 0.12 * S); winShape.lineTo(cabLen * 0.82, cabH - 0.62 * S); winShape.lineTo(0.1, cabH - 0.62 * S);
  const winGeo = keep(new THREE.ShapeGeometry(winShape));
  [-1, 1].forEach((s) => {
    const win = new THREE.Mesh(winGeo, glassCab); win.position.z = s * ((cabW - 0.1) / 2 + 0.06); if (s < 0) win.rotation.y = Math.PI; cab.add(win);
    box(0.012, cabH - y0 - 0.9 * S, 0.012, cabLen * 0.34, (cabH + y0 - 0.55 * S) / 2 - 0.2 * S, s * ((cabW - 0.1) / 2 + 0.065), navyDark, cab);        // door seam
    box(0.012, 0.9 * S, 0.012, cabLen * 0.34, y0 + 0.5 * S, s * ((cabW - 0.1) / 2 + 0.065), navyDark, cab);
    box(0.16, 0.035, 0.03, cabLen * 0.52, y0 + 0.95 * S, s * ((cabW - 0.1) / 2 + 0.085), steel, cab);                                                   // door handle
    box(cabLen * 0.86, 0.07, 0.014, cabLen * 0.46, y0 + 0.55 * S, s * ((cabW - 0.1) / 2 + 0.065), orange, cab);                                           // brand stripe
    box(0.05, 0.22, 0.1, cabLen * 0.78, cabH - 0.55 * S, s * (cabW / 2 + 0.08), dark, cab);                                                              // mirror arm
    box(0.04, 0.3 * S, 0.12, cabLen * 0.78 + 0.02, cabH - 0.75 * S, s * (cabW / 2 + 0.17), navyDark, cab);                                                // mirror
    box(0.32 * S, 0.06, 0.18, cabLen * 0.6, y0 + 0.02, s * (cabW / 2 - 0.02), dark, cab);                                                                 // step
  });
  // front face: grille, headlights, indicators, bumper
  const fx = cabLen + 0.075;
  box(0.03, 0.46 * S, cabW * 0.62, fx, y0 + 0.62 * S, 0, dark, cab);
  for (let i = 0; i < 5; i++) box(0.035, 0.018, cabW * 0.58, fx + 0.004, y0 + (0.44 + i * 0.075) * S, 0, steel, cab);
  [-1, 1].forEach((s) => {
    box(0.05, 0.2 * S, 0.3 * S, fx - 0.005, y0 + 0.75 * S, s * (cabW / 2 - 0.34 * S), lamp, cab);
    box(0.045, 0.07, 0.12, fx - 0.005, y0 + 0.5 * S, s * (cabW / 2 - 0.18 * S), orange, cab);
  });
  box(0.16, 0.2 * S, cabW + 0.04, fx + 0.04, y0 + 0.12, 0, navyDark, cab);
  box(0.04, 0.05, cabW * 0.7, fx + 0.1, y0 + 0.04, 0, steel, cab);
  // ---------------- wheels ----------------
  const tyreGeo = keep(new THREE.CylinderGeometry(wheelR, wheelR, 0.26 * S, 32));
  const rimGeo = keep(new THREE.CylinderGeometry(wheelR * 0.58, wheelR * 0.58, 0.275 * S, 24));
  const hubGeo = keep(new THREE.CylinderGeometry(wheelR * 0.24, wheelR * 0.24, 0.3 * S, 16));
  const boltGeo = keep(new THREE.CylinderGeometry(0.018, 0.018, 0.32 * S, 8));
  const treadGeo = keep(new THREE.TorusGeometry(wheelR * 0.97, 0.025, 6, 40));
  function addWheel(x, z) {
    const w = new THREE.Group(); w.position.set(x, wheelR, z);
    const tyre = new THREE.Mesh(tyreGeo, rubber); tyre.rotation.x = Math.PI / 2; tyre.castShadow = true; w.add(tyre);
    [-1, 1].forEach((s) => { const t = new THREE.Mesh(treadGeo, dark); t.position.z = s * 0.1 * S; w.add(t); });
    const rim = new THREE.Mesh(rimGeo, steel); rim.rotation.x = Math.PI / 2; w.add(rim);
    const hub = new THREE.Mesh(hubGeo, M('#6B7788', { metalness: 0.7, roughness: 0.3 })); hub.rotation.x = Math.PI / 2; w.add(hub);
    for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3, b = new THREE.Mesh(boltGeo, dark); b.rotation.x = Math.PI / 2; b.position.set(Math.cos(a) * wheelR * 0.4, Math.sin(a) * wheelR * 0.4, 0); w.add(b); }
    group.add(w);
  }
  const fenderMat = keep(new THREE.MeshStandardMaterial({ color: '#0F1A3D', roughness: 0.5, side: THREE.DoubleSide }));
  const fenderGeo = keep(new THREE.CylinderGeometry(wheelR + 0.09, wheelR + 0.09, 1, 28, 1, true, 0, Math.PI));
  const fender = (x, z, len) => { // half-cylinder mud-guard over the top of a wheel
    const inner = new THREE.Mesh(fenderGeo, fenderMat); inner.scale.set(1, len, 1); inner.rotation.x = Math.PI / 2; inner.castShadow = true;
    const outer = new THREE.Group(); outer.add(inner); outer.rotation.z = Math.PI / 2; outer.position.set(x, wheelR, z); group.add(outer);
  };
  // front axle (single tyres) under the cab, rear axle(s) (dual tyres) at the back of the body
  [-1, 1].forEach((s) => { addWheel(frontAxle, s * (cabW / 2 - 0.2 * S)); fender(frontAxle, s * (cabW / 2 - 0.2 * S), 0.3 * S); });
  rearAxles.forEach((ax) => [-1, 1].forEach((s) => {
    addWheel(ax, s * (W / 2 - 0.12 * S)); if (C.dual) addWheel(ax, s * (W / 2 - 0.12 * S - 0.29 * S));
    box(0.5 * S, 0.05, 0.02, ax - wheelR - 0.14, wheelR * 0.5, s * (W / 2 + 0.02), rubber);                          // mud flap
  }));
  rearAxles.forEach((ax) => cylZ(0.04, W - 0.1, ax, wheelR, 0, steel));                                           // axle
  cylZ(0.04, cabW - 0.2, frontAxle, wheelR, 0, steel);

  // ---------------- bounds ----------------
  const bounds = new THREE.Box3(new THREE.Vector3(bodyRear - 0.2, 0, -bodyW / 2 - 0.1), new THREE.Vector3(cabX0 + cabLen + 0.3, Math.max(cabH, roofY + 0.1), bodyW / 2 + 0.1));

  // ---------------- capacity ruler (decorative gauge fed by the ESTIMATE's percentage, not by mesh counts) ----------------
  const rulerLen = L, rulerY = frameY - 0.28;
  const trackMat = M('#CBD5E1'), fillMat = M('#F59E0B', { emissive: '#7A4A00', emissiveIntensity: 0.25 });
  const rulers = [-1, 1].map((s) => {
    const z = s * (bodyW / 2 + 0.035);
    box(rulerLen, 0.07, 0.03, 0, rulerY, z, trackMat);
    const fill = box(1, 0.09, 0.045, 0, rulerY, z, fillMat); fill.userData.z = z;
    box(0.015, 0.14, 0.05, L / 2 - 0.8 * L, rulerY, z, white); // 80 % tick (measured from the front wall)
    return fill;
  });
  function setFill(fraction, state) {
    const f = Math.max(0.001, Math.min(1, fraction || 0));
    rulers.forEach((r) => { r.scale.x = rulerLen * f; r.position.x = L / 2 - (rulerLen * f) / 2; r.visible = fraction > 0; });
    fillMat.color.set(state === 'over' ? '#DC2626' : state === 'near' ? '#B45309' : '#F59E0B');
    fillMat.emissive.set(state === 'over' ? '#5A0D0D' : state === 'near' ? '#3A1F00' : '#7A4A00');
  }
  function setState(state) {
    wallMat.color.set(state === 'over' ? '#F6AFAF' : state === 'near' ? '#F9D49A' : '#BFD7F5');
  }
  function setWalls(clear) {
    wallClear.value = clear;
    wallMat.opacity = clear ? 0.1 : 0.42;
    roof.visible = true;
  }

  return {
    group, floorY, rearX: bodyRear, frontX: bodyFront, bounds, bodyW, setFill, setState, setWalls,
    /** bay frame (x from front wall, y up from floor, z across) -> world */
    bayToWorld: (bx, by, bz) => ({ x: L / 2 - bx, y: floorY + by, z: bz - W / 2 }),
    dispose() { disposables.forEach((d) => d.dispose && d.dispose()); group.clear(); }
  };
}
