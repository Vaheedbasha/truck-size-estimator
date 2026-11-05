# Truck Size Estimator — UI/UX Mockup Design Documentation

**Document type:** Product design brief and mockup specification  
**Product:** Indian Household Truck Size Estimator  
**Primary purpose:** Generate qualified household-shifting enquiries  
**Design target:** Responsive single-page web experience  
**Implementation target:** PHP, HTML, CSS, JavaScript and MySQL, developed locally with XAMPP  
**Status:** Design specification — ready for wireframing and visual mockup creation

---

## 1. Executive Summary

The Truck Size Estimator is a single-page tool for people planning a household move in India. Users select the furniture, appliances, cartons and other belongings they plan to move. The website updates an illustrative 2D truck cargo scene, estimates the load volume, recommends a suitable truck category or indicates when a larger or multiple-truck option may be needed, and then invites the user to request a shifting quote.

The mockup must communicate three things immediately:

1. **Easy to use:** visitors can find items, set quantities and correct their inventory without understanding logistics.
2. **Easy to understand:** the truck visual and capacity summary react to item selections and explain the estimate in plain language.
3. **Useful before lead capture:** visitors see an estimate and recommendation before being asked for their contact details.

This document specifies the look, layout, interactions, responsive behaviour, states and handoff requirements for the mockup. It is not a final fleet-capacity specification; item dimensions, vehicle capacities and loading assumptions must be validated separately before the tool is used for real operational decisions.

## 2. Product Decisions and Design Constraints

| Decision | Agreed direction |
|---|---|
| Audience | Indian household-shifting customers |
| Main business objective | Generate shifting leads |
| Product format | Single-page estimator |
| Main visual | Illustrated 2D truck that appears to fill as inventory grows |
| Vehicle choices | Small, medium and large vehicle categories; support multiple vehicles or manual assessment when required |
| Catalogue | Broad household inventory, including uncommon items and custom entries |
| Estimation precision | Practical volume estimate with visible caveats, not a certified loading simulation |
| Lead capture | After the visitor sees the estimate and recommendation |
| Local development | XAMPP on Windows |
| Technology boundary | Mockup should be feasible using PHP-rendered HTML, CSS, JavaScript, SVG and MySQL for enquiries |

### 2.1 Design goals

- Make the first useful action obvious: search for or browse household items.
- Keep selected items visible and editable.
- Give the truck visual a prominent but not overwhelming place in the interface.
- Make volume, capacity utilisation and recommendation readable at a glance.
- Avoid forcing visitors to register or provide contact details to calculate an estimate.
- Keep the experience usable on a small mobile screen, including one-handed quantity adjustments.
- Make caveats understandable: results are estimates and may change after an inventory review or survey.

### 2.2 Non-goals for the first mockup

- Exact three-dimensional packing or physics simulation.
- Booking, payment, route planning or instant guaranteed pricing.
- User accounts, saved inventories or a customer dashboard.
- Admin catalogue management.
- A fleet-specific recommendation until confirmed vehicle dimensions and payload limits are supplied.
- Collecting personal information before the visitor has received a useful result.

## 3. Users and Primary Scenario

### 3.1 Primary user

A person or family in India preparing to move from one home to another. They may know their large furniture and appliances but may not know truck sizes, cubic feet or loading efficiency. They may be using a mobile phone and may not want to count every small utensil or personal possession individually.

### 3.2 Primary scenario

1. Visitor opens the estimator.
2. Visitor sees the value proposition and a short instruction.
3. Visitor searches or browses a category such as Bedroom, Kitchen or Cartons.
4. Visitor adds an item, selects a variant and changes quantity.
5. The selected-items summary, estimated volume and truck illustration update immediately.
6. The capacity engine recommends a vehicle category or indicates that a larger/multiple-truck option needs review.
7. Visitor reviews the estimate and clicks **Get a shifting quote**.
8. A compact form asks for name, phone number, pickup and destination, and an optional move date.
9. On success, the visitor sees a clear confirmation and what happens next.

### 3.3 Secondary scenarios to represent in the mockup

