import React from "react";
import SearchResultsTable from "./SearchResultsTable";
import { formatDisplayDate } from "../../utils/date.utils";
import "./TaxonDetailComponent.css";

const PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: "all", label: "Tous" },
];

const TAXON_COLUMNS = [
  {
    id: "taxonomicGroup",
    label: "Groupe taxonomique",
    sortable: true,
    sortType: "string",
    getValue: (detail) => detail?.groupe_taxo,
  },
  {
    id: "observedSpecies",
    label: "Taxon(s) observée(s)",
    sortable: true,
    sortType: "string",
    getValue: (detail) => detail?.nom_vern || detail?.nom_valide || "-",
    getSortValue: (detail) =>
      [detail?.nom_vern || "", detail?.nom_valide || ""].join(" "),
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
    sortable: true,
    sortType: "number",
    getValue: (detail) => detail?.nb_observations ?? null,
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
        rowKey={(detail, index) =>
          `${detail?.cd_ref || detail?.nom_valide || "detail"}-${index}`
        }
        tableClassName="table table-striped table-hover mv-sr-table mv-sr-taxon-table"
        itemLabel="taxons"
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        defaultPageSize={25}
        selectionPrompt={selectionPrompt}
        selectionPromptMessage={selectionPromptMessage}
        loadingState={loadingState}
        loadingMessage="Chargement des données en cours..."
        errorMessage={errorMessage}
        emptyMessage="Aucune observation détaillée disponible."
        groupBy={{
          columnId: "taxonomicGroup",
          label: "groupe taxonomique",
          toggleLabel: "Regrouper par groupe taxonomique",
          getValue: (detail) => detail.groupe_taxo,
          emptyLabel: "Groupe non renseigné",
        }}
      />
    </div>
  );
};

export default TaxonDetailComponent;
