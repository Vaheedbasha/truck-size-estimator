<?php
/*
 * Shared page shell for every PHP page: configuration, small helpers, <head>, header and footer.
 * Every public page is rendered on the server, so headings, copy, links and FAQs are in the first HTML response.
 *
 * BEFORE LAUNCH: replace SITE_URL with the real https address (used for canonical links, Open Graph and the sitemap).
 */
declare(strict_types=1);

const SITE_NAME = 'Truck Size Estimator';
const SITE_URL = 'https://YOUR-DOMAIN.example';   // placeholder, no trailing slash
const DATA_REVIEWED = 'November 2026';            // shown next to facts that can go stale

function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

/** URL for a local asset with a ?v= timestamp so edits show up without a hard refresh. $root is '' or '../'. */
function asset(string $relativePath, string $root = ''): string
{
    $file = dirname(__DIR__) . '/' . $relativePath;
    $v = is_file($file) ? (string) filemtime($file) : '0';
    return e($root . $relativePath . '?v=' . $v);
}

/** Read and decode one JSON file from the project root. Returns [data|null, errorMessage|null]. */
function load_json(string $relativePath): array
{
    $path = dirname(__DIR__) . '/' . $relativePath;
    if (!is_readable($path)) {
        return [null, "Could not read $relativePath."];
    }
    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return [null, "$relativePath is not valid JSON (" . json_last_error_msg() . ').'];
    }
    return [$data, null];
}

/** Active vehicle classes with their usable cargo volume (ft3), smallest first. */
function vehicle_classes(): array
{
    [$data] = load_json('data/vehicles.json');
    $out = [];
    foreach (($data['vehicles'] ?? []) as $v) {
        if (empty($v['active'])) {
            continue;
        }
        $d = $v['internalDimensionsFt'];
        $gross = $d['length'] * $d['width'] * $d['height'];
        $v['usableFt3'] = $gross * $v['loadingEfficiency'];
        $out[] = $v;
    }
    usort($out, fn ($a, $b) => $a['usableFt3'] <=> $b['usableFt3']);
    return $out;
}

function breadcrumb_ld(array $crumbs): array
{
    $items = [];
    foreach ($crumbs as $i => [$name, $path]) {
        $items[] = ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $name, 'item' => SITE_URL . $path];
    }
    return ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $items];
}

/**
 * Print <!DOCTYPE> ... <body>. $p keys: title, description, path (canonical path, e.g. '/how-it-works/'), root ('' or '../'),
 * ld (list of JSON-LD arrays), app (bool: needs the import map for the 3D modules), bodyAttrs (string).
 */
