(function () {
  // Drawer controller
  const openDrawer = (name) => {
    const drawer = document.querySelector(`.site-drawer[data-drawer="${name}"]`);
    if (!drawer) return;
    drawer.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    const panel = drawer.querySelector('.site-drawer__panel');
    panel?.focus?.();
    const firstInput = panel?.querySelector('input, a, button:not([data-drawer-close])');
    firstInput?.focus?.();
  };

  const closeDrawer = (drawer) => {
    drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    // Also update aria-expanded on any opener
    const name = drawer.dataset.drawer;
    document.querySelectorAll(`[data-drawer-toggle="${name}"]`).forEach((btn) => {
      btn.setAttribute('aria-expanded', 'false');
    });
  };

  const closeAll = () => {
    document.querySelectorAll('.site-drawer[aria-hidden="false"]').forEach(closeDrawer);
  };

  document.addEventListener('click', (e) => {
    const toggler = e.target.closest('[data-drawer-toggle]');
    if (toggler) {
      e.preventDefault();
      const name = toggler.dataset.drawerToggle;
      const drawer = document.querySelector(`.site-drawer[data-drawer="${name}"]`);
      if (!drawer) return;
      const isOpen = drawer.getAttribute('aria-hidden') === 'false';
      if (isOpen) {
        closeDrawer(drawer);
      } else {
        closeAll();
        openDrawer(name);
        toggler.setAttribute('aria-expanded', 'true');
      }
      return;
    }
    const closer = e.target.closest('[data-drawer-close]');
    if (closer) {
      e.preventDefault();
      const drawer = closer.closest('.site-drawer');
      if (drawer) closeDrawer(drawer);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });

  // Live cart count
  const updateCartCount = async () => {
    try {
      const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const cart = await res.json();
      document.querySelectorAll('[data-cart-count]').forEach((el) => {
        el.textContent = cart.item_count;
        el.closest('.site-header__cart')?.toggleAttribute('data-empty', cart.item_count === 0);
      });
    } catch (_) { /* ignore */ }
  };

  // Expose refresh for other scripts (e.g., quick add)
  window.__refreshCartCount = updateCartCount;

  // Init
  updateCartCount();

  // Listen for quick-add / add-to-cart forms
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-quick-add-form]');
    if (!form) return;
    e.preventDefault();
    const formData = new FormData(form);
    const btn = form.querySelector('button[type="submit"]');
    btn && (btn.disabled = true);
    try {
      const res = await fetch('/cart/add.js', { method: 'POST', body: formData, headers: { Accept: 'application/json' } });
      if (res.ok) {
        await updateCartCount();
        btn && (btn.textContent = 'Hinzugefügt ✓');
        setTimeout(() => { btn && (btn.textContent = '+ In den Warenkorb'); btn && (btn.disabled = false); }, 1200);
      } else { btn && (btn.disabled = false); }
    } catch (_) { btn && (btn.disabled = false); }
  });

  // Re-init on theme editor section load
  document.addEventListener('shopify:section:load', (e) => {
    if (e.target?.matches?.('.section-site-header')) {
      updateCartCount();
    }
  });
  document.addEventListener('shopify:section:unload', () => closeAll());
})();
