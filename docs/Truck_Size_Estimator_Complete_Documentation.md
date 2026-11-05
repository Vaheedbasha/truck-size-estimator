---
title: "Truck Size Estimator"
subtitle: "Complete Product and Technical Documentation"
date: "20 October 2026"
---

## Contents

1. Executive summary
2. Product goals and scope
3. Users and key journeys
4. Functional requirements
5. User interface and interaction design
6. Technology stack and architecture
7. Local development setup with XAMPP
8. Project structure
9. Household catalogue specification
10. Catalogue data model
11. Truck profiles and capacity estimation
12. Recommendation and visualisation behaviour
13. Lead capture and database design
14. Security, privacy and reliability
15. Accessibility, responsiveness and performance
16. Testing and acceptance criteria
17. Implementation roadmap
18. Deployment and maintenance
19. Risks, assumptions and open decisions
20. Glossary
21. Official technical references

## Document purpose

This document is the working specification for building a single-page household truck-size estimator for the Indian packers-and-movers market. It defines the user experience, requirements, catalogue, data structures, estimation model, lead workflow, application security, testing and deployment approach.

The product should let visitors select household items, watch a 2D truck illustration respond to their inventory, receive an indicative vehicle recommendation, and request a shifting quote. The estimator must remain useful without requiring visitors to register or submit contact details.

**Important limitation:** the output is an estimate, not a guarantee of physical packing fit, legal payload compliance, availability or final transport price. Real vehicle dimensions, payload limits and default item data must be verified before the estimator is promoted as operationally reliable.

# 1. Executive summary

## 1.1 Product concept

The Truck Size Estimator is a single-page website that helps households understand the approximate cargo capacity needed for relocation. The main interaction is visual: as a visitor selects furniture, appliances, boxes and belongings, the cargo area of a 2D illustrated truck responds to the growing inventory. When the estimated load approaches or exceeds the selected vehicle's capacity, the interface recommends another size or explains that multiple vehicles or a manual assessment may be needed.

## 1.2 Business purpose

The primary business goal is **lead generation for household shifting services**. Visitors receive an immediate estimate first; the quote-request form is presented after the result. The inventory is attached to the enquiry so the operations or sales team can follow up without asking the visitor to repeat the item list.

## 1.3 Confirmed product decisions

| Decision | Agreed direction |
|---|---|
| Purpose | Generate shifting enquiries / leads |
| Experience | Single-page interactive estimator |
| Audience | Indian household relocation customers |
| Visual | 2D animated truck / cargo-bay illustration |
| Vehicles | Small, medium and large; suggest multiple vehicles when appropriate |
| Catalogue | Broad household catalogue with search and custom items |
| Accuracy target | Practical estimate, not physics-grade packing simulation |
| Lead form | After results; no registration required to estimate |
| Local development | Windows computer with XAMPP |
| Backend | Native PHP |
| Frontend | HTML, CSS and vanilla JavaScript |
| Persistence | MySQL/MariaDB for enquiries; JSON for catalogue and initial vehicle profiles |
| Hosting direction | Local XAMPP first; compatible PHP hosting/VPS deployment later |

## 1.4 Product principles

1. **Estimate first, ask second.** Do not gate the result behind a phone number.
2. **Show your reasoning.** Display estimated volume, approximate utilization and why a vehicle category was selected.
3. **No false precision.** Mark estimates as approximate, and surface weight/oversize checks where data is incomplete.
4. **Catalogue-driven design.** Item additions should usually require data changes, not new UI code.
5. **Responsive and accessible.** The catalogue and form must remain usable on small screens, with keyboard support and reduced-motion behaviour.
6. **Keep the first version simple.** No login system, admin dashboard, framework dependency or 3D engine is required for the first release.

# 2. Product goals and scope

## 2.1 Goals

- Help users build an inventory of goods to be moved.
- Cover typical and uncommon possessions in Indian homes, from small flats to larger independent homes.
- Calculate an indicative packed-space estimate as quantities change.
- Animate a 2D truck cargo area based on the estimate.
- Recommend an appropriate configured vehicle category, or indicate that multiple trucks/manual review may be required.
- Collect complete, usable quote enquiries with the selected inventory attached.
- Work locally at `http://localhost/truck-size-estimator/` using XAMPP.
- Keep item data, vehicle specifications and calculation rules maintainable.

## 2.2 In scope for the initial release

- One primary estimator page.
- Searchable category-based household catalogue.
- Item variants and quantity selectors.
- Add/remove items and clear/reset inventory.
- Custom item entry with estimated size preset or dimensions.
- Approximate volume calculation in cubic feet.
- Configurable vehicle profiles, usability factors and capacity thresholds.
- 2D SVG truck visualization with capacity states.
- Vehicle recommendation and multiple-truck/manual-assessment fallback.
- Lead form shown after results.
- PHP endpoint, server-side validation and MySQL/MariaDB storage.
- Consent notice, spam mitigation, clear error/success messages.
- Responsive design, keyboard use, accessibility checks and basic analytics hooks.
- Local runbook and later deployment notes.

## 2.3 Out of scope for the initial release

- Exact 3D packing simulation or guaranteed item-by-item placement.
- Guaranteed loading-time, travel cost, quotation or truck availability.
- Route planning, distance calculation or live traffic integration.
- User accounts, saved projects, customer dashboards or a CRM portal.
- Full admin interface for changing the catalogue/vehicle fleet.
- Payment collection and online booking.
- Motorcycle, car, commercial equipment or industrial cargo estimation as a primary use case. These can be separate categories or services later.
- Automated legal certification of payload or vehicle compliance.

## 2.4 Success metrics

Track the following after launch:

- Estimator starts and completed inventories.
- Catalogue search usage and zero-result searches.
- Percentage of users who view a recommendation.
- Quote-form starts and successful lead submissions.
- Completion rate by device category.
- Most frequently selected items and custom-item frequency.
- Lead quality: reachable phone numbers, quote follow-up rate and conversion to booked move.
- Difference between estimated and actual recommended vehicle for completed moves, used to tune defaults.

# 3. Users and key journeys

## 3.1 Primary user

A person or family planning a household move within India who may not know truck sizes or how much cargo space their possessions require. They may be on a mobile phone, may not know formal furniture dimensions, and need simple labels and practical defaults.

## 3.2 Main journey

1. Visitor lands on the page and sees what the estimator does.
2. Visitor searches or browses categories.
3. Visitor selects items and variants and adjusts quantities.
4. Inventory totals and truck illustration update immediately.
5. The result panel shows estimated volume, capacity usage, a recommended truck category and warnings.
6. Visitor chooses to request a quote.
7. Visitor enters name, phone, pickup location, destination location and optional moving date.
8. The site submits the lead and inventory snapshot to PHP.
9. PHP validates the data, recomputes the estimate from authoritative catalogue/vehicle data, saves the enquiry and returns a clear result.
10. Visitor sees a success message and optional contact method for follow-up.

