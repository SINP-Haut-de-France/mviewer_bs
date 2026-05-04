import React, { useEffect, useMemo, useState } from "react";
import PaginationControls from "./PaginationControls";
import { getTableWrapperStyle, paginateItems } from "./searchResults.utils";

const PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: "all", label: "Tous" },
];

const TaxonDetailComponent = ({
  details = [],
  selectionPrompt = false,
  selectionPromptMessage = "",
  loadingState = false,
  errorMessage = "",
}) => {
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [details, pageSize]);

  const paginatedDetails = useMemo(
    () => paginateItems(details, pageSize, page),
    [details, pageSize, page]
  );
  const tableWrapperStyle = useMemo(
    () =>
      getTableWrapperStyle(paginatedDetails.length, {
        headerHeight: 34,
        rowHeight: 42,
      }),
    [paginatedDetails.length]
  );

  if (!details.length && !selectionPrompt && !loadingState && !errorMessage) {
    return <p className="mv-sr-empty">Aucune observation détaillée disponible.</p>;
  }

  return (
    <div className="mv-sr-section">
      <PaginationControls
        items={details}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="taxons"
      />

      <div className="table-responsive mv-sr-table-wrapper" style={tableWrapperStyle}>
        <table className="table table-striped table-hover mv-sr-table">
          <thead>
            <tr>
              <th>Groupe taxonomique</th>
              <th>Espèce observée</th>
              <th>Dernière observation</th>
              <th>Nb. observations</th>
            </tr>
          </thead>
          <tbody>
            {selectionPrompt ? (
              <tr>
                <td colSpan="4" className="mv-sr-empty-row">
                  {selectionPromptMessage}
                </td>
              </tr>
            ) : loadingState ? (
              <tr>
                <td colSpan="4" className="mv-sr-loading-row">
                  <div className="mv-sr-table-loading" role="status" aria-live="polite">
                    <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                    <span>Chargement des observations...</span>
                  </div>
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td colSpan="4" className="mv-sr-empty-row">
                  {errorMessage}
                </td>
              </tr>
            ) : (
              paginatedDetails.map((detail, index) => (
                <tr key={`${detail?.cd_ref || detail?.nom_valide || "detail"}-${index}`}>
                  <td>
                    {detail?.group2_inpn ||
                      detail?.group1_inpn ||
                      detail?.group3_inpn ||
                      detail?.groupe_taxo ||
                      "-"}
                  </td>
                  <td>
                    <div>{detail?.nom_vern || "-"}</div>
                    <div className="mv-sr-latin-name">{detail?.nom_valide || ""}</div>
                  </td>
                  <td>{detail?.last_date_obs || "-"}</td>
                  <td>{detail?.nb_observations ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaxonDetailComponent;
