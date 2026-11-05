/*
 * plan-api.js - exposes the pure loading-plan maths (no Three.js, a few KB) to the classic scripts, so the page can check
 * in the background whether the volume-based vehicle can physically take every item. Loaded as a small module on page start.
 */
import { packCargo, planVehicles, bayFromVehicle, validatePlacements } from './cargo-layout.js';

window.TSE = window.TSE || {};
window.TSE.Packing = { packCargo, planVehicles, bayFromVehicle, validatePlacements };
window.dispatchEvent(new Event('tse-pack-ready'));