- A visitor with a very small load.
- A visitor whose inventory is close to the displayed truck capacity.
- A visitor who exceeds a vehicle's estimated usable capacity.
- A visitor with oversized or fragile items that need manual confirmation.
- A visitor who cannot find an item and adds a custom item.
- A visitor who removes an item or reduces a quantity after seeing the result.
- A visitor who is not ready to submit a lead and continues editing the inventory.

## 4. Visual Direction

### 4.1 Design concept

**Practical, modern, friendly logistics.** The interface should feel like a useful planning tool rather than a generic corporate landing page. Use a calm neutral canvas, deep navy for structure and trust, and orange for action and load progress. The truck is the visual centrepiece. Item cards should be compact and scannable, with clear names, quantities and consistent illustrations.

The interface should avoid heavy gradients, excessive animations, glassmorphism, tiny labels and decorative elements that make the estimator harder to use.

### 4.2 Proposed colour tokens

These are starting design tokens. They can be adjusted to match the final business brand before high-fidelity design approval.

| Token | Colour | Intended use |
|---|---|---|
| Brand navy | `#172554` | Header, primary text, key outlines and selected states |
| Action orange | `#F59E0B` | Primary CTA, capacity fill and important interactive emphasis |
| Orange hover | `#D97706` | Hover/pressed state for orange actions |
| Page background | `#F5F7FB` | Main canvas behind white surfaces |
| Surface | `#FFFFFF` | Cards, panels, forms and popovers |
| Border | `#E2E8F0` | Dividers, inputs and card outlines |
| Primary text | `#172033` | Headings and body copy |
| Secondary text | `#64748B` | Descriptions, helper text and metadata |
| Success | `#15803D` | Successful actions and suitable-capacity status, paired with text/icon |
| Warning | `#B45309` | Near-capacity and manual-review warnings |
| Error | `#B91C1C` | Validation errors and submission failures |
| Selected tint | `#FFF7E6` | Selected cards and lightly highlighted areas |

Do not rely on colour alone to describe a state. Include a label, icon or message. Validate final colour contrast against WCAG guidance before sign-off.

### 4.3 Typography

- Use a clean sans-serif family such as **Inter**, **system-ui** or **Arial**.
- Page title: approximately 32–44 px on desktop and 28–34 px on mobile; weight 700–800.
- Section headings: 20–24 px; weight 650–750.
- Item names: 14–16 px; weight 600.
- Body text: 14–16 px with comfortable line height.
- Helper text: preferably at least 12–13 px, but critical instructions should be 14 px or larger.
- Numeric outputs such as volume should use tabular numerals where available.

### 4.4 Spacing, shape and elevation

Use a consistent 4 px base spacing scale: 4, 8, 12, 16, 24, 32 and 48 px. Cards should generally use 12–18 px corner radii. Use restrained shadows only for floating elements or a sticky summary; normal cards should primarily be distinguished by background and border. Maintain generous space around the main heading and avoid overly tall forms.

### 4.5 Icon and illustration style

- Use one consistent, simple line/solid icon family.
- Use a coherent set of household item illustrations; do not mix photographic item thumbnails with unrelated cartoon icons.
- Use SVG for the truck and key diagram elements.
- Prioritise recognisable silhouettes for sofa, bed, refrigerator, washing machine, wardrobe and cartons.
- For small or uncommon items, use category icons and text rather than sourcing hundreds of one-off images.

## 5. Information Architecture

Although the product is a single page, the mockup should show clear regions and interaction states.

1. Site header and brand identity.
2. Introductory hero with page title and short explanation.
3. Estimator workspace.
   - Search and category navigation.
   - Household item browser.
   - Selected inventory summary.
   - 2D truck visual.
   - Estimated volume, capacity status and recommendation.
4. Results explanation and estimate caveat.
5. Quote request form.
6. Success/confirmation state.
7. Footer with contact, privacy and service-related links.

The main estimator should not be broken into multiple page navigations. Category switching, item search, quantity editing, custom item entry and result updates should happen in place.

## 6. Desktop Mockup Specification

### 6.1 Desktop artboard

