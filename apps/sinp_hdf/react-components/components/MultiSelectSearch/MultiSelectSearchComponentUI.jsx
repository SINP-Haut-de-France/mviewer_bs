import React, { useRef, useEffect } from "react";
import "./MultiSearchComponent.css";

const MultiSelectSearchUI = ({
  title,
  search,
  setSearch,
  filteredData,
  showResults,
  setShowResults,
  selected,
  handleSelect,
  handleRemove,
  handleFocus,
  label,
  selectedKey,
  multiselect,
  loading,
  error,
}) => {
  const showSearchInput = multiselect || selected.length === 0;
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Fermer le menu déroulant quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowResults]);

  return (
    <div className="multi-select-container">
      <div className="multi-select-header">
        <label className="multi-select-label">{title}</label>
      </div>

      <div className="search-input">
        {selected.map((item) => (
          <div key={item[selectedKey]} className="selected-tag">
            <span>{typeof label === 'function' ? label(item) : label}</span>
            <button className="remove-btn" onClick={() => handleRemove(item[selectedKey])}>
              ✕
            </button>
          </div>
        ))}

        {showSearchInput && (
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              // Afficher les résultats uniquement si l'utilisateur a saisi quelque chose
              setShowResults(e.target.value.length > 0);
            }}
            onFocus={() => {
              // Ne pas afficher les résultats immédiatement au focus
              // Seulement si un texte est déjà saisi
              if (search.length > 0) {
                setShowResults(true);
              }
            }}
            onBlur={() => {
              // Délai pour permettre la sélection d'un élément avant de fermer
              setTimeout(() => {
                // Ne pas fermer si l'utilisateur a cliqué sur un résultat
                if (document.activeElement !== dropdownRef.current) {
                  setShowResults(false);
                }
              }, 200);
            }}
          />
        )}
      </div>

      {showResults && (
        <div ref={dropdownRef} className="results-list">
          {loading ? (
            <div className="loading-message">Chargement...</div>
          ) : error ? (
            <div className="error-message">Erreur : {error}</div>
          ) : filteredData && filteredData.length > 0 ? ( // Vérification explicite
            filteredData.map((item) => (
              <div
                key={item[selectedKey]}
                className="result-item"
                onClick={() => handleSelect(item)}
              >
                {typeof label === 'function' ? label(item) : label}
              </div>
            ))
          ) : (
            <div className="no-results-message">Aucun résultat trouvé.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectSearchUI;