import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFilters } from "../../providers/FilterProvider";
import GlobalFilterModal from "../GlobalFilterModal/GlobalFilterModal";
import SidebarFilterPanel from "../SidebarFilterPanel/SidebarFilterPanel";
import FilterErrorToaster from "../FilterErrorToaster/FilterErrorToaster";
import RestitutionLayerControl from "../RestitutionLayerControl/RestitutionLayerControl";
import FilterActionsBar from "../FilterActionsBar/FilterActionsBar";
import {
  SEARCH_RESTITUTION_LAYERS,
  getVisibleEnvironmentalLayers,
  resolveSearchLayerId,
} from "../../configs/filtersConfig";

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
  const [sidebarActionsContainer, setSidebarActionsContainer] = useState(null);
  const [restitutionHeader, setRestitutionHeader] = useState(null);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [filterActionsState, setFilterActionsState] = useState({
    filterCount: 0,
    canReset: true,
    canSubmit: false,
    hasSubmittedSearch: false,
  });
  const [isMobile, setIsMobile] = useState(() =>
    Boolean(window.configuration?.getConfiguration?.().mobile || window.innerWidth < 992)
  );

  useEffect(() => {
    const syncMobileState = () => {
      setIsMobile(
        Boolean(window.configuration?.getConfiguration?.().mobile || window.innerWidth < 992)
      );
    };

    syncMobileState();
    window.addEventListener("resize", syncMobileState);

    return () => {
      window.removeEventListener("resize", syncMobileState);
    };
  }, []);

  // Trouver le conteneur du sidebar (créé par reactInjector.js)
  useEffect(() => {
    if (isMobile) {
      setSidebarContainer(null);
      setSidebarActionsContainer(null);
      return undefined;
    }

    let retryTimer = null;

    const findContainer = () => {
      const container = document.getElementById("react-sidebar-filter-panel");
      const actionsContainer = document.getElementById(
        "react-sidebar-filter-actions"
      );

      if (container && actionsContainer) {
        setSidebarContainer(container);
        setSidebarActionsContainer(actionsContainer);
        console.log("✅ Sidebar container trouvé:", container);
      } else {
        console.warn(
          "⚠️ Container react-sidebar-filter-panel non trouvé, nouvelle tentative..."
        );
        retryTimer = setTimeout(findContainer, 200);
      }
    };

    findContainer();

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [isMobile]);

  useEffect(() => {
    let retryTimer = null;

    const findRestitutionHeader = () => {
      const header = document.getElementById("layers-container-box-header");
      if (header) {
        setRestitutionHeader(header);
        return;
      }
      retryTimer = window.setTimeout(findRestitutionHeader, 200);
    };

    findRestitutionHeader();
    return () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, []);

  useEffect(() => {
    const handleLoadingState = (event) => {
      setIsFilterLoading(Boolean(event.detail?.isLoading));
    };

    window.addEventListener("sinp:filter-loading-state", handleLoadingState);
    return () =>
      window.removeEventListener("sinp:filter-loading-state", handleLoadingState);
  }, []);

  useEffect(() => {
    const handleFilterActionsState = (event) => {
      setFilterActionsState((previousState) => ({
        ...previousState,
        ...(event.detail || {}),
      }));
    };

    window.addEventListener("sinp:filter-actions-state", handleFilterActionsState);
    return () =>
      window.removeEventListener(
        "sinp:filter-actions-state",
        handleFilterActionsState
      );
  }, []);

  useEffect(() => {
    const sidebarMenu = document.getElementById("react-filters-menu");
    const sidebarActionsSection = sidebarActionsContainer?.closest(
      ".react-filter-actions-section"
    );

    if (!sidebarMenu) {
      return;
    }

    sidebarMenu.style.display = displayMode === "sidebar" ? "" : "none";
    if (sidebarActionsSection) {
      sidebarActionsSection.style.display =
        displayMode === "sidebar" ? "" : "none";
    }
  }, [displayMode, sidebarContainer, sidebarActionsContainer]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("sinpMobileFilters:state", {
        detail: { isOpen: Boolean(isMobile && modalState.isOpen) },
      })
    );
  }, [isMobile, modalState.isOpen]);

  const handleOpenModalFromSidebar = () => {
    switchToModal({
      activeLayerId: sidebarState.activeLayerId,
      filterProfile: sidebarState.filterProfile,
      onSubmit: sidebarState.onSubmit,
      selectionContext: sidebarState.selectionContext,
      onSelectionSubmit: sidebarState.onSelectionSubmit,
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
    sidebarState.selectionContext,
    sidebarState.onSelectionSubmit,
    sidebarState.uiConfig,
  ]);

  const handleAnchorModalToSidebar = (filters) => {
    setCurrentFilters(filters ?? null);

    showSidebar({
      activeLayerId: modalState.activeLayerId,
      filterProfile: modalState.filterProfile,
      onSubmit: modalState.onSubmit,
      selectionContext: modalState.selectionContext,
      onSelectionSubmit: modalState.onSelectionSubmit,
      uiConfig: modalState.uiConfig,
    });
  };

  const selectedRestitutionLayerId =
    currentFilters?.restitutionLayerId ||
    resolveSearchLayerId(
      displayMode === "modal"
        ? modalState.activeLayerId
        : sidebarState.activeLayerId
    );
  const selectionAvailable =
    Boolean(currentFilters?.selectionMode) &&
    Boolean(currentFilters?.selectionFeatureUid) &&
    Boolean(currentFilters?.selectedSelectionLayerId) &&
    getVisibleEnvironmentalLayers().some(
      ({ id }) => id === currentFilters.selectedSelectionLayerId
    );

  const restitutionControl =
    restitutionHeader &&
    createPortal(
      <RestitutionLayerControl
        layers={SEARCH_RESTITUTION_LAYERS}
        selectedLayerId={selectedRestitutionLayerId}
        selectionAvailable={selectionAvailable}
        isLoading={isFilterLoading}
        onChange={(layerId) =>
          window.dispatchEvent(
            new CustomEvent("sinp:restitution-layer-change", {
              detail: { layerId },
            })
          )
        }
      />,
      restitutionHeader
    );
  const sidebarFilterActions =
    displayMode === "sidebar" &&
    !isMobile &&
    sidebarActionsContainer &&
    createPortal(
      <FilterActionsBar
        {...filterActionsState}
        onReset={() =>
          window.dispatchEvent(new CustomEvent("sinp:filter-reset-request"))
        }
        onSubmit={() =>
          window.dispatchEvent(new CustomEvent("sinp:filter-submit-request"))
        }
      />,
      sidebarActionsContainer
    );

  return (
    <>
      <FilterErrorToaster />
      {restitutionControl}
      {sidebarFilterActions}

      {/* Modal de filtres (rendu direct) */}
      {displayMode === "modal" && (
        <GlobalFilterModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSubmit={modalState.onSubmit}
          activeLayerId={modalState.activeLayerId}
          filterProfile={modalState.filterProfile}
          selectionContext={modalState.selectionContext}
          onSelectionSubmit={modalState.onSelectionSubmit}
          closeButton={modalState.uiConfig?.closeButton}
          density={modalState.uiConfig?.density}
          openRequestId={modalState.openRequestId}
          initialFilters={currentFilters}
          onFiltersChange={setCurrentFilters}
          onAnchorToSidebar={isMobile ? undefined : handleAnchorModalToSidebar}
          isMobile={isMobile}
          filterActionsState={filterActionsState}
          onFilterReset={() =>
            window.dispatchEvent(new CustomEvent("sinp:filter-reset-request"))
          }
          onFilterSubmit={() =>
            window.dispatchEvent(new CustomEvent("sinp:filter-submit-request"))
          }
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
            selectionContext={sidebarState.selectionContext}
            onSelectionSubmit={sidebarState.onSelectionSubmit}
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