Create the primary desktop artboard at **1440 × 1000 px**. Also verify at 1280 × 800 px so the layout does not depend on a large monitor. Use a centred content area about 1200–1280 px wide with 24–32 px outer spacing.

### 6.2 Header

- Height: about 68–76 px.
- Left: logo/wordmark and optional small descriptor.
- Right: compact help link or contact action; do not make navigation compete with the estimator.
- Header may be sticky only if it does not reduce usable vertical space too much.
- Avoid multiple dropdowns or a full marketing navigation bar in the first version.

### 6.3 Hero

- Eyebrow: “HOUSEHOLD SHIFTING ESTIMATOR” or similar.
- H1: “Find the right truck for your household move.”
- Supporting text: “Select your furniture, appliances and cartons to estimate the space you need.”
- Optional compact trust note: “Free estimate · No sign-up required.” Use only if accurate.
- Keep hero concise so that the estimator is visible early on the first screen.

### 6.4 Main estimator grid

Use a two-column composition:

- **Left: catalogue panel**, approximately 58–62% of the available content width.
- **Right: truck and estimate panel**, approximately 38–42%.
- Gap: 20–24 px.
- The right panel may use `position: sticky` on desktop, provided it does not collide with the footer or obscure controls.

Recommended left panel hierarchy:

1. Search field with search icon and clear action.
2. Horizontal category chips or a compact category sidebar.
3. Visible item count or short helper text.
4. Grid of item cards (two or three columns depending on actual width).
5. Add custom item action.
6. Selected inventory list or a compact drawer/expandable summary.

Recommended right panel hierarchy:

1. Title: “Your estimated truck load”.
2. Truck illustration within a framed cargo area.
3. Capacity state label such as “Room available”, “Near estimated capacity” or “More capacity needed”.
4. Volume number and units, e.g. `210 ft³`.
5. Capacity progress bar with visible percentage and text equivalent.
6. Recommended vehicle name and concise reason.
7. Small estimate disclaimer.
8. Primary CTA: “Get a shifting quote”.

Do not fabricate a percentage or recommendation before the calculator has enough inventory or configured vehicle data. In an empty state, show an inviting instruction rather than a 0% capacity warning.

### 6.5 Selected inventory treatment

Each selected row should show:

- Item name and variant.
- Quantity control with minus, numeric quantity and plus.
- Optional volume contribution in expanded/details mode.
- Remove action with an accessible label.

Keep the most important actions easy to reach. Do not make users open a modal for every quantity change. When many items are selected, show a concise summary with an “Edit selected items” affordance.

## 7. Mobile Mockup Specification

### 7.1 Mobile artboard

Create a mobile artboard at **390 × 844 px** and verify at **360 × 800 px**. The page must work at narrower widths without horizontal scrolling.

### 7.2 Mobile order

1. Compact header with wordmark and optional help action.
2. Short hero heading and one-sentence instruction.
3. Compact truck preview and live volume/recommendation summary.
4. Search bar.
5. Horizontally scrollable category chips with clear selected state.
6. Single-column item cards or compact rows.
7. Selected-items summary, expandable when long.
8. Recommendation and lead CTA when sufficient inventory is selected.

A compact sticky summary may sit at the bottom of the screen, showing selected item count, estimated volume and an expand/edit action. It must not obscure item controls, validation messages or browser UI. Leave enough bottom padding for the sticky element and keyboard.

### 7.3 Mobile interaction details

- Touch targets should be approximately 44 × 44 px or larger.
- Quantity controls must not be too close together.
- Search, category changes and card selection should preserve scroll position where practical.
- Prefer expanding a compact summary to opening many nested modal dialogs.
- On-screen keyboard behaviour must be considered for search and custom item fields.
- Reduce non-essential truck animation when `prefers-reduced-motion` is enabled.

## 8. Household Catalogue Mockup

The design should demonstrate breadth without making users scan a huge unstructured list. Include search, categories, item variants and custom entry.

### 8.1 Suggested categories

