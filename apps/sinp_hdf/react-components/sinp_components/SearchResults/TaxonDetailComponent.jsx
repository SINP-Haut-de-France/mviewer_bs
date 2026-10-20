import React from "react";
import SearchResultsTable from "./SearchResultsTable";
import { formatDisplayDate } from "../../utils/date.utils";
import "./TaxonDetailComponent.css";

const PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: "all", label: "Tous" },
];

// FOLDER_ICONS : chemin du dossier d'icônes relatif à l'URL de base de l'application
const getGroupIconUrl = (iconName) => {
  const folder =
    window.mviewer?.env?.[window.mviewer?.env?.CURRENT_ENV]?.FOLDER_ICONS || "";
  return `${folder.replace(/\/?$/, "/")}${iconName}`;
};

export const renderGroupIcon = (detail) => {
  const icon = detail?.icone_groupe_principal;
  if (!icon) return null;
  return (
    <img
      src={getGroupIconUrl(icon)}
      alt={detail?.nom_groupe_principal || ""}
      title={detail?.nom_groupe_principal || ""}
      className="mv-sr-group-icon"
    />
  );
};

export const GROUP_ICON_COLUMN = {
  id: "groupIcon",
  label: "",
  sortable: false,
  getValue: (detail) => detail?.icone_groupe_principal,
  render: renderGroupIcon,
};

export const OBSERVED_SPECIES_COLUMN = {
  id: "observedSpecies",
  label: "Taxon(s) observée(s)",
  sortable: true,
  sortType: "string",
  getValue: (detail) => detail?.nom_vern || detail?.nom_valide || "-",
  getSortValue: (detail) => [detail?.nom_vern || "", detail?.nom_valide || ""].join(" "),
  render: (detail) => {
    const content = (
      <>
        <div>{detail?.nom_vern || detail?.nom_valide || "-"}</div>
        <div className="mv-sr-latin-name">{detail?.nom_valide || ""}</div>
      </>
    );
    return detail?.external_url ? (
      <a href={detail.external_url} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    ) : (
      content
    );
  },
};

const TAXON_COLUMNS = [
  GROUP_ICON_COLUMN,
  OBSERVED_SPECIES_COLUMN,
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
    label: "Nb. de données",
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
        defaultSort={{ columnId: "observationCount", direction: "desc" }}
        selectionPrompt={selectionPrompt}
        selectionPromptMessage={selectionPromptMessage}
        loadingState={loadingState}
        loadingMessage="Chargement des données en cours..."
        errorMessage={errorMessage}
        emptyMessage="Aucune observation détaillée disponible."
        groupBy={{
          columnId: "groupIcon",
          label: "groupe taxonomique",
          toggleLabel: "Regrouper par groupe taxonomique",
          getValue: (detail) => detail?.nom_groupe_principal,
          renderIcon: renderGroupIcon,
          emptyLabel: "Groupe non renseigné",
        }}
      />
    </div>
  );
};

export default TaxonDetailComponent;
