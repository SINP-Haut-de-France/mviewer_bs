import React from "react";
import "./FilterActionsBar.css";

const FilterActionsBar = ({
  filterCount = 0,
  filterTags = [],
  canReset = false,
  canSubmit = false,
  hasSubmittedSearch = false,
  onReset,
  onSubmit,
}) => (
  <div className="mv-filter-actions-bar" data-tour="filter-actions">
    {filterTags.length > 0 && (
      <ul className="mv-filter-actions-bar__tags" aria-label="Filtres sélectionnés">
        {filterTags.map((tag) => (
          <li key={tag.id} className="mv-filter-actions-bar__tag" title={tag.label}>
            {tag.icon && <i className={`fas ${tag.icon}`} aria-hidden="true"></i>}
            <span>{tag.label}</span>
          </li>
        ))}
      </ul>
    )}
    <span className="mv-filter-actions-bar__count" aria-live="polite">
      Filtre(s) sélectionné(s) ({filterCount})
    </span>
    <button
      type="button"
      className="btn mv-filter-actions-bar__reset"
      disabled={!canReset}
      onClick={onReset}>
      <i className="fas fa-undo" aria-hidden="true"></i>
      <span>Réinitialiser</span>
    </button>
    <button
      type="button"
      className="btn mv-filter-actions-bar__submit"
      disabled={!canSubmit}
      onClick={onSubmit}>
      <i className="fas fa-check" aria-hidden="true"></i>
      <span>{hasSubmittedSearch ? "Rafraîchir" : "Appliquer"}</span>
    </button>
  </div>
);

export default FilterActionsBar;
