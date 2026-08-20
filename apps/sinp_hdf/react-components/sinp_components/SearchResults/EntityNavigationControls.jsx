import React from "react";

const EntityNavigationControls = ({
  currentIndex = 0,
  total = 0,
  entityLabel = "",
  disabled = false,
  onPrevious,
  onNext,
}) => {
  if (total <= 1) {
    return null;
  }

  return (
    <div className="mv-sr-entity-navigation" aria-label="Navigation entre les entités">
      <button
        type="button"
        className="mv-sr-page-button"
        disabled={disabled || currentIndex <= 0}
        onClick={onPrevious}>
        Précédent
      </button>
      <span className="mv-sr-entity-status">
        {entityLabel ? `${entityLabel} — ` : ""}
        {currentIndex + 1} / {total}
      </span>
      <button
        type="button"
        className="mv-sr-page-button"
        disabled={disabled || currentIndex >= total - 1}
        onClick={onNext}>
        Suivant
      </button>
    </div>
  );
};

export default EntityNavigationControls;
