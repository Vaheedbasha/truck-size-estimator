<!-- ============ Persistent bottom action bar ============ -->
<div class="action-bar" id="action-bar" role="region" aria-label="Estimate and actions" hidden>
  <div class="ab-inner">
    <button type="button" class="ab-summary" id="ab-summary" aria-haspopup="dialog" aria-controls="review-dialog">
      <span class="ab-ico" aria-hidden="true"><svg class="ui-icon"><use href="#i-truck"/></svg></span>
      <span class="ab-text">
        <span class="ab-label">Estimated truck size</span>
        <strong id="ab-vehicle">Add items to begin</strong>
        <span class="ab-sub" id="ab-sub">Tap to review your list</span>
      </span>
      <svg class="ui-icon ab-chev" aria-hidden="true"><use href="#i-chevron-up"/></svg>
    </button>
    <div class="ab-actions">
      <button type="button" class="btn btn-secondary ab-edit" id="edit-btn" aria-haspopup="dialog" aria-controls="review-dialog" aria-label="Edit inventory" title="Edit inventory" disabled><svg class="ui-icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
      <button type="button" class="btn btn-secondary" id="view3d-btn" aria-haspopup="dialog" aria-controls="viewer-dialog" disabled><svg class="ui-icon" aria-hidden="true"><use href="#i-cube"/></svg>View in 3D</button>
      <button type="button" class="btn btn-primary" id="quote-btn" disabled><svg class="ui-icon" aria-hidden="true"><use href="#i-send"/></svg>Get Quote</button>
    </div>
  </div>
</div>

<!-- Toast + screen-reader announcer -->
<div class="toast" id="toast" popover="manual" role="status" hidden>
  <span id="toast-text"></span>
  <button type="button" class="toast-btn" id="toast-action" hidden></button>
  <button type="button" class="toast-close" id="toast-close" aria-label="Dismiss message"><svg class="ui-icon" aria-hidden="true"><use href="#i-x"/></svg></button>
</div>
<div class="sr-only" id="sr-live" role="status" aria-live="polite" aria-atomic="true"></div>

