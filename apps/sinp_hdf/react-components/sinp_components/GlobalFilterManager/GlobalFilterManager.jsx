import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFilters } from '../../providers/FilterProvider';
import GlobalFilterModal from '../GlobalFilterModal/GlobalFilterModal';
import SidebarFilterPanel from '../SidebarFilterPanel/SidebarFilterPanel';

/**
 * Composant racine qui gère tous les affichages de filtres
 * Monté une seule fois dans react-global-root
 */
const GlobalFilterManager = () => {
  const { modalState, closeModal, sidebarState } = useFilters();
  const [sidebarContainer, setSidebarContainer] = useState(null);

  // Trouver ou créer le conteneur du sidebar
  useEffect(() => {
    let container = document.getElementById('react-sidebar-filter-panel');

    if (!container) {
      console.warn('⚠️ Container react-sidebar-filter-panel non trouvé, création...');
      container = document.createElement('li');
      container.id = 'react-sidebar-filter-panel';
      container.className = 'react-filter-container';

      // Chercher le menu-list de la sidebar
      const menuList = document.querySelector('#menu-list');
      if (menuList) {
        menuList.appendChild(container);
        console.log('✅ Container sidebar créé dans #menu-list');
      } else {
        // Fallback: ajouter au body
        document.body.appendChild(container);
        console.log('⚠️ Container sidebar créé dans body (fallback)');
      }
    }

    setSidebarContainer(container);
    console.log('✅ Sidebar container prêt:', container);
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
      {sidebarContainer && createPortal(
        <SidebarFilterPanel
          isExpanded={sidebarState.isExpanded}
          activeLayerId={sidebarState.activeLayerId}
        />,
        sidebarContainer
      )}
    </>
  );
};

export default GlobalFilterManager;