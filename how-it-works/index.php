<?php
declare(strict_types=1);

require dirname(__DIR__) . '/includes/layout.php';

page_head([
    'title' => 'How the Truck Size Estimate Works - Method and Limits',
    'description' => 'How this estimator turns your household items into a truck-size estimate: packed volume, usable cargo space, 3D placement checks and what it cannot tell you.',
    'path' => '/how-it-works/',
    'root' => '../',
    'ld' => [breadcrumb_ld([['Truck Size Estimator', '/'], ['How it works', '/how-it-works/']])],
]);
site_header('../', 'how');
?>
<main id="main">
  <div class="page-hero">
    <div class="container narrow">
      <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="../">Truck Size Estimator</a></li><li aria-current="page">How it works</li></ol></nav>
      <h1>How the truck size estimate works</h1>
      <p class="lead"><strong>Short answer:</strong> the estimator adds up the packed volume of the items you choose, compares it with the usable cargo space of five common Indian goods-vehicle classes, suggests the smallest class that covers it, and then checks that every item has a physical place in that vehicle. Last reviewed <?= e(DATA_REVIEWED) ?>.</p>
    </div>
  </div>

  <article class="container narrow prose">
    <section aria-labelledby="method">
      <h2 id="method">The method, step by step</h2>
      <ol class="plain-steps">
        <li><strong>You choose a home size.</strong> Studio / 1 RK to 4+ BHK, or not sure. This is context only. It does not add items and does not limit what you can add.</li>
        <li><strong>You add items.</strong> Each catalogue item has variants (for example 3-seater sofa, or queen bed assembled or dismantled). Every variant has a packed volume in cubic feet and a packed size in centimetres.</li>
        <li><strong>Volumes are added.</strong> Item volume multiplied by quantity, summed. A bundle (such as a bed set) counts once. A dismantled item counts once, using the volume of its variant, even though it is drawn as several flat parts.</li>
        <li><strong>Vehicles are compared.</strong> Usable volume is internal length × width × height × 0.75. At or below 100% of usable volume a load fits by volume; at 80% or more it is shown as near capacity.</li>
        <li><strong>The smallest class that fits is suggested.</strong> If your load is bigger than the largest class, the result says that more than one vehicle, or a manual survey, may be needed. It never claims that a single vehicle fits.</li>
        <li><strong>A 3D loading plan checks placement.</strong> The suggested vehicle is tested in the background. If some items have no valid place, the next larger class that can take everything is suggested and the reason is shown.</li>
      </ol>
    </section>

    <section aria-labelledby="terms">
      <h2 id="terms">Terms used in the estimator</h2>
      <dl class="term-list">
        <div><dt>Cargo volume</dt><dd>The space a load body offers, in cubic feet. It is approximate cargo space, not the weight a vehicle may carry.</dd></div>
        <div><dt>Payload</dt><dd>The weight a vehicle may carry. <strong>This estimator does not check payload.</strong> Confirm it with the transport provider.</dd></div>
        <div><dt>Internal cargo dimensions</dt><dd>The inside length, width and height of the load body. The estimator uses typical values for each class (see <a href="../truck-sizes/">Truck sizes</a>), not the dimensions of a particular vehicle.</dd></div>
        <div><dt>Inventory</dt><dd>The list of items and quantities you add. It stays in your browser tab and is sent with a quote request.</dd></div>
        <div><dt>Estimate confidence</dt><dd>An estimate is only as good as its inputs. Item sizes are approximate, vehicle sizes are class-typical, and custom items with a rough size are marked approximate.</dd></div>
      </dl>
    </section>

    <section aria-labelledby="assumptions">
      <h2 id="assumptions">Assumptions in the numbers</h2>
      <div class="table-wrap">
        <table class="data-table">
          <caption class="sr-only">Assumptions used by the estimator</caption>
          <thead><tr><th scope="col">Assumption</th><th scope="col">Value</th><th scope="col">Why</th></tr></thead>
          <tbody>
            <tr><th scope="row">Usable share of cargo space</th><td>75%</td><td>Real loads leave gaps between awkward shapes.</td></tr>
            <tr><th scope="row">Near-capacity warning</th><td>80% of usable volume</td><td>Gives a margin before the vehicle is full.</td></tr>
            <tr><th scope="row">Item size</th><td>Packed size, approximate</td><td>The item plus a packing allowance, scaled to its stated volume. Not measured.</td></tr>
            <tr><th scope="row">Vehicle size</th><td>Class-typical</td><td>Typical operator-quoted cargo bodies, not manufacturer specifications.</td></tr>
            <tr><th scope="row">Weight</th><td>Not checked</td><td>No payload figures are used.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section aria-labelledby="placement">
      <h2 id="placement">How the 3D loading plan decides</h2>
      <ul class="check-list">
        <li>Every item is placed as a box at its configured size. Nothing is shrunk, merged or hidden to make it fit.</li>
        <li>Heavy and tall furniture and appliances stay on the vehicle floor. Fridges, plants, TVs, gas cylinders and every fragile item stay upright.</li>
        <li>Nothing is stacked on a fragile item. A fragile item may sit on a suitable non-fragile one.</li>
        <li>Items rest only on things that can carry them, and at least 70% of an item's base must be supported.</li>
        <li>Items with no valid place are drawn outside the vehicle, and a larger or additional vehicle is suggested.</li>
      </ul>
      <p>The preview is a visual planning aid, not proof of real-world fit.</p>
    </section>

    <section id="limits" aria-labelledby="limits-title">
      <h2 id="limits-title">What the estimate does not check</h2>
      <ul class="check-list">
        <li>Weight, payload limits and axle loads.</li>
        <li>Door, lift, staircase, lane or parking access at either end.</li>
        <li>The real loading order, strapping, padding or centre of gravity.</li>
        <li>The exact size and shape of your own furniture.</li>
        <li>Items that need special handling: restricted items such as LPG cylinders are flagged for confirmation, not approved.</li>
      </ul>
      <p>Final vehicle choice, space, payload and price should always be confirmed with the transport provider.</p>
    </section>

    <aside class="cta-box">
      <h2>Try it with your own items</h2>
      <p>It takes a few minutes and you do not need to sign up.</p>
      <a class="btn btn-primary btn-lg" href="../#estimator">Estimate my truck size</a>
    </aside>
  </article>
</main>
<?php site_footer('../'); ?>
</body>
</html>