1. Living room furniture.
2. Bedroom furniture.
3. Dining room furniture.
4. Kitchen appliances.
5. Kitchen utensils and small appliances.
6. Cartons, luggage and packed goods.
7. Clothes, linen, books and personal belongings.
8. Utility, laundry and cleaning equipment.
9. Electronics and home office.
10. Study room furniture.
11. Children and baby items.
12. Prayer/pooja items.
13. Bathroom items.
14. Balcony and garden.
15. Fitness and sports equipment.
16. Musical instruments and hobbies.
17. Fragile, bulky and special items.
18. Dismantled furniture and loose components.
19. Other/custom items.

### 8.2 Item card anatomy

- Illustration or icon at top/left.
- Item name (plain Indian English; add local synonym search terms in data rather than cluttering the interface).
- Optional dimension/variant selector for items with materially different sizes.
- Add button or quantity stepper.
- Selected state that is obvious without colour alone.
- Optional “Details” link for unusually large, fragile or multi-component items.

### 8.3 Variant examples

- Refrigerator: single-door, double-door, side-by-side.
- Bed: single, double, queen, king; frame and mattress may be separate.
- Sofa: 1-, 2-, 3-seater, L-shaped, sofa-cum-bed.
- Carton: small, medium, large, extra-large, wardrobe or fragile-item carton.
- Dining table: 2-, 4-, 6-, 8-seater.
- Wardrobe: compact, standard, large; assembled or dismantled.

A “bundle” option can speed entry, but bundle components must not be counted twice if users also select the same items individually.

### 8.4 Search behaviour

- Search by common name and reasonable synonyms (e.g. fridge/refrigerator, almirah/wardrobe, cooler/air cooler).
- Search results should show category context where useful.
- Provide a clear no-results state with the prompt “Can’t find it? Add a custom item.”
- Search must not require exact spelling or use of technical terminology.

### 8.5 Custom item flow

The custom-item interface should request:

- Item name (required).
- Quantity (required; default 1).
- Approximate size: Small / Medium / Large, or optional length, width and height.
- Optional fragile/oversized flag.
- Short clarification only when necessary.

Show a label that custom-item volume is approximate when exact dimensions are not supplied. Avoid pretending unknown dimensions are measured values.

## 9. Truck Visualizer Design

### 9.1 Main visual composition

Create a distinctive, side-view 2D cargo truck with a clearly bounded cargo box and visible cab/wheels. The cargo area should be the primary visual region. The open/transparent side should allow furniture and cartons to appear inside the truck.

The visual must work at desktop and mobile sizes; it should be SVG or another scalable vector asset where possible.

### 9.2 Fill metaphor

The truck has two complementary signals:

- **Illustrative load:** representative item shapes appear inside the cargo bay.
- **Quantitative load:** a progress indicator communicates estimated capacity utilisation.

The illustration is explanatory, not a literal packing solution. Do not claim that an arrangement is physically proven or that all item dimensions have been checked unless the algorithm actually supports that claim.

### 9.3 Visual states

| State | Illustration | Message | Recommended action |
|---|---|---|---|
| Empty | Empty cargo area; neutral treatment | “Add items to estimate your load.” | Browse/search items |
| Low/comfortable load | Some representative objects in cargo area | “There appears to be room available.” | Continue adding items |
| Near capacity | Cargo appears fuller; warning text/icon | “Your selected items are nearing this vehicle’s estimated capacity.” | Review inventory or compare next size |
| Exceeds one vehicle | Overflow/second vehicle cue; avoid chaotic visual | “A larger or multiple-truck option may be needed.” | Show alternative and/or manual review |
| Oversized/special item | Special badge or discreet alert | “This item may require a manual loading check.” | Include it in quote request |
| Calculation unavailable | Neutral placeholder and clear message | “We couldn’t calculate this item yet.” | Edit item or request manual estimate |

### 9.4 Loading animation

- Update the visual after item add/remove/quantity changes.
- Use a short, restrained transition (roughly 150–300 ms as a design target).
- Avoid items moving randomly or making the whole truck shake.
- Use deterministic positioning so the illustration does not rearrange dramatically on every interaction.
- Keep the capacity bar and displayed volume as the authoritative UI values.
- Support reduced-motion preferences.

