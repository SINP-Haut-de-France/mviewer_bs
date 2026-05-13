import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFilters } from "../../providers/FilterProvider";
import GlobalFilterModal from "../GlobalFilterModal/GlobalFilterModal";
import SidebarFilterPanel from "../SidebarFilterPanel/SidebarFilterPanel";
import FilterErrorToaster from "../FilterErrorToaster/FilterErrorToaster";

/**
 * Composant racine qui gère tous les affichages de filtres
 * Monté une seule fois dans react-global-root
 */
const GlobalFilterManager = () => {
  const {
    displayMode,
    modalState,
    closeModal,
    sidebarState,
    currentFilters,
    setCurrentFilters,
    switchToModal,
    showSidebar,
  } = useFilters();
  const [sidebarContainer, setSidebarContainer] = useState(null);

  // Trouver le conteneur du sidebar (créé par reactInjector.js)
  useEffect(() => {
    const findContainer = () => {
      const container = document.getElementById("react-sidebar-filter-panel");

      if (container) {
        setSidebarContainer(container);
        console.log("✅ Sidebar container trouvé:", container);
      } else {
        console.warn(
          "⚠️ Container react-sidebar-filter-panel non trouvé, nouvelle tentative..."
        );
        setTimeout(findContainer, 200);
      }
    };

    findContainer();
  }, []);

  useEffect(() => {
    const sidebarMenu = document.getElementById("react-filters-menu");

    if (!sidebarMenu) {
      return;
    }

    sidebarMenu.style.display = displayMode === "sidebar" ? "" : "none";
  }, [displayMode, sidebarContainer]);

  const handleOpenModalFromSidebar = () => {
    switchToModal({
      activeLayerId: sidebarState.activeLayerId,
      filterProfile: sidebarState.filterProfile,
      onSubmit: sidebarState.onSubmit,
      uiConfig: sidebarState.uiConfig,
    });
  };

  useEffect(() => {
    const handleSidebarHeaderOpen = () => {
      handleOpenModalFromSidebar();
    };

    window.addEventListener("reactSidebarFilters:openModal", handleSidebarHeaderOpen);

    return () => {
      window.removeEventListener("reactSidebarFilters:openModal", handleSidebarHeaderOpen);
    };
  }, [
    sidebarState.activeLayerId,
    sidebarState.filterProfile,
    sidebarState.onSubmit,
    sidebarState.uiConfig,
  ]);

  const handleAnchorModalToSidebar = (filters) => {
    setCurrentFilters(filters ?? null);

    showSidebar({
      activeLayerId: modalState.activeLayerId,
      filterProfile: modalState.filterProfile,
      onSubmit: modalState.onSubmit,
      uiConfig: modalState.uiConfig,
    });
  };

  return (
    <>
      <FilterErrorToaster />

      {/* Modal de filtres (rendu direct) */}
      {displayMode === "modal" && (
        <GlobalFilterModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSubmit={modalState.onSubmit}
          activeLayerId={modalState.activeLayerId}
          filterProfile={modalState.filterProfile}
          closeButton={modalState.uiConfig?.closeButton}
          density={modalState.uiConfig?.density}
          initialFilters={currentFilters}
          onFiltersChange={setCurrentFilters}
          onAnchorToSidebar={handleAnchorModalToSidebar}
        />
      )}

      {/* Sidebar de filtres (rendu via Portal) */}
      {displayMode === "sidebar" &&
        sidebarContainer &&
        createPortal(
          <SidebarFilterPanel
            activeLayerId={sidebarState.activeLayerId}
            filterProfile={sidebarState.filterProfile}
            onSubmit={sidebarState.onSubmit}
            density={sidebarState.uiConfig?.density}
            initialFilters={currentFilters}
            onFiltersChange={setCurrentFilters}
          />,
          sidebarContainer
        )}
    </>
  );
};

export default GlobalFilterManager;
