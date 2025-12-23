import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFilters } from "../../providers/FilterProvider";
import GlobalFilterModal from "../GlobalFilterModal/GlobalFilterModal";
import SidebarFilterPanel from "../SidebarFilterPanel/SidebarFilterPanel";

/**
 * Composant racine qui gère tous les affichages de filtres
 * Monté une seule fois dans react-global-root
 */
const GlobalFilterManager = () => {
  const { modalState, closeModal, sidebarState } = useFilters();
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

  return (
    <>
      {/* Modal de filtres (rendu direct) */}
      <GlobalFilterModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSubmit={modalState.onSubmit}
        activeLayerId={modalState.activeLayerId}
        filterProfile={modalState.filterProfile}
      />

      {/* Sidebar de filtres (rendu via Portal) */}
      {sidebarContainer &&
        createPortal(
          <SidebarFilterPanel activeLayerId={sidebarState.activeLayerId} />,
          sidebarContainer
        )}
    </>
  );
};

export default GlobalFilterManager;
