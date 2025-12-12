import React from 'react';
import { useFilters } from '../../providers/FilterProvider';
import GlobalFilters from '../GlobalFilters/GlobalFilters';
import './SidebarFilterPanel.css';

const SidebarFilterPanel = ({ isExpanded: controlledIsExpanded, activeLayerId }) => {
  const { sidebarState, toggleSidebar } = useFilters();

  // Utiliser l'état contrôlé s'il est fourni, sinon utiliser le contexte
  const isExpanded = controlledIsExpanded !== undefined
    ? controlledIsExpanded
    : sidebarState.isExpanded;

  const layerId = activeLayerId || sidebarState.activeLayerId;

  const handleSubmit = (params) => {
    console.log('Filtres soumis depuis le sidebar:', params);

    if (window.mviewer?.customLayers?.advancedSearch) {
      mviewer.customLayers.advancedSearch.get_datas(params);
    }
  };

  const handleReset = () => {
    console.log('Filtres réinitialisés');
  };

  return (
    <div className={`sidebar-filter-panel ${isExpanded ? 'expanded' : 'closed'}`}>
      <div className="filter-panel-header" onClick={toggleSidebar}>
        <h4>
          <i className="fas fa-search"></i>
          Recherche avancée
        </h4>
        <button className="toggle-button" aria-label={isExpanded ? 'Réduire' : 'Développer'}>
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
        </button>
      </div>

      {isExpanded && (
        <div className="filter-panel-content">
          <GlobalFilters
            onSubmit={handleSubmit}
            onReset={handleReset}
            activeLayerId={layerId}
            showActions={true}
            actionLabels={{
              submit: 'Appliquer',
              reset: 'Réinitialiser'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SidebarFilterPanel;