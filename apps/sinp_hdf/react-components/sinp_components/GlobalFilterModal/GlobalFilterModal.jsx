import React, { useRef, useState } from "react";
import BaseModal from "../../components/BaseModal/BaseModal";
import GlobalFilters from "../GlobalFilters/GlobalFilters";
import "./GlobalFilterModal.css";

const GlobalFilterModal = ({
  isOpen,
  onClose,
  onSubmit,
  activeLayerId,
  filterProfile,
}) => {
  const modalRef = useRef(null);
  const globalFiltersRef = useRef(null);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [error, setError] = useState(null);
  const filtersStateRef = useRef(null); // Pour sauvegarder l'état complet des filtres

  const handleSubmit = async (params, filtersState) => {
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
      if (Array.isArray(effectiveFilters.filteredCommunes)) {
        finalParams.communes = effectiveFilters.filteredCommunes;
      }
      if (Array.isArray(effectiveFilters.filteredDepartments)) {
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

    setError(null); // Réinitialiser l'erreur

    try {
      // 1. Appel au code mviewer
      if (window.mviewer?.customLayers?.communeSearch) {
        await mviewer.customLayers.communeSearch.get_datas(finalParams);

        // Vérifier si des données ont été retournées
        const layer = mviewer.customLayers.communeSearch.layer;
        const features = layer.getSource().getFeatures();

        if (features.length === 0) {
          setError("Aucune donnée trouvée avec les filtres appliqués.");
          return; // Ne pas minimiser la modal
        }

        // Sauvegarder l'état complet des filtres pour le rebinding
        // Use effectiveFilters (the most recent known state)
        filtersStateRef.current = effectiveFilters;
        setAppliedFilters(effectiveFilters);

        // Minimiser la modal après succès
        if (modalRef.current?.handleToggleMinimize) {
          modalRef.current.handleToggleMinimize();
        }
      } else {
        setError("Service de recherche non disponible.");
        console.warn("mviewer.customLayers.communeSearch n'est pas disponible");
      }

      // 2. Callback optionnel pour comportements additionnels (UI, analytics, etc.)
      if (onSubmit) {
        onSubmit(params);
      }
    } catch (err) {
      console.error("Erreur lors de la recherche:", err);
      setError(`Erreur lors de la recherche: ${err.message || "Erreur inconnue"}`);
    }
  };

  // Callback appelé à CHAQUE changement de filtre dans GlobalFilters
  // Cela garantit que appliedFilters reste toujours en sync
  const handleFiltersChange = (currentFilters) => {
    console.log("📥 Filtres actualisés dans le composant enfant:", currentFilters);
    // Mettre à jour le cache de la modale
    filtersStateRef.current = currentFilters;
  };

  const handleReset = () => {
    console.log("🔄 Réinitialisation des filtres dans la modale");
    setAppliedFilters(null);
    filtersStateRef.current = null;
    setError(null);
  };

  const handleClose = () => {
    console.log("Fermeture de la modal - réinitialisation des filtres");
    setAppliedFilters(null);
    filtersStateRef.current = null;
    setError(null);
    onClose();
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

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Filtres avancés"
      onMinimize={handleModalToggle}
      ref={modalRef}>
      <div className="modal-filters-wrapper">
        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="fas fa-exclamation-triangle"></i> {error}
          </div>
        )}
        <GlobalFilters
          ref={globalFiltersRef}
          onSubmit={handleSubmit}
          onReset={handleReset}
          onFiltersChange={handleFiltersChange}
          initialFilters={appliedFilters}
          activeLayerId={activeLayerId}
          filterProfile={filterProfile}
          showActions={true}
          actionLabels={{
            submit: "Appliquer les filtres",
            reset: "Réinitialiser",
          }}
        />
      </div>
    </BaseModal>
  );
};

export default GlobalFilterModal;