<!-- ============ Review sheet: estimate details + selected items ============ -->
<dialog id="review-dialog" class="dialog dialog-sheet" aria-labelledby="review-title">
  <div class="dlg-inner">
    <div class="dlg-head">
      <h2 id="review-title">Your estimate</h2>
      <button type="button" class="icon-btn" data-close aria-label="Close your estimate"><svg class="ui-icon" aria-hidden="true"><use href="#i-x"/></svg></button>
    </div>
    <div class="sheet-stack">
      <div class="vehicle-pick" id="vehicle-pick" role="group" aria-label="Compare vehicle sizes"></div>

      <div class="status" id="status" data-state="empty">
        <svg class="ui-icon status-icon" aria-hidden="true"><use id="status-use" href="#i-info"/></svg>
        <div>
          <strong id="status-title">Ready when you are</strong>
          <p id="status-text">Your estimate will appear here as you add household items.</p>
        </div>
      </div>

      <div class="metrics">
        <div class="metric">
          <span class="metric-label">Estimated volume</span>
          <span class="metric-value"><span id="m-volume">&ndash;</span><span class="metric-unit" id="m-volume-unit"> ft&sup3;</span></span>
          <span class="metric-sub" id="m-volume-sub">illustrative</span>
        </div>
        <div class="metric">
          <span class="metric-label">Capacity used</span>
          <span class="metric-value"><span id="m-percent">&ndash;</span><span class="metric-unit" id="m-percent-unit"></span></span>
          <span class="metric-sub" id="m-percent-sub">of selected vehicle</span>
        </div>
      </div>
      <div class="meter" id="meter" role="meter" aria-label="Estimated capacity used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="No estimate yet" data-state="empty">
        <div class="meter-track"><div class="meter-fill" id="meter-fill"></div><span class="meter-mark" style="left:80%" aria-hidden="true"></span></div>
        <div class="meter-scale" aria-hidden="true"><span>0%</span><span>80%</span><span>100%</span></div>
      </div>

      <div class="reco" id="reco">
        <svg class="ui-icon" aria-hidden="true"><use href="#i-truck"/></svg>
        <div>
          <span class="reco-label">Estimated truck size</span>
          <strong id="reco-name">Not available yet</strong>
          <p id="reco-reason">Add items to see which vehicle size looks suitable.</p>
        </div>
      </div>

      <p class="reco-flags" id="reco-flags"><span class="tag tag-info"><svg class="ui-icon" aria-hidden="true"><use href="#i-info"/></svg>Fit not validated</span> <span class="tag tag-warn"><svg class="ui-icon" aria-hidden="true"><use href="#i-scale"/></svg>Payload not checked</span></p>

      <section class="checks" aria-labelledby="checks-title">
        <h3 id="checks-title">What this estimate checks</h3>
        <dl class="check-rows">
          <div><dt>Volume</dt><dd id="chk-volume">&ndash;</dd></div>
          <div><dt>Payload (weight)</dt><dd>Not checked. Confirm it with the transport provider.</dd></div>
          <div><dt>Placement</dt><dd id="chk-fit">Not checked yet</dd></div>
          <div><dt>Confidence</dt><dd id="chk-confidence">Approximate: item sizes are packed-size estimates and vehicle sizes are class-typical.</dd></div>
        </dl>
      </section>

      <div class="notices" id="notices"></div>

      <section class="selected" id="selected" aria-labelledby="sel-title" tabindex="-1">
        <div class="sel-head">
          <h3 id="sel-title">Selected items <span class="count-badge" id="sel-count" aria-label="0 items">0</span></h3>
          <button type="button" class="btn btn-text btn-danger-text" id="sel-clear" disabled><svg class="ui-icon" aria-hidden="true"><use href="#i-trash"/></svg>Start over</button>
        </div>
        <p class="empty-note" id="sel-empty">Nothing selected yet. Items you add will appear here so you can check and edit them.</p>
        <ul class="sel-list" id="sel-list"></ul>
        <p class="sel-total" id="sel-total" hidden></p>
      </section>

      <p class="disclaimer-short"><strong>Illustrative estimate only.</strong> Item sizes are approximate packed sizes and vehicle sizes are class-typical, not verified specifications. Weight has not been checked. Not a quote or a guarantee of fit.</p>

      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" id="rv-edit"><svg class="ui-icon" aria-hidden="true"><use href="#i-list"/></svg>Edit inventory</button>
        <button type="button" class="btn btn-secondary" id="rv-3d" disabled><svg class="ui-icon" aria-hidden="true"><use href="#i-cube"/></svg>View 3D preview</button>
        <button type="button" class="btn btn-primary" id="rv-quote" disabled><svg class="ui-icon" aria-hidden="true"><use href="#i-send"/></svg>Request my quote</button>
      </div>

      <details class="demo-tools">
        <summary>Prototype tools: load a demo inventory <svg class="ui-icon chev" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary>
        <p class="muted small">These shortcuts replace your current list with sample items so every state can be reviewed quickly.</p>
        <div class="demo-buttons" id="demo-buttons"></div>
      </details>
    </div>
  </div>
</dialog>

<!-- ============ "More options" popup for an item card ============ -->
<dialog id="more-dialog" class="dialog dialog-xs" aria-labelledby="more-title">
  <div class="dlg-inner">
    <div class="dlg-head">
      <h2 id="more-title">Item details</h2>
      <button type="button" class="icon-btn" data-close aria-label="Close item details"><svg class="ui-icon" aria-hidden="true"><use href="#i-x"/></svg></button>
    </div>
    <div class="more-body" id="more-body"></div>
  </div>
</dialog>

