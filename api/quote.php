<?php
/*
 * POST /api/quote.php - receives a quote request from the estimator form.
 *
 * What it does:
 *   1. checks the request (JSON only, same site, size limit, honeypot, rate limit);
 *   2. validates every field again on the server (the browser checks are only a convenience);
 *   3. RECOMPUTES the estimate from the catalogue and vehicle data, so the saved estimate never depends on numbers sent by the browser;
 *   4. saves the request as one JSON line in storage/leads/leads-YYYY-MM.jsonl (no database), and returns a reference.
 * The browser shows "received" only after it gets {"ok":true,...} from here. Sending the same requestId twice returns the same
 * reference and saves nothing new, so double clicks cannot create duplicates.
 *
 * Production notes: move storage/ outside the web root (or keep the supplied deny rules), add the real notification / CRM hand-off where
 * marked, and keep the data-use wording on the form in step with what is really done with the data.
 */
declare(strict_types=1);

date_default_timezone_set('Asia/Kolkata');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    reply(405, ['ok' => false, 'error' => 'Use POST.']);
}
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    reply(415, ['ok' => false, 'error' => 'Send the request as JSON.']);
}
// same-site only: a browser form on another website cannot post here
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $oh = (string) parse_url($origin, PHP_URL_HOST);
    $op = parse_url($origin, PHP_URL_PORT);
    $got = $op ? $oh . ':' . $op : $oh;
    if (strcasecmp($got, (string) ($_SERVER['HTTP_HOST'] ?? '')) !== 0) {
        reply(403, ['ok' => false, 'error' => 'This request came from another site.']);
    }
}
$raw = file_get_contents('php://input', false, null, 0, 200001);
if ($raw === false || strlen($raw) > 200000) {
    reply(413, ['ok' => false, 'error' => 'The request is too large.']);
}
$in = json_decode($raw, true);
if (!is_array($in)) {
    reply(400, ['ok' => false, 'error' => 'The request could not be read.']);
}
if (($in['website'] ?? '') !== '') {   // honeypot field: real visitors never fill it
    reply(200, ['ok' => true, 'reference' => 'TSE-' . date('Ymd') . '-000000', 'estimate' => null]);
}

// ---------------- storage ----------------
$storage = dirname(__DIR__) . '/storage/leads';
foreach ([$storage, $storage . '/ids', $storage . '/rate'] as $dir) {
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
        reply(500, ['ok' => false, 'error' => 'The server could not prepare its storage folder.']);
    }
}
@file_put_contents($storage . '/.htaccess', "Require all denied\n");
@file_put_contents($storage . '/index.html', '');

