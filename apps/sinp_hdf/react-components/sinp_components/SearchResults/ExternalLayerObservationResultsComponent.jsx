import React, { useEffect, useMemo, useState } from "react";
import SelectionSummary from "./SelectionSummary";
import EntityNavigationControls from "./EntityNavigationControls";
import SearchResultsTabs from "./SearchResultsTabs";
import { TAB_IDS } from "./searchResults.utils";
import "./SearchResults.css";

const STATE_EVENT = "sinp:external-layer-observation-state";

const buildSelectionSummary = (state) => {
  const details = state?.currentDetails || [];
  const eventCount = details.reduce((total, detail) => {
    const count = Number(detail?.nb_observations);
    return Number.isFinite(count) ? total + count : total;
  }, 0);
  const taxonCount = new Set(
    details
      .map((detail) => detail?.cd_ref || detail?.nom_valide)
      .filter((value) => value !== null && value !== undefined)
  ).size;
  const lastObservationDate = details.reduce((latest, detail) => {
    const candidate = detail?.last_date_obs;
    return candidate && (!latest || candidate > latest) ? candidate : latest;
  }, null);

  return {
    selectionLabel:
      state?.currentEntity?.label || state?.siteName || "Zonage environnemental",
    eventCount,
    taxonCount,
    lastObservationDate,
  };
};

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

  const selectionSummary = useMemo(
    () => (state?.status === "success" ? buildSelectionSummary(state) : null),
    [state]
  );

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

      {/* Résumé de sélection au niveau supérieur */}
      {selectionSummary ? (
        <SelectionSummary selectionSummary={selectionSummary} />
      ) : null}

      <SearchResultsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        properties={{}}
        details={state.currentDetails || []}
        jddDetails={state.currentMetadata || state.metadata || []}
        selectionSummary={selectionSummary}
        panelLabel={`Détails des observations de ${state.siteName || "ce site"}`}
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