<!-- ============ 3D truck modal ============ -->
<dialog id="viewer-dialog" class="dialog dialog-3d" aria-labelledby="v3-title" aria-describedby="v3-sub">
  <div class="v3-slot" id="v3-slot">
  <div class="v3-shell" id="v3-shell">
    <header class="v3-head">
      <div class="v3-head-text">
        <h2 id="v3-title">3D truck preview</h2>
        <p id="v3-sub">A visual planning preview of your load, not proof that everything fits in real life.</p>
      </div>
      <button type="button" class="btn btn-secondary btn-sm v3-close" data-close id="v3-close"><svg class="ui-icon" aria-hidden="true"><use href="#i-x"/></svg>Close</button>
    </header>
    <div class="v3-pick-slot" id="v3-pick-slot"></div>
    <div class="v3-body">
      <div class="v3-stage-wrap">
        <div class="truck-stage" id="truck-stage"></div>
        <p class="v3-status" id="v3-status" data-state="empty"><span id="v3-status-text">Empty truck</span></p>
        <button type="button" class="v3-expand" id="v3-expand" aria-label="Expand 3D view" title="Expand 3D view" aria-haspopup="dialog" aria-controls="viewer-dialog"><svg class="ui-icon" aria-hidden="true"><use href="#i-expand"/></svg></button>
        <div class="v3-fallback" id="v3-fallback" hidden role="alert">
          <strong>The 3D view could not start.</strong>
          <p id="v3-fallback-text">3D graphics are not available here. The estimate and the item list below are not affected.</p>
          <button type="button" class="btn btn-primary btn-sm" id="v3-retry"><svg class="ui-icon" aria-hidden="true"><use href="#i-retry"/></svg>Try again</button>
        </div>
        <div class="v3-controls" id="v3-controls" role="group" aria-label="3D view controls" hidden>
          <button type="button" class="vt-btn" data-act="rotate" aria-pressed="false" aria-label="Rotate" title="Rotate"><svg class="ui-icon" aria-hidden="true"><use href="#i-rotate"/></svg><span>Rotate</span></button>
          <button type="button" class="vt-btn vt-icon" data-act="zoom-in" aria-label="Zoom in"><svg class="ui-icon" aria-hidden="true"><use href="#i-plus"/></svg></button>
          <button type="button" class="vt-btn vt-icon" data-act="zoom-out" aria-label="Zoom out"><svg class="ui-icon" aria-hidden="true"><use href="#i-minus"/></svg></button>
          <button type="button" class="vt-btn" data-act="reset" aria-label="Reset view" title="Reset view"><svg class="ui-icon" aria-hidden="true"><use href="#i-undo"/></svg><span>Reset view</span></button>
        </div>
        <p class="v3-hint" id="v3-hint">Drag to turn the view. Pinch or scroll to zoom.</p>
      </div>
      <aside class="v3-info" id="v3-info" data-state="empty" aria-labelledby="v3-info-title">
        <div class="v3-est" id="v3-est">
          <span class="ab-ico" aria-hidden="true"><svg class="ui-icon"><use href="#i-truck"/></svg></span>
          <div class="v3-est-text"><span class="ab-label">Estimated truck size</span><strong id="v3-est-name">&ndash;</strong><span class="v3-est-sub" id="v3-est-sub"></span></div>
        </div>
        <p class="v3-est-why" id="v3-est-why"></p>
        <h3 id="v3-info-title">Estimated capacity</h3>
        <p class="v3-vehicle"><strong id="v3-vehicle">&ndash;</strong><span id="v3-vehicle-dims" class="muted small"></span></p>
        <div class="v3-meter" id="v3-meter" data-state="empty">
          <div class="meter-track"><div class="meter-fill" id="v3-meter-fill"></div><span class="meter-mark" style="left:80%" aria-hidden="true"></span></div>
          <p class="v3-meter-text" id="v3-meter-text">No items yet</p>
        </div>
        <div class="v3-plan" id="v3-plan" data-state="empty"><strong id="v3-plan-title">&ndash;</strong><p id="v3-plan-text"></p></div>
        <details class="v3-list">
          <summary>Items in this view <svg class="ui-icon chev" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary>
          <ul id="v3-items"></ul>
        </details>
        <p class="v3-note" id="v3-note">Vehicle sizes are class-typical, not verified specifications. Item sizes are approximate packed sizes.</p>
        <div class="v3-detail-slot" id="v3-detail-slot"></div>
        <div class="v3-actions-slot" id="v3-actions-slot"></div>
      </aside>
    </div>
  </div>
  </div>
</dialog>

