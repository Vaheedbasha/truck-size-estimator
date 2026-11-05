<?php
/*
 * Truck Size Estimator - landing page + estimator (page shell).
 *
 * PHP renders the landing content, FAQ and metadata on the server, reads the JSON data files and embeds them in the page
 * (so the estimator works with no extra requests). All interaction is plain JavaScript in assets/js/. No database is used.
 * The quote form posts to api/quote.php (see that file).
 */
declare(strict_types=1);

require __DIR__ . '/includes/layout.php';

$dataErrors = [];
[$categories, $e1] = load_json('data/categories.json');
[$items, $e2] = load_json('data/household-items.json');
[$vehicles, $e3] = load_json('data/vehicles.json');
[$presets, $e4] = load_json('data/house-presets.json');
foreach ([$e1, $e2, $e3, $e4] as $e) {
    if ($e !== null) {
        $dataErrors[] = $e;
    }
}
$payload = json_encode(
    ['categories' => $categories, 'items' => $items, 'vehicles' => $vehicles, 'presets' => $presets, 'errors' => $dataErrors],
    JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);

$classes = vehicle_classes();

// Visible FAQ. The same list feeds the FAQPage markup, so the markup always matches what visitors can read.
$faq = [
    ['How do I estimate the truck size for house shifting?',
     'List your furniture, appliances and cartons, then add up the space they take. This estimator does that for you: choose your home size, add the items you are moving, and it compares the total packed volume with the usable cargo space of seven common Indian goods-vehicle classes, from a mini goods vehicle to a 22 ft truck. It suggests the smallest class that covers your load and then checks, in a 3D loading plan, that every item has a physical place in it.'],
    ['What is the difference between cargo volume and payload?',
     'Cargo volume is how much space the load body offers, measured in cubic feet. Payload is how much weight the vehicle may carry. A load can fit by space and still be too heavy, or the other way round. This estimator works with volume and placement. It does not check weight, so always confirm payload with the transport provider.'],
    ['Is a 1 BHK always a mini truck or a pickup?',
     'No. Home size is only a starting point. A 1 BHK with a refrigerator, a washing machine and a wardrobe can need more space than a sparsely furnished 2 BHK. That is why the estimate is built from the items you actually add, and why you can add or remove anything whatever home size you chose.'],
    ['Why does the 3D preview sometimes show items outside the vehicle?',
     'Volume alone does not guarantee that things fit. A tall wardrobe, a wide mattress or an upright refrigerator may not fit the height or width of a smaller body even when the total volume does. The preview never shrinks or hides an item to make it fit: anything without a valid place is drawn outside the vehicle and a larger or additional vehicle is suggested.'],
    ['Are the vehicle sizes exact?',
     'No. The seven classes use typical cargo-body sizes quoted by transport operators for each class. Real vehicles vary by make, model and body builder. Treat the sizes as planning values and confirm the actual internal dimensions and payload with the provider.'],
    ['What if my item is not in the list?',
     'Search first: many items have Indian and alternate names, such as almirah for wardrobe or box for carton. If nothing matches, add a custom item with a name, a rough size or exact dimensions, and mark it fragile or oversized if needed.'],
    ['Is my list saved?',
     'Your list stays in your browser tab while you work and is cleared when you reload the page. When you request a quote, your list, home size and estimate are sent with the request so you do not need to type them again.'],
];
$faqLd = ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => array_map(
    fn ($f) => ['@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f[1]]], $faq)];
$siteLd = ['@context' => 'https://schema.org', '@type' => 'WebSite', 'name' => SITE_NAME, 'url' => SITE_URL . '/', 'inLanguage' => 'en-IN'];

page_head([
    'title' => 'Truck Size Estimator for House Shifting in India',
    'ogTitle' => 'Truck Size Estimator for House Shifting',
    'description' => 'Estimate a suitable moving truck for your household items. Select your home size, build an inventory and review a practical truck-capacity estimate.',
    'path' => '/',
    'root' => '',
    'app' => true,
    'ld' => [$siteLd, $faqLd],
    'bodyAttrs' => 'data-viewer-src="' . asset('assets/js/3d/truck-visualizer-3d.js') . '" data-quote-endpoint="api/quote.php"',
]);
site_header('', 'estimator');
?>

<main id="main">
  <!-- ============ Hero ============ -->
  <section class="hero" aria-labelledby="hero-title">
    <div class="container hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">Household truck size estimator</p>
        <h1 id="hero-title">Find the right <span class="accent">truck size</span> for your home move</h1>
        <p class="hero-lead">Choose your home size, add your furniture and boxes, and get a practical truck-capacity estimate before requesting a quote.</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="#estimator">Estimate my truck size</a>
          <a class="btn btn-secondary btn-lg" href="how-it-works/">How it works</a>
        </div>
        <p class="hero-note"><svg class="ui-icon" aria-hidden="true"><use href="#i-info"/></svg>The vehicle you need can also depend on item dimensions, weight, vehicle access and loading constraints.</p>
      </div>
      <div class="hero-art" aria-hidden="true">
        <svg viewBox="0 0 480 240" width="480" height="240" focusable="false">
          <rect x="0" y="196" width="480" height="44" fill="#E9EEF5"/>
          <path d="M0 196h480" stroke="#C9D3E1" stroke-width="2"/>
          <path d="M20 218h60M110 218h60M200 218h60M290 218h60M380 218h60" stroke="#C9D3E1" stroke-width="3" stroke-linecap="round"/>
          <rect x="40" y="52" width="250" height="124" rx="10" fill="#FFFFFF" stroke="#23366B" stroke-width="3"/>
          <rect x="52" y="104" width="64" height="62" rx="4" fill="#E8750B"/>
          <rect x="124" y="124" width="54" height="42" rx="4" fill="#C89B66"/>
          <rect x="186" y="96" width="46" height="70" rx="4" fill="#23366B"/>
          <rect x="240" y="136" width="40" height="30" rx="4" fill="#C89B66"/>
          <path d="M290 84h70l44 44v48H290z" fill="#041148"/>
          <path d="M306 98h50l30 30h-80z" fill="#CFE0F7"/>
          <rect x="40" y="176" width="364" height="14" rx="4" fill="#0B174A"/>
          <circle cx="104" cy="196" r="24" fill="#182230"/><circle cx="104" cy="196" r="11" fill="#DCE2EA"/>
          <circle cx="356" cy="196" r="24" fill="#182230"/><circle cx="356" cy="196" r="11" fill="#DCE2EA"/>
          <rect x="396" y="152" width="14" height="10" rx="3" fill="#FF8A14"/>
        </svg>
      </div>
    </div>
  </section>

  <?php if ($dataErrors): ?>
  <div class="container">
    <div class="alert alert-error" role="alert">
      <svg class="ui-icon" aria-hidden="true"><use href="#i-stop"/></svg>
      <div><strong>The estimator data could not be loaded.</strong>
        <ul><?php foreach ($dataErrors as $err): ?><li><?= e($err) ?></li><?php endforeach; ?></ul>
      </div>
    </div>
  </div>
  <?php endif; ?>

  <noscript>
    <div class="container"><div class="alert alert-error"><div>The estimator needs JavaScript to select items and show the truck. The explanations, truck sizes and answers on this page work without it.</div></div></div>
  </noscript>

  <div id="app-error" class="container" hidden>
    <div class="alert alert-error" role="alert"><svg class="ui-icon" aria-hidden="true"><use href="#i-stop"/></svg><div id="app-error-text"></div></div>
  </div>

<?php include __DIR__ . '/includes/estimator.php'; ?>

  <!-- ============ Three steps ============ -->
  <section class="band" aria-labelledby="steps-title">
    <div class="container">
      <h2 id="steps-title">Three steps to a truck-size estimate</h2>
      <ol class="step-cards">
        <li><span class="step-num" aria-hidden="true">1</span><h3>Choose your home size</h3><p>Studio / 1 RK to 4+ BHK, or not sure. It is only a starting point: it adds no items and does not limit what you can add.</p></li>
        <li><span class="step-num" aria-hidden="true">2</span><h3>Select your items</h3><p>Browse eleven household categories or search. Pick the size or type of each item, such as an assembled or a dismantled bed, and set quantities.</p></li>
        <li><span class="step-num" aria-hidden="true">3</span><h3>Review the estimate</h3><p>See the estimated volume and a suggested vehicle size. Open the 3D preview, then request a quote with your list attached.</p></li>
      </ol>
    </div>
  </section>

  <!-- ============ How the estimate works ============ -->
  <section id="how" class="content-section" aria-labelledby="how-title">
    <div class="container narrow">
      <h2 id="how-title">How the estimate works</h2>
      <p class="lead"><strong>In short:</strong> every item has an approximate packed volume. The estimator adds them up and compares the total with the usable cargo space of each vehicle class. It suggests the smallest class that covers your load, then checks whether every item has a physical place in it.</p>
      <ol class="plain-steps">
        <li><strong>Add up the volume.</strong> Each item's packed volume (in cubic feet) multiplied by its quantity. A bundle such as a bed set is counted once, and a dismantled item counts once.</li>
        <li><strong>Work out usable space.</strong> Each vehicle class has a typical cargo-body length, width and height. Only 75% of that space is treated as usable, to allow for gaps between items.</li>
        <li><strong>Pick the smallest fit.</strong> If your load is at or below 100% of a class's usable space it fits by volume; 80% or more is shown as near capacity.</li>
        <li><strong>Check the placement.</strong> A 3D loading plan places each item at its real packed size. Items never shrink. Fragile items have nothing stacked on them. Items with no valid place are shown outside the vehicle.</li>
      </ol>
      <h3>What the estimate does not check</h3>
      <ul class="check-list">
        <li>Weight and payload limits.</li>
        <li>Door, lift, staircase or road access.</li>
        <li>Real loading order, strapping or centre of gravity.</li>
        <li>The exact size of your own furniture: item sizes are approximate packed sizes.</li>
      </ul>
      <p><a href="how-it-works/">Read the full method and its limits</a></p>
    </div>
  </section>

  <!-- ============ What you get ============ -->
  <section class="band" aria-labelledby="features-title">
    <div class="container">
      <h2 id="features-title">What this tool does</h2>
      <ul class="feature-grid">
        <li><h3>Indian household items</h3><p>247 items with sizes and types, from almirahs and steel trunks to pooja mandirs, coolers and LPG cylinders, searchable by common alternate names.</p></li>
        <li><h3>Dismantled furniture</h3><p>Choose dismantled beds, wardrobes and tables and see them as flat parts, not as an assembled piece.</p></li>
        <li><h3>Indian goods-vehicle classes</h3><p>From a mini goods vehicle to a 22 ft truck, using typical cargo-body sizes that you can check on the truck sizes page.</p></li>
        <li><h3>Honest 3D preview</h3><p>Items keep their size, nothing is hidden, and anything that does not fit is shown outside the vehicle with a suggestion.</p></li>
      </ul>
    </div>
  </section>

  <!-- ============ Truck classes ============ -->
  <section id="truck-classes" class="content-section" aria-labelledby="classes-title">
    <div class="container narrow">
      <h2 id="classes-title">Truck classes used in the estimate</h2>
      <p>These are common vehicle <em>classes</em>, with typical cargo-body sizes quoted by transport operators. They are not manufacturer specifications and no payload is stated. Last reviewed <?= e(DATA_REVIEWED) ?>.</p>
      <div class="table-wrap">
        <table class="data-table">
          <caption class="sr-only">Vehicle classes with typical internal cargo size and usable volume</caption>
          <thead><tr><th scope="col">Class</th><th scope="col">Typical cargo body (L × W × H)</th><th scope="col">Usable volume</th><th scope="col">Often used for</th></tr></thead>
          <tbody>
          <?php foreach ($classes as $v): $d = $v['internalDimensionsFt']; ?>
            <tr>
              <th scope="row"><?= e($v['name']) ?></th>
              <td><?= e((string) $d['length']) ?> × <?= e((string) $d['width']) ?> × <?= e((string) $d['height']) ?> ft</td>
              <td>about <?= e((string) round($v['usableFt3'])) ?> ft³</td>
              <td><?= e(preg_replace('/^.*?\)\.\s*/', '', (string) $v['description'])) ?></td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <p><a href="truck-sizes/">See the truck sizes page for how to read these numbers</a></p>
    </div>
  </section>

  <!-- ============ Related guides ============ -->
  <section class="band" aria-labelledby="guides-title">
    <div class="container">
      <h2 id="guides-title">Helpful guides</h2>
      <ul class="guide-grid">
        <li><a class="guide-card" href="how-it-works/"><h3>How the estimate works</h3><p>The method, the assumptions and what the estimate cannot tell you.</p><span class="guide-link">Read the guide</span></a></li>
        <li><a class="guide-card" href="truck-sizes/"><h3>Truck sizes explained</h3><p>Cargo volume, payload and internal dimensions, and the seven vehicle classes.</p><span class="guide-link">Read the guide</span></a></li>
      </ul>
    </div>
  </section>

  <!-- ============ FAQ ============ -->
  <section id="faq" class="content-section" aria-labelledby="faq-title">
    <div class="container narrow">
      <h2 id="faq-title">Common questions</h2>
      <p class="muted small">Last reviewed <?= e(DATA_REVIEWED) ?>.</p>
      <div class="faq-list">
        <?php foreach ($faq as [$q, $a]): ?>
        <div class="faq-item"><h3><?= e($q) ?></h3><p><?= e($a) ?></p></div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- ============ Final CTA ============ -->
  <section class="final-cta" aria-labelledby="cta-title">
    <div class="container">
      <h2 id="cta-title">Ready to find your truck size?</h2>
      <p>It takes a few minutes and you do not need to sign up.</p>
      <a class="btn btn-primary btn-lg" href="#estimator">Estimate my truck size</a>
    </div>
  </section>
</main>

<?php
site_footer('');
include __DIR__ . '/includes/dialogs.php';
?>

<script type="application/json" id="tse-data"><?= $payload ?></script>
<script src="<?= asset('assets/js/icons.js') ?>"></script>
<script src="<?= asset('assets/js/catalogue.js') ?>"></script>
<script src="<?= asset('assets/js/inventory.js') ?>"></script>
<script src="<?= asset('assets/js/estimator.js') ?>"></script>
<script src="<?= asset('assets/js/truck-visualizer.js') ?>"></script>
<script src="<?= asset('assets/js/ui-common.js') ?>"></script>
<script src="<?= asset('assets/js/ui-viewer.js') ?>"></script>
<script src="<?= asset('assets/js/ui-catalogue.js') ?>"></script>
<script src="<?= asset('assets/js/ui-summary.js') ?>"></script>
<script src="<?= asset('assets/js/ui-house-size.js') ?>"></script>
<script src="<?= asset('assets/js/quote-form.js') ?>"></script>
<script src="<?= asset('assets/js/app.js') ?>"></script>
<!-- Loading-plan maths (small ES module, no Three.js). The heavy 3D viewer is only loaded when "View 3D Truck" is first opened. -->
<script type="module" src="<?= asset('assets/js/3d/plan-api.js') ?>"></script>
</body>
</html>
