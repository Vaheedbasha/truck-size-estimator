<?php
declare(strict_types=1);

require dirname(__DIR__) . '/includes/layout.php';

$classes = vehicle_classes();

page_head([
    'title' => 'Truck Sizes for House Shifting in India - Classes and Cargo Dimensions',
    'description' => 'The seven Indian goods-vehicle classes used by the estimator, from a mini goods vehicle to a 22 ft truck, with typical cargo dimensions, usable volume and how to read them.',
    'path' => '/truck-sizes/',
    'root' => '../',
    'ld' => [breadcrumb_ld([['Truck Size Estimator', '/'], ['Truck sizes', '/truck-sizes/']])],
]);
site_header('../', 'sizes');
?>
<main id="main">
  <div class="page-hero">
    <div class="container narrow">
      <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="../">Truck Size Estimator</a></li><li aria-current="page">Truck sizes</li></ol></nav>
      <h1>Truck sizes for house shifting in India</h1>
      <p class="lead"><strong>Short answer:</strong> household moves in India typically use one of seven vehicle classes: a mini goods vehicle, an 8 ft pickup, a 10 ft, 14 ft, 17 ft, 19 ft or 22 ft closed truck. The sizes below are typical cargo bodies for each class, not specifications of a particular vehicle. Last reviewed <?= e(DATA_REVIEWED) ?>.</p>
    </div>
  </div>

  <article class="container narrow prose">
    <section aria-labelledby="classes">
      <h2 id="classes">The seven classes</h2>
      <div class="table-wrap">
        <table class="data-table">
          <caption class="sr-only">Vehicle classes with typical internal cargo dimensions, gross volume and usable volume</caption>
          <thead><tr><th scope="col">Class</th><th scope="col">Typical cargo body (L × W × H)</th><th scope="col">Gross volume</th><th scope="col">Usable volume (75%)</th><th scope="col">Payload</th></tr></thead>
          <tbody>
          <?php foreach ($classes as $v): $d = $v['internalDimensionsFt']; $gross = $d['length'] * $d['width'] * $d['height']; ?>
            <tr>
              <th scope="row"><?= e($v['name']) ?><br><span class="muted small"><?= e((string) $v['classExamples']) ?></span></th>
              <td><?= e((string) $d['length']) ?> × <?= e((string) $d['width']) ?> × <?= e((string) $d['height']) ?> ft</td>
              <td><?= e((string) round($gross)) ?> ft³</td>
              <td>about <?= e((string) round($v['usableFt3'])) ?> ft³</td>
              <td>Not stated</td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <p class="muted small">The example names show what each class looks like. They do not mean a particular make or model has these dimensions.</p>
    </section>

    <section aria-labelledby="read">
      <h2 id="read">How to read these numbers</h2>
      <dl class="term-list">
        <div><dt>Internal cargo dimensions</dt><dd>The inside length, width and height of the load body. Tall or wide items can fail on one dimension even when total volume is fine.</dd></div>
        <div><dt>Gross volume</dt><dd>Length × width × height, in cubic feet.</dd></div>
        <div><dt>Usable volume</dt><dd>Gross volume × 0.75, because real loads leave gaps.</dd></div>
        <div><dt>Payload</dt><dd>How much weight the vehicle may carry. It is a different limit from volume. It is not stated here because no verified payload is held for these classes: ask the transport provider.</dd></div>
      </dl>
    </section>

    <section id="sources" aria-labelledby="sources-title">
      <h2 id="sources-title">Where the sizes come from</h2>
      <p>The cargo sizes are typical figures quoted by Indian transport and rental operators for each class, rounded for planning. They vary between operators, makes and body builders, which is why they are labelled class-typical and unverified.</p>
      <p>To see how much published figures vary, take the Tata Ace Gold mini truck: Tata Motors lists its cargo box at about 2.2 to 2.5 m long (depending on the variant), 1.49 m wide and 0.3 m high, an open deck rather than a covered body. See Tata Motors' <a href="https://ace.tatamotors.com/mini-truck/tata-ace-gold/tata-ace-gold-cng-specifications.aspx" rel="noopener">Ace Gold CNG specifications</a>. A covered body adds height, so the mini goods vehicle class here is not an Ace specification.</p>
      <p>Before relying on any estimate, confirm the real internal dimensions and payload with your transport provider. When verified figures for specific vehicles are available they can replace these class-typical values in one data file.</p>
    </section>

    <aside class="cta-box">
      <h2>See which class suits your load</h2>
      <p>Add your items and the estimator compares them with each class.</p>
      <a class="btn btn-primary btn-lg" href="../#estimator">Estimate my truck size</a>
    </aside>
  </article>
</main>
<?php site_footer('../'); ?>
</body>
</html>