<!-- ============ Quote dialog ============ -->
<dialog id="quote-dialog" class="dialog" aria-labelledby="quote-title">
  <div class="dlg-inner">
    <div class="dlg-head">
      <h2 id="quote-title">Get a quote for your move</h2>
      <button type="button" class="icon-btn" data-close aria-label="Close quote form"><svg class="ui-icon" aria-hidden="true"><use href="#i-x"/></svg></button>
    </div>
    <div class="proto-banner" role="note"><svg class="ui-icon" aria-hidden="true"><use href="#i-info"/></svg><span><strong>Prototype build.</strong> Your request is saved only in this website&rsquo;s server folder. Nobody is contacted automatically.</span></div>

    <div id="quote-view-form">
      <div class="attached" id="quote-attached"></div>

      <div class="alert alert-error" id="quote-error" role="alert" tabindex="-1" hidden>
        <svg class="ui-icon" aria-hidden="true"><use href="#i-stop"/></svg>
        <div>
          <strong>We couldn&rsquo;t send your request.</strong>
          <p id="quote-error-text">Your details and your selected items are still here, so nothing needs to be entered again.</p>
          <button type="button" class="btn btn-primary btn-sm" id="quote-retry"><svg class="ui-icon" aria-hidden="true"><use href="#i-retry"/></svg>Try again</button>
        </div>
      </div>
      <div class="alert alert-error" id="quote-summary-errors" role="alert" tabindex="-1" hidden></div>

      <form id="quote-form" novalidate autocomplete="on">
        <div class="field">
          <label for="q-name">Full name <span class="req">(required)</span></label>
          <input id="q-name" name="name" type="text" autocomplete="name" maxlength="80" aria-describedby="q-name-err" required>
          <p class="field-error" id="q-name-err" hidden></p>
        </div>
        <div class="field">
          <label for="q-phone">Mobile number <span class="req">(required)</span></label>
          <div class="input-affix"><span class="affix" aria-hidden="true">+91</span>
            <input id="q-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="18" placeholder="10-digit mobile number" aria-describedby="q-phone-hint q-phone-err" required>
          </div>
          <p class="hint" id="q-phone-hint">10 digits, starting with 6, 7, 8 or 9.</p>
          <p class="field-error" id="q-phone-err" hidden></p>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="q-pickup">Pickup city or PIN code <span class="req">(required)</span></label>
            <input id="q-pickup" name="pickup" type="text" autocomplete="off" maxlength="60" aria-describedby="q-pickup-err" required>
            <p class="field-error" id="q-pickup-err" hidden></p>
          </div>
          <div class="field">
            <label for="q-drop">Destination city or PIN code <span class="req">(required)</span></label>
            <input id="q-drop" name="destination" type="text" autocomplete="off" maxlength="60" aria-describedby="q-drop-err" required>
            <p class="field-error" id="q-drop-err" hidden></p>
          </div>
        </div>
        <div class="field">
          <label for="q-date">Preferred moving date <span class="opt">(optional)</span></label>
          <input id="q-date" name="movingDate" type="date" aria-describedby="q-date-err">
          <p class="field-error" id="q-date-err" hidden></p>
        </div>
        <div class="field">
          <label for="q-notes">Notes <span class="opt">(optional)</span></label>
          <textarea id="q-notes" name="notes" rows="3" maxlength="500" aria-describedby="q-notes-hint q-notes-err"></textarea>
          <p class="hint" id="q-notes-hint">For example floor numbers, lift access or items that need special care. Up to 500 characters.</p>
          <p class="field-error" id="q-notes-err" hidden></p>
        </div>
        <div class="hp-field" aria-hidden="true"><label for="q-website">Leave this empty</label><input id="q-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
        <div class="field check-field">
          <label class="check"><input id="q-consent" name="consent" type="checkbox" aria-describedby="q-consent-err"><span>I agree to be contacted about this quote request. <span class="req">(required)</span></span></label>
          <p class="hint">We use your name, mobile number, route and list only to prepare and follow up on this quote. A privacy policy will be linked here when it is published.</p>
          <p class="field-error" id="q-consent-err" hidden></p>
        </div>

        <fieldset class="proto-controls">
          <legend>Prototype control (for testing)</legend>
          <label class="check"><input id="q-simulate-fail" type="checkbox"><span>Show the &ldquo;could not send&rdquo; state on the next attempt (nothing is sent)</span></label>
        </fieldset>

        <div class="dlg-actions">
          <button type="button" class="btn btn-secondary" data-close>Back to estimate</button>
          <button type="submit" class="btn btn-primary" id="quote-submit"><svg class="ui-icon" aria-hidden="true"><use href="#i-send"/></svg><span>Request my quote</span></button>
        </div>
      </form>
    </div>

    <div id="quote-view-success" hidden>
      <div class="success-box" role="status">
        <svg class="ui-icon big" aria-hidden="true"><use href="#i-check-circle"/></svg>
        <h3 id="success-title" tabindex="-1">Your quote request has been received.</h3>
        <p>Thank you. We have saved your request with the items you selected. Keep the reference below if you contact us about it.</p>
        <p class="muted">Reference: <strong id="success-ref"></strong></p>
      </div>
      <div class="attached" id="success-summary"></div>
      <details class="sim-payload"><summary>View the data that was sent <svg class="ui-icon chev" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary><pre id="success-json"></pre></details>
      <div class="dlg-actions">
        <button type="button" class="btn btn-secondary" id="success-new">Start a new estimate</button>
        <button type="button" class="btn btn-primary" data-close>Back to estimate</button>
      </div>
    </div>
  </div>
