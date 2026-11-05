Three.js r186 (npm package "three" 0.186.1), MIT licence (see LICENSE).
Unmodified files copied from the official package:
  three.module.js, three.core.js        <- build/
  addons/controls/OrbitControls.js      <- examples/jsm/controls/
  addons/geometries/RoundedBoxGeometry.js <- examples/jsm/geometries/
They are loaded through the import map in index.php / index.html, so the site needs no network access at runtime.
To upgrade: replace these files with the same files from a newer "three" release and re-test.
