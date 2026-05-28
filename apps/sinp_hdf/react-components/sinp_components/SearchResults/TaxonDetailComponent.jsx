import React from "react";
import SearchResultsTable from "./SearchResultsTable";
import { formatDisplayDate } from "../../utils/date.utils";

const PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: "all", label: "Tous" },
];

const getTaxonomicGroupLabel = (detail = {}) => {
  return (
    detail?.group2_inpn || detail?.group1_inpn || detail?.group3_inpn || detail?.groupe_taxo || "-"
  );
};

const TAXON_COLUMNS = [
  {
    id: "taxonomicGroup",
    label: "Groupe taxonomique",
    sortable: true,
    sortType: "text",
    getValue: (detail) => getTaxonomicGroupLabel(detail),
  },
  {
    id: "observedSpecies",
    label: "Espèce(s) observée(s)",
    sortable: true,
    sortType: "text",
    getValue: (detail) => detail?.nom_vern || detail?.nom_valide || "-",
    getSortValue: (detail) => [detail?.nom_vern || "", detail?.nom_valide || ""].join(" "),
    render: (detail) => (
      <>
        <div>{detail?.nom_vern || detail?.nom_valide || "-"}</div>
        <div className="mv-sr-latin-name">{detail?.nom_valide || ""}</div>
      </>
    ),
  },
  {
    id: "lastObservation",
    label: "Dernière observation",
    sortable: true,
    sortType: "date",
    getValue: (detail) => detail?.last_date_obs || null,
    render: (detail) => formatDisplayDate(detail?.last_date_obs),
  },
  {
    id: "observationCount",
    label: "Nb. observations",
    sortable: false,
    getValue: (detail) => detail?.nb_observations ?? "-",
  },
];

const TaxonDetailComponent = ({
  details = [],
  selectionSummary = null,
  selectionPrompt = false,
  selectionPromptMessage = "",
  loadingState = false,
  errorMessage = "",
}) => {
  if (!details.length && !selectionPrompt && !loadingState && !errorMessage) {
    return <p className="mv-sr-empty">Aucune observation détaillée disponible.</p>;
  }

  return (
    <div className="mv-sr-section">
      {!selectionPrompt && selectionSummary ? (
        <div className="mv-sr-selection-summary" aria-live="polite">
          <strong>Sélection courante :</strong> {selectionSummary.selectionLabel}
          <span className="mv-sr-selection-summary-separator" aria-hidden="true">
            -
          </span>
          <strong>Évènement(s) rattaché(s) :</strong> {selectionSummary.eventCount}
        </div>
      ) : null}

      <SearchResultsTable
        items={details}
        columns={TAXON_COLUMNS}
        rowKey={(detail, index) => `${detail?.cd_ref || detail?.nom_valide || "detail"}-${index}`}
        tableClassName="table table-striped table-hover mv-sr-table"
        itemLabel="taxons"
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        defaultPageSize={25}
        selectionPrompt={selectionPrompt}
        selectionPromptMessage={selectionPromptMessage}
        loadingState={loadingState}
        loadingMessage="Chargement des observations..."
        errorMessage={errorMessage}
        emptyMessage="Aucune observation détaillée disponible."
        groupBy={{
          columnId: "taxonomicGroup",
          label: "groupe taxonomique",
          toggleLabel: "Regrouper par groupe taxonomique",
          getValue: (detail) => getTaxonomicGroupLabel(detail),
          emptyLabel: "Groupe non renseigné",
        }}
      />
    </div>
  );
};

export default TaxonDetailComponent;
