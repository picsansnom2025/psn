/**
 * Gender Toggle — click handler for men's/women's product navigation.
 *
 * Uses standard navigation for now. AJAX swap can be layered on
 * once basic navigation is confirmed working.
 */
(function () {
  document.addEventListener('click', function (e) {
    const pill = e.target.closest('[data-gender-swap-url]');
    if (!pill) return;

    e.preventDefault();

    const url = pill.dataset.genderSwapUrl || pill.getAttribute('href');
    if (url) {
      window.location.href = url;
    }
  });
})();
