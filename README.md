# Truck Size Estimator - UI/UX Mockup

An interactive, browser-based **mockup** of a household truck-size estimator for people moving home in India.
It is a stand-alone estimator tool (not a company website). Visitors **choose a home size**, add their own furniture,
appliances and cartons by category, see an **illustrative** volume estimate and goods-vehicle recommendation in a
persistent bottom bar, open a **3D truck** preview in a modal, and send a **quote request** that a PHP endpoint validates, re-estimates and saves.
The site also has server-rendered content pages (landing copy, FAQ, How it works, Truck sizes) with SEO metadata.

> **This is a prototype with class-typical data.** Item sizes and vehicle sizes are planning values, not verified
> measurements or manufacturer specifications. The estimate is not a quote, not a guarantee that items fit, and weight is never checked.
> Quote requests are saved only in `storage/leads/` on the server that runs the site (see section 5b).

Stack: PHP (page shell only) + HTML5 + CSS3 + vanilla JavaScript + **Three.js (vendored locally)** + inline SVG + JSON files.
No framework, no Node.js/npm, no build step, no database, no CDN, no internet needed at runtime.
Design follows `D:\Truck_Size_Estimator_Master_Design_Specification (1).md` (navy + orange + white tokens, mobile-first,
44 px touch targets, safe-area insets, 30 % / 70 % workspace).

---

## 1. Run it (XAMPP on Windows)

1. Open the **XAMPP Control Panel** and click **Start** next to **Apache** (MySQL is not needed).
2. Make sure the project is in `C:\xampp\htdocs\truck-size-estimator\`.
3. Open **http://localhost/truck-size-estimator/** in your browser.

Do not open `index.php` by double-clicking it (`file:///...`): PHP only runs when Apache serves the page.

Automated checks in the browser: **http://localhost/truck-size-estimator/tests/estimator-tests.html**
(should show `115 passed, 0 failed`). A gallery of every 3D household model is at `/tests/3d-models.html`.
Add `?no3d=1` to the main address to preview the 2D fallback inside the 3D modal.

## 1b. Hosting without PHP (Vercel, Netlify, GitHub Pages)

