import React from 'react';
import './MultiCheckBox.css';

// Fonction utilitaire pour formater le label
function formatLabel(template, item) {
  return template.replace(/{{(.*?)}}/g, (_, key) => item[key.trim()] || '');
}

const MultiCheckBoxUI = ({
  libelle,
  data,
  selected,
  selectedKey,
  error,
  isLoading,
  handleToggle,
  handleToggleAll,
  isExpanded,
  toggleExpand,
  canCheckAll,
  areAllChecked,
  label,
}) => (
  <div className="multi-select-container">
    {/* Header contenant le libellé et bouton expand/collapse */}
    <div className="multi-select-header">
      <label className="multi-select-label">{libelle}</label>
      <button className="expand-btn" onClick={toggleExpand}>
        {isExpanded ? '−' : '+'} {/* Symbole pour étendre ou réduire */}
      </button>
    </div>

    {/* Affichage des tags sélectionnés en lecture seule */}
    <div className="selected-tags-container">
      {selected.map((item) => (
        <span key={item[selectedKey]} className="selected-tag read-only">
          {formatLabel(label, item)}
        </span>
      ))}
    </div>

    {/* Affichage de la liste déroulante quand le composant est étendu */}
    {isExpanded && (
      <div className="multi-checkbox-list">
        {isLoading && <div className="loading-message">Chargement...</div>}
        {error && <div className="error-message">{error}</div>}

        {/* Bouton "Tout cocher/décocher" */}
        {canCheckAll && (
          <div className="checkbox-item">
            <input
              type="checkbox"
              id="select-all"
              checked={areAllChecked}
              onChange={(e) => handleToggleAll(e.target.checked)}
            />
            <label htmlFor="select-all">Tout cocher/décocher</label>
          </div>
        )}

        {/* Liste d'options */}
        {!isLoading &&
          data.map((item) => (
            <div key={item[selectedKey]} className="checkbox-item">
              <input
                type="checkbox"
                id={`checkbox-${item[selectedKey]}`} // ID basé sur la clé unique
                checked={selected.some((el) => el[selectedKey] === item[selectedKey])}
                onChange={() => handleToggle(item)}
              />
              <label htmlFor={`checkbox-${item[selectedKey]}`}>
                {formatLabel(label, item)} {/* Label formatté dynamiquement */}
              </label>
            </div>
          ))}

        {data.length === 0 && !isLoading && (
          <div className="no-results-message">Aucun élément disponible.</div>
        )}
      </div>
    )}
  </div>
);

export default MultiCheckBoxUI;