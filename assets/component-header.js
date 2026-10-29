
// Dropdown and mega menu

const ddButtons = document.getElementsByClassName("mob-parent-button");

// Loop through each button
for (const ddButton of ddButtons) {
  // Add a click event listener to the button
  ddButton.addEventListener("click", function (event) {
    // Prevent the default behavior of the button click
    event.preventDefault();
    // Find the next sibling element and add the "active" class to it
    const nextElement = ddButton.nextElementSibling;
    if (nextElement) {
      nextElement.classList.add("active");
      updateSlHideVisibility();
    }
  });
} 

const ddPanels = document.querySelectorAll(".mob-secondary-level-ul, .mob-third-level-ul");

// Function to update the visibility of sl-hide divs
function updateSlHideVisibility() {
  const isActivePanel = Array.from(ddPanels).some(panel => panel.classList.contains("active"));
  const slHideDivs = document.getElementsByClassName("sl-hide");

  for (const slHideDiv of slHideDivs) {
    if (isActivePanel) {
      slHideDiv.classList.add("sl-hide-oi");
    } else {
      slHideDiv.classList.remove("sl-hide-oi");
    }
  }
}

// Loop through each panel
for (const ddPanel of ddPanels) {
  // Find the "nav-secondary-fo-back-button" within the current panel
  const backButton = ddPanel.querySelector(".nav-secondary-fo-back-button");

  // Add a click event listener to the back button
  backButton.addEventListener("click", function () {
    // Remove the "active" class from the parent panel
    ddPanel.classList.toggle("active");
    updateSlHideVisibility();
  });

  // MutationObserver for each panel
  const panelObserver = new MutationObserver(() => {
    updateSlHideVisibility();
  });

  const observerConfig = { subtree: true, childList: true, attributes: true, characterData: true };
  panelObserver.observe(ddPanel, observerConfig);
}


// Accordion menu system

document.addEventListener("DOMContentLoaded", function () {
  var drawerAccordionButtons = document.querySelectorAll(".mob-parent-accordion-button");
  drawerAccordionButtons.forEach(function (drawerAccordionButton) {
    drawerAccordionButton.addEventListener("click", function () {
      var panel = drawerAccordionButton.nextElementSibling;

      // Toggle the "open" class for the accordion heading
      if (drawerAccordionButton.classList.contains("active")) {
        drawerAccordionButton.classList.remove("active");
        drawerAccordionButton.setAttribute('aria-expanded', 'false');
        panel.style.height = null;
        setTimeout(function () {
          panel.classList.remove("panel-open");
          panel.setAttribute('aria-hidden', 'true');
        }, 600);
      } else {
        drawerAccordionButton.classList.add("active");
        drawerAccordionButton.setAttribute('aria-expanded', 'true');
        panel.style.height = panel.scrollHeight + "px";
        panel.setAttribute('aria-hidden', 'false');
        panel.classList.add("panel-open");
      }
    });
  });
});


// Dropdown menu interaction
if (!document.querySelector('.nav-desktop-dd-btn-clickable')) {
  const navDesktopButtons = document.querySelectorAll('.nav-desktop-dd-btn');
  const headerMegaFwLists = document.querySelectorAll('.header-nav-desktop-dd-panel');
  const gcHeader = document.querySelector('.header-bar-inner');
    
  function applyBackgroundColor() {
    gcHeader.classList.add('hovered');
  }
  
  function removeBackgroundColor() {
    gcHeader.classList.remove('hovered');
  }
  
  navDesktopButtons.forEach((navDesktopButton) => {
    navDesktopButton.addEventListener('mouseover', applyBackgroundColor);
    navDesktopButton.addEventListener('mouseout', removeBackgroundColor);
  });
  
  headerMegaFwLists.forEach((headerMegaFwList) => {
    headerMegaFwList.addEventListener('mouseover', applyBackgroundColor);
    headerMegaFwList.addEventListener('mouseout', removeBackgroundColor);
  });
}

// Scrolling transition for transparent header option

