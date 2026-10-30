if (!customElements.get('quick-add-modal')) {
  customElements.define(
    'quick-add-modal',
    class QuickAddModal extends ModalDialog {
      constructor() {
        super();
        this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');

        this.addEventListener('product-info:loaded', ({ target }) => {
          target.addPreProcessCallback(this.preprocessHTML.bind(this));
        });
      }

      hide(preventFocus = false) {
        const cartNotification = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        if (cartNotification) cartNotification.setActiveElement(this.openedBy);
        this.removeQuickAddSizeGuide();
        this.modalContent.innerHTML = '';

        if (preventFocus) this.openedBy = null;
        super.hide();
      }

      show(opener) {
        opener.setAttribute('aria-disabled', true);
        opener.classList.add('loading');
        opener.querySelector('.loading__spinner').classList.remove('hidden');

        fetch(opener.getAttribute('data-product-url'))
          .then((response) => response.text())
          .then((responseText) => {
            const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
            const productElement = responseHTML.querySelector('product-info');

            this.preprocessHTML(productElement);
            HTMLUpdateUtility.setInnerHTML(this.modalContent, productElement.outerHTML);

            if (window.Shopify && Shopify.PaymentButton) {
              Shopify.PaymentButton.init();
            }
            if (window.ProductModel) window.ProductModel.loadShopifyXR();

            super.show(opener);
          })
          .finally(() => {
            opener.removeAttribute('aria-disabled');
            opener.classList.remove('loading');
            opener.querySelector('.loading__spinner').classList.add('hidden');
          });
      }

      preprocessHTML(productElement) {
        productElement.classList.forEach((classApplied) => {
          if (classApplied.startsWith('color-') || classApplied === 'gradient')
            this.modalContent.classList.add(classApplied);
        });
        this.preventDuplicatedIDs(productElement);
        this.removeDOMElements(productElement);
        //this.removeGalleryListSemantic(productElement);
        //this.updateImageSizes(productElement);
        this.preventVariantURLSwitching(productElement);
      }

      preventVariantURLSwitching(productElement) {
        productElement.setAttribute('data-update-url', 'false');
      }

      removeDOMElements(productElement) {
        const pickupAvailability = productElement.querySelector('pickup-availability');
        if (pickupAvailability) pickupAvailability.remove();

        const productModal = productElement.querySelector('product-modal');
        if (productModal) productModal.remove();

        const productPopup = productElement.querySelector('.product-popup-modal__opener');
        if (productPopup) productPopup.remove();

        this.keepProductSizeGuide(productElement);

        const modalDialog = productElement.querySelectorAll('modal-dialog');
        if (modalDialog) modalDialog.forEach((modal) => {
          if (modal.id === this.sizeGuideModalId) return;
          modal.remove();
        });

        const hTitle = productElement.querySelectorAll('h1');
        if (hTitle) hTitle.forEach(modal => modal.remove());

        const Accordion = productElement.querySelectorAll('.accordion');
        if (Accordion) Accordion.forEach(modal => modal.remove());

        const ProductDescription = productElement.querySelectorAll('.product-description-static');
        if (ProductDescription) ProductDescription.forEach(modal => modal.remove());

        const ProductDescriptionExpandButton = productElement.querySelectorAll('.product-text-clamp-toggle');
        if (ProductDescriptionExpandButton) ProductDescriptionExpandButton.forEach(modal => modal.remove());      
        
        const ProductTabs = productElement.querySelectorAll('.product-info-tabs');
        if (ProductTabs) ProductTabs.forEach(modal => modal.remove());

        const ProductBreadcrumb = productElement.querySelectorAll('.product-breadcrumb-block');
        if (ProductBreadcrumb) ProductBreadcrumb.forEach(modal => modal.remove());

        const CrossLinks = productElement.querySelectorAll('.product__cross-links');
        if (CrossLinks) CrossLinks.forEach(modal => modal.remove());      

        const SocialLinks = productElement.querySelectorAll('.product-share-component');
        if (SocialLinks) SocialLinks.forEach(modal => modal.remove());

        const ProductBadges = productElement.querySelectorAll('.main-product--badge');
        if (ProductBadges) ProductBadges.forEach(modal => modal.remove());      

        const ProductIcons = productElement.querySelectorAll('.product-feature-icon-grid--wrapper');
        if (ProductIcons) ProductIcons.forEach(modal => modal.remove());

      }

      keepProductSizeGuide(productElement) {
        const sizeGuide = productElement.querySelector('#SizeGuideModal');
        if (!sizeGuide) {
          this.sizeGuideModalId = null;
          return;
        }

        const uniqueId = `${this.id}-SizeGuide`;
        const existing = document.getElementById(uniqueId);
        if (existing) existing.remove();

        sizeGuide.id = uniqueId;
        sizeGuide.classList.add('size-guide-modal');
        const closeButton = sizeGuide.querySelector('[id^="ModalClose-"]');
        if (closeButton) closeButton.id = `ModalClose-${uniqueId}`;
        productElement.querySelectorAll('[data-modal="#SizeGuideModal"]').forEach((opener) => {
          opener.setAttribute('data-modal', `#${uniqueId}`);
        });
        this.sizeGuideModalId = uniqueId;
      }

      removeQuickAddSizeGuide() {
        if (!this.sizeGuideModalId) return;
        const sizeGuide = document.getElementById(this.sizeGuideModalId);
        if (sizeGuide) {
          if (sizeGuide.hasAttribute('open')) sizeGuide.hide();
          sizeGuide.remove();
        }
        this.sizeGuideModalId = null;
      }

      preventDuplicatedIDs(productElement) {
        const sectionId = productElement.dataset.section;

        const oldId = sectionId;
        const newId = `quickadd-${sectionId}`;
        productElement.innerHTML = productElement.innerHTML.replaceAll(oldId, newId);
        Array.from(productElement.attributes).forEach((attribute) => {
          if (attribute.value.includes(oldId)) {
            productElement.setAttribute(attribute.name, attribute.value.replace(oldId, newId));
          }
        });

        productElement.dataset.originalSection = sectionId;
      }

      removeGalleryListSemantic(productElement) {
        const galleryList = productElement.querySelector('[id^="Slider-Gallery"]');
        if (!galleryList) return;

        galleryList.setAttribute('role', 'presentation');
        galleryList.querySelectorAll('[id^="Slide-"]').forEach((li) => li.setAttribute('role', 'presentation'));
      }

      updateImageSizes(productElement) {
        const product = productElement.querySelector('.product');
        const desktopColumns = product?.classList.contains('product--columns');
        if (!desktopColumns) return;

        const mediaImages = product.querySelectorAll('.product__media img');
        if (!mediaImages.length) return;

        let mediaImageSizes =
          '(min-width: 1000px) 715px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)';

        if (product.classList.contains('product--medium')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '605px');
        } else if (product.classList.contains('product--small')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '495px');
        }

        mediaImages.forEach((img) => img.setAttribute('sizes', mediaImageSizes));
      }
    }
  );
}