## 3.3 Alternative journeys and edge cases

- Visitor starts with a preset such as “1 BHK” only if such shortcuts are later introduced; the preset must be editable item-by-item.
- Search returns no result: show “No exact match” and offer a custom item.
- User selects an oversized or fragile item: show a handling note and do not assume normal loading.
- Load exceeds the largest single vehicle: show a multi-truck/manual quote recommendation rather than pretending the largest truck fits.
- User has not provided dimensions for a custom item: offer Small / Medium / Large presets and mark the estimate as lower confidence.
- Network or server submission fails: retain the visible inventory/form inputs and let the user retry.
- User changes inventory after seeing results: recalculate and refresh the recommendation immediately.
- User declines the quote form: the estimator remains fully usable.

# 4. Functional requirements

Requirements use IDs so they can be turned into a QA checklist or task board.

## 4.1 Catalogue and inventory

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | Show household items grouped into clear categories and subcategories. | P0 |
| FR-002 | Search by item name, common synonym and keyword. | P0 |
| FR-003 | Display item name, image/icon, variant and quantity control. | P0 |
| FR-004 | Allow a quantity to be increased, decreased, or removed. | P0 |
| FR-005 | Update inventory volume and truck state after each change. | P0 |
| FR-006 | Add a custom item with name, quantity and size preset or dimensions. | P0 |
| FR-007 | Prevent negative, invalid or excessively large quantities. | P0 |
| FR-008 | Support bundles (e.g., bed set) without double-counting component items. | P1 |
| FR-009 | Allow the user to clear/reset the inventory with confirmation. | P1 |
| FR-010 | Preserve the current inventory during ordinary UI changes and failed lead submission. | P1 |
| FR-011 | Provide useful empty-search and empty-inventory states. | P0 |

## 4.2 Estimation and truck recommendation

| ID | Requirement | Priority |
|---|---|---|
| FR-020 | Calculate estimated packed volume from item quantity and per-unit volume. | P0 |
| FR-021 | Use configurable vehicle profiles with actual internal dimensions. | P0 |
| FR-022 | Apply an explicit loading-efficiency factor to cargo-bay volume. | P0 |
| FR-023 | Show volume in cubic feet and capacity use as a percentage. | P0 |
| FR-024 | Recommend the smallest configured vehicle that meets volume and known fit constraints. | P0 |
| FR-025 | Surface payload checks when reliable weight data exists. | P1 |
| FR-026 | Warn when weight data is incomplete or an item's dimensions/handling needs manual review. | P0 |
| FR-027 | Recommend a larger vehicle or indicate multiple vehicles/manual confirmation when needed. | P0 |
| FR-028 | Recompute the estimate server-side before saving a lead. | P0 |
| FR-029 | Explain that the output is an estimate, not a guaranteed loading plan. | P0 |
| FR-030 | Avoid presenting unverified sample vehicle capacities as real fleet data. | P0 |

## 4.3 Visualizer and result panel

| ID | Requirement | Priority |
|---|---|---|
| FR-040 | Display an SVG 2D truck with a clearly defined cargo boundary. | P0 |
| FR-041 | Animate or visually update cargo fill as inventory changes. | P0 |
| FR-042 | Show normal, near-capacity and over-capacity states. | P0 |
| FR-043 | Use text/icon labels in addition to color for state communication. | P0 |
| FR-044 | Keep the truck illustration responsive and legible at mobile widths. | P0 |
| FR-045 | Honour reduced-motion preferences. | P1 |
| FR-046 | Avoid implying that fill percentage equals exact physical packing feasibility. | P0 |

## 4.4 Lead generation

| ID | Requirement | Priority |
|---|---|---|
| FR-050 | Show the quote form after the estimate/result. | P0 |
| FR-051 | Request name, mobile number, pickup, destination and optional moving date. | P0 |
| FR-052 | Attach selected items, variants, quantities, volume and estimate version to the lead. | P0 |
| FR-053 | Validate all fields in both browser and PHP. | P0 |
| FR-054 | Use a prepared SQL statement for database writes. | P0 |
| FR-055 | Show a clear success state only after the server confirms saving. | P0 |
| FR-056 | Retain the form and inventory after a recoverable failure. | P1 |
| FR-057 | Include appropriate consent/privacy wording and a privacy link. | P0 |
| FR-058 | Add baseline spam protections and request limits. | P1 |

# 5. User interface and interaction design

## 5.1 Page structure

1. **Header:** business logo/name, concise navigation if needed, and a short trust cue.
2. **Intro:** headline, one-sentence explanation and an instruction to select household goods.
3. **Estimator workspace:** searchable catalogue and inventory controls alongside a sticky result/truck panel on desktop.
4. **Inventory summary:** selected item count, estimated total cubic feet and any warnings.
5. **Recommendation:** vehicle category, approximate capacity used, and explanation.
6. **Quote form:** revealed after the result; optionally presented as an in-page panel or dialog with accessible focus management.
7. **Footer:** business contact, privacy notice, terms/estimate disclaimer.

## 5.2 Desktop layout

Use a two-column grid. The item catalogue occupies approximately 55–60% of the main workspace and the truck/result panel the remaining 40–45%. The result panel may be sticky if this does not conceal other content. Catalogue cards should form a compact grid rather than a long full-width vertical form.

## 5.3 Mobile layout

- Single-column content flow.
- Compact truck preview and volume summary near the top.
- Large, touch-friendly quantity controls.
- Search remains easy to reach.
- Consider a sticky bottom summary, but ensure it never overlaps form controls or keyboard focus.
- Use a category drawer or horizontal category tabs only if it remains keyboard and screen-reader accessible.
- Avoid horizontal overflow and excessively tall item cards.

## 5.4 Item card behaviour

Each card should show an icon/illustration, name, size/variant selector where relevant, volume or size label only if it is useful to the customer, and a quantity stepper. The active state should be obvious. Controls must have accessible labels such as “Increase quantity of three-seater sofa”. Do not require users to understand cubic feet before using the catalogue.

## 5.5 Capacity states

- **Low / comfortable load:** use neutral success-like information such as “Estimated space available”.
- **Near capacity:** show a clear warning threshold configured per product; 80% is a provisional UI threshold, not a universal standard.
- **Over capacity:** display the next suitable size or “Multiple vehicles / manual confirmation recommended”.
- **Incomplete data:** clearly identify unknown payload or custom dimensions rather than hiding that limitation.

Never rely on red/amber/green color alone. Include labels and icons. Avoid alarmist wording.

# 6. Technology stack and architecture

