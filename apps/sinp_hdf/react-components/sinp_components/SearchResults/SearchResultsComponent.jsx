import React, { useEffect, useState } from "react";
import EntityNavigationControls from "./EntityNavigationControls";
import SearchResultsTabs from "./SearchResultsTabs";
import "./SearchResults.css";
import {
  getFeatureByUid,
  getFeatureProperties,
  getLayerConfig,
  getSelectedEntitySummary,
  getResultPanelTitle,
  SELECTION_PROMPT_MESSAGE,
  TAB_IDS,
} from "./searchResults.utils";

const FEATURE_INFO_DATA_CHANGED_EVENT = "sinp:feature-info-data-changed";

const SearchResultsComponent = ({
  layerId,
  featureUid,
  promptOnly = false,
  metadataInMaintenance = false,
}) => {
  const [activeTab, setActiveTab] = useState(TAB_IDS.OBSERVATIONS);
  const [feature, setFeature] = useState(() => getFeatureByUid(layerId, featureUid));
  const [isResolvingFeature, setIsResolvingFeature] = useState(false);
  const [, setFeatureRevision] = useState(0);

  useEffect(() => {
    let retryCount = 0;
    let retryTimer = null;
    let isCancelled = false;

    const resolveFeature = () => {
      const resolvedFeature = getFeatureByUid(layerId, featureUid);

      if (isCancelled) {
        return;
      }

      if (resolvedFeature || promptOnly) {
        setFeature(resolvedFeature);
        setIsResolvingFeature(false);
        return;
      }

      retryCount += 1;
      if (retryCount === 1) {
        setFeature(null);
      }

      setIsResolvingFeature(true);
      retryTimer = window.setTimeout(resolveFeature, retryCount < 50 ? 100 : 500);
    };

    resolveFeature();

    return () => {
      isCancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [layerId, featureUid, promptOnly]);

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

  useEffect(() => {
    const handleFeatureInfoDataChanged = (event) => {
      const eventLayerId = event?.detail?.layerId;
      const featureUids = Array.isArray(event?.detail?.featureUids)
        ? event.detail.featureUids.map((uid) => String(uid))
        : [];

      if (eventLayerId !== layerId) {
        return;
      }

      if (featureUid && featureUids.length > 0 && !featureUids.includes(String(featureUid))) {
        return;
      }

      const resolvedFeature = getFeatureByUid(layerId, featureUid);
      if (resolvedFeature) {
        setFeature(resolvedFeature);
      }
      setFeatureRevision((revision) => revision + 1);
    };

    window.addEventListener(FEATURE_INFO_DATA_CHANGED_EVENT, handleFeatureInfoDataChanged);

    return () => {
      window.removeEventListener(FEATURE_INFO_DATA_CHANGED_EVENT, handleFeatureInfoDataChanged);
    };
  }, [layerId, featureUid]);

  const layerConfig = getLayerConfig(layerId);
  const properties = feature
    ? getFeatureProperties(feature)
    : !promptOnly
      ? {
          code: "--",
          code_insee: "--",
          code_maille: "--",
          nb_observations: "-",
          entity_data_loading: true,
          entity_data_error: null,
          jdd_data_loading: true,
        }
      : {};
  const details = Array.isArray(properties.details) ? properties.details : [];
  const jddDetails = Array.isArray(properties.jdd_details) ? properties.jdd_details : [];
  const selectionSummary = getSelectedEntitySummary(layerId, properties, layerConfig);
  const loadingState = properties.entity_data_loading === true;
  const errorMessage =
    typeof properties.entity_data_error === "string" ? properties.entity_data_error : "";
  const datasetLoadingState = properties.jdd_data_loading === true;
  const datasetErrorMessage =
    typeof properties.jdd_data_error === "string" ? properties.jdd_data_error : "";
  const selectionPrompt = promptOnly === true;
  const navigationController = window.mviewer?.customControls?.[layerId];
  const navigationState =
    !selectionPrompt && feature
      ? navigationController?.getEntityNavigationState?.(feature) || null
      : null;

  const selectEntity = (index) => {
    navigationController?.selectEntityByIndex?.(index);
  };

  React.useEffect(() => {
    try {
      const headerH6 = document.querySelector('#right-panel .mv-header h6');
      if (headerH6) {
        headerH6.textContent = getResultPanelTitle({
          layerId,
          properties,
          selectionSummary,
          selectionMode: Boolean(window.__filterAPI?.currentFilters?.selectionMode),
        });
      }
    } catch (e) {
      // Ignore if the legacy panel is not mounted yet.
    }
  }, [layerId, properties, selectionSummary]);

  return (
    <div className="mv-sr-root">
      {navigationState ? (
        <EntityNavigationControls
          currentIndex={navigationState.currentIndex}
          total={navigationState.total}
          entityLabel={navigationState.entityLabel}
          disabled={loadingState || datasetLoadingState}
          onPrevious={() => selectEntity(navigationState.currentIndex - 1)}
          onNext={() => selectEntity(navigationState.currentIndex + 1)}
        />
      ) : null}

      <SearchResultsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        properties={properties}
        details={details}
        jddDetails={jddDetails}
        selectionSummary={selectionSummary}
        panelLabel={layerConfig.panelLabel}
        selectionPrompt={selectionPrompt}
        selectionPromptMessage={SELECTION_PROMPT_MESSAGE}
        loadingState={loadingState}
        errorMessage={errorMessage}
        datasetLoadingState={datasetLoadingState}
        datasetErrorMessage={datasetErrorMessage}
        metadataInMaintenance={metadataInMaintenance}
      />
    </div>
  );
};

export default SearchResultsComponent;