### 9.5 Truck category comparison

When the chosen inventory exceeds one profile's estimated capacity, show a concise comparison such as “Recommended option: Medium truck” with the reason (“more usable cargo space for this estimated load”). If multiple trucks are suggested, make clear this is an estimate and may require confirmation. Avoid displaying precise vehicle specifications that have not been verified.

## 10. Results and Recommendation Panel

### 10.1 Required information

- Estimated inventory volume in cubic feet.
- Percentage of the selected vehicle's configured usable capacity, when available.
- Recommended truck category or a clear manual-review state.
- Why it was recommended in plain language.
- Important caveat covering approximate item volume, packing inefficiency and actual vehicle fit.
- Main CTA to request a quote.

### 10.2 Message examples

**Empty:** “Your estimate will appear here as you add household items.”

**Usable estimate:** “Based on the selected items, this vehicle category appears suitable by estimated volume. Final space and payload should be confirmed with the mover.”

**Over capacity:** “Your selected items exceed this vehicle’s estimated usable space. Try a larger vehicle or request a review for multiple trucks.”

**Special item:** “One or more items may need special handling or a dimension check before confirming the vehicle.”

Avoid claims such as “guaranteed to fit”, guaranteed price or exact loading success.

## 11. Lead Capture and Confirmation Mockups

### 11.1 When the form appears

The form appears after the user has seen the estimate and clicked **Get a shifting quote**. It may be an inline card or a modal on desktop, but the mockup should prioritise mobile accessibility. If a modal is used, it must have a clear title, close control, focus management and an understandable way to return to the estimate.

### 11.2 Fields

Required fields:

- Full name.
- Mobile number.
- Pickup city or PIN code.
- Destination city or PIN code.

Optional field:

- Preferred moving date.

The selected inventory, estimated volume and recommended vehicle should be attached automatically; never ask the user to re-enter that data. If the business needs consent wording for follow-up, show a concise privacy explanation near the submit action and finalise the exact wording before release.

### 11.3 Form states

- Default.
- Focused field.
- Required-field validation.
- Invalid mobile number.
- Submission in progress.
- Server/network error with retry option.
- Success confirmation.

Inline errors should explain how to fix the issue and should not push other controls off-screen in a disorienting way. Preserve entered values if submission fails.

### 11.4 Success state

Show a clear confirmation such as **“Your quote request has been received.”** Explain the expected next step without promising a response time unless the business can guarantee it. Offer a return-to-estimate action. The design may include a click-to-call or WhatsApp option only if the business provides a verified number and wants to support it.

## 12. Component Inventory for the Design File

Create reusable components or component frames with the following variants:

- Header: desktop / mobile.
- Primary, secondary and text button: default / hover / pressed / disabled / loading.
- Search input: empty / focused / with query / no results.
- Category chip: default / selected / hover / focus.
- Item card: default / hover / selected / disabled / special-handling.
- Quantity stepper: minimum / normal / maximum / keyboard focus.
- Custom-item form: default / validation / saved.
- Selected item row: default / editing / removed feedback.
- Truck panel: empty / comfortable / near capacity / over capacity / calculation issue.
- Capacity bar: empty / partial / near limit / over limit, each with text and icon.
- Recommendation card: single vehicle / larger vehicle / multiple truck review / manual assessment.
- Form field: default / focus / error / disabled.
- Lead form: idle / submitting / failure / success.
- Toast or inline alert: success / warning / error / info.
- Modal/drawer: open / closed / keyboard focus state, only if used.

Design interaction states, not just attractive static screens. Every selected, warning, validation or loading state should be visible in the handoff file.

## 13. Interaction Specifications