## 6.1 Chosen stack

| Layer | Technology | Reason |
|---|---|---|
| Local server | Apache via XAMPP | Already available on the Windows development machine |
| Backend | PHP | Native fit for the existing environment and straightforward request handling |
| Frontend structure | HTML/PHP templates | One-page page shell and server-rendered form support |
| Styling | CSS | Responsive grid, item cards, states and animation |
| Browser logic | Vanilla JavaScript | Inventory state, search, volume calculation and SVG updates without a frontend build step |
| Truck illustration | Inline SVG + CSS/JavaScript | Crisp 2D visual that scales to different screens |
| Data catalogue | JSON files | Easy to expand and version-control; no catalogue admin required for v1 |
| Lead persistence | MySQL/MariaDB | Structured, durable lead records through XAMPP's database service |
| Database access | PHP PDO | Prepared statements and structured connection handling |
| Local DB tools | phpMyAdmin | Simple schema and lead inspection during development |
| Version control | Git, recommended | Track catalogue changes, code changes and releases |

## 6.2 Architecture

```text
Visitor's browser
  ├─ PHP page shell (index.php)
  ├─ Catalogue and vehicle JSON
  ├─ inventory.js ── maintains selections and quantities
  ├─ estimator.js ── calculates volume and recommends a vehicle
  └─ truck-visualizer.js ── updates SVG cargo display
                 │
                 │ POST /api/lead.php (same origin)
                 ▼
             Apache / PHP
                 ├─ validates request and CSRF token
                 ├─ reloads trusted catalogue and vehicle data
                 ├─ recomputes estimate server-side
                 ├─ writes via PDO prepared statement
                 ▼
             MySQL / MariaDB
                 └─ leads table and inventory snapshot
```

The browser calculation improves responsiveness but is not authoritative for lead storage. PHP must verify item IDs, variant IDs, quantities and vehicle selection against trusted server-side data, then recompute the saved estimate. Do not blindly trust volume, weight or recommendation values supplied by the browser.

## 6.3 Avoid unnecessary dependencies

The initial product does not require Astro, React, Laravel, a Node.js runtime or a 3D library. Reconsider a framework only if complexity grows materially—for example, an authenticated admin interface, complex reusable modules, a large number of dynamic routes or multiple backend integrations.

# 7. Local development setup with XAMPP

## 7.1 Prerequisites

- Windows computer.
- XAMPP installed with Apache, PHP and MySQL/MariaDB.
- A modern browser.
- Code editor such as VS Code (recommended).
- Git (recommended, but not required to run the app).

## 7.2 Create the application folder

Create:

`C:\xampp\htdocs\truck-size-estimator\`

Open XAMPP Control Panel and start **Apache** and **MySQL**. Open `http://localhost/` to confirm Apache is running and `http://localhost/phpmyadmin/` to confirm database tools are available.

Open the application at:

`http://localhost/truck-size-estimator/`

Do not open `index.php` as a local file such as `file:///C:/...`; it must be requested through Apache so PHP is executed.

## 7.3 Initial database setup

Open phpMyAdmin, select the SQL tab and run:

