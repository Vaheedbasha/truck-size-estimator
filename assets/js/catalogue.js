/*
 * catalogue.js - read-only view of data/household-items.json + categories.json.
 *
 * Builds lookup maps, works out the volume of bundle variants from their
 * components (so a bundle can never disagree with its parts) and provides
 * forgiving search (synonyms, plurals, small spelling mistakes).
 * No DOM code here, so it can be unit-tested outside the browser.
 */
(function (root) {
  'use strict';
  var TSE = (root.TSE = root.TSE || {});

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/\ba\s*\/\s*c\b/g, 'ac')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Levenshtein distance with an early exit once the distance exceeds `max`.
  function editDistance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      var rowMin = cur[0];
      for (j = 1; j <= b.length; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      var t = prev; prev = cur; cur = t;
    }
    return prev[b.length];
  }

  function tokenForms(tok) {
    var forms = [tok];
    if (tok.length > 3 && /s$/.test(tok)) forms.push(tok.replace(/es$/, '').replace(/s$/, ''));
    if (tok.length > 4 && /ies$/.test(tok)) forms.push(tok.replace(/ies$/, 'y'));
    return forms;
  }

  /**
   * @param {object} itemsData      parsed household-items.json
   * @param {object} categoriesData parsed categories.json
   * @returns {object} catalogue API
   */
  function create(itemsData, categoriesData) {
    var problems = [];
    var categories = (categoriesData && categoriesData.categories ? categoriesData.categories.slice() : [])
      .sort(function (a, b) { return a.sortOrder - b.sortOrder; });
    var catById = {};
    categories.forEach(function (c) { catById[c.id] = c; });

    var rawItems = itemsData && itemsData.items ? itemsData.items : [];
    var byId = {};
    rawItems.forEach(function (it) { byId[it.id] = it; });

    // ---- variant volume (bundles are summed from their components) ----
    function variantById(item, variantId) {
      if (!item) return null;
      for (var i = 0; i < item.variants.length; i++) if (item.variants[i].id === variantId) return item.variants[i];
      return null;
    }
    function componentsOf(item, variant) {
      if (!item || !item.isBundle || !variant || !variant.components) return null;
      var out = [];
      variant.components.forEach(function (c) {
        var ci = byId[c.item];
        var cv = variantById(ci, c.variant);
        if (!ci || !cv) { problems.push('Bundle ' + item.id + ' references missing ' + c.item + '/' + c.variant); return; }
        out.push({ item: ci, variant: cv, qty: c.qty });
      });
      return out;
    }
    /** Packed volume of ONE unit of this variant, or null when unknown. */
    function variantVolume(item, variant) {
      if (!item || !variant) return null;
      if (item.isBundle) {
        var comps = componentsOf(item, variant);
        if (!comps || !comps.length) return null;
        var sum = 0;
        for (var i = 0; i < comps.length; i++) {
          var v = variantVolume(comps[i].item, comps[i].variant);
          if (typeof v !== 'number') return null;
          sum += v * comps[i].qty;
        }
        return sum;
      }
      return typeof variant.volumeFt3 === 'number' && isFinite(variant.volumeFt3) && variant.volumeFt3 > 0 ? variant.volumeFt3 : null;
    }
    function variantNeedsReview(item, variant) {
      if (item.manualReview || (variant && variant.manualReview)) return true;
      if (item.isBundle) {
        var comps = componentsOf(item, variant) || [];
        return comps.some(function (c) { return variantNeedsReview(c.item, c.variant); });
      }
      return false;
    }

    /**
     * Configured packed size of ONE unit of a variant, in metres, for the 3D loading plan:
     *   { dismantled:false, dimsM:[w,d,h] }   or   { dismantled:true, parts:[{id,label,type,qty,dimsM}] }   or null when not configured.
     */
    function variantGeometry(item, variant) {
      if (!item || !variant || item.isBundle) return null;
      if (variant.parts && variant.parts.length) {
        return {
          dismantled: true,
          parts: variant.parts.map(function (p) {
            return { id: p.id, label: p.label, type: p.type, qty: p.qty || 1, dimsM: p.dimsCm.map(function (x) { return x / 100; }) };
          })
        };
      }
      if (variant.dimsCm && variant.dimsCm.length === 3) {
        return { dismantled: false, dimsM: variant.dimsCm.map(function (x) { return x / 100; }) };
      }
      return null;
    }
    function fmtCm(x) { var r = Math.round(x * 10) / 10; return String(r); }
    /** Short text for item cards, e.g. "approx. 120 x 75 x 76 cm" or "dismantled: 11 flat parts". Null for bundles / unknown. */
    function variantDimsText(item, variant) {
      var g = variantGeometry(item, variant);
      if (!g) return null;
      if (g.dismantled) {
        var n = g.parts.reduce(function (a, p) { return a + p.qty; }, 0);
        return 'dismantled: ' + n + ' flat parts';
      }
      return 'approx. ' + g.dimsM.map(function (x) { return fmtCm(x * 100); }).join(' × ') + ' cm';
    }

    // ---- search index ----
    var index = rawItems.map(function (it) {
      var cat = catById[it.category];
      var words = {};
      var addWords = function (s) { norm(s).split(' ').forEach(function (w) { if (w) words[w] = true; }); };
      addWords(it.name);
      (it.aliases || []).forEach(addWords);
      (it.searchTags || []).forEach(addWords); // former category names (pooja, kids, fitness ...) still find the item
      it.variants.forEach(function (v) { addWords(v.label); });
      if (cat) addWords(cat.name);
      return {
        item: it,
        name: norm(it.name),
        nameWords: norm(it.name).split(' '),
        aliases: (it.aliases || []).map(norm),
        variants: it.variants.map(function (v) { return norm(v.label); }),
        cat: (cat ? norm(cat.name) : '') + ' ' + (it.searchTags || []).map(norm).join(' '), // current and former category words
        words: Object.keys(words)
      };
    });

    // substring match for 3+ letters; very short words ("ac", "tv") must match a whole word so they do not hit "accent" or "packed"
    function loose(text, t) {
      return t.length >= 3 ? text.indexOf(t) !== -1 : (' ' + text + ' ').indexOf(' ' + t + ' ') !== -1;
    }

    function scoreToken(entry, tok) {
      var best = 0, i, j, forms = tokenForms(tok);
      for (var f = 0; f < forms.length; f++) {
        var t = forms[f], s = 0;
        if (entry.name === t) s = 120;
        else {
          for (i = 0; i < entry.nameWords.length; i++) {
            if (entry.nameWords[i] === t) { s = Math.max(s, 105); }
            else if (t.length >= 3 && entry.nameWords[i].indexOf(t) === 0) { s = Math.max(s, 95); }
          }
          if (!s && t.length >= 3 && entry.name.indexOf(t) !== -1) s = 80;
        }
        if (s < 106) { // an exact synonym ("fridge", "gas") outranks a partial name match
          for (j = 0; j < entry.aliases.length; j++) {
            var al = entry.aliases[j];
            if (al === t) s = Math.max(s, 106);
            else if (al.split(' ').indexOf(t) !== -1) s = Math.max(s, 75);
            else if (al.indexOf(t) === 0) s = Math.max(s, 70);
            else if (t.length >= 4 && al.indexOf(t) !== -1) s = Math.max(s, 55);
          }
        }
        if (!s) {
          for (j = 0; j < entry.variants.length; j++) if (loose(entry.variants[j], t)) { s = 30; break; }
        }
        if (!s && loose(entry.cat, t)) s = 20;
        if (s > best) best = s;
      }
      if (best) return best;
      // Typo tolerance: compare with every word we know for this item.
      if (tok.length >= 5) { // short words are too noisy for spelling tolerance
        var max = tok.length >= 9 ? 2 : 1;
        for (i = 0; i < entry.nameWords.length; i++) {
          if (editDistance(tok, entry.nameWords[i], max) <= max) return 16; // close to a word in the item's own name
        }
        for (i = 0; i < entry.words.length; i++) {
          if (editDistance(tok, entry.words[i], max) <= max) return 12;
        }
      }
      return 0;
    }

    /** Ranked search over name, synonyms, variants and category. Empty query returns []. */
    function search(query, opts) {
      var q = norm(query);
      if (!q) return [];
      var tokens = q.split(' ');
      var out = [];
      index.forEach(function (entry) {
        var total = 0;
        for (var i = 0; i < tokens.length; i++) {
          var s = scoreToken(entry, tokens[i]);
          if (!s) return; // every word must match something
          total += s;
        }
        out.push({ item: entry.item, score: total / tokens.length });
      });
      out.sort(function (a, b) { return b.score - a.score || a.item.name.localeCompare(b.item.name); });
      var limit = opts && opts.limit;
      var items = out.map(function (o) { return o.item; });
      return limit ? items.slice(0, limit) : items;
    }

    // Validate once so data problems are visible, not silent.
    rawItems.forEach(function (it) {
      if (!catById[it.category]) problems.push('Item ' + it.id + ' has unknown category ' + it.category);
      it.variants.forEach(function (v) {
        if (variantVolume(it, v) === null) problems.push('Item ' + it.id + '/' + v.id + ' has no usable volume');
      });
    });

    return {
      version: itemsData && itemsData.catalogueVersion,
      dataStatus: itemsData && itemsData.dataStatus,
      notice: itemsData && itemsData.notice,
      categories: categories,
      items: rawItems,
      customSizePresets: (itemsData && itemsData.customSizePresets) || [],
      problems: problems,
      categoryById: function (id) { return catById[id] || null; },
      getItem: function (id) { return byId[id] || null; },
      getVariant: variantById,
      defaultVariant: function (item) { return item.variants[0]; },
      variantVolume: variantVolume,
      variantComponents: componentsOf,
      variantNeedsReview: variantNeedsReview,
      variantGeometry: variantGeometry,
      variantDimsText: variantDimsText,
      itemsInCategory: function (catId) { return rawItems.filter(function (i) { return i.category === catId; }); },
      search: search,
      norm: norm
    };
  }

  TSE.Catalogue = { create: create, norm: norm, editDistance: editDistance };
})(typeof window !== 'undefined' ? window : globalThis);