</dialog>

<!-- ============ Custom item dialog ============ -->
<dialog id="custom-dialog" class="dialog dialog-sm" aria-labelledby="custom-title">
  <div class="dlg-inner">
    <div class="dlg-head">
      <h2 id="custom-title">Add a custom item</h2>
      <button type="button" class="icon-btn" data-close aria-label="Close custom item form"><svg class="ui-icon" aria-hidden="true"><use href="#i-x"/></svg></button>
    </div>
    <form id="custom-form" novalidate>
      <div class="field">
        <label for="c-name">Item name <span class="req">(required)</span></label>
        <input id="c-name" type="text" maxlength="60" autocomplete="off" aria-describedby="c-name-err" required>
        <p class="hint" id="c-name-hint" role="status" hidden></p>
        <p class="field-error" id="c-name-err" hidden></p>
      </div>
      <div class="field qty-field">
        <label for="c-qty">Quantity</label>
        <input id="c-qty" type="number" inputmode="numeric" min="1" max="99" step="1" value="1" aria-describedby="c-qty-err">
        <p class="field-error" id="c-qty-err" hidden></p>
      </div>
      <fieldset class="field size-field" aria-describedby="c-size-err">
        <legend>Approximate size <span class="req">(required unless you enter dimensions)</span></legend>
        <div class="size-options" id="c-sizes"></div>
        <p class="field-error" id="c-size-err" hidden></p>
      </fieldset>
      <fieldset class="field dims-field" aria-describedby="c-dims-hint c-dims-err">
        <legend>Know the exact size? <span class="opt">(optional, in inches)</span></legend>
        <div class="dims-row">
          <div><label for="c-l">Length</label><input id="c-l" type="number" inputmode="decimal" min="1" max="300" step="any"></div>
          <div><label for="c-w">Width</label><input id="c-w" type="number" inputmode="decimal" min="1" max="300" step="any"></div>
          <div><label for="c-h">Height</label><input id="c-h" type="number" inputmode="decimal" min="1" max="300" step="any"></div>
        </div>
        <p class="hint" id="c-dims-hint">Exact dimensions are used for the volume and for the 3D loading plan, and replace the size choice above. A size choice only gives an approximate volume.</p>
        <p class="field-error" id="c-dims-err" hidden></p>
      </fieldset>
      <div class="field">
        <label for="c-weight">Weight in kg <span class="opt">(optional)</span></label>
        <input id="c-weight" type="number" inputmode="decimal" min="0.1" max="5000" step="any" aria-describedby="c-weight-hint c-weight-err">
        <p class="hint" id="c-weight-hint">Sent with your quote request. The estimate does not check weight.</p>
        <p class="field-error" id="c-weight-err" hidden></p>
      </div>
      <div class="field flag-field">
        <label class="check"><input id="c-fragile" type="checkbox"><span>Fragile (nothing is stacked on it in the 3D plan)</span></label>
        <label class="check"><input id="c-oversized" type="checkbox"><span>Oversized or needs special handling</span></label>
        <label class="check"><input id="c-dismantled" type="checkbox"><span>Dismantled or flat-packed</span></label>
      </div>
      <div class="field">
        <label for="c-notes">Handling notes <span class="opt">(optional)</span></label>
        <input id="c-notes" type="text" maxlength="120" autocomplete="off" aria-describedby="c-notes-hint">
        <p class="hint" id="c-notes-hint">For example "glass top" or "needs two people". Up to 120 characters.</p>
      </div>
      <div class="dlg-actions">
        <button type="button" class="btn btn-secondary" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary" id="custom-submit"><svg class="ui-icon" aria-hidden="true"><use href="#i-plus"/></svg><span>Add to my list</span></button>
      </div>
    </form>
  </div>
</dialog>

<!-- ============ Confirm dialog ============ -->
<dialog id="confirm-dialog" class="dialog dialog-xs" aria-labelledby="confirm-title" aria-describedby="confirm-text">
  <div class="dlg-inner">
    <h2 id="confirm-title">Start over?</h2>
    <p id="confirm-text"></p>
    <div class="dlg-actions">
      <button type="button" class="btn btn-secondary" id="confirm-no">Keep my items</button>
      <button type="button" class="btn btn-danger" id="confirm-yes">Remove all</button>
    </div>
  </div>
</dialog>
