(function () {
  // --- Media tabs ---
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-media-tab]');
    if (!tab) return;
    const section = tab.closest('.product-showcase');
    if (!section) return;
    const name = tab.dataset.mediaTab;
    section.querySelectorAll('[data-media-tab]').forEach(b => { b.classList.toggle('is-active', b === tab); b.setAttribute('aria-selected', b === tab); });
    section.querySelectorAll('[data-media-panel]').forEach(p => p.classList.toggle('is-active', p.dataset.mediaPanel === name));
  });

  // --- <product-video> custom element: autoplay once + hover replay + end-frame poster ---
  if (!customElements.get('product-video')) {
    class ProductVideo extends HTMLElement {
      connectedCallback() {
        this.video = this.querySelector('.product-video__el');
        this.posterImg = this.querySelector('img.product-video__poster');
        this.posterCanvas = this.querySelector('canvas.product-video__poster');
        this.replayBtn = this.querySelector('.product-video__replay');

        const replayOnHover = this.dataset.replayOnHover === 'true';
        const autoplayOnce = this.dataset.autoplayOnce === 'true';

        if (!this.video) return; // YouTube/Vimeo embed: nothing to hook into

        this.video.muted = true;
        this.video.playsInline = true;

        this.video.addEventListener('play', () => { this.classList.add('is-playing'); this.classList.remove('is-ended'); });
        this.video.addEventListener('ended', () => this.handleEnd());

        // Autoplay once when in view
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && autoplayOnce && !this.hasPlayed) {
              this.video.currentTime = 0;
              this.video.play().catch(() => {});
              this.hasPlayed = true;
            }
          });
        }, { threshold: 0.35 });
        observer.observe(this);
        this._observer = observer;

        // Hover replay
        if (replayOnHover) {
          this.addEventListener('mouseenter', () => this.replay());
          this.addEventListener('focusin', () => this.replay());
        }
        this.replayBtn?.addEventListener('click', () => this.replay());
      }

      disconnectedCallback() {
        this._observer?.disconnect();
      }

      handleEnd() {
        this.classList.remove('is-playing');
        this.classList.add('is-ended');
        // Capture last frame to canvas if no custom poster
        if (this.posterCanvas && !this.posterImg) {
          try {
            const w = this.video.videoWidth;
            const h = this.video.videoHeight;
            if (w && h) {
              this.posterCanvas.width = w;
              this.posterCanvas.height = h;
              const ctx = this.posterCanvas.getContext('2d');
              ctx.drawImage(this.video, 0, 0, w, h);
            }
          } catch (_) { /* cross-origin may fail */ }
        }
      }

      replay() {
        if (!this.video) return;
        this.classList.remove('is-ended');
        try {
          this.video.currentTime = 0;
          this.video.play().catch(() => {});
        } catch (_) {}
      }
    }
    customElements.define('product-video', ProductVideo);
  }

  // --- Variant switching + add-to-cart ---
  if (!customElements.get('product-form')) {
    class ProductForm extends HTMLElement {
      connectedCallback() {
        const dataEl = this.querySelector('[data-product-json]');
        try { this.variants = JSON.parse(dataEl?.textContent || '[]'); } catch (_) { this.variants = []; }
        this.form = this.querySelector('form');
        this.idInput = this.querySelector('[data-variant-id-input]');
        this.submitBtn = this.querySelector('[data-add-to-cart]');
        this.priceWrap = this.closest('.product-showcase')?.querySelector('[data-price-wrap]');
        this.buyNow = this.querySelector('[data-buy-now]');

        // Option change
        this.querySelectorAll('[data-option-input]').forEach((input) => {
          input.addEventListener('change', () => this.onOptionChange());
        });

        // Quantity buttons
        const qtyInput = this.querySelector('input[name="quantity"]');
        this.querySelector('[data-qty-minus]')?.addEventListener('click', () => { qtyInput.value = Math.max(1, parseInt(qtyInput.value, 10) - 1); });
        this.querySelector('[data-qty-plus]')?.addEventListener('click', () => { qtyInput.value = parseInt(qtyInput.value, 10) + 1; });

        // Submit -> ajax add
        this.form?.addEventListener('submit', (e) => this.onSubmit(e));
        this.buyNow?.addEventListener('click', () => this.onBuyNow());

        // Update selected-value label
        this.updateSelectedLabels();
      }

      onOptionChange() {
        const selected = Array.from(this.querySelectorAll('[data-option-input]:checked'))
          .sort((a, b) => parseInt(a.dataset.optionInput) - parseInt(b.dataset.optionInput))
          .map(i => i.value);

        const match = this.variants.find(v => {
          return (v.options || []).every((o, i) => o === selected[i]);
        });

        // Toggle swatch states
        this.querySelectorAll('.product-form__swatch').forEach((sw) => {
          const inp = sw.querySelector('input');
          sw.classList.toggle('is-selected', inp.checked);
        });

        this.updateSelectedLabels();

        if (match) {
          this.idInput.value = match.id;
          this.submitBtn.disabled = !match.available;
          const lbl = this.submitBtn.querySelector('[data-atc-label]');
          if (lbl) lbl.textContent = match.available ? 'In den Warenkorb' : 'Ausverkauft';
          // Price
          if (this.priceWrap) this.renderPrice(match);
        } else {
          this.submitBtn.disabled = true;
          const lbl = this.submitBtn.querySelector('[data-atc-label]');
          if (lbl) lbl.textContent = 'Nicht verfügbar';
        }
      }

      updateSelectedLabels() {
        this.querySelectorAll('[data-option-value]').forEach((el, i) => {
          const idx = parseInt(el.dataset.optionValue);
          const sel = this.querySelector(`[data-option-input="${idx}"]:checked`);
          if (sel) el.textContent = sel.value;
        });
      }

      renderPrice(variant) {
        const money = (cents) => {
          // Simple EUR format; server renders localised price initially
          return new Intl.NumberFormat('de-DE', { style: 'currency', currency: (window.Shopify?.currency?.active) || 'EUR' })
            .format(cents / 100);
        };
        const onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
        this.priceWrap.innerHTML = onSale
          ? `<div class="price price--on-sale"><span class="price__sale">${money(variant.price)}</span><s class="price__compare">${money(variant.compare_at_price)}</s></div>`
          : `<div class="price"><span class="price__regular">${money(variant.price)}</span></div>`;
      }

      async onSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.form);
        this.submitBtn.disabled = true;
        const originalLbl = this.submitBtn.querySelector('[data-atc-label]')?.textContent;
        try {
          const res = await fetch('/cart/add.js', {
            method: 'POST', body: formData, headers: { Accept: 'application/json' }
          });
          if (res.ok) {
            const lbl = this.submitBtn.querySelector('[data-atc-label]');
            if (lbl) lbl.textContent = 'Hinzugefügt ✓';
            window.__refreshCartCount?.();
            setTimeout(() => {
              this.submitBtn.disabled = false;
              if (lbl) lbl.textContent = originalLbl || 'In den Warenkorb';
            }, 1500);
          } else {
            this.submitBtn.disabled = false;
          }
        } catch (_) {
          this.submitBtn.disabled = false;
        }
      }

      async onBuyNow() {
        const formData = new FormData(this.form);
        try {
          await fetch('/cart/add.js', { method: 'POST', body: formData, headers: { Accept: 'application/json' } });
          window.location.href = '/checkout';
        } catch (_) {}
      }
    }
    customElements.define('product-form', ProductForm);
  }
})();
