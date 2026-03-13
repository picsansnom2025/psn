/**
 * Colorway Swatches — click handler for pseudo-variant color navigation.
 *
 * Delegates AJAX product swap to ProductPageSwap utility.
 * Falls back to standard navigation if the swap fails.
 */
(function () {
  document.addEventListener('click', function (e) {
    const swatch = e.target.closest('.colorway-swatches-block__swatch[data-product-url]');
    if (!swatch || swatch.classList.contains('colorway-swatches-block__swatch--active')) return;

    e.preventDefault();

    const productUrl = swatch.dataset.productUrl;
    if (!productUrl) return;

    // Guard: fall back to standard navigation if utility not loaded
    if (!window.ProductPageSwap) {
      window.location.href = productUrl;
      return;
    }

    const swatchBlock = swatch.closest('.colorway-swatches-block');

    ProductPageSwap.navigate(productUrl, {
      stateKey: 'colorwaySwap',
      onBeforeSwap: function () {
        if (swatchBlock) swatchBlock.style.opacity = '0.5';
      }
    }).catch(function () {
      window.location.href = productUrl;
    });
  });
})();
