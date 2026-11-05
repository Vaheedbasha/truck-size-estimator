  <section id="estimator" class="estimator" aria-label="Estimator">
    <div class="container">

    <!-- ============ STEP 1: home size (the first thing visitors see) ============ -->
    <section class="panel step-panel" id="size-step" aria-labelledby="size-title">
      <p class="step-label">Step 1 of 2</p>
      <h2 id="size-title">First, choose your home size</h2>
      <p class="step-help" id="size-help">Tap your home size to start. We&rsquo;ll use it as a starting point; you can add or remove items next.</p>
      <fieldset class="size-grid" id="size-grid" aria-describedby="size-help">
        <legend class="sr-only">Home size</legend>
      </fieldset>
      <p class="step-status" id="size-status" role="status" aria-live="polite">Tap a home size to open your item list.</p>
    </section>

    <!-- ============ STEP 2: categories (30%) + items (70%) ============ -->
    <section class="workspace" id="est-grid" aria-label="Choose your household items" hidden>
     <div class="ws-layout">
      <div class="ws-main">
      <div class="ws-top">
        <div class="home-chip">
          <svg class="ui-icon" aria-hidden="true"><use href="#i-home"/></svg>
          <span class="home-chip-text"><span class="muted">Home size</span> <strong id="home-size-label">&ndash;</strong></span>
          <button type="button" class="btn btn-text btn-sm" id="size-change">Change</button>
        </div>
        <div class="search-field">
          <label class="sr-only" for="search-input">Search household items</label>
          <div class="search-box">
            <svg class="ui-icon search-icon" aria-hidden="true"><use href="#i-search"/></svg>
            <input id="search-input" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false"
                   placeholder="Search: fridge, almirah, sofa, cooler, LPG..." aria-describedby="result-count">
            <button type="button" id="search-clear" class="icon-btn search-clear" aria-label="Clear search" hidden>
              <svg class="ui-icon" aria-hidden="true"><use href="#i-x"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="ws-grid">
        <!-- categories: a vertical 30% rail on phones and tablets, wrapped tabs above the items on desktop -->
        <nav class="cat-panel" id="cat-panel" aria-label="Item categories">
          <h2 class="cat-panel-title">Categories</h2>
          <!-- desktop (1024px and wider): one dropdown; phones and tablets: the vertical rail below -->
          <div class="cat-select-wrap"><label for="cat-select">Category</label><select id="cat-select"></select></div>
          <ul class="cat-list" id="cat-list"></ul>
        </nav>

        <!-- items: right column (70%) -->
        <section class="items-panel" id="catalogue" aria-labelledby="items-title">
          <div class="items-head">
            <h2 id="items-title">Living Room</h2>
            <p class="result-count" id="result-count" role="status" aria-live="polite"></p>
          </div>
          <p class="cat-note" id="category-note" hidden></p>

          <div class="item-grid" id="item-grid"></div>

          <div class="no-results" id="no-results" hidden>
            <svg class="ui-icon" aria-hidden="true"><use href="#i-search"/></svg>
            <p><strong id="no-results-title">No matching items found.</strong><br><span id="no-results-text">Can&rsquo;t find it? Add a custom item.</span></p>
            <div class="no-results-actions"><button type="button" class="btn btn-secondary" id="no-results-all" hidden>Search all categories</button>
            <button type="button" class="btn btn-secondary" id="no-results-add"><svg class="ui-icon" aria-hidden="true"><use href="#i-plus"/></svg>Add a custom item</button></div>
          </div>

          <div class="custom-cta">
            <div>
              <strong>Item not in the list?</strong>
              <span class="muted">Add it yourself with an approximate size.</span>
            </div>
            <button type="button" class="btn btn-secondary" id="custom-open"><svg class="ui-icon" aria-hidden="true"><use href="#i-plus"/></svg>Add custom item</button>
          </div>
        </section>
      </div>
      </div>
      <!-- desktop (1024px and wider): the live 3D truck panel lives here; the same viewer opens as a full-screen dialog on smaller screens -->
      <aside class="ws-dock" id="v3-dock" aria-label="Live 3D truck preview"></aside>
     </div>
    </section>
    </div>
  </section>