| Action | Expected response |
|---|---|
| Search for an item | Filter relevant results; retain the current inventory |
| Change category | Show items in the selected category and preserve current selections |
| Add item | Add default variant and quantity; update selected summary, volume and truck visual |
| Increase/decrease quantity | Recalculate without page reload; enforce minimum 0/1 rules appropriately |
| Remove item | Update summary, calculated load, capacity state and illustration |
| Select variant | Update the item's estimate and its display label |
| Add custom item | Add it to inventory with an approximate-volume label when needed |
| Load nears capacity | Show non-colour-only warning and a helpful next action |
| Vehicle capacity exceeded | Recommend larger profile or manual/multiple-truck review, if supported by data |
| Get quote | Open or reveal the quote form, retaining inventory state |
| Submit valid form | Show progress; on server success show confirmation |
| Submit invalid form | Mark fields and explain corrections without clearing valid values |
| Submission fails | Show retry option and preserve entered details |
| Clear/reset inventory | Ask for confirmation if a large selection would be removed; then restore empty state |

## 14. Accessibility and Inclusive Design

- Maintain logical heading hierarchy and readable text.
- Ensure each input has a persistent programmatic label, not only placeholder text.
- Make all controls operable by keyboard, with visible focus outlines.
- Ensure icon-only controls have accessible names.
- Do not rely on colour alone for selected, capacity or validation states.
- Provide text equivalents for capacity bar and truck state.
- Announce meaningful updates using a restrained live region; avoid announcing every tiny decorative animation.
- Ensure the modal/drawer, if used, manages focus and Escape behaviour appropriately.
- Respect reduced-motion settings.
- Use descriptive alt text for meaningful illustrations; mark purely decorative graphics as decorative.
- Test at 200% browser zoom and on narrow mobile widths.
- Check colour contrast for text, icons and controls before handoff.

## 15. Content and Microcopy Principles

Use simple, friendly Indian English. Prefer words people use at home (“fridge”, “almirah”, “carton”, “water cooler”) as search synonyms while keeping canonical item names consistent. Don't overwhelm users with technical terms like volumetric efficiency or payload limit. If those concepts influence the recommendation, explain them in plain language.

### Recommended CTA hierarchy

- Primary: **Get a shifting quote**.
- Secondary: **Add custom item**.
- Supporting: **Edit selected items**, **Compare truck options**, **Start over**.

### Avoid

- “Guaranteed truck fit.”
- “Exact truck size” where only an estimate is possible.
- Fake countdown timers or urgency.
- Unsupported claims about price, availability, arrival times or vehicle specifications.
- Contact gating before the estimator result is shown.

## 16. Mockup Deliverables

The design work is complete when the following handoff items exist:

1. **Low-fidelity wireframes** for desktop and mobile.
2. **High-fidelity desktop screen** showing the primary empty/starting state and active estimator.
3. **High-fidelity mobile screen** showing compact truck preview, search, categories and item selection.
4. **Result states**: comfortable capacity, near capacity and over capacity/multiple-truck review.
5. **Quote form states**: default, validation error, submission progress, server error and success.
6. **Component library** with named variants for cards, buttons, quantity controls, fields, alerts and truck panel.
7. **Clickable prototype** demonstrating add item, change quantity, switch categories, see truck update, exceed capacity and open/submit the quote form with dummy data.
8. **Design tokens** for colour, typography, spacing, radii, borders and shadows.
9. **Asset inventory** listing truck SVG, item illustrations, icons, and licences/source as applicable.
10. **Handoff notes** describing responsive rules, UI state behaviour, copy, edge cases and questions that need product confirmation.

Suggested design file pages:

- `00 — Cover & Design Principles`
- `01 — Foundations & Tokens`
- `02 — Components`
- `03 — Desktop Wireframes`
- `04 — Mobile Wireframes`
- `05 — High-Fidelity Screens`
- `06 — Interactive States`
- `07 — Clickable Prototype`
- `08 — Handoff & Open Questions`

## 17. Suggested Wireframe Layouts

