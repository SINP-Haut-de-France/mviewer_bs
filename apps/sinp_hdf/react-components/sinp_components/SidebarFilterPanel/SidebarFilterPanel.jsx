import React from "react";
import GlobalFilters from "../GlobalFilters/GlobalFilters";
import "./SidebarFilterPanel.css";

const SidebarFilterPanel = ({ activeLayerId }) => {
  const handleSubmit = (params, currentFilters) => {
    console.log("🎯 [SIDEBAR] handleSubmit APPELÉ !");
    console.log("🎯 [SIDEBAR] Filtres soumis depuis le sidebar:", params);
    console.log("🎯 [SIDEBAR] État complet des filtres:", currentFilters);

    if (window.mviewer?.customLayers?.advancedSearch) {
      console.log("🎯 [SIDEBAR] Appel de advancedSearch.get_datas");
      mviewer.customLayers.advancedSearch.get_datas(params);
    } else {
      console.error("❌ [SIDEBAR] mviewer.customLayers.advancedSearch non disponible");
    }
  };

  const handleReset = () => {
    console.log("🔄 [SIDEBAR] Filtres réinitialisés");
  };

  console.log("🔍 [SIDEBAR] Render - handleSubmit défini:", typeof handleSubmit);

  return (
    <div className="sidebar-filter-panel-wrapper">
      <GlobalFilters
        onSubmit={handleSubmit}
        onReset={handleReset}
        activeLayerId={activeLayerId}
        showActions={true}
        actionLabels={{
          submit: "Appliquer",
          reset: "Réinitialiser",
        }}
      />
    </div>
  );
};

export default SidebarFilterPanel;