Those hosts do not run PHP. Double-click **`export-static.bat`** (needs XAMPP's PHP) to write static copies: `index.html`,
`how-it-works/index.html` and `truck-sizes/index.html` (`vercel.json` has `cleanUrls`, `.vercelignore` skips the PHP-only folders).
On Vercel: framework preset **Other**, no build command. **`api/quote.php` needs PHP**: on a static host the quote form shows its
"could not send" state and never claims the request was received. Use a PHP host for a working quote form.

## 2. The flow

| Step | What happens |
|---|---|
| **Landing** (server-rendered) | Header with navigation and an "Estimate truck size" button, hero with the H1 "Find the right truck size for your home move", primary CTA "Estimate my truck size", a short qualifier, then the home-size cards straight away. Below the estimator: three steps, how the estimate works and what it does not check, features, truck-class table, guides, visible FAQ, final CTA, footer. |
| **1. Home size** (first thing on the page) | Large radio cards: Studio / 1 RK, 1 BHK, 2 BHK, 3 BHK, 4+ BHK, Not sure / Custom. Selecting one adds **no items** and opens the inventory straight away (no continue button; with a keyboard, arrows move the selection and Enter / Space confirms). "Change" returns to the cards and keeps your items; tap the highlighted size to go back to them. |
| **2. Inventory** | Left **30 %**: 11 categories (a scrolling chip row on phones). Right **70 %**: the items of that category with an illustration, variant selector, packed size, tags (fragile / heavy / dismantled ...) and quantity controls. Search covers all categories. |
| **Bottom action bar** (phones and tablets; always visible, never covers item controls) | **Estimated truck size** (tap for the full estimate sheet), then three buttons: **Edit** (pencil icon; opens the sheet at the added items), **View in 3D**, **Get Quote**. The 3D dialog on phones shows only the 3D view and the estimated truck size below it. The category rail is slim (about 82px on phones) and keeps the label text. |
| **Your estimate** sheet | Vehicle comparison (Auto / each class), status, volume, capacity meter, notices, the selected list (edit variant, quantity, remove with Undo), prototype demo shortcuts. |
| **3D truck modal** | Interactive 3D vehicle with your load. Controls: **Rotate, Zoom in, Zoom out, Reset view, Close**. Capacity panel with the estimate, a loading-plan message and a text list of items. Mouse, touch (one finger rotates, pinch zooms) and keyboard (arrows, + / -, 0). |
| **Estimate sheet actions** | **Edit inventory**, **View 3D preview**, **Request my quote**, plus a "What this estimate checks" list (volume, payload not checked, placement, confidence) and "Fit not validated" / "Payload not checked" badges. |
| **Quote** | Name, Indian mobile, pickup, destination, optional date and notes, consent. Sent to `api/quote.php`; "received" appears only after the server confirms (see 5b). |

**Item cards** keep the face simple: picture, name, a volume hint, the type/size selector and a quantity stepper (0 means not selected; minus is disabled at 0). Packed size, dismantled parts, bundle contents and handling notes (fragile, heavy, restricted) sit under **More options**. The search text is kept when you change category: a category then shows the matches inside it, and **All results** shows every match. **Custom items** accept a size preset or exact inches, optional weight, fragile / oversized / dismantled flags and notes; adding the same item twice merges the quantity, and each custom item can be edited or removed.

Categories (every one of the 247 catalogue items sits in exactly one): Living Room, Bedroom, Kitchen, Dining Room, Appliances,
Bathroom, Utility, Cartons & Personal Belongings, Study & Office, Balcony & Garden, Other Items. Items you add yourself with
"Add custom item" appear at the top of **Other Items**. The former category words (pooja, fitness, kids, music, electronics, dismantled)
are kept as search tags, so search results did not change.

## 3. Project structure

```
index.php                     Landing page + estimator (server-rendered copy, FAQ, JSON-LD, embedded data)
how-it-works/index.php        Method, terms, assumptions, 3D rules, limits
truck-sizes/index.php         Vehicle classes table, how to read it, where the sizes come from
includes/                     layout.php (config, head, header, footer), sprite.php, estimator.php, dialogs.php
api/quote.php                 Quote endpoint (validates, recomputes the estimate, saves to storage/leads/)
storage/                      Created on first quote: leads-YYYY-MM.jsonl (deny rules included)
robots.txt, sitemap.xml       Placeholder domain - replace YOUR-DOMAIN.example before launch
index.html, ...               Generated static copies (see 1b)
data/
  categories.json             11 categories (id, name, icon, order)
  household-items.json        247 items: variants with packed size (dimsCm), dismantled parts, aliases, searchTags, flags, bundles
  vehicles.json               5 Indian goods-vehicle CLASSES (internal size, efficiency, 3D model key), class-typical, unverified
  house-presets.json          Home-size options in step 1 (id, label, description). No items.
assets/css/style.css          Tokens + all layout (mobile-first)
assets/js/
  icons.js catalogue.js inventory.js estimator.js   Data, search, selection and the volume / recommendation rules (no DOM)
  truck-visualizer.js         2D SVG truck (only used when 3D is unavailable)
  ui-house-size.js            Step 1 cards
  ui-catalogue.js             Search, category navigation, item cards
  ui-summary.js               Bottom bar, estimate sheet, selected list, feed to the modal
  ui-viewer.js                The 3D modal (loads the 3D module on first open; fallback + retry)
  site.js                     Mobile menu button (all pages)
  ui-common.js quote-form.js app.js   Helpers, quote form (talks to api/quote.php), start-up, background loading check, demos
  3d/
    item-specs.js             Handling rules per visualType (floor-only, upright-only, what the top can carry) + size lookup
    cargo-layout.js           The loading plan (no shrinking, fragile / stacking rules, overflow, vehicle plan) - pure maths
    plan-api.js               Exposes the packing maths to the page (small module, no Three.js)
    item-models.js            ~75 procedural 3D models, including flat dismantled parts
    truck-model.js            Procedural goods vehicles: mini, pickup, LCV, 17 ft truck, 19 ft tandem
    truck-visualizer-3d.js    Scene, camera, OrbitControls, render-on-demand
assets/vendor/three/          Three.js r186 (MIT) + OrbitControls + RoundedBoxGeometry, unmodified
tests/                        estimator-tests.html (+ estimator-tests.js, cargo-layout-tests.js), 3d-models.html
```

## 4. How the estimate works (illustrative)

1. `item volume x quantity`, summed (cubic feet). Bundles (sofa set, bed set, dining set, study set) count once; parts you also add are not
   counted twice. A **dismantled** item counts once, with the volume of its variant (its parts are not added again).
2. Each vehicle class: `length x width x height x loadingEfficiency (0.75)` = usable volume.
3. `utilisation = volume / usable volume`. At or below 100 % it fits **by volume**; 80 % or more is "near capacity". The smallest class that fits is the suggestion.
4. **Loading check.** In the background the page runs the 3D loading plan for the suggested vehicle. If every item has a valid place, nothing changes. If some
   items have none (for example a queen mattress in a mini goods vehicle that is narrower than the mattress), the next larger class that can take everything is
   suggested and the sheet says why ("3D check"). If even the largest class cannot, the bar says **More than one vehicle** and names a class that could take the leftovers.
5. Unknown-size items are listed, contribute 0 and are flagged. Weight is never verified.

## 5. The 3D loading plan (what changed and why)

**Root cause of the old shrinking bug.** `packCargo` retried a failed packing up to 14 times with every box scaled by 0.94, and the viewer then drew
existing items at that scale; item sizes were also derived by scaling a generic shape to the item's *volume*. So adding items made sofas shrink.

**Now:**
* **Sizes come from data.** Each variant has `dimsCm: [width, depth, height]` (its packed envelope, scaled once to the stated `volumeFt3`, within 8 %). `dimsFor()` returns exactly that.
  No code path scales, merges, pools or hides an item (the old carton pooling and the 220-unit cap are gone; 99 small items stay 99 boxes).
* **Placement** is a deterministic height-map packing on real 3D boxes: floor-only items (heavy / tall furniture, appliances) first, then carriers, then items that carry nothing.
  If the first order leaves items over, two other orders are tried and the best kept. Nothing intersects, floats (at least 70 % of the base is supported) or leaves the bay.
* **Rules** (`item-specs.js`): *floor* (stays on the floor), *upright* (never laid on its side: fridges, plants, TVs, LPG cylinders and every fragile item), and what the **top** can carry
  (`rigid` > `carton` > `light` > `none`). A **fragile** item, or any item whose type carries nothing (sofas, plants, lamps, electronics ...), never has anything on top of it; it may sit on a
  suitable non-fragile item. Heavy items rest only on the floor or on rigid, heavy supports. `validatePlacements()` re-checks all of this geometrically.
* **Overflow.** Items with no valid place are drawn outside the vehicle on a red pad with a sign, with a reason (`too-big` or `no-space`), and the modal recommends the next larger class or an additional vehicle.
* **Dismantled furniture.** Variants such as "Queen - dismantled" list flat **parts** (`parts` in the data): a bed becomes headboard, footboard, 2 side rails, slat set and a fittings box; a wardrobe
  becomes side / top / bottom / back panels, shelves, door panels and a fittings box; a dining table becomes a top, 4 legs and fittings; a bunk bed becomes posts, rails, 2 slat sets, ladder and fittings.
  Each part is drawn flat at its own size and never as an assembled model. The assembled variants still draw the assembled bed (a bare frame; the mattress is its own item), wardrobe or table.
  Part sizes are realistic board sizes, so the drawn parts take less space than the variant's catalogue volume, which includes a packing allowance.
* **Honest labelling.** The modal says it is a visual planning preview, not proof of fit; weight, loading order, access and securing are not modelled.

## 5b. Quote request (backend)

`api/quote.php` accepts only same-site JSON POSTs (size limit, honeypot field, 12 requests per visitor per hour). It **validates every field again** (name, Indian mobile normalised to +91, pickup/destination city or PIN, optional date, notes, consent),
**recomputes the estimate** from `data/household-items.json` and `data/vehicles.json` (bundles counted once, covered parts not double counted), and appends one JSON line to `storage/leads/leads-YYYY-MM.jsonl`. It returns `{"ok":true,"reference":"TSE-YYYYMMDD-XXXXXX"}`;
the form shows success only then. A per-form `requestId` makes a repeated send return the same reference and save nothing new. Validation errors (422) are shown next to the fields; network, 404 and server errors show an in-page error with **Try again** and keep the form and your list.
The saved estimate is labelled volume-only (placement not validated, payload not checked). Before launch: move `storage/` outside the web root, add the real notification / CRM hand-off at the marked line, and publish a privacy policy (the form has a short data-use note and no privacy link yet).

## 5c. Desktop layout (1024px and wider)

From 1024px the estimator follows the specification's desktop composition: the **inventory pane on the left (about 60%)** and a **persistent live 3D truck panel on the right (about 40%)**, side by side, inside a workspace capped at 1440px.
* Categories become a **dropdown** above the items (no side rail, no tabs, no sideways scroll; it shows how many items are selected in each category); item cards sit in **two columns**.
* The right-hand panel is one **sticky card**: the truck-size row (**Auto** + each vehicle class with its usable ft³), the 3D view (status pill, Rotate / Zoom / Reset view, an expand icon), then one concise estimate under it: **Estimated truck size** with a plain-language reason, the capacity bar, the loading-plan status, notices that apply, the **Selected items** list (editable) and **Get Quote**. Nothing is shown twice. It updates after every add / remove / quantity / type change. The expand icon opens the same viewer in a larger dialog and puts it back in the panel on close.
* It is one viewer: the same panel is moved between the desktop dock and the full-screen dialog, so there is only ever one WebGL scene. Three.js loads when the panel first appears.
* **There is no bottom bar on desktop.** The "Your estimate" sheet's truck-size row, notices and selected-items list, and the Get Quote button, are moved into the panel (same elements, same handlers) and move back into the sheet and the fixed bottom bar below 1024px.
* **More options** on an item card opens a small popup (size, dismantled parts, bundle contents, handling notes) instead of stretching the card. On phones the home-size choice is a short row of badges (no icons or descriptions).
* Below 1024px (phones and tablets) the 30% category rail / 70% item layout is kept and 3D opens full-screen on demand.

## 6. Indian goods vehicles

`data/vehicles.json` describes seven **classes** commonly used for household shifting, with typical cargo-body sizes quoted by transport operators (looked up for planning, then rounded):

| Class | Typical examples (for orientation only) | Cargo body used (L x W x H, ft) |
|---|---|---|
| Mini goods vehicle | Tata Ace / Mahindra Jeeto type | 7 x 4.8 x 4.5 |
| Pickup truck (8 ft) | Bolero Pickup / Tata Intra / Ashok Leyland Dost type | 8 x 5 x 4.8 |
| 10 ft closed truck (LCV) | Tata 407 / Eicher Pro 2049 type | 10 x 5.5 x 5.5 (length from operator listings; width and height estimated) |
| 14 ft closed truck (LCV) | Eicher Pro 14 ft / Tata 14 ft LPT type | 14 x 6 x 6 |
| 17 ft closed truck | Eicher Pro type | 17 x 6.5 x 7 |
| 19 ft closed truck | 19 ft medium / heavy-duty | 19 x 7 x 7 |
| 22 ft closed truck | Tata 22 ft heavy truck type | 22 x 7.5 x 7 |

These are **not** manufacturer specifications and no payload or tonnage is claimed (`payloadLimitKg` is `null`, `dataStatus` is `class-typical`). Real body sizes, payloads and permitted loads vary by make,
model and body builder; confirm with the transport provider. The 3D vehicles are generic procedural models of each class (small bonnet cab and single rear tyres for the mini vehicle, an open-sided cargo bed with a covered cage for the pickup, cab-over trucks with dual rear tyres for the LCV and
larger trucks, a tandem rear axle on the 19 ft and 22 ft trucks), not replicas of any brand.

## 7. Replacing the demo data later

* **Items** - `data/household-items.json`: `id`, `name`, `category`, `shape` (2D drawing), `visualType` (3D model and handling rules), `aliases`, `searchTags`, `variants` (`label`, `volumeFt3`, `dimsCm`,
  optional `parts` + `dismantled`), optional `flags` (`fragile`, `heavy`, `bulky`, `restricted`), `manualReview`, `note`. Bundles use `components`. Add a new `visualType` to `item-specs.js` (rules) and `item-models.js` (model).
* **Vehicles** - `data/vehicles.json`: `internalDimensionsFt`, `loadingEfficiency`, `payloadLimitKg`, `model` (`mini | pickup | lcv | truck | truck-tandem`), `active`, `dataStatus`. Invalid profiles are ignored.
* **Home sizes** - `data/house-presets.json`. **Site name** - `$brand` at the top of `index.php`. Data is embedded when the page loads, so refresh after editing JSON.

## 8. QA

### Run during development
* All JSON files parse; `php -l index.php` passes; every JS file (including the 3D ES modules) passes `node --check` (Node used only as a checker and test runner).
* **109 automated checks** pass, in Node and in a real browser (`tests/estimator-tests.html`): calculations, search, inventory, quote validation, the 11 consolidated categories (no item lost, search tags kept), plus
  - **no shrinking**: every placed box keeps exactly its configured dimensions in every demo and every vehicle; adding 60+ items leaves existing sofas, beds and wardrobes unchanged; 99 small items stay 99 boxes;
  - **fragile**: nothing is ever stacked on a fragile item (checked geometrically over crowded loads); the rule check fires on a deliberately bad layout; fragile items may rest on non-fragile supports;
  - **stacking / orientation**: items rest only on supports that can carry them; upright-only items are never laid down; too-tall items are reported as `too-big`, not shrunk;
  - **overflow and planning**: over-capacity loads return every unit; `planVehicles` finds the first physical fit or names the vehicle for the leftovers;
  - **dismantled**: no assembled model is drawn for a dismantled variant; part counts, part sizes and the single volume count are checked; assembled variants and bundles are unchanged;
  - **vehicles**: five ascending classes, labelled class-typical, no payload claims; each builds a 3D model;
  - every catalogue variant in all seven vehicles packs validly (1,900+ combinations); a 200+ box load packs in a few seconds at most.
* Browser checks (Chromium preview, WebGL) at 320, 375, 390, 768, 1024 and 1440 px: no horizontal overflow, the bottom bar and its page padding, the 30 / 70 grid, category chips, selection / quantity / variant / remove + Undo, the estimate sheet, the 3D modal (open, Esc / Close,
  focus returns to the opener, Rotate / Zoom / Reset, fallback with `?no3d=1`), the toast above open dialogs, loading-plan notices for the mini vehicle, the pickup and the over-capacity demo (items left outside the 22 ft truck).

### Not covered (please check yourself)
* Firefox, Safari, real iOS / Android devices (touch gestures, on-screen keyboard, GPU speed on a mid-range phone), screen readers (NVDA / VoiceOver), a formal colour-contrast tool run.
* The estimate sheet and 3D modal use native `<dialog>`; focus trapping is the browser's own.
* Primary buttons follow the guide (white on `--orange-600`). That pair measures about 3.0:1, so primary button text is bold and at least 18.66px, which WCAG treats as "large text" (3:1). Smaller orange-on-white text is not used.
* Not done: a privacy-policy page, a social (Open Graph) image, real company contact details, verified vehicle specifications, photography. These need real material from you (see section 10).

### Manual checklist
- [ ] The first thing visible is **First, choose your home size** with six cards (no dropdown). Tapping a card opens the inventory directly.
- [ ] After Continue: the workspace shows an empty list, categories left (30 %) and items right (70 %) on a desktop, a chip row on a phone. The bottom bar shows "Add items to begin"; Edit, View in 3D and Get Quote are disabled.
- [ ] Add a sofa, a bed (assembled), a fridge and cartons: the bar shows the estimated vehicle. Open **View in 3D**: items keep their size when you add more.
- [ ] Choose **Bed -> Queen - dismantled**: the 3D view shows flat parts (headboard, footboard, rails, slats, fittings box), not an assembled bed.
- [ ] Load the **Fragile items** demo: nothing sits on the TV, glass table or mirror. Load **Over capacity**: items outside the vehicle, message with the next step.
- [ ] Tab through the page: visible focus, dialogs trap focus, Esc closes them, focus returns to the button that opened them.
- [ ] Phone widths (320 - 390): no sideways scrolling; the bar never hides the Add / quantity buttons; the bar hides while the keyboard is open.

## 9. Known limitations
* Quote requests are stored in a local file, not a database, and nothing is forwarded to anyone automatically.
* Estimates only; not a packing engine in the physical sense. The 3D picture is a visual planning aid: no weight, centre of gravity, loading order, door or lift clearances, strapping or diagonal placement.
* **Sizes are approximate.** Item `dimsCm` are planning envelopes derived from the catalogue volumes and typical shapes; vehicle sizes are class-typical. Neither is measured or verified.
* The dismantled parts are typical board sizes; real furniture differs. Only beds, bunk beds, wardrobes and dining tables have dismantled variants with parts; the loose "dismantled parts" items are drawn as wrapped flat-packs.
* Very large loads draw simplified (plain coloured) boxes above 170 items, at the same sizes. The background loading check uses the same packing and can take a moment for hundreds of items.
* Inventory lives in memory: reloading the page clears it.
* The 2D fallback drawing (`truck-visualizer.js`) is the old illustration: it pools tiny items and does not apply the new stacking rules. It is shown only when 3D cannot start.

## 10. Master Design Specification: status

**Done:** canonical tokens and type scale; orange-600 primary buttons with white text; orange-tinted focus ring; white header with navigation, CTA and an accessible mobile menu; server-rendered landing page with the required H1, supporting copy, CTAs, qualifier, three steps, method and limits, truck-class table, guides, FAQ and final CTA; footer with grouped links; How it works and Truck sizes pages with definitions, tables and dated "last reviewed" notes; unique titles and descriptions, canonical links, Open Graph tags, JSON-LD (WebSite, FAQPage matching the visible FAQ, BreadcrumbList), `robots.txt`, `sitemap.xml`; home-size cards with radio semantics; 30 / 70 workspace; item cards with "More options"; search kept across categories; custom items (weight, notes, edit, duplicate merge); sticky bar and estimate sheet with the three result actions; 3D modal; quote form with notes, honest states and a real server round-trip.

**Needs your input before launch:**
* **Domain** - replace `YOUR-DOMAIN.example` in `includes/layout.php` (`SITE_URL`), `robots.txt` and `sitemap.xml`.
* **Real business facts** - address, phone, hours, service areas, `Organization` / `LocalBusiness` markup. None were invented; the footer says they will be published.
* **Privacy policy and contact pages** - not built (you chose How it works + Truck sizes only). The quote form has a data-use note instead of a link.
* **Verified vehicle data** - the guide asks for verified dimensions and payloads. The classes are labelled class-typical and unverified; replace them in `data/vehicles.json` when you have verified figures.
* **Imagery** - the hero uses an inline SVG illustration. Add authentic moving photography and an Open Graph image (`og:image`) when available.
* **Core Web Vitals, real-device and screen-reader testing** - not measured here.
