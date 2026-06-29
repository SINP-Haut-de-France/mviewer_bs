import React from "react";
import GlobalFilters from "../GlobalFilters/GlobalFilters";
import { useFilters } from "../../providers/FilterProvider";
import { getSearchLayer, resolveSearchLayerId } from "../../configs/filtersConfig";
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

  const executeSearch = async (params, layerId = activeLayerId) => {
    if (typeof onSubmit === "function") {
      await onSubmit(params, layerId);
      return;
    }

    const resolvedLayerId = resolveSearchLayerId(layerId);
    const targetLayer = getSearchLayer(layerId);

    if (targetLayer?.get_datas) {
      console.log("🎯 [SIDEBAR] Appel de get_datas sur la couche:", resolvedLayerId);
      await targetLayer.get_datas(params);
      return;
    }

    console.error("❌ [SIDEBAR] Aucune recherche de couche disponible");
  };

  const handleSubmit = async (params, currentFilters, layerId) => {
    console.log("🎯 [SIDEBAR] handleSubmit APPELÉ !");
    console.log("🎯 [SIDEBAR] Filtres soumis depuis le sidebar:", params);
    console.log("🎯 [SIDEBAR] État complet des filtres:", currentFilters);

    await executeSearch(params, layerId);
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
    <div
      className={`sidebar-filter-panel-wrapper ${density || ""}`.trim()}
      data-tour="advanced-filters-panel">
      <GlobalFilters
        onSubmit={handleSubmit}
        onReset={handleReset}
        onFiltersChange={onFiltersChange}
        initialFilters={initialFilters}
        activeLayerId={resolveSearchLayerId(activeLayerId)}
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
