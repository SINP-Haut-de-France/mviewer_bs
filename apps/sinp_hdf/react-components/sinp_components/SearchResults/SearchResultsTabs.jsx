import React from "react";
import JddDetailComponent from "./JddDetailComponent";
import TaxonDetailComponent from "./TaxonDetailComponent";
import { TAB_IDS } from "./searchResults.utils";

const TAB_DEFINITIONS = [
  { id: TAB_IDS.OBSERVATIONS, label: "Taxon(s) observé(s)" },
  { id: TAB_IDS.DATASETS, label: "Métadonnées" },
];

const SearchResultsTabs = ({
  activeTab,
  onTabChange,
  properties,
  details,
  jddDetails,
  selectionSummary,
  panelLabel,
  selectionPrompt,
  selectionPromptMessage,
  loadingState = false,
  errorMessage = "",
  datasetLoadingState = false,
  datasetErrorMessage = "",
}) => {
  return (
    <>
      <div className="mv-sr-tabs" role="tablist" aria-label={panelLabel}>
        {TAB_DEFINITIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`mv-sr-tab ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => onTabChange(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mv-sr-panel">
        {activeTab === TAB_IDS.OBSERVATIONS ? (
          <TaxonDetailComponent
            details={details}
            selectionSummary={selectionSummary}
            selectionPrompt={selectionPrompt}
            selectionPromptMessage={selectionPromptMessage}
            loadingState={loadingState}
            errorMessage={errorMessage}
          />
        ) : null}
        {activeTab === TAB_IDS.DATASETS ? (
          <JddDetailComponent
            details={jddDetails}
            selectionPrompt={selectionPrompt}
            selectionPromptMessage={selectionPromptMessage}
            loadingState={datasetLoadingState}
            errorMessage={datasetErrorMessage}
          />
        ) : null}
      </div>
    </>
  );
};

export default SearchResultsTabs;