function page_head(array $p): void
{
    $root = $p['root'] ?? '';
    $url = SITE_URL . $p['path'];
    ?>
<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title><?= e($p['title']) ?></title>
  <meta name="description" content="<?= e($p['description']) ?>">
  <link rel="canonical" href="<?= e($url) ?>">
  <meta name="theme-color" content="#041148">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="<?= e(SITE_NAME) ?>">
  <meta property="og:title" content="<?= e($p['ogTitle'] ?? $p['title']) ?>">
  <meta property="og:description" content="<?= e($p['description']) ?>">
  <meta property="og:url" content="<?= e($url) ?>">
  <meta property="og:locale" content="en_IN">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23041148'/%3E%3Crect x='5' y='9' width='14' height='11' rx='2' fill='%23FF8A14'/%3E%3Cpath d='M21 12h4l3 4v4h-7z' fill='%23fff'/%3E%3Ccircle cx='11' cy='22' r='3' fill='%23fff'/%3E%3Ccircle cx='24' cy='22' r='3' fill='%23fff'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="<?= asset('assets/css/style.css', $root) ?>">
<?php if (!empty($p['app'])): ?>
  <!-- Three.js is vendored locally (assets/vendor/three). The import map lets the 3D modules say: import ... from 'three'. -->
  <script type="importmap">{"imports":{"three":"./assets/vendor/three/three.module.js","three/addons/":"./assets/vendor/three/addons/"}}</script>
<?php endif; ?>
<?php foreach (($p['ld'] ?? []) as $ld): ?>
  <script type="application/ld+json"><?= json_encode($ld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<?php endforeach; ?>
</head>
<body<?= isset($p['bodyAttrs']) ? ' ' . $p['bodyAttrs'] : '' ?>>
<a class="skip-link" href="#main">Skip to the main content</a>
<?php
    include __DIR__ . '/sprite.php';
}

function site_header(string $root, string $active = ''): void
{
    $link = function (string $href, string $label, string $key) use ($active): string {
        return '<li><a href="' . e($href) . '"' . ($active === $key ? ' aria-current="page"' : '') . '>' . e($label) . '</a></li>';
    };
    ?>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="<?= e($root ?: './') ?>" aria-label="<?= e(SITE_NAME) ?> - home">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="36" height="36"><rect width="40" height="40" rx="11" fill="#041148"/><rect x="6" y="11" width="18" height="15" rx="3" fill="#FF8A14"/><path d="M26 15h6l4 5v6H26z" fill="#fff"/><circle cx="13" cy="28" r="3.4" fill="#fff" stroke="#041148" stroke-width="1.6"/><circle cx="30" cy="28" r="3.4" fill="#fff" stroke="#041148" stroke-width="1.6"/></svg>
      </span>
      <span class="brand-text"><strong><?= e(SITE_NAME) ?></strong></span>
    </a>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <ul>
        <?= $link($root . '#estimator', 'Estimator', 'estimator') ?>
        <?= $link($root . 'how-it-works/', 'How it works', 'how') ?>
        <?= $link($root . 'truck-sizes/', 'Truck sizes', 'sizes') ?>
        <?= $link($root . '#faq', 'FAQ', 'faq') ?>
      </ul>
      <a class="btn btn-primary nav-cta" href="<?= e($root) ?>#estimator">Estimate truck size</a>
    </nav>
    <button type="button" class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="site-nav">
      <svg class="ui-icon" aria-hidden="true"><use href="#i-menu"/></svg><span>Menu</span>
    </button>
  </div>
</header>
<?php
}

function site_footer(string $root): void
{
    ?>
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-about">
        <p class="footer-brand"><?= e(SITE_NAME) ?></p>
        <p>A free tool that helps you work out which goods vehicle size may suit a household move in India. It gives an estimate, not a quote or a guarantee of fit.</p>
      </div>
      <nav aria-label="Estimator pages">
        <h2 class="footer-title">The estimator</h2>
        <ul>
          <li><a href="<?= e($root) ?>#estimator">Estimate my truck size</a></li>
          <li><a href="<?= e($root) ?>how-it-works/">How it works</a></li>
          <li><a href="<?= e($root) ?>truck-sizes/">Truck sizes</a></li>
        </ul>
      </nav>
      <nav aria-label="Helpful information">
        <h2 class="footer-title">Good to know</h2>
        <ul>
          <li><a href="<?= e($root) ?>#faq">Common questions</a></li>
          <li><a href="<?= e($root) ?>how-it-works/#limits">What the estimate does not check</a></li>
          <li><a href="<?= e($root) ?>truck-sizes/#sources">Where the sizes come from</a></li>
        </ul>
      </nav>
      <div>
        <h2 class="footer-title">Contact and legal</h2>
        <p>Company contact details and the privacy policy will be published here when they are available. Nothing is shown that is not real.</p>
      </div>
    </div>
    <p class="footer-base">&copy; <?= date('Y') ?> <?= e(SITE_NAME) ?>. Prototype with class-typical data, last reviewed <?= e(DATA_REVIEWED) ?>.</p>
  </div>
</footer>
<script src="<?= asset('assets/js/site.js', $root) ?>"></script>
<?php
}
