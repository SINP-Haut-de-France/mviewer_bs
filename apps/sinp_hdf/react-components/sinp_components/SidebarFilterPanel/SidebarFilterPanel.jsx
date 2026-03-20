import React from "react";
import GlobalFilters from "../GlobalFilters/GlobalFilters";
import { useFilters } from "../../providers/FilterProvider";
import "./SidebarFilterPanel.css";

const SidebarFilterPanel = ({
  activeLayerId,
  filterProfile,
  onSubmit,
  density,
  initialFilters,
  onFiltersChange,
}) => {
  const { pushFilterError } = useFilters();

  const executeSearch = async (params) => {
    if (typeof onSubmit === "function") {
      await onSubmit(params);
      return;
    }

    const targetLayer =
      (activeLayerId && window.mviewer?.customLayers?.[activeLayerId]) ||
      window.mviewer?.customLayers?.communeSearch;

    if (targetLayer?.get_datas) {
      console.log("🎯 [SIDEBAR] Appel de get_datas sur la couche:", activeLayerId);
      await targetLayer.get_datas(params);
      return;
    }

    console.error("❌ [SIDEBAR] Aucune recherche de couche disponible");
  };

  const handleSubmit = async (params, currentFilters) => {
    console.log("🎯 [SIDEBAR] handleSubmit APPELÉ !");
    console.log("🎯 [SIDEBAR] Filtres soumis depuis le sidebar:", params);
    console.log("🎯 [SIDEBAR] État complet des filtres:", currentFilters);

    await executeSearch(params);
  };

  const handleReset = () => {
    console.log("🔄 [SIDEBAR] Filtres réinitialisés");
  };

  const handleSubmitError = (error) => {
    const message =
      error?.userMessage ||
      error?.message ||
      "Une erreur est survenue lors de l'application des filtres.";
    pushFilterError(message);
  };

  console.log("🔍 [SIDEBAR] Render - handleSubmit défini:", typeof handleSubmit);

  return (
    <div className={`sidebar-filter-panel-wrapper ${density || ""}`.trim()}>
      <GlobalFilters
        onSubmit={handleSubmit}
        onReset={handleReset}
        onFiltersChange={onFiltersChange}
        initialFilters={initialFilters}
        activeLayerId={activeLayerId}
        filterProfile={filterProfile}
        showActions={true}
        actionLabels={{
          submit: "Appliquer",
          reset: "Réinitialiser",
        }}
        onSubmitError={handleSubmitError}
      />
    </div>
  );
};

export default SidebarFilterPanel;
