/*
 * truck-visualizer-3d.js - the interactive 3D truck viewer (Three.js, loaded locally through the import map).
 *
 * It only DRAWS. Volume, capacity %, recommended truck and warnings come from estimator.js; this module receives the
 * same model object the 2D viewer used:
 *   { vehicle, blocks, state, percent, excessText, emptyText, unavailableText }
 * where blocks are the estimator's per-unit boxes (with visualType / dimensions from the catalogue).
 * The picture is an illustration of the estimate. It is NOT calculated from mesh counts and does not prove physical fit.
 *
 * Items are always drawn at their configured size. Nothing is scaled, merged or hidden to make a load fit; items that
 * have no valid place are drawn outside the vehicle.
 *
 * Performance: one renderer, shared geometries/materials, render-on-demand (no loop while idle), shadows re-rendered
 * only when something changes, pixel-ratio cap, paused when hidden or off-screen.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createItemFactory } from './item-models.js';
import { buildTruck } from './truck-model.js';
import { packCargo, packOverflow, bayFromVehicle, validatePlacements } from './cargo-layout.js';
import { dimsFor } from './item-specs.js';

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

const VIEWS = { // azimuth (deg, + towards the truck's front), polar angle from straight up (deg)
  threeQuarter: { az: 38, pol: 68 }, side: { az: 0, pol: 84 }, top: { az: 0, pol: 9 },
  front: { az: 90, pol: 80 }, rear: { az: -90, pol: 78 }
};
const VIEW_LABEL = { threeQuarter: 'Three-quarter view', side: 'Side view', top: 'Top view', front: 'Front view', rear: 'Rear view' };
const DEG = Math.PI / 180;

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function axisVec(axis) { return axis === 0 ? new THREE.Vector3(-1, 0, 0) : axis === 1 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1); }

export function createViewer(container, opts = {}) {
  if (!webglAvailable()) throw new Error('WebGL is not available');
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  // ---------- DOM ----------
  container.classList.add('v3d');
  const canvasHost = document.createElement('div'); canvasHost.className = 'v3d-host'; container.appendChild(canvasHost);
  const overlay = document.createElement('div'); overlay.className = 'v3d-overlay';
  overlay.innerHTML = '<p class="v3d-loading" role="status">Loading 3D view…</p><p class="v3d-badge" hidden></p><p class="truck-note" hidden></p><p class="truck-pill" hidden></p>';
  container.appendChild(overlay);
  const $o = (s) => overlay.querySelector(s);
  const loadingEl = $o('.v3d-loading'), badgeEl = $o('.v3d-badge'), noteEl = $o('.truck-note'), pillEl = $o('.truck-pill');

  // ---------- renderer / scene ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
  } catch (e) { throw new Error('Could not create the WebGL renderer: ' + e.message); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.NoToneMapping;
  const canvas = renderer.domElement;
  canvas.className = 'v3d-canvas'; canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '3D view of the truck and its load. Use arrow keys to rotate, plus and minus to zoom, zero to reset.');
  canvasHost.appendChild(canvas);

  const BG = '#EEF3FB';
  const scene = new THREE.Scene(); scene.background = new THREE.Color(BG); scene.fog = new THREE.Fog(BG, 22, 48);
  const camera = new THREE.PerspectiveCamera(36, 1.4, 0.1, 120);
  const hemi = new THREE.HemisphereLight('#FFFFFF', '#B8C4D6', 0.95); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFFFFF', 1.55); sun.castShadow = true; sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3; scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight('#DCE7FF', 0.45); fill.position.set(-6, 5, -7); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: '#E1E8F2', roughness: 0.96 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // road markings give a sense of scale and direction
  const markMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.9 });
  const markGeo = new THREE.BoxGeometry(1.4, 0.004, 0.14);
  for (let i = -8; i <= 8; i++) { const m = new THREE.Mesh(markGeo, markMat); m.position.set(i * 2.6, 0.003, -3.1); m.receiveShadow = true; scene.add(m); }

  const factory = createItemFactory(THREE, RoundedBoxGeometry);
  const cargoGroup = new THREE.Group(); scene.add(cargoGroup);
  const overflowGroup = new THREE.Group(); scene.add(overflowGroup);
  const labelGroup = new THREE.Group(); scene.add(labelGroup);

  // ---------- controls ----------
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableDamping = !reduced(); controls.dampingFactor = 0.09;
  controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.8; controls.minPolarAngle = 0.12; controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };

  // ---------- state ----------
  let truck = null, truckKey = '', lastSig = '', lastModel = null, disposed = false, visible = true, raf = 0, shadowDirty = true;
  let fitDist = 12, zoomFactor = 1.0, curView = 'threeQuarter', viewTween = null, wallsClear = true;
  const target = new THREE.Vector3(0, 1.2, 0);
  const items = new Map();      // block id -> { group, sig, tween, label, parent }
  const orientCache = new Map();
  let overflowSign = null, overflowPad = null, frameBox = new THREE.Box3();
  let lastExt = { x: 6, y: 3, z: 2.2 }, overflowExtra = 0;

  const invalidate = () => { if (disposed || !visible || document.hidden) return; if (!raf) raf = requestAnimationFrame(frame); };

  // ---------- helpers ----------
  function orientQuat(perm) {
    const key = perm.join(''); if (orientCache.has(key)) return orientCache.get(key);
    const axisOf = [0, 0, 0]; perm.forEach((nat, bayAxis) => { axisOf[nat] = bayAxis; });  // natural axis (0 w, 1 d, 2 h) -> bay axis
    const cx = axisVec(axisOf[0]), cy = axisVec(axisOf[2]), cz = axisVec(axisOf[1]);          // model X (width), Y (height), Z (depth)
    const m = new THREE.Matrix4().makeBasis(cx, cy, cz);
    if (m.determinant() < 0) { cx.negate(); m.makeBasis(cx, cy, cz); }                          // mirror-symmetric items: flip rather than reflect
    const q = new THREE.Quaternion().setFromRotationMatrix(m); orientCache.set(key, q); return q;
  }
  function disposeLabel(rec) {
    if (rec.label) { labelGroup.remove(rec.label); rec.label.material.map.dispose(); rec.label.material.dispose(); rec.label = null; }
  }
  function makeLabel(text, wide) {
    const W = wide ? 560 : 320;
    const c = document.createElement('canvas'); c.width = W; c.height = 72; const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.94)'; g.strokeStyle = '#172554'; g.lineWidth = 3;
    g.beginPath(); g.roundRect ? g.roundRect(3, 3, W - 6, 66, 14) : g.rect(3, 3, W - 6, 66); g.fill(); g.stroke();
    g.fillStyle = '#172554'; g.font = '600 28px system-ui, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const maxChars = wide ? 44 : 24, t = text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text; g.fillText(t, W / 2, 38);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 2;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); s.scale.set(0.9, 0.2, 1); s.renderOrder = 10; return s;
  }
  function disposeRec(id) {
    const rec = items.get(id); if (!rec) return;
    rec.parent.remove(rec.group); disposeLabel(rec); items.delete(id);   // geometries/materials are shared; nothing else to free
  }

  // ---------- truck ----------
  function ensureTruck(vehicle, bay) {
    const key = vehicle.id + '|' + (vehicle.model || '') + '|' + bay.L.toFixed(3) + '|' + bay.W.toFixed(3) + '|' + bay.H.toFixed(3);
    if (key === truckKey && truck) return false;
    if (truck) { scene.remove(truck.group); truck.dispose(); }
    truck = buildTruck(THREE, bay, { kind: vehicle.model || vehicle.cls }); truckKey = key; scene.add(truck.group); truck.setWalls(wallsClear);
    lastSig = ''; // contents must be re-laid in the new bay
    const b = truck.bounds, size = b.getSize(new THREE.Vector3());
    target.set((b.min.x + b.max.x) / 2, 1.15, 0);
    lastExt = { x: size.x, y: size.y, z: size.z };
    const R = Math.max(size.x, size.z) * 0.75 + 4;
    sun.position.set(target.x + R * 0.55, R * 0.95, R * 0.7); sun.target.position.copy(target);
    const sc = sun.shadow.camera; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 0.5; sc.far = R * 3; sc.updateProjectionMatrix();
    shadowDirty = true; return true;
  }

  // ---------- items ----------
  function applyPlacement(rec, placement, origin, parent, animate) {
    const bayToWorld = (bx, by, bz) => ({ x: origin.x - bx, y: origin.y + by, z: bz - origin.zc });
    const cx = bayToWorld(placement.x + placement.ex / 2, placement.y, placement.z + placement.ez / 2);
    const q = orientQuat(placement.perm), g = rec.group, h = rec.size[1];
    const off = new THREE.Vector3(0, h / 2, 0).applyQuaternion(q);       // model origin is the centre of its base
    const pos = new THREE.Vector3(cx.x, cx.y + placement.ey / 2, cx.z).sub(off);
    if (rec.parent !== parent) { rec.parent.remove(g); parent.add(g); rec.parent = parent; }
    const fresh = !rec.placed;
    rec.placed = true;
    if (animate && !reduced()) {
      rec.tween = {
        t0: performance.now(), dur: fresh ? 420 : 360,
        p0: fresh ? pos.clone().add(new THREE.Vector3(0, 0.5, 0)) : g.position.clone(), p1: pos,
        q0: g.quaternion.clone(), q1: q.clone(), s0: fresh ? 0.78 : g.scale.x, s1: 1
      };
      if (fresh) { g.position.copy(rec.tween.p0); g.quaternion.copy(q); g.scale.setScalar(0.78); }
    } else { g.position.copy(pos); g.quaternion.copy(q); g.scale.setScalar(1); rec.tween = null; }
    rec.target = { pos, top: new THREE.Vector3(cx.x, cx.y + placement.ey + 0.14, cx.z) };
    if (rec.label) rec.label.position.copy(rec.target.top);
  }

  function syncItems(layout, overflowLayout, bay, lod) {
    const wanted = new Set();
    const originCargo = { x: bay.L / 2, y: truck.floorY, zc: bay.W / 2 };
    const zoneW = Math.max(bay.W * 1.25, 2.0);
    const originZone = { x: truck.rearX - 1.1, y: 0, zc: zoneW / 2 };
    const place = (p, origin, parent, isOverflow) => {
      const b = p.block, d = dimsFor(b);
      const w = d.w, dd = d.d, hh = d.h; // configured size, never scaled
      const variant = hashStr(b.id) % 4;
      const sig = [b.visualType, w.toFixed(3), dd.toFixed(3), hh.toFixed(3), lod ? 1 : 0, variant].join('|');
      wanted.add(p.id);
      let rec = items.get(p.id);
      if (rec && rec.sig !== sig) { disposeRec(p.id); rec = null; }
      if (!rec) {
        const g = factory.build(b.visualType, w, dd, hh, { lod, variant });
        g.traverse((o) => { if (o.isMesh) o.castShadow = o.castShadow && !isOverflow; });
        rec = { group: g, sig, size: [w, hh, dd], parent, placed: false, tween: null, label: null, target: null, overflow: isOverflow };
        parent.add(g); items.set(p.id, rec);
        if ((b.custom || g.userData.placeholder) && !lod) { rec.label = makeLabel(b.custom ? (b.label || 'Custom item') : (b.label || b.visualType)); labelGroup.add(rec.label); }
      }
      applyPlacement(rec, p, origin, parent, true);
    };
    layout.placed.forEach((p) => place(p, originCargo, cargoGroup, false));
    overflowLayout.placed.forEach((p) => place(p, originZone, overflowGroup, true));
    Array.from(items.keys()).forEach((id) => { if (!wanted.has(id)) disposeRec(id); });
    shadowDirty = true;
    return { zoneW, originZone };
  }

  // overflow pad + sign
  function updateOverflowZone(info, count, hiddenCount, depth, visibleZone) {
    if (overflowPad) { overflowGroup.remove(overflowPad); overflowPad.geometry.dispose(); overflowPad.material.dispose(); overflowPad = null; }
    if (overflowSign) { labelGroup.remove(overflowSign); overflowSign.material.map.dispose(); overflowSign.material.dispose(); overflowSign = null; }
    overflowExtra = 0;
    if (!visibleZone) return;
    const w = info.zoneW, dd = Math.max(depth + 0.3, 1.2);
    overflowExtra = 1.1 + dd + 0.3;
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(dd, w), new THREE.MeshBasicMaterial({ color: '#DC2626', transparent: true, opacity: 0.12, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(info.originZone.x - dd / 2 + 0.1, 0.01, 0); overflowPad = pad; overflowGroup.add(pad);
    const text = 'Does not fit in this vehicle';
    overflowSign = makeLabel(text, true); overflowSign.scale.set(3.3, 0.43, 1);
    overflowSign.position.set(info.originZone.x - dd / 2, 1.9, 0); labelGroup.add(overflowSign);
  }

  // ---------- camera ----------
  function spherical() {
    const v = camera.position.clone().sub(target); const r = v.length();
    return { r, az: Math.atan2(v.x, v.z), pol: Math.acos(Math.max(-1, Math.min(1, v.y / r))) };
  }
  function setCam(az, pol, r) {
    pol = Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, pol));
    camera.position.set(target.x + r * Math.sin(pol) * Math.sin(az), target.y + r * Math.cos(pol), target.z + r * Math.sin(pol) * Math.cos(az));
    camera.lookAt(target);
  }
  function computeFit() {
    const asp = camera.aspect, vfov = camera.fov * DEG, hfov = 2 * Math.atan(Math.tan(vfov / 2) * asp);
    const len = lastExt.x + overflowExtra;                                  // truck length (+ overflow area behind it)
    const halfW = (0.9 * len + 0.45 * lastExt.z) / 2;                       // projected width in a three-quarter view
    const halfH = (lastExt.y + 0.3 * len) / 2;                              // projected height including the ground depth
    fitDist = Math.max((halfW * 1.1) / Math.tan(hfov / 2), (halfH * 1.1) / Math.tan(vfov / 2)) + lastExt.z * 0.4;
    controls.minDistance = fitDist * 0.35; controls.maxDistance = fitDist * 1.7;
  }
  function frameTarget() {
    if (!truck) return;
    const b = truck.bounds.clone(); if (overflowExtra > 0) b.expandByPoint(new THREE.Vector3(truck.rearX - overflowExtra, 0, 0));
    const c = b.getCenter(new THREE.Vector3()); target.set(c.x, 1.1, 0); controls.target.copy(target);
  }
  function goToView(name, instant) {
    const v = VIEWS[name] || VIEWS.threeQuarter; curView = name in VIEWS ? name : 'threeQuarter';
    computeFit(); frameTarget();
    const to = { az: v.az * DEG, pol: v.pol * DEG, r: fitDist * zoomFactor };
    if (instant || reduced()) { setCam(to.az, to.pol, to.r); controls.update(); viewTween = null; invalidate(); return; }
    const from = spherical(); let dAz = to.az - from.az; while (dAz > Math.PI) dAz -= 2 * Math.PI; while (dAz < -Math.PI) dAz += 2 * Math.PI;
    viewTween = { t0: performance.now(), dur: 650, from, dAz, to };
    invalidate();
  }

  // ---------- sizing ----------
  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false); canvas.style.width = '100%'; canvas.style.height = '100%';
    if (!truck || !viewInit) { camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate(); return; }
    const old = fitDist; camera.aspect = w / h; camera.updateProjectionMatrix();
    const s = spherical(); computeFit();
    const ratio = old > 0 ? s.r / old : 1; zoomFactor = Math.max(0.35, Math.min(1.7, ratio));
    setCam(s.az, s.pol, fitDist * zoomFactor); controls.update(); invalidate();
  }

  // ---------- render loop (on demand) ----------
  function frame(now) {
    raf = 0; if (disposed) return;
    let active = false;
    now = now || performance.now();
    items.forEach((rec) => {
      const t = rec.tween; if (!t) return;
      const k = Math.min(1, (now - t.t0) / t.dur), e = 1 - Math.pow(1 - k, 3);
      rec.group.position.lerpVectors(t.p0, t.p1, e); rec.group.quaternion.slerpQuaternions(t.q0, t.q1, e); rec.group.scale.setScalar(t.s0 + (t.s1 - t.s0) * e);
      if (rec.label && rec.target) rec.label.position.set(rec.group.position.x, rec.target.top.y + (1 - e) * 0.3, rec.group.position.z);
      if (k >= 1) { rec.tween = null; if (rec.label && rec.target) rec.label.position.copy(rec.target.top); } else active = true;
      shadowDirty = true;
    });
    if (viewTween) {
      const t = viewTween, k = Math.min(1, (now - t.t0) / t.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setCam(t.from.az + t.dAz * e, t.from.pol + (t.to.pol - t.from.pol) * e, t.from.r + (t.to.r - t.from.r) * e);
      if (k >= 1) viewTween = null; else active = true;
    }
    const changed = controls.update();
    if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
    renderer.render(scene, camera);
    if (loadingEl && !loadingEl.hidden) loadingEl.hidden = true;
    if (active || changed) invalidate();
  }

  controls.addEventListener('change', () => { zoomFactor = camera.position.distanceTo(target) / fitDist; invalidate(); });
  controls.addEventListener('start', () => { viewTween = null; container.classList.add('is-dragging'); if (opts.onManual) opts.onManual(); });
  controls.addEventListener('end', () => { container.classList.remove('is-dragging'); });

  // keyboard (the canvas is focusable): arrows rotate, + / - zoom, 0 resets
  canvas.addEventListener('keydown', (e) => {
    const s = spherical(); let handled = true;
    if (e.key === 'ArrowLeft') setCam(s.az - 10 * DEG, s.pol, s.r);
    else if (e.key === 'ArrowRight') setCam(s.az + 10 * DEG, s.pol, s.r);
    else if (e.key === 'ArrowUp') setCam(s.az, s.pol - 8 * DEG, s.r);
    else if (e.key === 'ArrowDown') setCam(s.az, s.pol + 8 * DEG, s.r);
    else if (e.key === '+' || e.key === '=') setCam(s.az, s.pol, Math.max(controls.minDistance, s.r * 0.88));
    else if (e.key === '-' || e.key === '_') setCam(s.az, s.pol, Math.min(controls.maxDistance, s.r * 1.14));
    else if (e.key === '0') goToView('threeQuarter');
    else handled = false;
    if (handled) { e.preventDefault(); viewTween = null; controls.update(); zoomFactor = camera.position.distanceTo(target) / fitDist; invalidate(); }
  });

  // visibility / size observers
  const ro = new ResizeObserver(() => { if (!disposed) resize(); }); ro.observe(container);
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) invalidate(); }, { threshold: 0 }) : null;
  if (io) io.observe(container);
  const onVis = () => { if (!document.hidden) invalidate(); };
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (opts.onFail) opts.onFail('The 3D graphics context was lost.'); });
  canvas.addEventListener('webglcontextrestored', () => { shadowDirty = true; invalidate(); });

  // ---------- public update ----------
  const LOD_AT = 170; // above this many boxes the detailed models are swapped for plain coloured boxes (same sizes)
  const STATE_TEXT = { comfortable: 'Comfortable load', near: 'Near capacity', over: 'Over capacity', empty: 'Empty truck', unavailable: 'No estimate yet' };
  function update(m) {
    lastModel = m;
    if (!m.vehicle) { noteEl.hidden = false; noteEl.textContent = 'Truck data could not be loaded.'; return null; }
    const bay = bayFromVehicle(m.vehicle);
    const prev = viewInit ? Object.assign(spherical(), { zf: zoomFactor }) : null;   // keep the visitor's angle and zoom across updates
    const truckChanged = ensureTruck(m.vehicle, bay);
    const empty = m.state === 'empty' || m.state === 'unavailable';
    const blocks = empty ? [] : (m.blocks || []);
    const sig = truckKey + '|' + blocks.map((b) => b.id + ':' + b.visualType + ':' + Math.round((b.volumeFt3 || 0) * 100) + (b.dimsM ? ':' + b.dimsM.map((x) => x.toFixed(3)).join('x') : '') + (b.fragile ? 'f' : '') + (b.heavy ? 'h' : '')).join(',');
    let stats = lastStats;
    if (sig !== lastSig) {
      lastSig = sig;
      const layout = packCargo(blocks, bay);
      const lod = layout.placed.length + layout.overflow.length > LOD_AT;
      const zoneW = Math.max(bay.W * 1.25, 2.0);
      const over = packOverflow(layout.overflow, zoneW);
      const info = syncItems(layout, over, bay, lod);
      updateOverflowZone(info, layout.overflow.length, over.hidden, over.depth, layout.overflow.length > 0);
      stats = lastStats = {
        placed: layout.placed.length, overflow: layout.overflow.length, overflowShown: over.placed.length, hidden: 0, scale: 1, pooled: 0, lod,
        tooBig: layout.overflow.filter((o) => o.reason === 'too-big').length, total: layout.totalCount,
        overflowItems: layout.overflow.map((o) => ({ id: o.id, label: o.block.label, reason: o.reason })),
        problems: validatePlacements(layout.placed, bay)
      };
      computeFit(); frameTarget();
      if (!viewInit) { viewInit = true; zoomFactor = 1; goToView(curView, true); }
      else if (prev) { zoomFactor = prev.zf; setCam(prev.az, prev.pol, fitDist * zoomFactor); controls.update(); zoomFactor = prev.zf; }
    }
    truck.setState(m.state); truck.setFill(empty ? 0 : Math.min(m.percent || 0, 100) / 100, m.state);

    // HTML overlay: only the empty-state note stays on the canvas; capacity details are shown by the page (modal text)
    badgeEl.hidden = true; pillEl.hidden = true;
    if (empty) { noteEl.hidden = false; noteEl.textContent = m.state === 'empty' ? (m.emptyText || 'Add items to load the vehicle') : (m.unavailableText || 'No estimate available yet'); } else noteEl.hidden = true;
    const note = stats && !empty ? 'Items are drawn at their configured sizes. The arrangement is an illustration, not proof that everything fits.' : '';
    if (stats) stats.note = note;
    canvas.setAttribute('aria-label', '3D view of the ' + m.vehicle.name.toLowerCase() + '. ' + (empty ? 'The cargo area is empty.' : STATE_TEXT[m.state] + ', about ' + Math.round(m.percent) + ' percent of its estimated capacity. Illustration only.') + ' Arrow keys rotate, plus and minus zoom, zero resets.');
    invalidate();
    return Object.assign({}, stats, { note });
  }
  let lastStats = null, viewInit = false;

  const api = {
    update,
    setView: (name) => goToView(name, false),
    reset: () => { zoomFactor = 1; goToView('threeQuarter', false); },
    zoom: (factor) => { const s = spherical(); setCam(s.az, s.pol, Math.min(controls.maxDistance, Math.max(controls.minDistance, s.r * factor))); controls.update(); zoomFactor = camera.position.distanceTo(target) / fitDist; invalidate(); },
    rotate: (dAzDeg, dPolDeg) => { const s = spherical(); setCam(s.az + dAzDeg * DEG, s.pol + dPolDeg * DEG, s.r); controls.update(); invalidate(); },
    setWalls: (clear) => { wallsClear = clear; if (truck) truck.setWalls(clear); invalidate(); },
    setTouchCapture: () => { canvas.style.touchAction = 'none'; },
    setAutoRotate: (on) => { controls.autoRotate = !!on && !reduced(); controls.autoRotateSpeed = 1.6; viewTween = null; invalidate(); return controls.autoRotate; },
    isAutoRotating: () => !!controls.autoRotate,
    getView: () => curView, viewLabel: (n) => VIEW_LABEL[n] || n,
    refresh: () => { resize(); invalidate(); },
    stats: () => {
      renderer.render(scene, camera); // make the renderer's own counters current
      let meshes = 0; scene.traverse((o) => { if (o.isMesh) meshes++; });
      return Object.assign({ drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
        meshes, labels: labelGroup.children.length, items: items.size, sceneChildren: scene.children.length, rendererCount: 1 }, lastStats || {});
    },
    sceneInfo: () => ({ items: Array.from(items.keys()), fitDist, zoomFactor, camera: camera.position.toArray(), target: target.toArray(), view: curView }),
    canvas, renderer, THREE,
    dispose() {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect(); if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis);
      Array.from(items.keys()).forEach(disposeRec); factory.dispose(); if (truck) truck.dispose(); controls.dispose(); renderer.dispose(); container.classList.remove('v3d');
      canvasHost.remove(); overlay.remove();
    }
  };
  canvas.style.touchAction = 'none'; // the viewer lives in a full-screen dialog, so one finger rotates and two fingers pinch-zoom
  resize();
  return api;
}

// make the viewer available to the classic (non-module) scripts
window.TSE = window.TSE || {};
window.TSE.Viewer3D = { supported: webglAvailable, create: createViewer, revision: THREE.REVISION };
window.dispatchEvent(new Event('tse-3d-ready'));
