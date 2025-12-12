import React from 'react';
import ReactDOM from 'react-dom/client';
import { FilterProvider } from './providers/FilterProvider';
import GlobalFilterManager from './sinp_components/GlobalFilterManager/GlobalFilterManager';

// Initialiser window.roots avant tout
window.roots = window.roots || {};

console.log('🚀 Chargement de main.jsx...');

// === MONTAGE DU ROOT GLOBAL ===

const initGlobalRoot = () => {
  const globalRootElement = document.getElementById('react-global-root');

  if (!globalRootElement) {
    console.error('❌ Element #react-global-root non trouvé');
    return;
  }

  console.log('✅ Element #react-global-root trouvé');

  const globalRoot = ReactDOM.createRoot(globalRootElement);

  globalRoot.render(
    <React.StrictMode>
      <FilterProvider>
        <GlobalFilterManager />
      </FilterProvider>
    </React.StrictMode>
  );

  // Sauvegarder la racine globale
  window.roots['react-global-root'] = globalRoot;

  console.log('✅ GlobalFilterManager monté dans react-global-root');
};

// === MONTAGE DU SIDEBAR FILTER (attendre l'injection du conteneur) ===

import GlobalFilters from './sinp_components/GlobalFilters/GlobalFilters';

const initSidebarFilter = () => {
  const sidebarContainer = document.getElementById('react-sidebar-filter-panel');
  
  if (!sidebarContainer) {
    console.warn('⏳ Conteneur sidebar pas encore créé, attente de l\'événement...');
    // Attendre que reactInjector crée le conteneur
    window.addEventListener('sidebarFilterContainerReady', (event) => {
      console.log('✅ Événement reçu:', event.detail);
      setTimeout(initSidebarFilter, 100); // Petit délai pour s'assurer que le DOM est à jour
    }, { once: true });
    return;
  }

  console.log('✅ Conteneur sidebar trouvé, montage de GlobalFilters...');

  const sidebarRoot = ReactDOM.createRoot(sidebarContainer);

  sidebarRoot.render(
    <React.StrictMode>
      <GlobalFilters
        showActions={true}
        actionLabels={{
          submit: 'Rechercher',
          reset: 'Réinitialiser'
        }}
      />
    </React.StrictMode>
  );

  window.roots['react-sidebar-filter-panel'] = sidebarRoot;

  console.log('✅ GlobalFilters monté dans le sidebar');
};

// Attendre que le DOM soit prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initGlobalRoot();
    initSidebarFilter();
  });
} else {
  initGlobalRoot();
  initSidebarFilter();
}

// === MONTAGE DES COMPOSANTS STANDALONE (data-react-component) ===

import MultiSelectSearchComponent from './components/MultiSelectSearch/MultiSelectSearchComponent';
import CheckBoxTreeView from './components/CheckBoxTreeView/CheckBoxTreeView';
import MultiCheckBox from './components/MultiCheckBox/MultiCheckBox';
import DateFilter from './components/DateFilter/DateFilter';
import Datasource from './components/Datasource/Datasource';
import EspeceSearchFilter from './sinp_components/EspeceSearchFilter/EspeceSearchFilter';

const initStandaloneComponents = () => {
  const reactElements = document.querySelectorAll('[data-react-component]');

  console.log(`📦 ${reactElements.length} composants standalone trouvés`);

  reactElements.forEach((element) => {
    const ComponentName = element.getAttribute('data-react-component');
    const props = JSON.parse(element.getAttribute('data-props') || '{}');

    let Component = null;

    switch (ComponentName) {
      case 'MultiSelectSearchComponent':
        Component = MultiSelectSearchComponent;
        break;
      case 'CheckBoxTreeView':
        Component = CheckBoxTreeView;
        break;
      case 'MultiCheckBox':
        Component = MultiCheckBox;
        break;
      case 'DateFilter':
        Component = DateFilter;
        break;
      case 'Datasource':
        Component = Datasource;
        break;
      case 'EspeceSearchFilter':
        Component = EspeceSearchFilter;
        break;
      default:
        console.warn(`⚠️ Composant "${ComponentName}" non reconnu`);
    }

    if (Component && element.id) {
      // Vérifier si le composant n'est pas déjà monté
      if (window.roots[element.id]) {
        console.log(`⚠️ ${ComponentName} déjà monté dans #${element.id}, skip`);
        return;
      }
      
      const root = ReactDOM.createRoot(element);
      root.render(<Component {...props} />);
      window.roots[element.id] = root;
      console.log(`✅ ${ComponentName} monté dans #${element.id}`);
    }
  });
};

// Exposer la fonction pour permettre le montage manuel depuis l'extérieur
window.mountReactStandaloneComponents = initStandaloneComponents;

// Observer les changements du DOM pour monter automatiquement les nouveaux composants
const observeNewComponents = () => {
  const observer = new MutationObserver((mutations) => {
    let hasNewComponents = false;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Vérifier si le nœud lui-même ou ses descendants ont data-react-component
          if (node.hasAttribute?.('data-react-component') || 
              node.querySelector?.('[data-react-component]')) {
            hasNewComponents = true;
          }
        }
      });
    });
    
    if (hasNewComponents) {
      console.log('🔄 Nouveaux composants React détectés, montage...');
      initStandaloneComponents();
    }
  });
  
  // Observer tout le body pour détecter les nouveaux éléments
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('👁️ Observateur de composants React activé');
};

// Monter les composants standalone après le DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initStandaloneComponents();
    observeNewComponents();
  });
} else {
  initStandaloneComponents();
  observeNewComponents();
}