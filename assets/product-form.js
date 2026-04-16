/**
 * Product Form — variant switching, price update, URL update, quantity +/- buttons.
 * Theme Store compliant: no jQuery, no external deps.
 */
(function () {
  'use strict';

  function init(sectionEl) {
    if (!sectionEl) return;
    var sectionId = sectionEl.dataset.sectionId;
    var jsonEl = document.getElementById('ProductJson-' + sectionId);
    if (!jsonEl) return;

    var variants;
    try { variants = JSON.parse(jsonEl.textContent); } catch (e) { return; }

    var form = sectionEl.querySelector('[data-product-form]');
    var optionSelects = sectionEl.querySelectorAll('[data-option-index]');
    var variantIdInput = sectionEl.querySelector('[data-variant-id]');
    var addBtn = sectionEl.querySelector('.product-section__add-btn');
    var priceEl = sectionEl.querySelector('.price');
    var mediaContainer = sectionEl.querySelector('[data-product-media-container]');

    /* Quantity buttons */
    var qtyInput = sectionEl.querySelector('[data-qty-input]');
    var qtyMinus = sectionEl.querySelector('[data-qty-minus]');
    var qtyPlus = sectionEl.querySelector('[data-qty-plus]');

    if (qtyInput && qtyMinus && qtyPlus) {
      qtyMinus.addEventListener('click', function () {
        var v = parseInt(qtyInput.value, 10) || 1;
        if (v > 1) qtyInput.value = v - 1;
      });
      qtyPlus.addEventListener('click', function () {
        var v = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = v + 1;
      });
    }

    if (optionSelects.length === 0) return;

    optionSelects.forEach(function (sel) {
      sel.addEventListener('change', onOptionChange);
    });

    function onOptionChange() {
      var selectedOptions = [];
      optionSelects.forEach(function (sel) {
        selectedOptions.push(sel.value);
      });

      var matched = null;
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        var match = true;
        for (var j = 0; j < selectedOptions.length; j++) {
          if (v.options[j] !== selectedOptions[j]) { match = false; break; }
        }
        if (match) { matched = v; break; }
      }

      if (!matched) {
        if (addBtn) {
          addBtn.disabled = true;
          addBtn.textContent = addBtn.dataset.unavailable || 'Unavailable';
        }
        return;
      }

      /* Update hidden variant ID */
      if (variantIdInput) variantIdInput.value = matched.id;

      /* Update URL */
      var url = new URL(window.location.href);
      url.searchParams.set('variant', matched.id);
      window.history.replaceState({}, '', url.toString());

      /* Update button state */
      if (addBtn) {
        if (matched.available) {
          addBtn.disabled = false;
          addBtn.textContent = addBtn.dataset.addToCart || 'Add to cart';
        } else {
          addBtn.disabled = true;
          addBtn.textContent = addBtn.dataset.soldOut || 'Sold out';
        }
      }

      /* Update price */
      if (priceEl) {
        var onSale = matched.compare_at_price && matched.compare_at_price > matched.price;
        priceEl.className = 'price' + (onSale ? ' price--on-sale' : '') + (!matched.available ? ' price--sold-out' : '');

        var priceHTML = '';
        if (onSale) {
          priceHTML = '<span class="price__sale">' + formatMoney(matched.price) + '</span>' +
                      '<s class="price__compare">' + formatMoney(matched.compare_at_price) + '</s>';
        } else {
          priceHTML = '<span class="price__regular">' + formatMoney(matched.price) + '</span>';
        }
        if (matched.unit_price) {
          priceHTML += '<span class="price__unit">' + formatMoney(matched.unit_price) + '/' + matched.unit_price_measurement.reference_unit + '</span>';
        }
        priceEl.innerHTML = priceHTML;
      }

      /* Switch active media */
      if (mediaContainer && matched.featured_media) {
        var items = mediaContainer.querySelectorAll('[data-media-id]');
        items.forEach(function (item) {
          item.classList.toggle('product-section__media-item--active',
            item.dataset.mediaId == matched.featured_media.id);
        });
      }
    }
  }

  function formatMoney(cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents, Shopify.money_format || '${{amount}}');
    }
    return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: window.Shopify && Shopify.currency && Shopify.currency.active || 'EUR' });
  }

  /* Init on load + section reload */
  document.querySelectorAll('[data-section-id]').forEach(function (el) {
    if (el.classList.contains('product-section')) init(el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('.product-section');
    if (el) init(el);
  });
})();
