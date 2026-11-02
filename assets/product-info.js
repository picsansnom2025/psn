if (!customElements.get('product-info')) {
  customElements.define(
    'product-info',
    class ProductInfo extends HTMLElement {
      quantityInput = undefined;
      quantityForm = undefined;
      onVariantChangeUnsubscriber = undefined;
      cartUpdateUnsubscriber = undefined;
      abortController = undefined;
      pendingRequestUrl = null;
      preProcessHtmlCallbacks = [];
      postProcessHtmlCallbacks = [];

      constructor() {
        super();

        this.quantityInput = this.querySelector('.quantity__input');
      }

      connectedCallback() {
        this.initializeProductSwapUtility();

        this.onVariantChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.optionValueSelectionChange,
          this.handleOptionValueChange.bind(this)
        );
        this.addEventListener('click', (event) => {
          const input = event.target.closest('input[type="radio"]');
          if (!input || !this.contains(input)) return;
          this.scrollToColor(input);
        });
        this.initQuantityHandlers();
        this.dispatchEvent(new CustomEvent('product-info:loaded', { bubbles: true }));
      }

      addPreProcessCallback(callback) {
        this.preProcessHtmlCallbacks.push(callback);
      }

      initQuantityHandlers() {
        if (!this.quantityInput) return;

        this.quantityForm = this.querySelector('.product-form__quantity');
        if (!this.quantityForm) return;

        this.setQuantityBoundries();
        if (!this.dataset.originalSection) {
          this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.fetchQuantityRules.bind(this));
        }
      }

      disconnectedCallback() {
        this.onVariantChangeUnsubscriber();
        this.cartUpdateUnsubscriber?.();
      }

      initializeProductSwapUtility() {
        this.preProcessHtmlCallbacks.push((html) =>
          html.querySelectorAll('.scroll-trigger').forEach((element) => element.classList.add('scroll-trigger--cancel'))
        );
        this.postProcessHtmlCallbacks.push((newNode) => {
          window?.Shopify?.PaymentButton?.init();
          window?.ProductModel?.loadShopifyXR();
        });
      }

      handleOptionValueChange({ data: { event, target, selectedOptionValues } }) {
        if (!this.contains(event.target)) return;

        this.selectedOptionValueIds = selectedOptionValues;
        this.scrollToColor(event.target);
        this.pendingMediaScroll = false;
        this.resetProductFormState();

        const productUrl = target.dataset.productUrl || this.pendingRequestUrl || this.dataset.url;
        this.pendingRequestUrl = productUrl;
        const shouldSwapProduct = this.dataset.url !== productUrl;
        const shouldFetchFullPage = this.dataset.updateUrl === 'true' && shouldSwapProduct;

        this.renderProductInfo({
          requestUrl: this.buildRequestUrlWithParams(productUrl, selectedOptionValues, shouldFetchFullPage),
          targetId: target.id,
          callback: shouldSwapProduct
            ? this.handleSwapProduct(productUrl, shouldFetchFullPage)
            : this.handleUpdateProductInfo(productUrl),
        });
      }

      resetProductFormState() {
        const productForm = this.productForm;
        productForm?.toggleSubmitButton(true);
        productForm?.handleErrorMessage();
      }

      handleSwapProduct(productUrl, updateFullPage) {
        return (html) => {
          this.productModal?.remove();

          const selector = updateFullPage ? "product-info[id^='MainProduct']" : 'product-info';
          const variant = this.getSelectedVariant(html.querySelector(selector));
          this.updateURL(productUrl, variant?.id);

          if (updateFullPage) {
            document.querySelector('head title').innerHTML = html.querySelector('head title').innerHTML;

            HTMLUpdateUtility.viewTransition(
              document.querySelector('main'),
              html.querySelector('main'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          } else {
            HTMLUpdateUtility.viewTransition(
              this,
              html.querySelector('product-info'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          }
        };
      }

      renderProductInfo({ requestUrl, targetId, callback }) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        fetch(requestUrl, { signal: this.abortController.signal })
          .then((response) => response.text())
          .then((responseText) => {
            this.pendingRequestUrl = null;
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            callback(html);
          })
          .then(() => {
            // set focus to last clicked option value
            document.querySelector(`#${targetId}`)?.focus();
          })
          .catch((error) => {
            if (error.name === 'AbortError') {
              console.log('Fetch aborted by user');
            } else {
              console.error(error);
            }
          });
      }

      getSelectedVariant(productInfoNode) {
        const selectedVariant = productInfoNode.querySelector('variant-selects [data-selected-variant]')?.innerHTML;
        return !!selectedVariant ? JSON.parse(selectedVariant) : null;
      }

      buildRequestUrlWithParams(url, optionValues, shouldFetchFullPage = false) {
        const params = [];

        !shouldFetchFullPage && params.push(`section_id=${this.sectionId}`);

        if (optionValues.length) {
          params.push(`option_values=${optionValues.join(',')}`);
        }

        return `${url}?${params.join('&')}`;
      }

      updateOptionValues(html) {
        const variantSelects = html.querySelector('variant-selects');
        if (variantSelects) {
          this.applyCheckedOptions(variantSelects);
          HTMLUpdateUtility.viewTransition(this.variantSelectors, variantSelects, this.preProcessHtmlCallbacks);
        }
      }

      applyCheckedOptions(variantSelects) {
        const ids = new Set((this.selectedOptionValueIds || []).map(String));
        if (!ids.size) return;

        variantSelects.querySelectorAll('[data-option-value-id]').forEach((el) => {
          const selected = ids.has(String(el.dataset.optionValueId));
          if (el.tagName === 'OPTION') {
            el.toggleAttribute('selected', selected);
            return;
          }
          if (el instanceof HTMLInputElement && el.type === 'radio') {
            el.toggleAttribute('checked', selected);
          }
        });

        variantSelects.querySelectorAll('fieldset').forEach((fieldset) => {
          const checked = fieldset.querySelector('input[type="radio"][checked]');
          const name = checked ? checked.value : '';
          fieldset.querySelectorAll('.product-color-swatch-label').forEach((label) => {
            label.textContent = name;
          });
          const sibling = fieldset.nextElementSibling;
          if (sibling?.classList.contains('product-color-swatch-label')) {
            sibling.textContent = name;
          }
        });
      }

      hasCompleteOptionSelection() {
        const root = this.variantSelectors;
        if (!root) return false;
        const fieldsets = [...root.querySelectorAll('fieldset')];
        const selects = [...root.querySelectorAll('select')];
        if (!fieldsets.length && !selects.length) return false;
        if (fieldsets.some((fieldset) => !fieldset.querySelector('input[type="radio"]:checked'))) return false;
        if (selects.some((select) => !select.value)) return false;
        return true;
      }

      scrollToColor(input) {
        if (!input || !this.isColorOptionChange({ target: input })) return;
        const mediaId = input.dataset.variantMediaId;
        if (!mediaId) return;
        this.pendingColorMediaId = mediaId;
        const now = Date.now();
        if (this.lastColorMediaId === mediaId && now - (this.lastColorScrollAt || 0) < 50) return;
        this.lastColorMediaId = mediaId;
        this.lastColorScrollAt = now;
        this.showVariantMedia(mediaId);
      }

      settleColorScroll() {
        const mediaId = this.pendingColorMediaId;
        if (!mediaId) return;
        this.pendingColorMediaId = null;
        requestAnimationFrame(() => this.showVariantMedia(mediaId));
      }

      handleUpdateProductInfo(productUrl) {
        return (html) => {
          this.updateOptionValues(html);
          this.settleColorScroll();
          const incomplete = !!this.variantSelectors && !this.hasCompleteOptionSelection();
          const variant = incomplete ? null : this.getSelectedVariant(html);

          this.pickupAvailability?.update(variant);
          this.updateURL(productUrl, variant?.id);
          this.updateVariantInputs(variant?.id);

          initVariantDrawer();

          if (!variant) {
            this.productForm?.toggleSubmitButton(
              true,
              incomplete ? window.variantStrings.chooseOptions : window.variantStrings.unavailable
            );
            this.querySelector(`#Inventory-${this.dataset.section}`)?.classList.add('hidden');
            if (!incomplete) this.setUnavailable();
            return;
          }

          this.updateMedia(html, variant?.featured_media?.id);

          const updateSourceFromDestination = (id, shouldHide = (source) => false) => {
            const source = html.getElementById(`${id}-${this.sectionId}`);
            const destination = this.querySelector(`#${id}-${this.dataset.section}`);
            if (source && destination) {
              destination.innerHTML = source.innerHTML;
              destination.classList.toggle('hidden', shouldHide(source));
            }
          };

          updateSourceFromDestination('price');
          updateSourceFromDestination('Sku', ({ classList }) => classList.contains('hidden'));
          updateSourceFromDestination('Inventory', ({ innerText }) => innerText === '');
          updateSourceFromDestination('Volume');
          updateSourceFromDestination('Price-Per-Item', ({ classList }) => classList.contains('hidden'));

          this.updateQuantityRules(this.sectionId, html);
          this.querySelector(`#Quantity-Rules-${this.dataset.section}`)?.classList.remove('hidden');
          this.querySelector(`#Volume-Note-${this.dataset.section}`)?.classList.remove('hidden');

          this.productForm?.toggleSubmitButton(
            html.getElementById(`ProductSubmitButton-${this.sectionId}`)?.hasAttribute('disabled') ?? true,
            window.variantStrings.soldOut
          );

          publish(PUB_SUB_EVENTS.variantChange, {
            data: {
              sectionId: this.sectionId,
              html,
              variant,
            },
          });
        };
      }

      updateVariantInputs(variantId) {
        this.querySelectorAll(
          `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
        ).forEach((productForm) => {
          const input = productForm.querySelector('input[name="id"]');
          input.value = variantId ?? '';
          input.disabled = !variantId;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      updateURL(url, variantId) {
        this.querySelector('share-button')?.updateUrl(
          `${window.shopUrl}${url}${variantId ? `?variant=${variantId}` : ''}`
        );

        if (this.dataset.updateUrl === 'false') return;
        window.history.replaceState({}, '', `${url}${variantId ? `?variant=${variantId}` : ''}`);
      }

      setUnavailable() {
        this.productForm?.toggleSubmitButton(true, window.variantStrings.unavailable);

        const selectors = ['price', 'Inventory', 'Sku', 'Price-Per-Item', 'Volume-Note', 'Volume', 'Quantity-Rules']
          .map((id) => `#${id}-${this.dataset.section}`)
          .join(', ');
        document.querySelectorAll(selectors).forEach(({ classList }) => classList.add('hidden'));
      }

      // Media Gallery Pagination
      handleScroll() {
        const slidesContainer = document.getElementById('SlidesCon');
        const slideWidth = slidesContainer.offsetWidth;
        const scrollPosition = slidesContainer.scrollLeft;
        const thumbnails = document.getElementsByClassName("gallery-slider--thumbnail");
      
        if (slidesContainer) {
          const index = Math.round(scrollPosition / slideWidth) + 1;
      
          pauseGalleryMedia();
        
          for (var i = 0; i < thumbnails.length; i++) {
            thumbnails[i].classList.remove("active");
        
            if (thumbnails[i].getAttribute('data-slide-index') == index) {
                thumbnails[i].classList.add("active");
            }
          }    
        }  
      }      

      // Variant Selector Drawer
      initVariantDrawer() {
        const toggles = document.querySelectorAll('.radio-drawer--opener');
        const drawers = document.querySelectorAll('.radio-options-drawer');
        const closeButtons = document.querySelectorAll('.rod--drawer-close');
        const closeButtonsFooter = document.querySelectorAll('.rod--drawer-footer-button');
        const backgrounds = document.querySelectorAll('.radio-options-drawer--background');

        toggles.forEach(function (toggle, index) {
          const drawer = drawers[index];
          const closeButton = closeButtons[index];
          const closeButtonFooter = closeButtonsFooter[index];
          const drawerBg = backgrounds[index];

          if (!drawer) return;

          const isAccordion = drawer.classList.contains('ro-display-type--accordion');

          // If accordion, set up localStorage key
          let drawerKey;
          if (isAccordion) {
            const productId = document.querySelector('[data-product-id]')?.dataset.productId || 'unknown';
            drawerKey = `drawerOpen-${productId}-${index}`;

            // Restore open state from localStorage
            if (window.location.search.includes('variant=') && localStorage.getItem(drawerKey) === 'true') {
              drawer.classList.add('open');
              if (drawerBg) drawerBg.classList.add('open');
            }
          }

          const closeDrawer = () => {
            drawer.classList.remove('open');
            if (drawerBg) drawerBg.classList.remove('open');
            if (isAccordion) localStorage.setItem(drawerKey, 'false');
          };

          if (drawerBg) drawerBg.addEventListener("click", closeDrawer);
          if (closeButtonFooter) closeButtonFooter.addEventListener("click", closeDrawer);
          if (closeButton) closeButton.addEventListener("click", closeDrawer);

          toggle.addEventListener("click", function () {
            const isOpen = drawer.classList.toggle('open');
            if (drawerBg) drawerBg.classList.toggle('open', isOpen);
            if (isAccordion) localStorage.setItem(drawerKey, isOpen.toString());
          });
        });
      }

      isColorOptionChange(event) {
        const fieldset = event?.target?.closest('fieldset');
        const legend = fieldset?.querySelector('legend');
        const name = (legend?.childNodes?.[0]?.textContent || '').trim();
        return /^(color|colour|colors|colours|couleur|farbe|colore|cor|kleur|färg|väri|颜色|色)\b/i.test(name);
      }

      showVariantMedia(mediaId) {
        if (!mediaId) return;
        const slide = this.querySelector(`#SlidesCon [data-media-id="${mediaId}"]`);
        if (!slide) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const behavior = reduceMotion ? 'auto' : 'smooth';
        const scroller = slide.parentElement;

        if (scroller && scroller.scrollWidth > scroller.clientWidth + 4) {
          scroller.scrollTo({ left: slide.offsetLeft, behavior });
          return;
        }

        slide.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' });
      }

      updateMedia(_html, variantFeaturedMediaId) {
        if (!this.pendingMediaScroll) return;
        this.pendingMediaScroll = false;
        this.showVariantMedia(variantFeaturedMediaId);
      }

      setQuantityBoundries() {
        const data = {
          cartQuantity: this.quantityInput.dataset.cartQuantity ? parseInt(this.quantityInput.dataset.cartQuantity) : 0,
          min: this.quantityInput.dataset.min ? parseInt(this.quantityInput.dataset.min) : 1,
          max: this.quantityInput.dataset.max ? parseInt(this.quantityInput.dataset.max) : null,
          step: this.quantityInput.step ? parseInt(this.quantityInput.step) : 1,
        };

        let min = data.min;
        const max = data.max === null ? data.max : data.max - data.cartQuantity;
        if (max !== null) min = Math.min(min, max);
        if (data.cartQuantity >= data.min) min = Math.min(min, data.step);

        this.quantityInput.min = min;

        if (max) {
          this.quantityInput.max = max;
        } else {
          this.quantityInput.max = max; // Edited to always set a max attribute
        }
        this.quantityInput.value = min;

        publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
      }

      fetchQuantityRules() {
        const currentVariantId = this.productForm?.variantIdInput?.value;
        if (!currentVariantId) return;

        this.querySelector('.quantity__rules-cart .loading__spinner').classList.remove('hidden');
        return fetch(`${this.dataset.url}?variant=${currentVariantId}&section_id=${this.dataset.section}`)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            this.updateQuantityRules(this.dataset.section, html);
          })
          .catch((e) => console.error(e))
          .finally(() => this.querySelector('.quantity__rules-cart .loading__spinner').classList.add('hidden'));
      }

      updateQuantityRules(sectionId, html) {
        if (!this.quantityInput) return;
        this.setQuantityBoundries();

        const quantityFormUpdated = html.getElementById(`Quantity-Form-${sectionId}`);
        const selectors = ['.quantity__input', '.quantity__rules', '.quantity__label'];
        for (let selector of selectors) {
          const current = this.quantityForm.querySelector(selector);
          const updated = quantityFormUpdated.querySelector(selector);
          if (!current || !updated) continue;
          if (selector === '.quantity__input') {
            const attributes = ['data-cart-quantity', 'data-min', 'data-max', 'step'];
            for (let attribute of attributes) {
              const valueUpdated = updated.getAttribute(attribute);
              if (valueUpdated !== null) {
                current.setAttribute(attribute, valueUpdated);
              } else {
                current.removeAttribute(attribute);
              }
            }
            // Edited - after updating attributes, reset boundaries
            this.setQuantityBoundries();
          } else {
            current.innerHTML = updated.innerHTML;
            if (selector === '.quantity__label') {
              const updatedAriaLabelledBy = updated.getAttribute('aria-labelledby');
              if (updatedAriaLabelledBy) {
                current.setAttribute('aria-labelledby', updatedAriaLabelledBy);
                // Update the referenced visually hidden element
                const labelId = updatedAriaLabelledBy;
                const currentHiddenLabel = document.getElementById(labelId);
                const updatedHiddenLabel = html.getElementById(labelId);
                if (currentHiddenLabel && updatedHiddenLabel) {
                  currentHiddenLabel.textContent = updatedHiddenLabel.textContent;
                }
              }
            }
          }
        }
      }

      get productForm() {
        return this.querySelector(`product-form`);
      }

      get productModal() {
        return document.querySelector(`#ProductModal-${this.dataset.section}`);
      }

      get pickupAvailability() {
        return this.querySelector(`pickup-availability`);
      }

      get variantSelectors() {
        return this.querySelector('variant-selects');
      }

      get relatedProducts() {
        const relatedProductsSectionId = SectionId.getIdForSection(
          SectionId.parseId(this.sectionId),
          'related-products'
        );
        return document.querySelector(`product-recommendations[data-section-id^="${relatedProductsSectionId}"]`);
      }

      get quickOrderList() {
        const quickOrderListSectionId = SectionId.getIdForSection(
          SectionId.parseId(this.sectionId),
          'quick_order_list'
        );
        return document.querySelector(`quick-order-list[data-id^="${quickOrderListSectionId}"]`);
      }

      get sectionId() {
        return this.dataset.originalSection || this.dataset.section;
      }
    }
  );
}
