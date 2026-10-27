import React, { useMemo, useState } from "react";
import SearchResultsTable from "./SearchResultsTable";
import {
  GROUP_ICON_COLUMN,
  OBSERVED_SPECIES_COLUMN,
  renderGroupIcon,
} from "./TaxonDetailComponent";
import { formatDisplayDate } from "../../utils/date.utils";
import "./TaxonDetailComponent.css";

const PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: "all", label: "Tous" },
];

const NOT_PROVIDED_LABEL = "NR";

const isEmptyValue = (value) => value === undefined || value === null || value === "";

export const formatIndividualCount = (detail) => {
  const min = isEmptyValue(detail?.denombrMin) ? null : Number(detail.denombrMin);
  const max = isEmptyValue(detail?.denombrMax) ? null : Number(detail.denombrMax);

  if (min === null && max === null) return NOT_PROVIDED_LABEL;
  if (min === null) return String(max);
  if (max === null || min >= max) return String(min);
  return `${min} à ${max}`;
};

const getIndividualCountSortValue = (detail) => {
  const min = isEmptyValue(detail?.denombrMin) ? null : Number(detail.denombrMin);
  const max = isEmptyValue(detail?.denombrMax) ? null : Number(detail.denombrMax);
  return min ?? max;
};

const toBoolean = (value) => {
  if (value === true || value === "true" || value === "t") return true;
  if (value === false || value === "false" || value === "f") return false;
  return null;
};

const getValidationStatus = (value) => {
  const flag = toBoolean(value);
  if (flag === true) return "valid";
  if (flag === false) return "invalid";
  return "unknown";
};

const renderValidationBadge = (label, flagValue, levelValue) => {
  const status = getValidationStatus(flagValue);
  const level = isEmptyValue(levelValue) ? NOT_PROVIDED_LABEL : String(levelValue);

  return (
    <span
      className={`mv-sr-validation-badge is-${status}`}
      title={level}
      aria-label={`${label} : ${level}`}>
      <span className="mv-sr-validation-dot" aria-hidden="true"></span>
      {label}
    </span>
  );
};

const DONNEES_COLUMNS = [
  GROUP_ICON_COLUMN,
  OBSERVED_SPECIES_COLUMN,
  {
    id: "observationDate",
    label: "Date d'observation",
    sortable: true,
    sortType: "date",
    getValue: (detail) => detail?.date_obs || null,
    render: (detail) => formatDisplayDate(detail?.date_obs),
  },
  {
    id: "individualCount",
    label: "Nb Individus",
    sortable: true,
    sortType: "number",
    getValue: formatIndividualCount,
    getSortValue: getIndividualCountSortValue,
  },
  {
    id: "validation",
    label: "Validation",
    sortable: false,
    getValue: (detail) => `${detail?.isValidateReg}-${detail?.isValidateNat}`,
    render: (detail) => (
      <span className="mv-sr-validation">
        {renderValidationBadge("Rég.", detail?.isValidateReg, detail?.nivValReg)}
        {renderValidationBadge("Nat.", detail?.isValidateNat, detail?.nivValNat)}
      </span>
    ),
  },
];

const DonneesDetailComponent = ({
  details = [],
  selectionPrompt = false,
  selectionPromptMessage = "",
  loadingState = false,
  errorMessage = "",
}) => {
  const [regionalOnly, setRegionalOnly] = useState(true);

  const visibleDetails = useMemo(
    () =>
      regionalOnly
        ? details.filter((detail) => toBoolean(detail?.isValidateReg) === true)
        : details,
    [details, regionalOnly]
  );
  const showNoRegionalDataMessage =
    regionalOnly &&
    details.length > 0 &&
    visibleDetails.length === 0 &&
    !selectionPrompt &&
    !loadingState &&
    !errorMessage;

  return (
    <div className="mv-sr-section">
      <div className="mv-sr-regional-filter">
        <label>
          <input
            type="checkbox"
            checked={regionalOnly}
            onChange={(event) => setRegionalOnly(event.target.checked)}
          />{" "}
          Evaluée au niveau régional uniquement
        </label>
      </div>
      <SearchResultsTable
        items={visibleDetails}
        columns={DONNEES_COLUMNS}
        rowKey={(detail, index) =>
          `${detail?.id_synthese || detail?.cd_ref || "obs"}-${index}`
        }
        tableClassName="table table-striped table-hover mv-sr-table mv-sr-taxon-table"
        itemLabel="observations"
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        defaultPageSize={50}
        defaultSort={{ columnId: "observationDate", direction: "desc" }}
        selectionPrompt={selectionPrompt}
        selectionPromptMessage={selectionPromptMessage}
        loadingState={loadingState}
        loadingMessage="Chargement des données en cours..."
        errorMessage={errorMessage}
        emptyMessage={
          showNoRegionalDataMessage ? (
            <span className="mv-sr-regional-filter-warning">
              Aucune donnée évaluée au niveau régional, veuillez décocher la checkbox pour
              voir l'intégralité des données
            </span>
          ) : (
            "Aucune observation disponible."
          )
        }
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

export default DonneesDetailComponent;
