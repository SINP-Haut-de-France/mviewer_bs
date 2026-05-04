import React, { useEffect, useState } from "react";
import SearchResultsTabs from "./SearchResultsTabs";
import "./SearchResults.css";
import {
  getFeatureByUid,
  getFeatureProperties,
  getLayerConfig,
  SELECTION_PROMPT_MESSAGE,
  TAB_IDS,
} from "./searchResults.utils";

const SearchResultsComponent = ({ layerId, featureUid, promptOnly = false }) => {
  const [activeTab, setActiveTab] = useState(TAB_IDS.OBSERVATIONS);
  const [feature, setFeature] = useState(() => getFeatureByUid(layerId, featureUid));
  const [, setFeatureRevision] = useState(0);

  useEffect(() => {
    setFeature(getFeatureByUid(layerId, featureUid));
  }, [layerId, featureUid]);

  useEffect(() => {
    if (!feature?.on || !feature?.un) {
      return undefined;
    }

    const handleFeatureChange = () => {
      setFeatureRevision((revision) => revision + 1);
    };

    feature.on("change", handleFeatureChange);

    return () => {
      feature.un("change", handleFeatureChange);
    };
  }, [feature]);

  if (!feature && !promptOnly) {
    return <p className="mv-sr-empty">Impossible de retrouver la feature demandée.</p>;
  }

  const layerConfig = getLayerConfig(layerId);
  const properties = feature ? getFeatureProperties(feature) : {};
  const details = Array.isArray(properties.details) ? properties.details : [];
  const jddDetails = Array.isArray(properties.jdd_details) ? properties.jdd_details : [];
  const loadingState = properties.entity_data_loading === true;
  const errorMessage =
    typeof properties.entity_data_error === "string" ? properties.entity_data_error : "";
  const datasetLoadingState = properties.jdd_data_loading === true;
  const datasetErrorMessage =
    typeof properties.jdd_data_error === "string" ? properties.jdd_data_error : "";
  const selectionPrompt = promptOnly === true;

  useEffect(() => {
    if (
      promptOnly ||
      activeTab !== TAB_IDS.DATASETS ||
      !feature ||
      datasetLoadingState ||
      properties.jdd_data_loaded === true
    ) {
      return;
    }

    let isCancelled = false;
    const refreshFeatureState = () => {
      if (isCancelled) {
        return;
      }

      setFeature(getFeatureByUid(layerId, featureUid) || feature);
      setFeatureRevision((revision) => revision + 1);
    };

    const request = window.mviewer?.customControls?.[layerId]?.ensureMetadataForFeatures?.([
      feature,
    ]);

    refreshFeatureState();

    Promise.resolve(request)
      .catch(() => undefined)
      .finally(() => {
        refreshFeatureState();
      });

    return () => {
      isCancelled = true;
    };
  }, [
    activeTab,
    feature,
    featureUid,
    layerId,
    promptOnly,
    properties.jdd_data_loaded,
  ]);

  return (
    <div className="mv-sr-root">
      <SearchResultsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        properties={properties}
        details={details}
        jddDetails={jddDetails}
        panelLabel={layerConfig.panelLabel}
        selectionPrompt={selectionPrompt}
        selectionPromptMessage={SELECTION_PROMPT_MESSAGE}
        loadingState={loadingState}
        errorMessage={errorMessage}
        datasetLoadingState={datasetLoadingState}
        datasetErrorMessage={datasetErrorMessage}
      />
    </div>
  );
};

export default SearchResultsComponent;
