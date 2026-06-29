var reactInjector = (function () {
  return {
    // Addon Init
    init: function () {
      // Fonction pour injecter le conteneur React dans le sidebar
      const injectSidebarFilterContainer = () => {
        const sidebarWrapper = document.getElementById("sidebar-wrapper");

        if (!sidebarWrapper) {
          console.warn("sidebar-wrapper not found, retrying...");
          setTimeout(injectSidebarFilterContainer, 200);
          return;
        }

        // Vérifier si le conteneur n'existe pas déjà
        //if (document.getElementById("react-sidebar-filter-panel")) {
        //  console.log("Container already exists, skipping injection");
        //  return; // Déjà créé
        //}

        // Trouver le ul.sidebar-nav principal dans le sidebar-wrapper
        const sidebarNav = sidebarWrapper.querySelector("ul.sidebar-nav");

        if (!sidebarNav) {
          console.warn("sidebar-nav not found, retrying...");
          setTimeout(injectSidebarFilterContainer, 200);
          return;
        }

        // Créer un nouveau <ul> pour les filtres (structure séparée du menu principal)
        const filtersWrapper = document.createElement("ul");
        filtersWrapper.className = "sidebar-nav nav-pills nav-stacked";
        filtersWrapper.id = "react-filters-menu";
        filtersWrapper.style.marginTop = "10px";
        filtersWrapper.style.paddingTop = "10px";
        filtersWrapper.style.paddingLeft = "0px";
        filtersWrapper.style.borderTop = "1px solid #ddd";

        // Créer le <li> du thème de filtres
        const filterTheme = document.createElement("li");
        filterTheme.className = "";
        filterTheme.id = "theme-react-filters";
        filterTheme.setAttribute("data-tour", "advanced-filters-menu");

        // Créer le header cliquable
        const header = document.createElement("a");
        header.href = "#";
        header.innerHTML = `
          <div class="menu-theme-layers-name">
            <span class="fa-stack">
              <i class="fa fa-filter fa-stack-1x"></i>
            </span>
            <span>Filtres avancés</span>
          </div>
          <div class="toggle-theme-layers react-filters-header-actions">
            <span
              class="fa-stack react-filters-toggle-button"
              role="button"
              tabindex="0"
              title="Ouvrir les filtres dans une fenêtre"
              aria-label="Ouvrir les filtres dans une fenêtre">
              <i class="fa fa-window-restore fa-stack-1x"></i>
            </span>
          </div>
        `;

        // Créer le conteneur des filtres (initialement caché)
        const filtersContainer = document.createElement("ul");
        filtersContainer.className = "nav-pills nav-stacked";
        filtersContainer.style.listStyleType = "none";
        filtersContainer.style.display = "none";
        filtersContainer.style.paddingLeft = "0px";

        // Créer le conteneur React à l'intérieur
        const reactContainer = document.createElement("div");
        reactContainer.id = "react-sidebar-filter-panel";
        reactContainer.className = "react-filter-container";
        reactContainer.setAttribute("data-tour", "advanced-filters-panel");
        reactContainer.style.width = "100%";
        reactContainer.style.maxWidth = "100%";
        reactContainer.style.boxSizing = "border-box";
        reactContainer.style.overflow = "visible";
        reactContainer.style.position = "relative";

        filtersContainer.appendChild(reactContainer);

        const modalToggleButton = header.querySelector(".react-filters-toggle-button");

        const openFiltersInModal = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("reactSidebarFilters:openModal"));
        };

        if (modalToggleButton) {
          modalToggleButton.addEventListener("click", openFiltersInModal);
          modalToggleButton.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              openFiltersInModal(e);
            }
          });
        }

        // Ajouter le comportement de toggle au clic sur le header
        header.addEventListener("click", function (e) {
          e.preventDefault();
          const isHidden = filtersContainer.style.display === "none";
          filtersContainer.style.display = isHidden ? "block" : "none";
          filterTheme.classList.toggle("active", isHidden);
          filterTheme.classList.toggle("opened", isHidden);
        });

        // Assembler la structure
        filterTheme.appendChild(header);
        filterTheme.appendChild(filtersContainer);
        filtersWrapper.appendChild(filterTheme);

        // L'ajouter après le ul.sidebar-nav existant dans le sidebar-wrapper
        sidebarWrapper.appendChild(filtersWrapper);

        // Injecter le CSS pour le sidebar
        const cssHref =
          "apps/sinp_hdf/react-components/sinp_components/GlobalFilters/GlobalFiltersSidebar.css";
        if (!document.querySelector(`link[href='${cssHref}']`)) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.type = "text/css";
          link.href = cssHref;
          document.head.appendChild(link);
        }

        console.log("React sidebar filter container injected successfully");

        // Déclencher un événement pour notifier que le conteneur est prêt
        window.dispatchEvent(
          new CustomEvent("sidebarFilterContainerReady", {
            detail: { containerId: "react-sidebar-filter-panel" },
          })
        );
      };

      // Attendre que mviewer soit complètement initialisé
      const waitForMviewerInit = () => {
        if (typeof mviewer !== "undefined" && mviewer.customLayers) {
          // mviewer est prêt, attendre que le sidebar soit complètement généré
          setTimeout(injectSidebarFilterContainer, 1000);
        } else {
          setTimeout(waitForMviewerInit, 100);
        }
      };

      // Démarrer l'attente
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", waitForMviewerInit);
      } else {
        waitForMviewerInit();
      }

      // Injecter le bouton filtre dans la barre mobile mviewer
      const injectMobileFilterButton = () => {
        const mobileNav = document.getElementById("mvNavbarMobile");

        if (!mobileNav) {
          setTimeout(injectMobileFilterButton, 300);
          return;
        }

        if (document.getElementById("mobile-filter-btn")) {
          return;
        }

        const filterBtn = document.createElement("a");
        filterBtn.id = "mobile-filter-btn";
        filterBtn.href = "#";
        filterBtn.setAttribute("data-bs-original-title", "Filtres avancés");
        filterBtn.innerHTML = '<i class="ri-filter-line"></i>';

        filterBtn.addEventListener("click", function (e) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("reactSidebarFilters:openModal"));
        });

        mobileNav.appendChild(filterBtn);
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectMobileFilterButton);
      } else {
        injectMobileFilterButton();
      }

      // Créer le conteneur global pour les modales (si pas déjà existant)
      if (!document.getElementById("react-global-root")) {
        const globalRoot = document.createElement("div");
        globalRoot.id = "react-global-root";
        document.body.appendChild(globalRoot);
      }

      // Ajouter les scripts React
      const mainScriptSrc = "apps/sinp_hdf/addons/reactInjector/dist/main.js";
      if (!document.querySelector(`script[src='${mainScriptSrc}']`)) {
        const mainScript = document.createElement("script");
        mainScript.src = mainScriptSrc;
        mainScript.type = "text/javascript";
        document.body.appendChild(mainScript);
      }

      const reactCompManagerSrc =
        "apps/sinp_hdf/addons/reactInjector/dist/reactComponentManager.js";
      if (!document.querySelector(`script[src='${reactCompManagerSrc}']`)) {
        const reactCompManagerScript = document.createElement("script");
        reactCompManagerScript.src = reactCompManagerSrc;
        reactCompManagerScript.type = "text/javascript";
        document.body.appendChild(reactCompManagerScript);
      }
    },
  };
})();
new CustomComponent("reactInjector", reactInjector.init);
