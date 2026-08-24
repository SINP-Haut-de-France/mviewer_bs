import React from "react";
import "./FilterActionsBar.css";

const FilterActionsBar = ({
  filterCount = 0,
  canReset = false,
  canSubmit = false,
  hasSubmittedSearch = false,
  onReset,
  onSubmit,
}) => (
  <div className="mv-filter-actions-bar" data-tour="filter-actions">
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
      <span>{hasSubmittedSearch ? "Rafraîchir" : "Appliquer le filtrage"}</span>
    </button>
  </div>
);

export default FilterActionsBar;
