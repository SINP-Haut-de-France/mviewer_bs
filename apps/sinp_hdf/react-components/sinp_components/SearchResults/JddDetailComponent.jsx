import React, { useEffect, useMemo, useState } from "react";
import PaginationControls from "./PaginationControls";
import {
  buildMetadataUrl,
  getMetadataBaseUrl,
  getTableWrapperStyle,
  groupJddDetails,
  paginateItems,
} from "./searchResults.utils";

const PAGE_SIZE_OPTIONS = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: "all", label: "Tous" },
];

const JddDetailComponent = ({
  details = [],
  selectionPrompt = false,
  selectionPromptMessage = "",
  loadingState = false,
  errorMessage = "",
}) => {
  const groupedDetails = useMemo(() => groupJddDetails(details), [details]);
  const metadataBaseUrl = useMemo(() => getMetadataBaseUrl(), []);
  const getGestionnaireLabel = (item = {}) => {
    return item.organisme || item.identite || "INCONNU";
  };
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [groupedDetails, pageSize]);

  const visibleGroups = useMemo(
    () => paginateItems(groupedDetails, pageSize, page),
    [groupedDetails, pageSize, page]
  );
  const visibleRowCount = useMemo(() => {
    return visibleGroups.reduce((count, group) => count + 1 + group.datasets.length, 0);
  }, [visibleGroups]);
  const tableWrapperStyle = useMemo(
    () =>
      getTableWrapperStyle(visibleRowCount, {
        headerHeight: 34,
        rowHeight: 36,
      }),
    [visibleRowCount]
  );

  if (!groupedDetails.length && !selectionPrompt && !loadingState && !errorMessage) {
    return <p className="mv-sr-empty">Aucun jeu de données disponible.</p>;
  }

  return (
    <div className="mv-sr-section">
      <PaginationControls
        items={groupedDetails}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="Jeu(x) de données"
      />

      <div className="table-responsive mv-sr-table-wrapper" style={tableWrapperStyle}>
        <table className="table table-hover mv-sr-table">
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Gestionnaire</th>
            </tr>
          </thead>
          <tbody>
            {selectionPrompt ? (
              <tr>
                <td colSpan="2" className="mv-sr-empty-row">
                  {selectionPromptMessage}
                </td>
              </tr>
            ) : loadingState ? (
              <tr>
                <td colSpan="2" className="mv-sr-loading-row">
                  <div className="mv-sr-table-loading" role="status" aria-live="polite">
                    <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                    <span>Chargement des données en cours...</span>
                  </div>
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td colSpan="2" className="mv-sr-empty-row">
                  {errorMessage}
                </td>
              </tr>
            ) : (
              visibleGroups.map((group) => (
                <React.Fragment key={group.key}>
                  <tr className="mv-sr-ca-row">
                    <td>{group.libelCA}</td>
                    <td>{getGestionnaireLabel(group)}</td>
                  </tr>
                  {group.datasets.map((dataset) => {
                    const metadataUrl = buildMetadataUrl(
                      metadataBaseUrl,
                      dataset.metadataId || dataset.idJdd || group.metadataId || group.idCA
                    );

                    return (
                      <tr key={dataset.key} className="mv-sr-jdd-row">
                        <td>{dataset.libelJdd}</td>
                        <td>
                          <div className="mv-sr-jdd-manager-cell">
                            <span>{getGestionnaireLabel(dataset)}</span>
                            {metadataUrl ? (
                              <a
                                href={metadataUrl}
                                className="mv-sr-action-link"
                                title={`Ouvrir la fiche de metadonnees de ${dataset.libelJdd}`}
                                aria-label={`Ouvrir la fiche de metadonnees de ${dataset.libelJdd}`}
                                target="_blank"
                                rel="noopener noreferrer">
                                <i
                                  className="fas fa-external-link-alt"
                                  aria-hidden="true"></i>
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JddDetailComponent;
