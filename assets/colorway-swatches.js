/**
 * Colorway Swatches — AJAX product swap for pseudo-variant color navigation.
 *
 * When a swatch is clicked, fetches the sibling product's full page HTML
 * via Shopify's Section Rendering API and swaps <main> using the theme's
 * HTMLUpdateUtility.viewTransition(). Falls back to standard navigation
 * if the fetch or swap fails.
 */
(function () {
  document.addEventListener('click', function (e) {
    const swatch = e.target.closest('.colorway-swatches-block__swatch[data-product-url]');
    if (!swatch || swatch.classList.contains('colorway-swatches-block__swatch--active')) return;

    e.preventDefault();

    const productUrl = swatch.dataset.productUrl;
    if (!productUrl) return;

    // Show loading state
    const swatchBlock = swatch.closest('.colorway-swatches-block');
    if (swatchBlock) swatchBlock.style.opacity = '0.5';

    fetch(productUrl)
      .then(function (response) {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
      })
      .then(function (html) {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const newMain = parsed.querySelector('main');
        const oldMain = document.querySelector('main');

        if (!newMain || !oldMain) throw new Error('Could not find main element');

        // Update page title
        const newTitle = parsed.querySelector('head title');
        if (newTitle) document.querySelector('head title').innerHTML = newTitle.innerHTML;

        // Swap main content using theme utility
        var preCallbacks = [
          function (content) {
            content.querySelectorAll('.scroll-trigger').forEach(function (el) {
              el.classList.add('scroll-trigger--cancel');
            });
          }
        ];
        var postCallbacks = [
          function () {
            if (window.Shopify && window.Shopify.PaymentButton) window.Shopify.PaymentButton.init();
            if (window.ProductModel) window.ProductModel.loadShopifyXR();
          }
        ];

        HTMLUpdateUtility.viewTransition(oldMain, newMain, preCallbacks, postCallbacks);

        // Update URL via History API
        window.history.pushState({ colorwaySwap: true, url: productUrl }, '', productUrl);

        // Scroll to top of product section
        var productSection = document.querySelector('main .section-main-product, main product-info');
        if (productSection) {
          productSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(function () {
        // Fallback: standard navigation
        window.location.href = productUrl;
      });
  });

  // Handle browser back/forward after AJAX swap
  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.colorwaySwap) {
      window.location.reload();
    }
  });
})();