const headerDiv = document.getElementById('SiteHeader');
const hadHdrTransHpInitially = headerDiv.classList.contains('hdr-trans-hp');
const hasScrollBehaviour = headerDiv.querySelector('.hb-scroll-behaviour--scroll');

let isScrolled = false;
if (!hasScrollBehaviour) {
window.addEventListener('scroll', function() {
  const scrollPosition = window.pageYOffset;

  if (scrollPosition > 300 && !isScrolled) {
    headerDiv.classList.remove('hdr-trans-hp');
    isScrolled = true;
  } else if (scrollPosition <= 300 && isScrolled) {
    if (hadHdrTransHpInitially) {
      headerDiv.classList.add('hdr-trans-hp');
    }
    isScrolled = false;
  }
});
}

// Menu drawer opening and closing

var navdrawermobile = document.getElementById('mobNavDrawer');
var drawbg = document.getElementById('drawBg');
var navbtns = document.querySelectorAll('.hdr-menu-button');
var navclose = document.getElementById('mobNavDrawerClose');
var lastFocusedButton = null;

// Function to open the menu drawer and set focus to the close button
function openMenuDrawer(event) {
  lastFocusedButton = event.currentTarget;
  navdrawermobile.classList.toggle('open');
  drawbg.classList.toggle('open');
  if (navdrawermobile.classList.contains('open')) {
    setTimeout(() => {
      navclose.focus();
    }, 200);
  }
  event.preventDefault();
}

// Event listeners to each menu button
navbtns.forEach(navbtn => {
  navbtn.addEventListener('click', openMenuDrawer);

  navbtn.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' || event.keyCode === 13) {
      openMenuDrawer(event);
    }
  });
});

if (navclose) { 
  navclose.addEventListener('click', function() {
    navdrawermobile.classList.remove('open');
    drawbg.classList.remove('open');
    lastFocusedButton?.focus();
  });
}

if (drawbg) { 
  drawbg.addEventListener('click', function() {
    navdrawermobile.classList.remove('open');
    drawbg.classList.remove('open');
    lastFocusedButton?.focus();
  });
}

// Desktop dropdowns for click option
var panelBg = document.querySelector('.dd-click-drawer-bg');
var lastClickedButton = null;

document.querySelectorAll('.nav-desktop-dd-btn-clickable').forEach(item => {
  item.addEventListener('click', (event) => {
    event.preventDefault();

    const panel = item.nextElementSibling;
    const isSameButton = lastClickedButton === item;
    const gcHeader = document.querySelector('.header-bar-inner');

    // Hide all other panels
    document.querySelectorAll('.header-nav-desktop-dd-panel').forEach(p => {
      if (p !== panel) {
        p.classList.remove("dd-visible");
      }
    });

    if (panel) {
      if (isSameButton) {
        // If clicking the same button, toggle the background visibility
        panel.classList.toggle("dd-visible");
        panelBg.classList.toggle("visible");
        gcHeader.classList.add('hovered');        
      } else {
        // If clicking a different button, ensure background stays visible
        panel.classList.add("dd-visible");
        panelBg.classList.add("visible");
        gcHeader.classList.add('hovered');
      }
    }

    // Update last clicked button
    lastClickedButton = isSameButton ? null : item;
  });
});

// Close all dropdowns when clicking anywhere outside
if (!document.querySelector('.nav-desktop-dd-btn-hover')) {
  document.addEventListener('click', (event) => {
    // Check if the clicked target is not inside a dropdown or clickable button
    if (
      !event.target.closest('.header-nav-desktop-dd-panel') &&
      !event.target.closest('.nav-desktop-dd-btn-clickable') &&
      !event.target.closest('.hdr-search-btn')
    ) {
      // Hide all dropdowns
      document.querySelectorAll('.header-nav-desktop-dd-panel').forEach(panel => {
        panel.classList.remove("dd-visible");
        panelBg.classList.remove("visible");
        document.querySelector('.header-bar-inner').classList.remove('hovered');
      });
    }
  });
}