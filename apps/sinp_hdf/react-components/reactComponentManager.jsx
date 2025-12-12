import React from 'react';
import ReactDOM from 'react-dom/client';

// === LEGACY SUPPORT ===

window.roots = window.roots || {};

/**
 * Accès au FilterContext depuis le code legacy
 */
let filterContextAPI = null;

/**
 * Initialiser l'API des filtres (appelé par FilterProvider)
 */
export const initFilterAPI = (api) => {
  filterContextAPI = api;

  // Exposer aussi dans window pour debugging
  window.__filterAPI = api;

  console.log('✅ Filter API initialisée et exposée:', api);

  // Déclencher un événement pour notifier que l'API est prête
  window.dispatchEvent(new CustomEvent('filterAPIReady', { detail: api }));
};

/**
 * Ouvre la modale de filtres depuis le code legacy
 */
export const openFilterModal = (config = {}) => {
  console.log('🎯 Tentative d\'ouverture de la modal...', config);

  if (!filterContextAPI) {
    console.error('❌ Filter API non initialisée. Attente...');

    // Attendre que l'API soit prête
    const waitForAPI = () => {
      return new Promise((resolve) => {
        window.addEventListener('filterAPIReady', (event) => {
          console.log('✅ API prête après attente');
          resolve(event.detail);
        }, { once: true });
      });
    };

    waitForAPI().then(() => {
      console.log('🔄 Réessai d\'ouverture de la modal...');
      openFilterModal(config);
    });

    return;
  }

  console.log('✅ Ouverture de la modal avec filterContextAPI:', filterContextAPI);

  filterContextAPI.openModal({
    onSubmit: config.onSubmit || ((params) => {
      console.log('Filtres soumis:', params);
      if (window.mviewer?.customLayers?.advancedSearch) {
        mviewer.customLayers.advancedSearch.get_datas(params);
      }
    }),
    activeLayerId: config.activeLayerId || null,
    filterProfile: config.filterProfile || null,
  });
};

/**
 * Ferme la modale de filtres
 */
export const closeFilterModal = () => {
  if (!filterContextAPI) {
    console.error('❌ Filter API non initialisée');
    return;
  }
  filterContextAPI.closeModal();
};

/**
 * Bascule l'affichage du sidebar de filtres
 */
export const toggleFilterSidebar = () => {
  if (!filterContextAPI) {
    console.error('❌ Filter API non initialisée');
    return;
  }
  filterContextAPI.toggleSidebar();
};

/**
 * Définit la couche active pour les filtres du sidebar
 */
export const setFilterLayer = (layerId) => {
  if (!filterContextAPI) {
    console.error('❌ Filter API non initialisée');
    return;
  }
  filterContextAPI.setSidebarLayer(layerId);
};

/**
 * Monte un composant React dynamiquement (legacy)
 */
export const mountComponent = (elementId, component, props) => {
  let container = document.getElementById(elementId);
  if (!container) {
    container = document.createElement('div');
    container.id = elementId;
    document.body.appendChild(container);
  }

  if (!window.roots[elementId]) {
    window.roots[elementId] = ReactDOM.createRoot(container);
  }

  window.roots[elementId].render(React.createElement(component, props));
};

/**
 * Démonte un composant React (legacy)
 */
export const unmountComponent = (elementId) => {
  const root = window.roots[elementId];
  if (root) {
    root.unmount();
    delete window.roots[elementId];
  }
};

// === EXPOSITION GLOBALE POUR LEGACY ===

if (typeof window !== 'undefined') {
  window.reactComponentManager = {
    openFilterModal,
    closeFilterModal,
    toggleFilterSidebar,
    setFilterLayer,
    mountComponent,
    unmountComponent,
    initFilterAPI, // ⚠️ IMPORTANT: Exposer pour que FilterProvider puisse l'appeler

    // Alias pour compatibilité
    toggleFilterModal: openFilterModal,

    // Helper pour vérifier si l'API est prête
    isReady: () => filterContextAPI !== null,

    // Accès direct à l'API (pour debugging)
    getAPI: () => filterContextAPI,
  };
}

console.log('✅ reactComponentManager chargé et exposé dans window');