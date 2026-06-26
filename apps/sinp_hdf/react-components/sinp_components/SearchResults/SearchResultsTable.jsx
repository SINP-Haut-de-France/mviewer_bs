import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  formatPageSizeValue,
  getTotalPages,
  getTableWrapperStyle,
  groupTableItems,
  paginateItems,
  parsePageSizeValue,
  sortTableItems,
} from "./searchResults.utils";

const SearchResultsTable = ({
  items = [],
  columns = [],
  rowKey,
  selectionPrompt = false,
  selectionPromptMessage = "",
  loadingState = false,
  loadingMessage = "Chargement des données en cours...",
  errorMessage = "",
  emptyMessage = "Aucune donnée disponible.",
  tableClassName = "table table-striped table-hover mv-sr-table",
  itemLabel = "éléments",
  pageSizeOptions = [],
  defaultPageSize = 25,
  groupBy = null,
  headerHeight = 34,
  rowHeight = 42,
}) => {
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const [displayMode, setDisplayMode] = useState("standard");
  const [expandedGroupKey, setExpandedGroupKey] = useState(null);
  const previousDisplayModeRef = useRef(displayMode);

  const visibleColumns = useMemo(() => {
    if (displayMode !== "grouped" || !groupBy?.columnId) {
      return columns;
    }

    return columns.filter((column) => column.id !== groupBy.columnId);
  }, [columns, displayMode, groupBy]);

  const sortedItems = useMemo(
    () => sortTableItems(items, columns, sortConfig),
    [items, columns, sortConfig]
  );
  const paginatedItems = useMemo(
    () => paginateItems(sortedItems, pageSize, page),
    [sortedItems, pageSize, page]
  );
  const groupedItems = useMemo(
    () => groupTableItems(items, groupBy, columns, sortConfig),
    [items, groupBy, columns, sortConfig]
  );
  const totalPages = getTotalPages(sortedItems, pageSize);

  useEffect(() => {
    setPage(1);
  }, [sortedItems, pageSize, displayMode]);

  useEffect(() => {
    if (displayMode !== "grouped") {
      previousDisplayModeRef.current = displayMode;
      return;
    }

    if (!groupedItems.length) {
      setExpandedGroupKey(null);
      previousDisplayModeRef.current = displayMode;
      return;
    }

    const isEnteringGroupedMode = previousDisplayModeRef.current !== "grouped";
    const hasExpandedGroup = groupedItems.some((group) => group.key === expandedGroupKey);
    if (isEnteringGroupedMode) {
      setExpandedGroupKey(groupedItems[0].key);
    } else if (expandedGroupKey !== null && !hasExpandedGroup) {
      setExpandedGroupKey(groupedItems[0].key);
    }

    previousDisplayModeRef.current = displayMode;
  }, [displayMode, expandedGroupKey, groupedItems]);

  const visibleRowCount = useMemo(() => {
    if (selectionPrompt || loadingState || errorMessage) {
      return 1;
    }

    if (displayMode === "grouped") {
      return groupedItems.reduce((count, group) => {
        return count + 1 + (expandedGroupKey === group.key ? group.items.length : 0);
      }, 0);
    }

    return paginatedItems.length;
  }, [
    selectionPrompt,
    loadingState,
    errorMessage,
    displayMode,
    groupedItems,
    expandedGroupKey,
    paginatedItems.length,
  ]);

  const tableWrapperStyle = useMemo(
    () =>
      getTableWrapperStyle(visibleRowCount, {
        headerHeight,
        rowHeight,
      }),
    [visibleRowCount, headerHeight, rowHeight]
  );

  const toggleSort = (columnId) => {
    setSortConfig((currentConfig) => {
      if (!currentConfig || currentConfig.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }

      return {
        columnId,
        direction: currentConfig.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const renderCellValue = (column, item) => {
    if (column.render) {
      return column.render(item);
    }

    const value = column.getValue?.(item);
    return value !== undefined && value !== null && String(value).trim() !== "" ? value : "-";
  };

  const renderTableRow = (item, index, keyPrefix = "") => (
    <tr key={`${keyPrefix}${rowKey(item, index)}`}>
      {visibleColumns.map((column) => (
        <td key={column.id}>{renderCellValue(column, item)}</td>
      ))}
    </tr>
  );

  if (!items.length && !selectionPrompt && !loadingState && !errorMessage) {
    return <p className="mv-sr-empty">{emptyMessage}</p>;
  }

  return (
    <div className="mv-sr-section">
      <div className="mv-sr-toolbar">
        {groupBy ? (
          <div className="mv-sr-display-mode" role="group" aria-label="Mode d'affichage">
            <button
              type="button"
              className={`mv-sr-display-button ${
                displayMode === "standard" ? "is-active" : ""
              }`}
              onClick={() => setDisplayMode("standard")}>
              Vue standard
            </button>
            <button
              type="button"
              className={`mv-sr-display-button ${
                displayMode === "grouped" ? "is-active" : ""
              }`}
              onClick={() => setDisplayMode("grouped")}>
              {groupBy.toggleLabel || `Regrouper par ${groupBy.label}`}
            </button>
          </div>
        ) : (
          <span />
        )}

        {displayMode === "standard" ? (
          <div className="mv-sr-pagination-cluster">
            <div className="mv-sr-page-size">
              <label htmlFor={`page-size-${itemLabel}`}>Afficher</label>
              <select
                id={`page-size-${itemLabel}`}
                value={formatPageSizeValue(pageSize)}
                onChange={(event) => setPageSize(parsePageSizeValue(event.target.value))}>
                {pageSizeOptions.map((option) => (
                  <option
                    key={formatPageSizeValue(option.value)}
                    value={formatPageSizeValue(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span>{itemLabel}</span>
            </div>

            <div className="mv-sr-pagination">
              <span className="mv-sr-page-status">
                {sortedItems.length} {itemLabel}
              </span>
              {pageSize !== "all" && totalPages > 1 ? (
                <>
                  <button
                    type="button"
                    className="mv-sr-page-button"
                    disabled={page <= 1}
                    onClick={() => setPage(Math.max(1, page - 1))}>
                    Précédent
                  </button>
                  <span className="mv-sr-page-status">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="mv-sr-page-button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(Math.min(totalPages, page + 1))}>
                    Suivant
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mv-sr-pagination">
            <span className="mv-sr-page-status">
              {groupedItems.length} groupes / {items.length} {itemLabel}
            </span>
          </div>
        )}
      </div>

      <div className="table-responsive mv-sr-table-wrapper" style={tableWrapperStyle}>
        <table className={tableClassName}>
          <thead>
            <tr>
              {visibleColumns.map((column) => {
                const isSorted = sortConfig?.columnId === column.id;
                const sortDirection = isSorted ? sortConfig.direction : null;

                return (
                  <th key={column.id}>
                    {column.sortable ? (
                      <button
                        type="button"
                        className="mv-sr-sort-button"
                        onClick={() => toggleSort(column.id)}>
                        <span>{column.label}</span>
                        <i
                          className={`fas ${
                            sortDirection === "asc"
                              ? "fa-sort-up"
                              : sortDirection === "desc"
                                ? "fa-sort-down"
                                : "fa-sort"
                          }`}
                          aria-hidden="true"></i>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {selectionPrompt || loadingState || errorMessage ? (
            <tbody>
              <tr>
                <td colSpan={visibleColumns.length} className={loadingState ? "mv-sr-loading-row" : "mv-sr-empty-row"}>
                  {loadingState ? (
                    <div className="mv-sr-table-loading" role="status" aria-live="polite">
                      <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                      <span>{loadingMessage}</span>
                    </div>
                  ) : selectionPrompt ? (
                    selectionPromptMessage
                  ) : (
                    errorMessage
                  )}
                </td>
              </tr>
            </tbody>
          ) : displayMode === "grouped" ? (
            groupedItems.map((group) => {
              const isExpanded = expandedGroupKey === group.key;

              return (
                <tbody key={group.key}>
                  <tr className="mv-sr-group-row">
                    <td colSpan={visibleColumns.length}>
                      <button
                        type="button"
                        className="mv-sr-group-toggle"
                        onClick={() =>
                          setExpandedGroupKey((currentKey) =>
                            currentKey === group.key ? null : group.key
                          )
                        }>
                        <span className="mv-sr-group-title">{group.label}</span>
                        <span className="mv-sr-group-count">
                          {group.items.length} {itemLabel}
                        </span>
                        <i
                          className={`fas ${
                            isExpanded ? "fa-chevron-down" : "fa-chevron-right"
                          }`}
                          aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                  {isExpanded
                    ? group.items.map((item, index) =>
                        renderTableRow(item, index, `${group.key}-`)
                      )
                    : null}
                </tbody>
              );
            })
          ) : (
            <tbody>
              {paginatedItems.map((item, index) => renderTableRow(item, index))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
};

export default SearchResultsTable;
