import React, { useEffect, useRef, useState } from "react";
import BaseModal from "../../components/BaseModal/BaseModal";
import GlobalFilters from "../GlobalFilters/GlobalFilters";
import { useFilters } from "../../providers/FilterProvider";
import { getSearchLayer, resolveSearchLayerId } from "../../configs/filtersConfig";
import FilterActionsBar from "../FilterActionsBar/FilterActionsBar";
import "./GlobalFilterModal.css";

const GlobalFilterModal = ({
  isOpen,
  onClose,
  onSubmit,
  activeLayerId,
  filterProfile,
  selectionContext,
  onSelectionSubmit,
  closeButton,
  density,
  openRequestId,
  initialFilters,
  onFiltersChange,
  onAnchorToSidebar,
  isMobile = false,
  filterActionsState = null,
  onFilterReset,
  onFilterSubmit,
}) => {
  const { pushFilterError, clearSelectionContext } = useFilters();
  const modalRef = useRef(null);
  const globalFiltersRef = useRef(null);
  const [appliedFilters, setAppliedFilters] = useState(() => initialFilters || null);
  const filtersStateRef = useRef(initialFilters || null); // Pour sauvegarder l'état complet des filtres

  useEffect(() => {
    modalRef.current?.restore?.();
  }, [openRequestId]);

  const executeSearch = async (
    params,
    layerId = activeLayerId,
    filtersState = null
  ) => {
    if (filtersState?.selectionMode) {
      if (typeof onSelectionSubmit !== "function") {
        throw new Error("La recherche sur le zonage sélectionné est indisponible.");
      }
      return onSelectionSubmit(params, layerId);
    }

    if (typeof onSubmit === "function") {
      return onSubmit(params, layerId);
    }

    const targetLayer = getSearchLayer(layerId);

    if (targetLayer?.get_datas) {
      return targetLayer.get_datas(params);
    }

    throw new Error("Service de recherche non disponible.");
  };

  const handleSubmit = async (params, filtersState, layerId) => {
    console.log("===== 🎯 HANDLESUBMIT DANS LA MODALE =====");
    console.log("Paramètres reçus depuis le composant enfant (params):", params);
    console.log("État des filtres reçus (filtersState):", filtersState);

    // Prefer the last-known filters from the modal cache (in case child submission was slightly stale)
    const effectiveFilters = filtersState || filtersStateRef.current || null;

    // Rebuild final params from effectiveFilters when available to avoid sending stale values
    let finalParams = { ...(params || {}) };
    if (effectiveFilters) {
      console.log(
        "📌 Overriding params with effectiveFilters from modal cache:",
        effectiveFilters
      );
      if (
        Array.isArray(effectiveFilters.filteredTaxons) &&
        effectiveFilters.filteredTaxons.length > 0
      ) {
        finalParams.taxons = effectiveFilters.filteredTaxons.map((t) =>
          typeof t === "object" && t.cd_ref ? t.cd_ref : t
        );
      }
      if (
        !effectiveFilters.selectionMode &&
        Array.isArray(effectiveFilters.filteredCommunes)
      ) {
        finalParams.communes = effectiveFilters.filteredCommunes;
      }
      if (
        !effectiveFilters.selectionMode &&
        Array.isArray(effectiveFilters.filteredDepartments)
      ) {
        finalParams.departements = effectiveFilters.filteredDepartments;
      }
      if (Array.isArray(effectiveFilters.filteredGroupes)) {
        finalParams.groupes = effectiveFilters.filteredGroupes;
      }
      // dates
      if (effectiveFilters.dateDeb) finalParams.dateDeb = effectiveFilters.dateDeb;
      if (effectiveFilters.dateFin) finalParams.dateFin = effectiveFilters.dateFin;
    }

    console.log("Paramètres finaux envoyés à communeSearch:", finalParams);
    console.log("=".repeat(45));

    try {
      // 1. Appel au code mviewer / callback configuré
      await executeSearch(finalParams, layerId, effectiveFilters);

      // Sauvegarder l'état complet des filtres pour le rebinding
      // Use effectiveFilters (the most recent known state)
      filtersStateRef.current = effectiveFilters;
      setAppliedFilters(effectiveFilters);

      // Minimiser la modal après succès en desktop uniquement.
      if (!isMobile && modalRef.current?.handleToggleMinimize) {
        modalRef.current.handleToggleMinimize();
      }

      if (isMobile && typeof onClose === "function") {
        onClose();
      }

      // 2. Callback optionnel pour comportements additionnels (UI, analytics, etc.)
    } catch (err) {
      console.error("Erreur lors de la recherche:", err);
      pushFilterError(err?.userMessage || err?.message || "Erreur lors de la recherche.");
    }
  };

  // Callback appelé à CHAQUE changement de filtre dans GlobalFilters
  // Cela garantit que appliedFilters reste toujours en sync
  const handleFiltersChange = (currentFilters) => {
    console.log("📥 Filtres actualisés dans le composant enfant:", currentFilters);
    // Mettre à jour le cache de la modale
    filtersStateRef.current = currentFilters;
    if (onFiltersChange) {
      onFiltersChange(currentFilters);
    }
  };

  const handleReset = () => {
    console.log("🔄 Réinitialisation des filtres dans la modale");
    setAppliedFilters(null);
    filtersStateRef.current = null;
    if (onFiltersChange) {
      onFiltersChange(null);
    }
    clearSelectionContext();
    window.externalLayersObs?.clearSelection?.();
  };

  const handleSelectionInvalidated = () => {
    clearSelectionContext();
    window.externalLayersObs?.clearSelection?.();
    pushFilterError(
      "Le zonage sélectionné a été retiré de la carte. Le filtrage par localisation standard a été réactivé.",
      { title: "Zonage désélectionné" }
    );
  };

  const handleClose = () => {
    console.log("Fermeture de la modal");
    onClose();
  };

  const handleAnchorToSidebar = () => {
    if (isMobile) {
      return;
    }

    if (typeof onAnchorToSidebar === "function") {
      onAnchorToSidebar(filtersStateRef.current || appliedFilters || null);
    }
  };


  // Called when modal minimize state changes (receives newState boolean)
  const handleModalToggle = (newState) => {
    console.log("Modal toggle, isMinimized =", newState);
    // When restored (newState === false), rebind filters from the saved state
    if (newState === false && filtersStateRef.current && globalFiltersRef.current) {
      console.log("🔄 Restoring filters:", filtersStateRef.current);
      // Call the rebind function on GlobalFilters ref
      if (typeof globalFiltersRef.current.rebindFilters === "function") {
        globalFiltersRef.current.rebindFilters(filtersStateRef.current);
      }
      // DO NOT call setAppliedFilters here - rebindFilters already handles state restoration
      // Calling setAppliedFilters would trigger the initialFilters effect which resets everything
    }
  };

  useEffect(() => {
    const handleSelectionRequest = () => {
      if (isMobile) {
        onClose?.();
      }
    };

    window.addEventListener("sinp:request-zoning-selection", handleSelectionRequest);
    return () =>
      window.removeEventListener(
        "sinp:request-zoning-selection",
        handleSelectionRequest
      );
  }, [isMobile, onClose]);

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Filtres avancés"
      onMinimize={handleModalToggle}
      closeButton={isMobile ? { visible: true, enabled: true } : closeButton}
      contentClassName={`global-filter-modal ${density || ""} ${
        isMobile ? "mobile-global-filter-modal" : ""
      }`.trim()}
      showMinimize={!isMobile}
      draggable={!isMobile}
      nonBlocking={!isMobile}
      headerActions={
        isMobile
          ? []
          : [
              {
                key: "anchor-to-sidebar",
                title: "Ancrer les filtres dans le sidebar",
                icon: "fas fa-thumbtack",
                onClick: handleAnchorToSidebar,
              },
            ]
      }
      ref={modalRef}>
      <div className={`modal-filters-wrapper ${density || ""}`.trim()}>
        <GlobalFilters
          ref={globalFiltersRef}
          onSubmit={handleSubmit}
          onReset={handleReset}
          onFiltersChange={handleFiltersChange}
          initialFilters={appliedFilters}
          activeLayerId={resolveSearchLayerId(activeLayerId)}
          filterProfile={filterProfile}
          selectionContext={selectionContext}
          onSelectionClear={() => {
            clearSelectionContext();
            window.externalLayersObs?.clearSelection?.();
          }}
          onSelectionInvalidated={handleSelectionInvalidated}
          onSubmitError={(error) => {
            pushFilterError(
              error?.userMessage ||
                error?.message ||
                "Erreur lors de l'application des filtres."
            );
          }}
        />
      </div>
      {filterActionsState ? (
        <div className="global-filter-modal-actions">
          <FilterActionsBar
            {...filterActionsState}
            onReset={onFilterReset}
            onSubmit={onFilterSubmit}
          />
        </div>
      ) : null}
    </BaseModal>
  );
};

export default GlobalFilterModal;
