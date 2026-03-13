/**
 * Gender Toggle — click handler for men's/women's product navigation.
 *
 * Delegates AJAX product swap to ProductPageSwap utility.
 * Falls back to standard navigation if the swap fails.
 */
(function () {
  document.addEventListener('click', function (e) {
    const pill = e.target.closest('[data-gender-swap-url]');
    if (!pill) return;

    e.preventDefault();

    const url = pill.dataset.genderSwapUrl;
    if (!url) {
      // If data attribute is empty, try the href
      const href = pill.getAttribute('href');
      if (href) window.location.href = href;
      return;
    }

    // Guard: fall back to standard navigation if utility not loaded
    if (!window.ProductPageSwap) {
      window.location.href = url;
      return;
    }

    const toggle = pill.closest('.gender-toggle');

    ProductPageSwap.navigate(url, {
      stateKey: 'genderSwap',
      onBeforeSwap: function () {
        if (toggle) toggle.style.opacity = '0.5';
      }
    }).catch(function () {
      window.location.href = url;
    });
  });
})();
