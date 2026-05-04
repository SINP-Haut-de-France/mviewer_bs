import React from "react";
import {
  formatPageSizeValue,
  getTotalPages,
  parsePageSizeValue,
} from "./searchResults.utils";

const PaginationControls = ({
  items = [],
  page,
  pageSize,
  pageSizeOptions = [],
  onPageChange,
  onPageSizeChange,
  itemLabel = "éléments",
}) => {
  const totalPages = getTotalPages(items, pageSize);
  const totalItems = items.length;

  return (
    <div className="mv-sr-toolbar">
      <div className="mv-sr-page-size">
        <label htmlFor={`page-size-${itemLabel}`}>Afficher</label>
        <select
          id={`page-size-${itemLabel}`}
          value={formatPageSizeValue(pageSize)}
          onChange={(event) => onPageSizeChange(parsePageSizeValue(event.target.value))}>
          {pageSizeOptions.map((option) => (
            <option key={formatPageSizeValue(option.value)} value={formatPageSizeValue(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
        <span>{itemLabel}</span>
      </div>

      <div className="mv-sr-pagination">
        <span className="mv-sr-page-status">
          {totalItems} {itemLabel}
        </span>
        {pageSize !== "all" && totalPages > 1 ? (
          <>
            <button
              type="button"
              className="mv-sr-page-button"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}>
              Précédent
            </button>
            <span className="mv-sr-page-status">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="mv-sr-page-button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
              Suivant
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PaginationControls;