// light rate limit: at most 12 requests per visitor address per hour
$ipKey = sha1(($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|tse');
$rateFile = $storage . '/rate/' . $ipKey . '.json';
$now = time();
$hits = is_file($rateFile) ? (json_decode((string) file_get_contents($rateFile), true) ?: []) : [];
$hits = array_values(array_filter($hits, fn ($t) => is_int($t) && $t > $now - 3600));
if (count($hits) >= 12) {
    reply(429, ['ok' => false, 'error' => 'Too many requests. Please try again in a while.']);
}

// ---------------- validation ----------------
$errors = [];
$name = trim((string) preg_replace('/\s+/u', ' ', (string) ($in['name'] ?? '')));
if ($name === '') {
    $errors['name'] = 'Enter your full name.';
} elseif (!preg_match('/^[\p{L}\p{M}][\p{L}\p{M} .\'\-]{1,79}$/u', $name)) {
    $errors['name'] = 'Use letters only (spaces, full stops and hyphens are fine).';
}

$digits = preg_replace('/[\s\-().]/', '', (string) ($in['phone'] ?? '')) ?? '';
if (str_starts_with($digits, '+91')) {
    $digits = substr($digits, 3);
} elseif (preg_match('/^91\d{10}$/', $digits)) {
    $digits = substr($digits, 2);
} elseif (preg_match('/^0\d{10}$/', $digits)) {
    $digits = substr($digits, 1);
}
if (!preg_match('/^[6-9]\d{9}$/', $digits)) {
    $errors['phone'] = 'Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8 or 9).';
}

$place = function (string $key, string $label) use ($in, &$errors): string {
    $v = trim((string) ($in[$key] ?? ''));
    if ($v === '') {
        $errors[$key] = "Enter the $label city or 6-digit PIN code.";
    } elseif (ctype_digit($v)) {
        if (!preg_match('/^[1-9]\d{5}$/', $v)) {
            $errors[$key] = 'A PIN code has 6 digits and does not start with 0.';
        }
    } elseif (!preg_match('/^\p{L}[\p{L}\p{M} .,\'()\-]{1,58}$/u', $v)) {
        $errors[$key] = 'Enter a city name using letters only, or a 6-digit PIN code.';
    }
    return $v;
};
$pickup = $place('pickup', 'pickup');
$destination = $place('destination', 'destination');

$movingDate = trim((string) ($in['movingDate'] ?? ''));
if ($movingDate !== '') {
    $dt = DateTime::createFromFormat('!Y-m-d', $movingDate);
    if (!$dt || $dt->format('Y-m-d') !== $movingDate) {
        $errors['movingDate'] = 'Choose a valid date.';
    } elseif ($movingDate < date('Y-m-d')) {
        $errors['movingDate'] = 'Choose today or a future date.';
    }
}
$notes = trim((string) preg_replace('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u', ' ', (string) ($in['notes'] ?? '')));
if (mb_strlen($notes) > 500) {
    $errors['notes'] = 'Use 500 characters or fewer.';
}
if (empty($in['consent'])) {
    $errors['consent'] = 'Please tick the box to agree to be contacted about this request.';
}
$requestId = (string) ($in['requestId'] ?? '');
if (!preg_match('/^[A-Za-z0-9\-]{8,64}$/', $requestId)) {
    reply(400, ['ok' => false, 'error' => 'The request is missing its identifier. Reload the page and try again.']);
}

// ---------------- data for the server-side estimate ----------------
function read_json(string $file): array
{
    $d = json_decode((string) @file_get_contents(dirname(__DIR__) . '/' . $file), true);
    return is_array($d) ? $d : [];
}
$catalogue = read_json('data/household-items.json');
$vehicleData = read_json('data/vehicles.json');
$presets = read_json('data/house-presets.json');
$byId = [];
foreach (($catalogue['items'] ?? []) as $it) {
    $byId[$it['id']] = $it;
}
$sizePresets = [];
foreach (($catalogue['customSizePresets'] ?? []) as $p) {
    $sizePresets[$p['id']] = $p;
}
if (!$byId || !$vehicleData) {
    reply(500, ['ok' => false, 'error' => 'The estimate data is not available on the server.']);
}

$homeSize = $in['homeSize'] ?? null;
$validSizes = array_merge(array_column($presets['presets'] ?? [], 'id'), ['custom']);
if ($homeSize !== null && !in_array($homeSize, $validSizes, true)) {
    $homeSize = null;
}

function variant_of(array $item, string $vid): ?array
{
    foreach ($item['variants'] as $v) {
        if ($v['id'] === $vid) {
            return $v;
        }
    }
    return null;
}
/** Packed volume of one unit of a variant (bundles are summed from their components). Null when unknown. */
function variant_volume(array $byId, array $item, array $variant): ?float
{
    if (!empty($item['isBundle'])) {
        $sum = 0.0;
        foreach (($variant['components'] ?? []) as $c) {
            $ci = $byId[$c['item']] ?? null;
            $cv = $ci ? variant_of($ci, $c['variant']) : null;
            $vol = ($ci && $cv) ? variant_volume($byId, $ci, $cv) : null;
            if ($vol === null) {
                return null;
            }
            $sum += $vol * $c['qty'];
        }
        return $sum;
    }
    return (isset($variant['volumeFt3']) && $variant['volumeFt3'] > 0) ? (float) $variant['volumeFt3'] : null;
}

$linesIn = $in['items'] ?? [];
if (!is_array($linesIn) || count($linesIn) < 1) {
    $errors['items'] = 'Add at least one item before requesting a quote.';
    $linesIn = [];
}
if (count($linesIn) > 250) {
    $errors['items'] = 'Too many different items in one request.';
    $linesIn = [];
}

$clean = [];      // validated lines saved with the request
$covered = [];    // units already included in selected bundles
$bundleName = [];
foreach ($linesIn as $l) {
    if (!is_array($l)) {
        continue;
    }
    $qty = $l['qty'] ?? 0;
    if (!is_int($qty) || $qty < 1 || $qty > 99) {
        continue;
    }
    if (($l['kind'] ?? '') === 'custom') {
        $cn = trim((string) preg_replace('/[\x00-\x1f\x7f]+/u', ' ', (string) ($l['name'] ?? '')));
        if ($cn === '' || mb_strlen($cn) > 60) {
            continue;
        }
        $vol = null;
        $approx = true;
        $dims = $l['dimsIn'] ?? null;
        if (is_array($dims) && isset($dims['l'], $dims['w'], $dims['h']) && is_numeric($dims['l']) && is_numeric($dims['w']) && is_numeric($dims['h'])
            && $dims['l'] > 0 && $dims['w'] > 0 && $dims['h'] > 0 && max($dims['l'], $dims['w'], $dims['h']) <= 300) {
            $vol = $dims['l'] * $dims['w'] * $dims['h'] / 1728;
            $approx = false;
        } elseif (isset($sizePresets[$l['sizeId'] ?? ''])) {
            $vol = isset($sizePresets[$l['sizeId']]['volumeFt3']) ? (float) $sizePresets[$l['sizeId']]['volumeFt3'] : null;
        } else {
            continue;
        }
        $w = $l['weightKg'] ?? null;
        $clean[] = ['kind' => 'custom', 'name' => $cn, 'qty' => $qty, 'unitVolumeFt3' => $vol, 'approximateSize' => $approx,
            'dimsIn' => $approx ? null : ['l' => (float) $dims['l'], 'w' => (float) $dims['w'], 'h' => (float) $dims['h']],
            'fragile' => !empty($l['fragile']), 'oversized' => !empty($l['oversized']), 'dismantled' => !empty($l['dismantled']),
            'weightKg' => (is_numeric($w) && $w > 0 && $w <= 5000) ? round((float) $w, 1) : null,
            'notes' => mb_substr(trim((string) preg_replace('/[\x00-\x1f\x7f]+/u', ' ', (string) ($l['notes'] ?? ''))), 0, 120)];
        continue;
    }
    $item = $byId[(string) ($l['itemId'] ?? '')] ?? null;
    $variant = $item ? variant_of($item, (string) ($l['variantId'] ?? '')) : null;
    if (!$item || !$variant) {
        continue;
    }
    $clean[] = ['kind' => 'catalogue', 'itemId' => $item['id'], 'variantId' => $variant['id'], 'name' => $item['name'], 'variant' => $variant['label'], 'qty' => $qty];
    if (!empty($item['isBundle'])) {
        foreach (($variant['components'] ?? []) as $c) {
            $k = $c['item'] . '::' . $c['variant'];
            $covered[$k] = ($covered[$k] ?? 0) + $c['qty'] * $qty;
        }
    }
}
if (!$clean && !isset($errors['items'])) {
    $errors['items'] = 'None of the items in the request could be read. Reload the page and try again.';
}

if ($errors) {
    reply(422, ['ok' => false, 'errors' => $errors]);
}

// ---------------- server-side estimate (same rules as assets/js/estimator.js) ----------------
$total = 0.0;
$unknown = [];
$units = 0;
foreach ($clean as &$c) {
    $counted = $c['qty'];
    if ($c['kind'] === 'catalogue') {
        $item = $byId[$c['itemId']];
        $variant = variant_of($item, $c['variantId']);
        $unit = variant_volume($byId, $item, $variant);
        if (empty($item['isBundle'])) {   // units already included in a selected bundle are not counted again
            $k = $c['itemId'] . '::' . $c['variantId'];
            $cov = min($covered[$k] ?? 0, $c['qty']);
            if ($cov > 0) {
                $counted = $c['qty'] - $cov;
                $covered[$k] -= $cov;
            }
        }
        $c['unitVolumeFt3'] = $unit;
    } else {
        $unit = $c['unitVolumeFt3'];
    }
    $c['countedQty'] = $counted;
    if ($unit === null) {
        $unknown[] = $c['name'];
        $c['volumeFt3'] = 0.0;
    } else {
        $c['volumeFt3'] = round($unit * $counted, 2);
        $total += $unit * $counted;
    }
    $units += $counted;
}
unset($c);

$vehicles = [];
foreach (($vehicleData['vehicles'] ?? []) as $v) {
    if (empty($v['active'])) {
        continue;
    }
    $d = $v['internalDimensionsFt'];
    $v['usable'] = $d['length'] * $d['width'] * $d['height'] * $v['loadingEfficiency'];
    $vehicles[] = $v;
}
usort($vehicles, fn ($a, $b) => $a['usable'] <=> $b['usable']);
$suggested = null;
$kind = $total <= 0 ? 'unavailable' : 'multiple';
foreach ($vehicles as $v) {
    if ($total > 0 && $total / $v['usable'] <= 1 + 1e-9) {
        $suggested = $v;
        $kind = 'single';
        break;
    }
}
$estimate = [
    'estimateVersion' => $vehicleData['estimateVersion'] ?? null,
    'dataStatus' => $vehicleData['dataStatus'] ?? null,
    'totalVolumeFt3' => round($total, 1),
    'itemsCounted' => $units,
    'itemsWithUnknownSize' => $unknown,
    'recommendation' => $kind,
    'vehicleId' => $suggested['id'] ?? null,
    'vehicleName' => $suggested['name'] ?? null,
    'payloadChecked' => false,
    'note' => 'Volume estimate only. Placement was not validated and payload was not checked.',
];

// ---------------- save (once per requestId) ----------------
$idFile = $storage . '/ids/' . $requestId . '.json';
if (is_file($idFile)) {
    $prev = json_decode((string) file_get_contents($idFile), true);
    if (is_array($prev) && isset($prev['reference'])) {
        reply(200, ['ok' => true, 'reference' => $prev['reference'], 'estimate' => $prev['estimate'] ?? $estimate, 'duplicate' => true]);
    }
}
$reference = 'TSE-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
$record = [
    'reference' => $reference,
    'receivedAt' => date('c'),
    'requestId' => $requestId,
    'contact' => ['name' => $name, 'mobile' => '+91' . $digits, 'pickup' => $pickup, 'destination' => $destination, 'movingDate' => $movingDate ?: null, 'notes' => $notes ?: null],
    'consent' => true,
    'homeSize' => $homeSize,
    'estimate' => $estimate,
    'inventory' => $clean,
    'catalogueVersion' => $catalogue['catalogueVersion'] ?? null,
    'clientReportedEstimate' => is_array($in['clientEstimate'] ?? null) ? array_intersect_key($in['clientEstimate'], array_flip(['totalVolumeFt3', 'vehicleId', 'planNote'])) : null,
];
$line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
$file = $storage . '/leads-' . date('Y-m') . '.jsonl';
if (@file_put_contents($file, $line, FILE_APPEND | LOCK_EX) === false) {
    reply(500, ['ok' => false, 'error' => 'The server could not save your request. Please try again.']);
}
@file_put_contents($idFile, json_encode(['reference' => $reference, 'estimate' => $estimate]));
$hits[] = $now;
@file_put_contents($rateFile, json_encode($hits));

// >>> Production hand-off goes here (email, CRM, queue). Do not report success to the visitor if it fails. <<<

reply(200, ['ok' => true, 'reference' => $reference, 'estimate' => $estimate]);