### 17.1 Desktop wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│ BRAND / LOGO                                  HELP / CONTACT        │
├────────────────────────────────────────────────────────────────────┤
│ HOUSEHOLD SHIFTING ESTIMATOR                                       │
│ Find the right truck for your household move.                       │
│ Select your items to estimate the space you need.                   │
├─────────────────────────────────────┬──────────────────────────────┤
│ SEARCH HOUSEHOLD ITEMS              │ YOUR ESTIMATED TRUCK LOAD    │
│ [ Search furniture, appliances... ] │                              │
│ [Living] [Bedroom] [Kitchen] [...] │       2D TRUCK SVG           │
│                                     │                              │
│ [Item card] [Item card] [Item card] │ Estimated volume: 210 ft³   │
│ [Item card] [Item card] [Item card] │ [ Capacity progress bar ]   │
│                                     │ Recommended: vehicle class   │
│ SELECTED ITEMS / QUANTITIES         │ Brief reason + caveat        │
│ [Sofa  − 1 +] [Remove]              │ [ GET A SHIFTING QUOTE ]     │
│ [ADD CUSTOM ITEM]                   │                              │
├─────────────────────────────────────┴──────────────────────────────┤
│ FOOTER: privacy / contact / service information                    │
└────────────────────────────────────────────────────────────────────┘
```

All values and the example recommendation in the wireframe are placeholders. Final mockups must clearly label placeholder data internally and use configured test fixtures in the clickable prototype.

### 17.2 Mobile wireframe

```text
┌──────────────────────────────┐
│ BRAND                  HELP  │
├──────────────────────────────┤
│ Find the right truck for     │
│ your household move.         │
│ Select items to begin.       │
├──────────────────────────────┤
│ [Compact 2D truck preview]   │
│ 120 ft³ · Estimate           │
│ [View selected items]        │
├──────────────────────────────┤
│ [ Search household items ]   │
│ [Living] [Bedroom] [Kitchen] │
│                              │
│ [Icon] Sofa                  │
│        [ − ] 1 [ + ]         │
│                              │
│ [Icon] Refrigerator          │
│        [ + Add ]             │
│                              │
│ [Add custom item]            │
├──────────────────────────────┤
│ STICKY SUMMARY (when useful) │
│ 4 items · 120 ft³  [Review]  │
└──────────────────────────────┘
```

The mobile sticky summary is optional and should only be used if it improves orientation without blocking catalogue controls or keyboard interaction.

## 18. Prototype Interaction Scope

The clickable prototype does not need a real database or final lead integration. It should use dummy data and demonstrate the experience faithfully.

Minimum prototype flows:

1. **Browse and select:** search for sofa, add it, change quantity and see the summary change.
2. **Categories:** switch from Living Room to Kitchen without losing selected items.
3. **Visual truck:** show items and progress updating in a stable, understandable way.
4. **Capacity transition:** add enough sample items to change from comfortable to near-capacity and over-capacity states.
5. **Custom item:** add an item with a chosen size preset and see the estimate update.
6. **Lead capture:** open the quote form after the result, trigger validation, then show a mock success message.
7. **Mobile:** repeat the core flow at mobile viewport size.

If building the prototype in Figma, interactions can be simulated with predefined states. If building a browser-based mockup, simple local JavaScript fixture data is sufficient. Real database work belongs to implementation, not the mockup approval stage.

## 19. Design Acceptance Checklist

### Visual quality

- [ ] Clear hierarchy: title, catalogue, truck, volume, recommendation, quote CTA.
- [ ] Truck illustration is recognisable and visually prominent without dominating the catalogue.
- [ ] Item cards share one illustration style and consistent spacing.
- [ ] Colours, typography, buttons, fields and radii use documented tokens.
- [ ] No placeholder text, fake ratings, fake testimonials or unsupported claims are visible in the final design.

### Interaction clarity

- [ ] Search and category navigation are obvious.
- [ ] Add, remove, quantity and variant controls communicate state.
- [ ] Selected inventory can be reviewed and edited.
- [ ] Capacity has both a progress visual and a text label.
- [ ] Recommendation explains why it was selected.
- [ ] Special or oversized items trigger appropriate review guidance.
- [ ] Estimate is visible before the quote form is requested.
- [ ] Lead form has error, loading, failure and success states.

### Responsive design

- [ ] Desktop approved at 1440 px and checked at 1280 px.
- [ ] Mobile approved at 390 px and checked at 360 px.
- [ ] No horizontal overflow at specified widths.
- [ ] Sticky summary does not block controls or the virtual keyboard.
- [ ] The truck and its labels remain legible at mobile size.

### Accessibility and handoff

- [ ] Keyboard and visible focus states are designed.
- [ ] Text and controls have adequate contrast.
- [ ] Status is not communicated by colour alone.
- [ ] Reduced-motion behaviour is considered.
- [ ] Components have named variants and dimensions.
- [ ] Assets and design tokens are named and ready for developer handoff.
- [ ] All estimates and truck specifications used in mockups are marked as illustrative until validated.

## 20. Design-to-Development Handoff for XAMPP

After approving the mockup, implement the design using the existing project approach:

- PHP page shell in `index.php`.
- CSS tokens and component styles in `assets/css/style.css`.
- Client-side interactions in `assets/js/`.
- Truck SVG and item illustrations in `assets/images/` or inline SVG where practical.
- Household catalogue and vehicle profiles in JSON for the initial version.
- PHP endpoint and MySQL for lead capture.

The mockup should not require Astro, React, Node.js or a separate web server. The target implementation is a PHP/HTML/CSS/JavaScript site served through local XAMPP Apache.

Implementation should preserve approved layouts and interaction behaviour while ensuring the real calculation engine, catalogue values, form validation and vehicle profiles are separately tested. The visual fill metaphor must not be treated as proof that items physically fit.

## 21. Design Prompt for a Designer or AI Design Tool

Use the following brief as the single source of design direction:

> Design a modern, mobile-first single-page website mockup for an Indian household truck size estimator used by a packers-and-movers business to generate shifting enquiries. The visitor must be able to browse/search a broad household inventory, choose item variants and quantities, add custom items, and watch a clear 2D side-cutaway moving truck fill as the inventory changes. Show estimated volume, capacity utilisation and a transparent vehicle recommendation with a caveat that it is an estimate. Reveal the quote form only after the visitor sees the result. Use a calm neutral background, deep navy structure, orange action/progress accents, accessible type sizes and consistent household illustrations. Prioritise clarity, fast scanning, large touch targets, desktop two-column layout and a mobile stacked layout with a compact truck summary. Include empty, comfortable-capacity, near-capacity, over-capacity, custom-item, validation, loading, error and success states. Do not invent exact truck specifications, guaranteed fit claims, prices or testimonials. Deliver desktop and mobile high-fidelity screens, reusable component variants, design tokens and a clickable prototype that demonstrates the core estimator flow.

## 22. Open Questions to Resolve Before Final Visual Approval

These questions do not block the first wireframe but should be resolved before production handoff:

1. What business name, logo and verified contact details should appear in the header and footer?
2. Is there an existing brand guide, or should the proposed navy/orange palette become the base direction?
3. Which actual vehicle categories are available to the moving business, and have their internal cargo dimensions and payload limits been collected?
4. Will the quote form ask for moving date and service type, or should it stay minimal?
5. Should the lead success state offer WhatsApp, click-to-call, or only an on-page confirmation?
6. Should item illustrations be custom SVGs, a licensed icon set, or a consistent sourced illustration pack?
7. Should the prototype use a sidebar category list on large desktop or category chips across all layouts?

## 23. Final Design Recommendation

Start with low-fidelity wireframes for desktop and mobile, confirm the main hierarchy and user flow, then create high-fidelity screens and interactive states. Do not begin by drawing every household item or polishing the truck art before validating the layout.

The order of priority is:

1. Clear catalogue-to-truck layout.
2. Item search, variants and quantity controls.
3. Volume and capacity communication.
4. Recommendation and caveat.
5. Quote form and success/error states.
6. Visual polish, illustration refinement and responsive details.

The mockup is approved when a first-time visitor can understand what to do, add several items, interpret the estimate, see what happens when capacity is exceeded and request a quote without needing assistance.

---

**Document owner:** Product / Design  
**Companion document:** Truck Size Estimator — Complete Product and Technical Documentation  
**Implementation environment:** Windows + XAMPP  
**Next milestone:** Wireframe review, followed by high-fidelity mockup and clickable prototype
