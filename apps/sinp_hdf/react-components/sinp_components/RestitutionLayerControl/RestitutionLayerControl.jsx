import React from "react";

const RestitutionLayerControl = ({
  layers = [],
  selectedLayerId = null,
  selectionAvailable = false,
  isLoading = false,
  onChange,
}) => (
  <div
    className="mv-restitution-header-control"
    role="group"
    aria-label="Couche de restitution"
    data-tour="filter-restitution-layer">
    {layers.map((layer) => {
      const isSelected = layer.id === selectedLayerId;

      return (
        <button
          key={layer.id}
          type="button"
          className={`btn mv-restitution-header-control__button ${
            isSelected ? "is-selected" : ""
          }`}
          disabled={
            isLoading ||
            isSelected ||
            (layer.selectionOnly && !selectionAvailable)
          }
          aria-pressed={isSelected}
          onClick={() => onChange?.(layer.id)}>
          {layer.label}
        </button>
      );
    })}
  </div>
);

export default RestitutionLayerControl;
