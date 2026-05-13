import React from "react";
import { useFilters } from "../../providers/FilterProvider";
import "./FilterErrorToaster.css";

const FilterErrorToaster = () => {
  const { toasts, dismissToast } = useFilters();

  if (!toasts || toasts.length === 0) {
    return null;
  }

  return (
    <div className="filter-error-toaster" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`filter-toast filter-toast-${toast.type || "error"}`}
          role="alert">
          <div className="filter-toast-content">
            <div className="filter-toast-title">{toast.title || "Information"}</div>
            <div className="filter-toast-message">{toast.message}</div>
          </div>
          <button
            type="button"
            className="filter-toast-close"
            onClick={() => dismissToast(toast.id)}
            title="Fermer la notification"
            aria-label="Fermer la notification">
            <i className="fa fa-times" aria-hidden="true"></i>
          </button>
        </div>
      ))}
    </div>
  );
};

export default FilterErrorToaster;
