import React, { useEffect, useState } from "react";
import EntityNavigationControls from "./EntityNavigationControls";
import SearchResultsTabs from "./SearchResultsTabs";
import { getResultPanelTitle, TAB_IDS } from "./searchResults.utils";
import "./SearchResults.css";

const STATE_EVENT = "sinp:external-layer-observation-state";

const ExternalLayerObservationResultsComponent = ({ featureUid }) => {
  const [activeTab, setActiveTab] = useState(TAB_IDS.OBSERVATIONS);
  const [state, setState] = useState(
    () => window.externalLayersObs?.getState?.(featureUid) || null
  );

  useEffect(() => {
    setState(window.externalLayersObs?.getState?.(featureUid) || null);

    const handleStateChange = (event) => {
      if (String(event?.detail?.featureUid) === String(featureUid)) {
        setState(event.detail);
      }
    };

    window.addEventListener(STATE_EVENT, handleStateChange);
    return () => window.removeEventListener(STATE_EVENT, handleStateChange);
  }, [featureUid]);

  const panelTitle = getResultPanelTitle({
    selectionMode: state?.selectionMode === true,
    selectionLayerName: state?.layerName || state?.siteName,
    selectionEntityLabel: state?.currentEntity?.label || state?.siteName,
  });

  React.useEffect(() => {
    const headerH6 = document.querySelector("#right-panel .mv-header h6");
    if (headerH6 && state?.status === "success") {
      headerH6.textContent = panelTitle;
    }
  }, [panelTitle, state?.status]);

  if (!state || state.status === "cleared") {
    return null;
  }

  const loading = state.status === "loading";
  const errorMessage = state.status === "error" ? state.errorMessage : "";
  const currentIndex = Number.isInteger(state.currentIndex) ? state.currentIndex : 0;
  const entities = state.entities || [];

  return (
    <div className="mv-sr-root">
      <EntityNavigationControls
        currentIndex={currentIndex}
        total={entities.length}
        entityLabel={state.currentEntity?.label || ""}
        disabled={loading}
        onPrevious={() =>
          window.externalLayersObs?.selectEntity?.(featureUid, currentIndex - 1)
        }
        onNext={() =>
          window.externalLayersObs?.selectEntity?.(featureUid, currentIndex + 1)
        }
      />

      <SearchResultsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        properties={{}}
        details={state.currentDetails || []}
        jddDetails={state.currentMetadata || state.metadata || []}
        panelLabel={panelTitle}
        selectionPrompt={false}
        selectionPromptMessage=""
        loadingState={loading}
        errorMessage={errorMessage}
        datasetLoadingState={loading}
        datasetErrorMessage={errorMessage}
      />
    </div>
  );
};

export default ExternalLayerObservationResultsComponent;