```sql
CREATE DATABASE truck_estimator
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE truck_estimator;

CREATE TABLE leads (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  pickup_city VARCHAR(150) NOT NULL,
  destination_city VARCHAR(150) NOT NULL,
  moving_date DATE NULL,
  inventory_json LONGTEXT NOT NULL,
  estimated_volume_ft3 DECIMAL(10,2) NOT NULL,
  recommended_vehicle VARCHAR(100) NOT NULL,
  estimate_version VARCHAR(30) NOT NULL,
  consent_accepted TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

For local testing only, a default XAMPP database account may have no password depending on how XAMPP was installed. Use a dedicated database user when practical and never reuse a default/root development configuration in production. Do not expose MySQL or phpMyAdmin to the public Internet.

## 7.4 Configuration

Keep database settings in one central configuration file loaded by PHP. On local XAMPP, a `config/database.php` file can be used if direct HTTP access to the `config` directory is denied by Apache. For production, store secrets outside the public document root or restrict them in the server configuration; `.htaccess` rules alone are not portable to Nginx.

Configuration should include:

- Host (local development is usually `127.0.0.1` or `localhost`).
- Database name.
- Database username/password.
- Environment label (`development` or `production`).
- Error display/logging mode.

Do not commit real passwords, API secrets or production credentials into Git.

## 7.5 Local verification

1. Confirm Apache and MySQL are running.
2. Visit the application URL.
3. Confirm CSS, JavaScript and catalogue files load.
4. Add and remove sample inventory items.
5. Verify the estimated volume changes.
6. Verify truck fill and capacity status update.
7. Submit a test quote request.
8. Confirm a row exists in `truck_estimator.leads`.
9. Check Apache/PHP logs when any step fails.

# 8. Recommended project structure

```text
C:\xampp\htdocs\truck-size-estimator\
├── index.php
├── config/
│   └── database.php
├── api/
│   └── lead.php
├── includes/
│   ├── bootstrap.php
│   ├── functions.php
│   ├── catalogue.php
│   └── csrf.php
├── data/
│   ├── categories.json
│   ├── household-items.json
│   └── vehicles.json
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── inventory.js
│   │   ├── estimator.js
│   │   └── truck-visualizer.js
│   ├── images/
│   │   ├── items/
│   │   └── truck/
│   └── icons/
├── tests/
│   ├── estimator-test-cases.md
│   └── lead-api-test-cases.md
├── .gitignore
├── .htaccess
└── README.md
```

Responsibilities:

- `index.php`: page shell and server-provided initial configuration; avoid placing all business logic in this one file.
- `config/database.php`: database connection parameters; block public access.
- `api/lead.php`: only the public lead endpoint; accept the intended HTTP method and return predictable JSON.
- `includes/bootstrap.php`: session setup, environment config and common initialization.
- `includes/functions.php`: shared PHP utilities.
- `includes/catalogue.php`: trusted server-side loading and validation of JSON catalogue/vehicle data.
- `includes/csrf.php`: CSRF token creation/verification if using session-based form protection.
- `data/*.json`: versioned data definitions. They may be browser-readable if loaded directly; they must contain no secrets.
- `assets/js/inventory.js`: state and quantity operations.
- `assets/js/estimator.js`: client-side equivalent of the estimate rules.
- `assets/js/truck-visualizer.js`: maps estimate state to SVG display; it should not own the estimate calculation.
- `tests/`: repeatable scenarios and expected outcomes.

Use clear module boundaries even though this is a small PHP application. That makes future fixes safer and easier to test.

# 9. Household catalogue specification

The catalogue should represent the real contents of Indian households, not only a few furniture examples. “Complete” means broad predefined coverage plus a custom-item option; it is not possible to enumerate every personal possession in advance.

## 9.1 Categories and examples

### 01. Living room

- Sofas: 1-, 2-, 3- and 5-seater; L-shaped; sofa-cum-bed; recliner; loveseat.
- Individual chairs: armchair, accent chair, rocking chair, ottoman, bean bag.
- Tables: centre/coffee table, nesting table, side table, console table.
- Storage: TV unit, display cabinet, bookshelf, shoe rack, sideboard.
- Electronics: televisions by size class, soundbar, speakers, home theatre.
- Decor and soft goods: rug, carpet, floor lamp, standing mirror, curtains, blinds, wall art, clock, indoor plant, plant stand, decorative screen.

### 02. Bedroom

- Beds: single, double, queen, king, bunk, trundle, folding bed, cot frame, bed base and headboard.
- Mattresses: single, double, queen, king, foldable mattress, mattress topper.
- Storage: wardrobe, sliding wardrobe, steel almirah, chest of drawers, bedside table, trunk, storage bench.
- Dressing: dressing table, vanity stool, full-length mirror.
- Other: bedside lamp, baby cot, mosquito net frame, folding screen.

### 03. Dining room

- Dining tables for 2, 4, 6 and 8 people; extendable table; folding table.
- Dining chair, bench, bar stool.
- Crockery unit, display cabinet, sideboard, buffet unit, serving trolley.

### 04. Major kitchen appliances

- Refrigerators: single-door, double-door, side-by-side, large multi-door.
- Deep freezer, washing machine (top-load/front-load), clothes dryer, dishwasher.
- Microwave, OTG, built-in oven, gas stove, induction cooktop, chimney.
- Water purifier, water dispenser, water cooler, wet grinder.
- Kitchen trolley, movable island, large storage rack.

### 05. Small kitchen appliances and equipment

- Mixer-grinder, blender, food processor, juicer, hand blender, electric beater.
- Air fryer, rice cooker, electric kettle, toaster, sandwich maker, coffee machine.
- Pressure cooker, large cookware pot, utensil rack, dish-drying stand.
- Spare cooktop and movable kitchen storage units.

### 06. Kitchen and household contents

- Cartons for utensils, crockery, glassware, pantry goods, books and small appliances.
- Cutlery organizers, storage containers, spice racks, steel racks.
- Clothes, linen, quilts, blankets, pillows, towels, shoes, toys and loose belongings should generally be represented as cartons, bags or bundles rather than each tiny object individually.

### 07. Utility, laundry and cleaning

- Air cooler, split AC indoor/outdoor units, window AC, ceiling fan, pedestal fan, table fan.
- Air purifier, humidifier, dehumidifier, geyser/water heater, room heater.
- Iron, ironing board, vacuum cleaner, drying rack, laundry basket, utility shelf.
- Ladder, toolbox, cleaning bucket, mop set, sewing machine.

### 08. Electronics and home office

- Desktop computer, monitor, laptop carton, printer, scanner, UPS, UPS battery.
- Computer desk, office chair, filing cabinet, drawer pedestal, bookshelf.
- Router, speakers, amplifier, projector, game console, cable/AV equipment carton.

### 09. Study room and general furniture

- Study table, writing desk, computer desk, bookshelf, filing unit, whiteboard, noticeboard.
- Folding desk, stool, stackable chair, bench, small conference table.
- Dismantled tabletop, legs, shelf panels and furniture hardware carton.

### 10. Children and baby items

- Baby cot, bassinet, stroller/pram, high chair, baby walker, playpen.
- Toy chest, dollhouse, toy kitchen, ride-on toy, tricycle, child's bicycle.
- Children's bed, desk, chair, car seat and bulky play equipment.

### 11. Prayer and religious household items

- Small/medium/large pooja mandir, freestanding temple cabinet, prayer stool, prayer mat.
- Decorative shelves, storage chest, boxed lamps and pooja utensils.
- Flag fragile/valuable pieces for careful handling; avoid recording religious beliefs or other unnecessary personal information.

### 12. Bathroom items

- Bathroom cabinet, mirror cabinet, storage tower, laundry hamper, stool, rack, towel stand.
- Portable vanity, boxed toiletries and compact utility storage.

### 13. Balcony and garden

- Plastic chairs, garden table, folding outdoor furniture, bench.
- Plant pots, large planters, indoor tree, balcony rack, planter stand.
- Garden tools, hose reel, watering can, outdoor storage cabinet, artificial plants.

### 14. Fitness, sport and recreation

- Treadmill, exercise bike, elliptical trainer, weight bench, gym rack, dumbbell/weight set.
- Bicycle, children's bicycle, sports kit, yoga mat, games table.
- Keyboard, guitar, electronic drum kit and other hobby equipment.

### 15. Cartons, luggage and packed goods

- Small, medium, large and extra-large cartons.
- Heavy-duty carton, wardrobe box, book carton, dish-pack carton.
- Suitcase, duffel bag, backpack, plastic storage tub, trunk, vacuum bag.
- Folded mattress, rolled carpet, bundled curtains and miscellaneous box.

### 16. Bulky, fragile and unusual items

- Large safe, piano/keyboard piano, aquarium, antique cabinet, glass tabletop, oversized mirror.
- Marble table, massage chair/table, large artwork, sculpture, oversized trunk.
- Items requiring specialist handling should trigger a manual-quote flag; do not assume an ordinary truck profile is sufficient.

### 17. Dismantled furniture and components

- Bed frame, wardrobe panels, modular furniture, table legs, headboard, bed slats.
- Cabinet doors, shelves, furniture boards, glass panels and fittings/hardware cartons.
- The item definition should distinguish assembled from dismantled where that materially changes packed volume.

### 18. Household safety and other goods

- Small home safe, fire extinguisher, tool chest and miscellaneous household storage items.
- Regulated or hazardous materials should not be treated as ordinary goods. Provide a note that fuel, gas cylinders, chemicals and other restricted items need transport-policy confirmation; do not automatically approve their loading.

### 19. Custom item

Allow the visitor to add an item not found in the catalogue. Request:

- Item name.
- Quantity.
- Size: small, medium or large if exact dimensions are unknown.
- Optional length, width and height.
- Optional weight only when known.
- Fragile/oversized/special-handling flag.

Custom items should have lower confidence when dimensions are guessed. The interface should not let arbitrary client-entered data overwrite the standard catalogue record.

## 9.2 Bundle and double-counting rules

- A “bed set” may be a convenience bundle that expands into frame, mattress and headboard components. Selecting the bundle and one of its components must not add the same component twice without the user intentionally adding an extra piece.
- An AC combo may represent indoor and outdoor units; selecting the combo should not also add each unit automatically elsewhere.
- Utensils, clothing, books and small personal belongings should typically be entered as cartons or a bundle.
- Fridge volume must use outer packed dimensions, not advertised internal food storage capacity.
- When furniture is dismantled, use the packed/dismantled footprint rather than the assembled bounding box if verified data is available.

# 10. Catalogue data model

## 10.1 Household item record

Recommended conceptual JSON record:

```json
{
  "id": "sofa-3-seater",
  "name": "3-seater sofa",
  "categoryId": "living-room",
  "searchKeywords": ["couch", "three seater", "sofa"],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "packedVolumeFt3": 42,
      "estimatedWeightKg": null,
      "packedDimensionsIn": {
        "length": 84,
        "width": 36,
        "height": 36
      }
    }
  ],
  "illustrationId": "sofa-3-seater",
  "isFragile": false,
  "isBundle": false,
  "components": []
}
```

The numbers above are **illustrative placeholders**, not validated furniture dimensions or production defaults. Replace them with measured/verified estimates before launch. Dimensions and volume must describe the item's packed-space envelope consistently. If dimensions are unavailable, store a reviewed approximate volume and a lower-confidence marker.

## 10.2 Category record

Each category should have: `id`, `name`, `description`, `sortOrder`, `iconId`, and optional `subcategories`. IDs should be stable even if display labels change.

## 10.3 Variant fields

Recommended fields:

- `id`: stable machine identifier.
- `label`: human-readable size/style.
- `packedVolumeFt3`: packed volume per unit.
- `packedDimensionsIn`: optional packed dimensions in inches.
- `estimatedWeightKg`: optional estimated packed weight.
- `confidence`: `measured`, `reviewed_estimate` or `rough_estimate`.
- `requiresManualReview`: true for outsize/special handling cases.

Use one unit convention in data. The initial design uses cubic feet for volume, inches for item dimensions and kilograms for weight. Convert only at the UI/API boundaries if other units are later introduced.

## 10.4 Vehicle profile record

Recommended conceptual JSON record:

```json
{
  "id": "medium-closed-body-01",
  "name": "Medium closed-body truck",
  "class": "medium",
  "internalDimensionsFt": {
    "length": null,
    "width": null,
    "height": null
  },
  "loadingEfficiency": 0.75,
  "payloadLimitKg": null,
  "doorDimensionsIn": {
    "width": null,
    "height": null
  },
  "active": false,
  "sortOrder": 30,
  "dataStatus": "needs_verification"
}
```

All `null` measurements must be replaced with actual fleet measurements before the profile is eligible for production recommendations. `0.75` is only a provisional loading-efficiency example and must be calibrated; it is not a universal Indian transport standard. The example profile is inactive until its data is verified.

## 10.5 Catalogue data quality

Before an item becomes active:

- Confirm the item name and synonyms.
- Define a sensible variant set.
- Verify the packed envelope or record the confidence of the estimate.
- Confirm bundle component relationships.
- Add illustration mapping or a generic icon.
- Test search terms used by Indian customers, including common alternative names.
- Mark fragile, oversized or special-handling conditions.
- Confirm that selecting the item increments the inventory only once.

Maintain catalogue data in version control. Use an explicit `catalogueVersion` or `estimateVersion` so saved leads can be interpreted after defaults change.

# 11. Truck profiles and capacity estimation

## 11.1 Why capacity needs a model

Advertised vehicle length or a market label such as “mini truck” is not enough to determine how much household cargo will fit. Use the actual internal cargo-body dimensions and payload limit for vehicles offered by the business. External length and marketing descriptions must not be treated as usable cargo dimensions.

## 11.2 Unit conventions

- Cargo/item volume: cubic feet (`ft³`).
- Item dimensions in the catalogue: inches (`in`).
- Vehicle internal dimensions: feet (`ft`).
- Weight: kilograms (`kg`).

If item dimensions are given in inches, their bounding-box volume is:

`itemVolumeFt3 = lengthIn × widthIn × heightIn / 1728`

The formula assumes all dimensions describe the packed envelope. If `packedVolumeFt3` is directly maintained after review, use it as the input and keep dimensions as a fit-check aid. Avoid inconsistent definitions that count packing allowance twice.

## 11.3 Inventory volume

For item variants `i` with quantities `qᵢ` and packed volume per unit `vᵢ`:

`inventoryVolumeFt3 = Σ (qᵢ × vᵢ)`

A bundle should either be counted as its own bundled volume or expanded into component items—not both. For custom items, calculate volume from validated dimensions or use the selected preset volume. Validate quantity and dimensions as finite positive numbers within sensible maximums.

## 11.4 Usable vehicle volume

Let the vehicle internal dimensions be `L`, `W`, and `H` feet, and `η` be the reviewed loading-efficiency factor between 0 and 1:

`grossInternalVolumeFt3 = L × W × H`

`usableVolumeFt3 = grossInternalVolumeFt3 × η`

Loading efficiency accounts for the fact that the cargo bay cannot be filled as a perfect rectangular solid due to furniture shapes, gaps and loading constraints. A 0.75 factor may be used for prototype testing only; production should use a value reviewed against actual moves. If `usableVolumeFt3` is less than or equal to zero, or the dimensions/data status is unverified, the profile must not be used as a production recommendation.

## 11.5 Utilization and thresholds

`utilizationPercent = inventoryVolumeFt3 / usableVolumeFt3 × 100`

A configurable near-capacity threshold (for example, 80%) can change the UI state. This is a communication threshold, not a claim that items physically fit with a known probability. A load over 100% of usable capacity exceeds the current profile's volume allowance and must not be recommended as a single-truck fit.

## 11.6 Weight and item fit

Volume alone is insufficient for heavy cargo. Where sufficiently reviewed item-weight estimates and a confirmed vehicle payload limit exist, calculate:

`estimatedWeightKg = Σ (quantity × estimatedWeightPerUnitKg)`

Reject a profile if a reliable estimated weight exceeds its payload limit. If weight data is incomplete, the estimate may still show a provisional volume-based option, but it must be labelled **weight not verified; final vehicle selection requires confirmation**. Never present unknown weight as confirmed compliance.

Where packed dimensions are known, compare large item dimensions to the truck door and cargo-body dimensions. Rotation may allow alternate orientations, but the initial estimator should not claim exact fit unless an orientation check has been implemented and tested. Flag long, tall, heavy or specialist items for manual assessment.

## 11.7 Selection rule

1. Load only active, verified vehicle profiles.
2. Compute the inventory volume using trusted item data.
3. Identify profiles whose usable volume is at least the estimated load volume.
4. Exclude any profile that fails known payload or dimension/handling constraints.
5. From eligible profiles, choose the smallest suitable class according to configured usable volume or fleet order.
6. If there is no eligible single vehicle, show the largest plausible class and explain that multiple trucks or a manual assessment is needed.
7. If weight or key item data is unknown, label the recommendation as provisional instead of claiming an assured fit.

## 11.8 Multiple-truck fallback

A simple lower bound can be estimated by dividing total volume by usable truck volume, but that alone does not prove that goods can be partitioned across vehicles: item indivisibility, payload and bulky dimensions matter. The initial release should use language such as “This inventory may require multiple vehicles; request a quote for confirmation” rather than promise a precise number of trucks solely from volume. A later version may add a packing allocation heuristic if it can be validated using real moves.

## 11.9 Calibration loop

For actual moves, collect the predicted volume/truck class and the operations team's confirmed final vehicle. Review mismatches by item type and house size. Adjust item packed volumes and efficiency factors only after evidence is collected; do not tune values solely to make the visual load appear aesthetically full.

# 12. Recommendation and visualisation behaviour

## 12.1 SVG scene

The illustration should have a fixed `viewBox`, cargo boundary, vehicle cab/wheels and a layer for selected items or representative category shapes. SVG scales cleanly to different sizes. Items should be arranged from an explicit, deterministic layout strategy; a fill-height rectangle can illustrate capacity, but should not be marketed as precise object placement.

## 12.2 First-release visualization strategy

Use two visual layers:

1. **Capacity layer:** a visible fill/meter driven by volume utilization.
2. **Item layer:** a representative set of selected-item icons or item silhouettes. Prioritize major furniture and appliances; use carton stacks/representative icons for numerous small possessions.

The item layer is an illustration of inventory, not a guaranteed packing arrangement. The volume meter remains the authoritative display of the estimate.

## 12.3 Visual states

- Empty: truck shown empty, instructions visible.
- Under capacity: fill/representative items appear and estimated volume updates.
- Near capacity: labelled warning appears at a configurable threshold.
- Over capacity: current truck shown as insufficient, followed by a larger vehicle or multi-vehicle/manual-assessment suggestion.
- Incomplete estimate: note is displayed for guessed custom dimensions, unknown weight or oversized goods.

## 12.4 Motion and accessibility

Use short, restrained transitions. Respect `prefers-reduced-motion`; users who prefer reduced motion should receive immediate state updates instead of animated movement. Give the SVG a suitable accessible name, and communicate volume/status in HTML text outside the SVG as well. The SVG should be decorative if equivalent information is fully available in adjacent text.

## 12.5 Inventory persistence in the browser

Version one may keep selections in JavaScript memory. Optional use of session storage/local storage can retain selections across refreshes, but should be documented and should not save contact form details without an explicit reason. If persisted inventory format changes, include a schema version and gracefully discard or migrate incompatible saved state.

# 13. Lead capture and database design

## 13.1 Minimum lead fields

| Field | Rule |
|---|---|
| Full name | Required; trim whitespace; limit length |
| Mobile number | Required; validate plausible input without assuming it is verified |
| Pickup city/PIN | Required; use text/PIN field appropriate to launch requirements |
| Destination city/PIN | Required |
| Preferred moving date | Optional; validate valid date and business policy |
| Inventory snapshot | Required; canonical item IDs, variants, quantities and custom items |
| Estimated volume | Recomputed on server from trusted data |
| Recommended vehicle | Recomputed on server or stored as provisional result plus caveat |
| Estimate/catalogue version | Required for interpreting historic estimates |
| Consent accepted | Required boolean for the consent checkbox/text policy selected by the business |
| Status | `new` by default; future follow-up status can be introduced |
| Created time | Database timestamp |

Collect only what is needed to contact the visitor and prepare a quote. Do not add sensitive personal details to the estimator unless there is a clear business requirement.

## 13.2 Lead API contract

Endpoint: `POST /truck-size-estimator/api/lead.php`  
Expected request type: `application/json` or a consistently configured form encoding  
Expected success response: JSON with a success flag and non-sensitive confirmation identifier/message  
Expected error response: JSON error message with an appropriate HTTP status; never expose stack traces, DB credentials or SQL details.

The final implementation should choose one request format and use it consistently. If browser `fetch()` is used, keep requests same-origin where practical and implement session/CSRF protection. Do not enable permissive cross-origin access without a specific need.

## 13.3 Server-side validation sequence

1. Accept only the intended method (`POST`).
2. Check content type and enforce a reasonable maximum request body size.
3. Verify CSRF token when using a session-based token.
4. Validate required lead fields, field lengths and date format.
5. Confirm each submitted item/variant ID exists in the trusted catalogue.
6. Validate quantity bounds and custom item fields.
7. Recalculate volume and recommendation from server-side JSON and active fleet profiles.
8. Check explicit consent requirement.
9. Apply basic rate limiting/honeypot mitigation and reject obvious automated abuse.
10. Save through PDO prepared statements.
11. Return a clean success response only after commit/save succeeds.
12. Log a safe diagnostic on server-side failure; return a generic user-facing error.

Use prepared statements for all SQL values. Do not build an SQL statement by concatenating user-provided strings. Reference: PHP PDO prepared statements (see official references below).

## 13.4 Database considerations

The `inventory_json` snapshot should include item IDs, variant IDs, quantities, custom item descriptions/dimensions, calculated volume, estimate version and relevant warnings. Validate the JSON schema before saving. Avoid relying only on the user-supplied `estimated_volume_ft3` field; recalculate it on the server.

A future release may add tables for catalogue audit history, vehicle profiles, lead activity and staff assignments. Those are not required for the initial public estimator.

## 13.5 Success and failure UX

Success: confirm that the enquiry has been received and state the next step without promising an exact response time unless the business can meet it. Offer call/WhatsApp follow-up links if configured.

Failure: preserve the current selection and form values; explain whether the issue is validation or temporary submission failure; allow retry. Do not clear the user's inventory when saving fails.

# 14. Security, privacy and reliability

## 14.1 Local development vs production

XAMPP is a development stack. Do not make its default services publicly accessible as a production server. In particular, secure database credentials, restrict phpMyAdmin to authorized access, disable unused services and avoid exposing development pages to the Internet. See the Apache Friends XAMPP Windows FAQ in the references.

## 14.2 Database security

- Use a dedicated application database user with only necessary privileges.
- Use a strong unique password outside version control.
- Do not expose MySQL/MariaDB's port to the public Internet.
- Keep backups protected and test restores.
- Use PDO prepared statements and strict input validation.

## 14.3 Web security

- Validate all inputs server-side; browser validation improves UX but is not a security boundary.
- Escape displayed user-supplied text to prevent cross-site scripting (XSS).
- Add CSRF protection for session-based requests.
- Limit request size, field length and quantity ranges.
- Use a honeypot and/or rate limiting; CAPTCHA can be considered if abuse is observed.
- Do not reveal PHP notices, filesystem paths, database errors or secrets to visitors.
- Disable directory listing and block direct access to configuration files and backups.
- Use HTTPS in production.
- Keep PHP, database, web server and dependencies patched.

## 14.4 Privacy

Add a privacy notice describing the purpose of name, mobile number, pickup/destination information, selected inventory and how the business will use the enquiry. Provide only the fields needed for the quote. The business should review the privacy/consent wording against applicable Indian legal requirements before launch. This document is technical/product guidance, not legal advice.

## 14.5 Reliability

- Treat failure to load catalogue data as a visible error, not an empty successful inventory.
- Fail closed if vehicle profiles are missing, invalid or unverified.
- Keep user inventory intact if the lead request fails.
- Log server faults privately with a correlation/reference ID where possible.
- Back up database and version-controlled catalogue files.

# 15. Accessibility, responsiveness and performance

## 15.1 Accessibility requirements

- Semantic headings and landmarks.
- Proper form labels and field error associations.
- Keyboard-operable search, quantity steppers, category controls and quote form.
- Visible focus indication.
- Sufficient text/background contrast.
- Status messages announced when inventory volume and recommendation change, without forcing screen readers to read every visual animation frame.
- Do not communicate truck states by color alone.
- Respect reduced-motion settings.
- SVG includes an accessible label or is marked decorative if equivalent text is adjacent.

## 15.2 Responsive acceptance

Test at minimum:

- 360px wide mobile viewport.
- 390–430px wide mobile viewport.
- Tablet portrait and landscape.
- 1366px desktop width.
- 1920px desktop width.

No page-level horizontal scrolling should occur. The sticky panel, category controls and lead form must not be blocked by mobile browser chrome or the on-screen keyboard.

## 15.3 Performance

- Keep calculations local to the browser; do not call the server for every quantity click.
- Use compressed, appropriately sized SVG/WebP/PNG illustrations.
- Use lazy loading for non-critical catalogue illustrations.
- Avoid rendering every catalogue card repeatedly when only one quantity changes; update affected state efficiently.
- Keep the data catalogue structured and indexed by ID; precompute item lookup maps in JavaScript.
- Keep public JSON to necessary catalogue fields only.
- Cache static assets carefully, but cache catalogue data with versioning so capacity/data fixes propagate.

# 16. Testing and acceptance criteria

## 16.1 Core calculation tests

1. Empty inventory returns zero volume and no truck recommendation.
2. One item gives `quantity × packed volume`.
3. Two different items sum correctly.
4. Increasing quantity increments volume correctly; decrementing reverses it.
5. Item variant changes replace rather than add the old variant volume.
6. Bundle and component logic does not double-count.
7. Item dimensions in inches convert to cubic feet using division by 1728.
8. Truck usable volume is internal dimensions multiplied by loading efficiency.
9. Load below capacity chooses the smallest eligible vehicle.
10. Load exactly at the threshold follows documented boundary rules consistently.
11. Load above all single-vehicle capacities does not claim a single truck fits.
12. Weight above a known payload limit excludes that profile.
13. Incomplete weight data creates a warning, not a false verified fit.
14. Invalid/unknown vehicle profile is not recommended.
15. Custom item with unknown dimensions uses a marked estimate preset or is rejected until a size is chosen.

## 16.2 UI tests

- Search by standard name and synonym.
- No-result search offers custom entry.
- Add, decrement, remove and reset controls.
- Category change and search do not lose selected quantities.
- Truck fill and text labels update together.
- Near-capacity and over-capacity messages display correctly.
- Keyboard navigation reaches every control in logical order.
- Reduced-motion preference removes non-essential movement.
- Layout works at required viewport widths.

## 16.3 Lead API tests

- Valid request saves exactly one lead.
- Missing name/phone/location is rejected.
- Malformed phone/date is rejected under the chosen validation rules.
- Unknown item/variant IDs are rejected.
- Negative, non-numeric or excessive quantities are rejected.
- Altered client-supplied volume/recommendation does not change server-calculated values.
- Missing/invalid CSRF token is rejected if token protection is enabled.
- Too-large request and unsupported HTTP method are rejected.
- SQL-like input is stored/handled safely as text and does not alter SQL structure.
- DB failure returns a generic error and does not report false success.
- Failed submission preserves browser inventory and form data.

## 16.4 Launch acceptance checklist

- [ ] Catalogue categories and core variants reviewed by the business.
- [ ] Item packed-volume values are reviewed or explicitly marked rough estimates.
- [ ] Active truck profiles use verified internal dimensions and payload data.
- [ ] No production vehicle profile contains placeholder dimensions.
- [ ] Bundle/duplicate counting tests pass.
- [ ] Recommendation and oversized-item fallback tests pass.
- [ ] All required fields and API validation are tested.
- [ ] Consent and privacy text reviewed.
- [ ] Lead is saved and visible to authorized staff.
- [ ] Mobile, tablet and desktop layout tests pass.
- [ ] Keyboard, contrast and reduced-motion checks pass.
- [ ] HTTPS, secret handling and backups are configured before public launch.
- [ ] Actual completed moves can be used to audit estimate accuracy.

# 17. Implementation roadmap

## Phase 1 — Foundation

Tasks: create XAMPP project folder, page shell, CSS design tokens, navigation/layout, JSON parsing and consistent naming conventions.  
Exit criterion: page loads locally without console/PHP errors; catalogue data can be read.

## Phase 2 — Household catalogue

Tasks: categories, search, synonyms, variants, quantity controls, custom items, empty states and bundle rules.  
Exit criterion: users can build an inventory from the agreed catalogue and quantities persist during the session.

## Phase 3 — Estimation engine

Tasks: volume units, total computation, vehicle profile validation, usable capacity, utilization thresholds, weight/dimension warnings and multi-vehicle fallback.  
Exit criterion: repeatable calculation tests pass; all active data fields have documented units and confidence.

## Phase 4 — 2D visualization

Tasks: SVG truck scene, cargo fill meter, category/item silhouettes, low/near/over states, mobile scaling and reduced-motion handling.  
Exit criterion: all visual states are driven from calculation output and never become an independent source of numerical truth.

## Phase 5 — Lead capture

Tasks: quote form, CSRF/session handling, server-side validation, trusted recomputation, PDO connection, leads table, success/error states and spam controls.  
Exit criterion: successful submissions are stored accurately; invalid payloads cannot corrupt lead records.

## Phase 6 — QA and data calibration

Tasks: browser/device test, accessibility review, error handling, catalogue volume review, verified truck profile entry and sample move comparisons.  
Exit criterion: launch checklist passes and unverified fleet profiles remain disabled.

## Phase 7 — Production launch

Tasks: export and deploy to a secured PHP-compatible host/VPS, configure HTTPS, production database/user, server configuration, backups, monitoring and privacy content.  
Exit criterion: production form test succeeds and restoration/recovery steps are documented.

## Recommended prioritisation

First ship the essential catalogue, accurate calculation boundaries and a clean visual truck. Do not spend the initial budget on hundreds of custom illustrations, a 3D simulator or a large admin system. Add representative illustrations, then expand based on search logs and user feedback.

# 18. Deployment and maintenance

## 18.1 Local run routine

1. Open XAMPP Control Panel.
2. Start Apache and MySQL/MariaDB.
3. Open `http://localhost/truck-size-estimator/`.
4. Check browser console and Apache/PHP logs if an error appears.
5. Use phpMyAdmin to confirm test enquiries only during local development.

## 18.2 Production warning

Do not publish the standard XAMPP installation directly to the public Internet. For a future Hostinger VPS release, deploy the PHP application under a proper production web-server configuration, use HTTPS, restrict database/network access, store secrets outside the public web root, disable verbose PHP errors for visitors, and configure a dedicated database user. XAMPP remains the local development environment.

## 18.3 Deployment checklist for a PHP-compatible VPS

- [ ] Confirm OS, existing web server and control panel before changing services.
- [ ] Back up existing sites/configuration before installing or modifying services.
- [ ] Create a non-root deployment workflow.
- [ ] Deploy application files while keeping secrets outside the document root.
- [ ] Create a production database and restricted application account.
- [ ] Import the reviewed schema and required catalogue/vehicle data.
- [ ] Configure server-side PHP errors to be logged, not displayed publicly.
- [ ] Configure HTTPS and verify renewal.
- [ ] Permit only necessary inbound ports; keep MySQL private.
- [ ] Test a lead submission end-to-end.
- [ ] Set up database/file backups and test restoration.
- [ ] Verify website forms, error logs, time zone and permissions.

## 18.4 Backup and recovery

Back up:

- MySQL/MariaDB lead database.
- Catalogue JSON files and reviewed vehicle configuration.
- PHP, CSS, JavaScript and image assets.
- Configuration templates without secrets.

Keep backups access-controlled and separate from the live document root. Test restoring to a separate database or staging folder before relying on backups.

## 18.5 Maintenance routine

Monthly or after each significant release:

- Review failed submissions and web logs.
- Check PHP/database versions and security updates.
- Audit catalogue searches that return no result.
- Compare predicted vehicle and actual operations outcome.
- Update item volume defaults only with a documented change.
- Verify backups and recovery procedure.
- Test the form and one representative small/medium/large inventory.

# 19. Risks, assumptions and open decisions

## 19.1 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Guessed item volumes | Wrong vehicle suggestion | Mark confidence; calibrate against real items and moves |
| Unverified truck dimensions | Unreliable recommendation | Keep profiles disabled until confirmed |
| Volume-only logic | Heavy/oversized items may not fit | Payload and dimension checks; manual-review warning |
| Bundle double-counting | Inflated estimate | Canonical bundle/component rules and regression tests |
| Spam or fake enquiries | Wasted sales effort | Validation, honeypot/rate limit and optional stronger anti-bot control |
| Direct exposure of config/phpMyAdmin | Credential/data compromise | Restrict access, production server configuration, unique DB credentials |
| Overpromising visual accuracy | Customer expectation mismatch | Make 2D visual illustrative and explain calculation limits |
| Catalogue too large to browse | Poor user experience | Search synonyms, subcategories, progressive browse and custom entry |
| Failed lead request loses data | Lost enquiry | Retain selections/form data and allow retry |

## 19.2 Assumptions

- The first release is a public, unauthenticated estimator.
- The initial catalogue is stored in JSON and version-controlled.
- Actual fleet measurements will be obtained before public launch.
- Contact details are collected only after the estimate is shown.
- The business can follow up on submitted enquiries manually at first.
- The result is a volume estimate, not an exact packing or quote engine.

## 19.3 Decisions still needed before production

1. Business brand/name, logo, primary colors and contact details.
2. Exact vehicle fleet profiles and which vehicle classes should appear.
3. Whether pickup/destination use city, PIN code, or both.
4. Whether moving date is optional or required.
5. Where leads should notify the sales team (database-only, email, WhatsApp workflow or CRM).
6. Final privacy/consent wording and data retention policy.
7. Whether to add common home-size presets (1 BHK, 2 BHK, 3 BHK) in addition to manual item selection.
8. Which catalogue items require specialist handling or should be flagged as restricted.

# 20. Glossary

- **Packed volume:** Estimated space occupied by one item in its packed/loading form, represented as a cubic-foot value or derived from packed dimensions.
- **Gross internal volume:** Internal cargo length × width × height before loading inefficiency is applied.
- **Usable volume:** Gross internal volume multiplied by the reviewed loading-efficiency factor.
- **Utilization:** Estimated inventory volume divided by usable vehicle volume.
- **Payload limit:** Maximum load mass permitted for the vehicle under its applicable specification; it must be verified, not inferred from volume.
- **Bundle:** A catalogue convenience selection representing multiple components.
- **Custom item:** User-entered goods not covered by a standard catalogue record.
- **Estimate version:** The identifier that records which catalogue and calculation rules produced a saved estimate.
- **Manual assessment:** A follow-up by the moving company when weight, dimensions, item handling or fleet data prevents a reliable automatic recommendation.

# 21. Official technical references

Use official documentation when implementing or maintaining the project. Links were checked while preparing this document; always consult the latest version before making production changes.

1. [Apache Friends — XAMPP for Windows FAQ](https://www.apachefriends.org/faq_windows) — installation, included services and security cautions.
2. [PHP Manual — PDO::prepare](https://www.php.net/manual/en/pdo.prepare.php) — prepared SQL statements and parameter binding.
3. [PHP Manual — Prepared statements](https://www.php.net/manual/en/pdo.prepared-statements.php) — benefits and safe use of prepared statements.
4. [Apache HTTP Server 2.4 — Access Control](https://httpd.apache.org/docs/2.4/howto/access.html) — access restrictions.
5. [Apache HTTP Server 2.4 — Configuration Sections](https://httpd.apache.org/docs/2.4/sections.html) — directory restrictions and `.htaccess` scope.
6. [MDN — SVG viewBox](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox) — coordinate system and responsive SVG behaviour.
7. [MDN — SVG animate](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/animate) — SVG animation support and reduced-motion considerations.

---

## Document control

**Owner:** Product / implementation team  
**Status:** Initial specification; item-volume and vehicle-capacity datasets require field validation.  
**Next review:** After catalogue and vehicle profile data are reviewed, before public launch.  
**Change control:** Update this document when the recommendation rules, lead data fields, database schema, or deployment model changes.
