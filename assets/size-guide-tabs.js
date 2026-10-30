/**
 * Size Guide Tabs — tab switching for gendered measurement tables.
 *
 * Uses document-level event delegation so it works after AJAX
 * product swaps (inline scripts in swapped HTML don't re-execute).
 */
(function () {
  if (window.__sizeGuideTabsInit) return;
  window.__sizeGuideTabsInit = true;

  document.addEventListener('click', function (e) {
    const tab = e.target.closest('.size-guide-modal__tab');
    if (!tab || tab.classList.contains('size-guide-modal__tab--active')) return;

    const target = tab.dataset.tab;
    const modal = tab.closest('.size-guide-modal');
    if (!modal) return;

    modal.querySelectorAll('.size-guide-modal__tab').forEach(function (t) {
      t.classList.remove('size-guide-modal__tab--active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('size-guide-modal__tab--active');
    tab.setAttribute('aria-selected', 'true');

    modal.querySelectorAll('.size-guide-modal__tab-panel').forEach(function (p) {
      p.hidden = p.dataset.panel !== target;
    });
  });
})();
