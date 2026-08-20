window.externalLayersObs = (function () {
  const STATE_EVENT = "sinp:external-layer-observation-state";
  const TARGET_LOC_CODES = {
    communeSearch: "2",
    gridSearch5x5: "7",
    grid10x10search: "6",
    gridSearch10x10: "6",
  };
  const ENTITY_SCOPE_BY_TARGET = {
    "2": {
      paramName: "communes",
      label: "Commune",
    },
    "6": {
      paramName: "mailles",
      label: "Maille 10 × 10 km",
    },
    "7": {
      paramName: "mailles",
      label: "Maille 5 × 5 km",
    },
  };
  const states = new Map();
  const entityFeatures = new Map();
  const activeRequests = new Map();
  let overlayLayer = null;
  let selectionLayer = null;
  let overlayClickMap = null;
  let overlayClickHandler = null;
  let selectedLayerVisibilitySubscription = null;
  let selectedFeatureUid = null;
  let requestSequence = 0;

  const _getConfiguredLayers = function () {
    const configuredLayers = window.mviewer?.env?.EXTERNAL_LAYERS_OBS;
    if (!Array.isArray(configuredLayers)) {
      console.error(
        "[EXTERNAL LAYERS OBS] La configuration EXTERNAL_LAYERS_OBS est absente."
      );
      return [];
    }

    return configuredLayers.filter(
      (layer) => layer && typeof layer.id === "string" && layer.id.trim() !== ""
    );
  };

  const _getConfiguredLayerIds = function () {
    return new Set(_getConfiguredLayers().map(({ id }) => id.trim()));
  };

  const _normalizeFeatureUid = function (featureUid) {
    return String(featureUid ?? "");
  };

  const _findFeature = function (featureUid) {
    const normalizedUid = _normalizeFeatureUid(featureUid);
    const features = window.info?.getQueriedFeatures?.() || [];
    const configuredLayerIds = _getConfiguredLayerIds();

    return (
      features.find((feature) => {
        const uid = feature?.ol_uid || feature?.get?.("feature_ol_uid");
        return (
          configuredLayerIds.has(feature?.get?.("mviewerid")) &&
          _normalizeFeatureUid(uid) === normalizedUid
        );
      }) || null
    );
  };

  const _getGeometryProjection = function (geometry) {
    const extent = geometry?.getExtent?.() || [];
    const looksGeographic =
      extent.length === 4 &&
      extent[0] >= -180 &&
      extent[2] <= 180 &&
      extent[1] >= -90 &&
      extent[3] <= 90;

    return looksGeographic
      ? "EPSG:4326"
      : window.mviewer?.getMap?.()?.getView?.()?.getProjection?.() || "EPSG:2154";
  };

  const _serializeGeometry = function (feature) {
    const geometry = feature?.getGeometry?.();
    const geometryType = geometry?.getType?.();

    if (!["Polygon", "MultiPolygon"].includes(geometryType)) {
      throw new Error("La géométrie complète du zonage est indisponible.");
    }

    return JSON.stringify(
      new ol.format.GeoJSON().writeGeometryObject(geometry, {
        featureProjection: _getGeometryProjection(geometry),
        dataProjection: "EPSG:4326",
      })
    );
  };

  const _setSearchLoading = function (visible) {
    const loader = mviewer.customLayers?.SinpBaseLayer;
    if (!loader) {
      return;
    }

    const options = {
      blockMap: true,
      message: "Chargement des observations du zonage…",
    };

    if (visible) {
      loader._startServerRenderLoad(options);
      return;
    }

    loader._finishServerRenderLoad(options);
  };

  const _syncRightPanelRevealHandle = function () {
    mviewer.customLayers?.communeSearch?._instance?._syncPanelRevealHandle?.(
      "right-panel"
    );
  };

  const _collapseRightPanel = function () {
    const panel = window.jQuery?.("#right-panel");
    if (!panel?.length) {
      return;
    }

    panel.removeClass("active");
    _syncRightPanelRevealHandle();
  };

  const _expandRightPanel = function () {
    const panel = window.jQuery?.("#right-panel");
    if (!panel?.length) {
      return;
    }

    panel.addClass("active");
    _syncRightPanelRevealHandle();
  };

  const _fitFeatures = function (features = []) {
    mviewer.customLayers?.communeSearch?._instance?.fitToFeatures?.(features);
  };

  const _publishState = function (featureUid, state) {
    const normalizedUid = _normalizeFeatureUid(featureUid);
    const nextState = {
      featureUid: normalizedUid,
      ...state,
    };

    states.set(normalizedUid, nextState);
    window.dispatchEvent(
      new CustomEvent(STATE_EVENT, {
        detail: nextState,
      })
    );
  };

  const _extractProperties = function (payload) {
    return (payload?.features || []).map((feature) => feature?.properties || {});
  };

  const _getEntityCode = function (source = {}) {
    const code =
      source.code_insee ||
      source.code_maille ||
      source.code ||
      source.id_maille ||
      source.maille ||
      source.cd_sig;

    return code === undefined || code === null ? "" : String(code).trim();
  };

  const _getEntityLabel = function (properties = {}, targetLocCode) {
    const code = _getEntityCode(properties);
    const name =
      properties.libelle ||
      properties.nom_commune ||
      properties.commune_name ||
      properties.nom_min ||
      properties.nom_maj;
    const typeLabel = ENTITY_SCOPE_BY_TARGET[targetLocCode]?.label || "Entité";

    if (name && code) {
      return `${name} (${code})`;
    }

    return name || code || typeLabel;
  };

  const _groupDetailsByEntity = function (details = []) {
    return details.reduce((groups, detail) => {
      const code = _getEntityCode(detail);
      if (!code) {
        return groups;
      }

      if (!groups.has(code)) {
        groups.set(code, []);
      }
      groups.get(code).push(detail);
      return groups;
    }, new Map());
  };

  const _chunk = function (items = [], size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  };

  const _fetchEntityFeatures = async function (
    requestParams,
    detailsByEntity,
    targetLocCode
  ) {
    const scope = ENTITY_SCOPE_BY_TARGET[targetLocCode];
    if (!scope) {
      return [];
    }

    const entityCodes = Array.from(detailsByEntity.keys());
    const payloads = [];
    const requestBatches = _chunk(entityCodes, 6);
    for (const codes of requestBatches) {
      const batchPayloads = await Promise.all(
        codes.map((code) => {
          const params = {
            ...requestParams,
            geometryGeojson: undefined,
            communes: [],
            mailles: [],
            [scope.paramName]: [code],
            targetLocCode,
          };
          const options = window.sinpQueryBuilder.buildRequestOptions(
            params,
            "fn_get_stats"
          );
          return window.sinpRepository.fetchGeoServerData(options);
        })
      );
      payloads.push(...batchPayloads);
    }
    const format = new ol.format.GeoJSON();

    return payloads.flatMap((payload) =>
      format.readFeatures(
        payload || { type: "FeatureCollection", features: [] }
      )
    );
  };

  const _createOverlayStyle = function (selected) {
    return new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: selected ? "rgba(250, 204, 21, 1)" : "rgba(14, 116, 144, 0.95)",
        width: selected ? 3 : 2,
      }),
      fill: new ol.style.Fill({
        color: selected
          ? "rgba(250, 204, 21, 0.35)"
          : "rgba(14, 116, 144, 0.16)",
      }),
      zIndex: selected ? 1001 : 900,
    });
  };

  const _ensureSelectionLayer = function () {
    if (!selectionLayer) {
      selectionLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "rgba(250, 204, 21, 1)",
            width: 4,
          }),
          fill: new ol.style.Fill({
            color: "rgba(250, 204, 21, 0.18)",
          }),
          zIndex: 1100,
        }),
      });
      selectionLayer.set("name", "sinp-selected-environmental-zoning");
      selectionLayer.set("queryable", false);
      selectionLayer.setZIndex(1100);
    }

    const map = mviewer.getMap?.();
    const mapLayers = map?.getLayers?.()?.getArray?.() || [];
    if (map && !mapLayers.includes(selectionLayer)) {
      map.addLayer(selectionLayer);
    }

    return selectionLayer;
  };

  const _highlightSelection = function (feature) {
    const geometry = feature?.getGeometry?.();
    const layer = _ensureSelectionLayer();
    layer.getSource().clear();

    if (geometry?.clone) {
      layer.getSource().addFeature(
        new ol.Feature({
          geometry: geometry.clone(),
        })
      );
    }
  };

  const _stopWatchingSelectedLayer = function () {
    if (!selectedLayerVisibilitySubscription) {
      return;
    }

    const { layer, handler } = selectedLayerVisibilitySubscription;
    layer.un?.("change:visible", handler);
    selectedLayerVisibilitySubscription = null;
  };

  const _watchSelectedLayer = function (layerId) {
    _stopWatchingSelectedLayer();
    const layer = mviewer.getLayers?.()?.[layerId]?.layer;
    if (!layer?.on || !layer?.un) {
      return;
    }

    const handler = () => {
      if (layer.getVisible?.()) {
        return;
      }

      clearSelection();
    };
    layer.on("change:visible", handler);
    selectedLayerVisibilitySubscription = { layer, handler };
  };

  const _ensureOverlayLayer = function () {
    if (!overlayLayer) {
      const regularStyle = _createOverlayStyle(false);
      const selectedStyle = _createOverlayStyle(true);
      overlayLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: (feature) =>
          feature.get("sinp_external_layer_selected") === true
            ? selectedStyle
            : regularStyle,
      });
      overlayLayer.set("name", "sinp-external-layer-restitution-entities");
      overlayLayer.set("queryable", false);
      overlayLayer.setZIndex(900);
    }

    const map = mviewer.getMap?.();
    const mapLayers = map?.getLayers?.()?.getArray?.() || [];
    if (map && !mapLayers.includes(overlayLayer)) {
      map.addLayer(overlayLayer);
    }

    if (map && overlayClickMap !== map) {
      if (overlayClickMap && overlayClickHandler) {
        overlayClickMap.un("singleclick", overlayClickHandler);
      }

      overlayClickHandler = (event) => {
        const selectedFeature = map.forEachFeatureAtPixel(
          event.pixel,
          (feature, layer) => (layer === overlayLayer ? feature : null),
          {
            layerFilter: (layer) => layer === overlayLayer,
          }
        );

        if (!selectedFeature) {
          return;
        }

        const featureUid = selectedFeature.get("sinp_external_layer_feature_uid");
        const entityIndex = selectedFeature.get("sinp_external_layer_entity_index");
        selectEntity(featureUid, entityIndex);
      };
      map.on("singleclick", overlayClickHandler);
      overlayClickMap = map;
    }

    return overlayLayer;
  };

  const _setOverlayFeatures = function (featureUid, features = []) {
    const layer = _ensureOverlayLayer();
    const source = layer.getSource();
    source.clear();

    features.forEach((feature, index) => {
      feature.set("sinp_external_layer_feature_uid", _normalizeFeatureUid(featureUid));
      feature.set("sinp_external_layer_entity_index", index);
      feature.set("sinp_external_layer_selected", index === 0);
    });
    source.addFeatures(features);
  };

  const _clearExistingRestitutions = function () {
    const layerIds =
      typeof SinpBaseCustom !== "undefined"
        ? SinpBaseCustom.SEARCH_LAYER_IDS
        : [];
    const clearedInstances = new Set();

    layerIds.forEach((layerId) => {
      const instance = mviewer.customLayers?.[layerId]?._instance;
      if (instance && !clearedInstances.has(instance)) {
        clearedInstances.add(instance);
        instance.clear?.();
      }

      const legendItem = $(
        `#layers-container .list-group-item[data-layerid="${layerId}"]`
      );
      if (!legendItem.length) {
        return;
      }

      if (typeof mviewer.removeLayer === "function") {
        mviewer.removeLayer(legendItem);
      } else {
        legendItem.remove();
      }
    });
  };

  const _buildEntities = function (
    featureUid,
    features,
    detailsByEntity,
    metadata,
    targetLocCode
  ) {
    const matchedCodes = new Set();
    const resolvedFeatures = features
      .map((feature) => {
        const properties = feature.getProperties?.() || {};
        const code = _getEntityCode(properties);
        const details = detailsByEntity.get(code) || [];
        if (!code || details.length === 0) {
          return null;
        }

        matchedCodes.add(code);
        feature.set("details", details);
        feature.set("jdd_details", metadata);
        return feature;
      })
      .filter(Boolean);

    detailsByEntity.forEach((details, code) => {
      if (matchedCodes.has(code)) {
        return;
      }

      const feature = new ol.Feature({
        code,
        details,
        jdd_details: metadata,
      });
      resolvedFeatures.push(feature);
    });

    resolvedFeatures.sort((left, right) =>
      _getEntityLabel(left.getProperties(), targetLocCode).localeCompare(
        _getEntityLabel(right.getProperties(), targetLocCode),
        "fr",
        { sensitivity: "base" }
      )
    );
    entityFeatures.set(_normalizeFeatureUid(featureUid), resolvedFeatures);

    return resolvedFeatures.map((feature) => {
      const properties = feature.getProperties?.() || {};
      return {
        code: _getEntityCode(properties),
        label: _getEntityLabel(properties, targetLocCode),
      };
    });
  };

  const selectEntity = function (featureUid, index) {
    const normalizedUid = _normalizeFeatureUid(featureUid);
    const state = states.get(normalizedUid);
    const features = entityFeatures.get(normalizedUid) || [];

    if (
      !state ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= features.length
    ) {
      return;
    }

    features.forEach((feature, featureIndex) => {
      feature.set("sinp_external_layer_selected", featureIndex === index);
    });
    overlayLayer?.getSource?.()?.changed?.();

    const selectedFeature = features[index];
    _publishState(featureUid, {
      ...state,
      currentIndex: index,
      currentEntity: state.entities[index],
      currentDetails: selectedFeature.get("details") || [],
      currentMetadata: selectedFeature.get("jdd_details") || state.metadata || [],
    });
  };

  const _loadResults = async function (feature, featureUid, params, layerId) {
    if (!window.sinpQueryBuilder?.buildRequestOptions) {
      throw new Error("Le constructeur de requêtes SINP est indisponible.");
    }
    if (!window.sinpRepository?.fetchGeoServerData) {
      throw new Error("Le service de requêtes SINP est indisponible.");
    }

    const wholeSelection = layerId === "selection";
    const targetLocCode = TARGET_LOC_CODES[layerId];
    if (!wholeSelection && !targetLocCode) {
      throw new Error("Le type de restitution sélectionné n'est pas pris en charge.");
    }

    const requestParams = {
      ...params,
      geometryGeojson: _serializeGeometry(feature),
      ...(targetLocCode ? { targetLocCode } : {}),
    };
    const detailsOptions = window.sinpQueryBuilder.buildRequestOptions(
      requestParams,
      "fn_get_obs_detaillee_for_geometry"
    );
    const metadataOptions = window.sinpQueryBuilder.buildRequestOptions(
      requestParams,
      "fn_get_metadonnees_for_geometry"
    );
    const normalizedUid = _normalizeFeatureUid(featureUid);
    const requestId = ++requestSequence;
    activeRequests.set(normalizedUid, requestId);
    entityFeatures.delete(normalizedUid);
    overlayLayer?.getSource?.()?.clear?.();
    _clearExistingRestitutions();
    _collapseRightPanel();
    _setSearchLoading(true);

    _publishState(featureUid, {
      status: "loading",
      siteName: feature.get("nom_site") || "Zonage environnemental",
      entities: [],
      currentIndex: 0,
      currentEntity: null,
      currentDetails: [],
      currentMetadata: [],
      metadata: [],
      errorMessage: "",
    });

    try {
      const [detailsPayload, metadataPayload] = await Promise.all([
        window.sinpRepository.fetchGeoServerData(detailsOptions),
        window.sinpRepository.fetchGeoServerData(metadataOptions),
      ]);

      if (activeRequests.get(normalizedUid) !== requestId) {
        return;
      }

      const details = _extractProperties(detailsPayload);
      const metadata = _extractProperties(metadataPayload);

      if (wholeSelection) {
        const siteName = feature.get("nom_site") || "Zonage environnemental";
        const entity = {
          code: normalizedUid,
          label: siteName,
        };
        entityFeatures.delete(normalizedUid);
        overlayLayer?.getSource?.()?.clear?.();
        _publishState(featureUid, {
          status: "success",
          siteName,
          entities: [entity],
          currentIndex: 0,
          currentEntity: entity,
          currentDetails: details,
          currentMetadata: metadata,
          metadata,
          errorMessage: "",
        });
        _fitFeatures([feature]);
        _expandRightPanel();
        return;
      }

      const detailsByEntity = _groupDetailsByEntity(details);
      const features = await _fetchEntityFeatures(
        requestParams,
        detailsByEntity,
        targetLocCode
      );

      if (activeRequests.get(normalizedUid) !== requestId) {
        return;
      }

      const entities = _buildEntities(
        featureUid,
        features,
        detailsByEntity,
        metadata,
        targetLocCode
      );
      const resolvedFeatures = entityFeatures.get(normalizedUid) || [];
      _setOverlayFeatures(featureUid, resolvedFeatures);
      _fitFeatures(resolvedFeatures);
      const firstFeature = resolvedFeatures[0] || null;

      _publishState(featureUid, {
        status: "success",
        siteName: feature.get("nom_site") || "Zonage environnemental",
        entities,
        currentIndex: 0,
        currentEntity: entities[0] || null,
        currentDetails: firstFeature?.get("details") || [],
        currentMetadata: firstFeature?.get("jdd_details") || metadata,
        metadata,
        errorMessage: "",
      });
      _expandRightPanel();
    } catch (error) {
      if (activeRequests.get(normalizedUid) === requestId) {
        entityFeatures.delete(normalizedUid);
        overlayLayer?.getSource?.()?.clear?.();
        _publishState(featureUid, {
          status: "error",
          siteName: feature.get("nom_site") || "Zonage environnemental",
          entities: [],
          currentIndex: 0,
          currentEntity: null,
          currentDetails: [],
          currentMetadata: [],
          metadata: [],
          errorMessage:
            error?.userMessage ||
            error?.message ||
            "Impossible de charger les observations du site.",
        });
      }
      throw error;
    } finally {
      _setSearchLoading(false);
      _syncRightPanelRevealHandle();
    }
  };

  const open = function (featureUid) {
    const feature = _findFeature(featureUid);
    if (!feature) {
      mviewer.alert(
        "Impossible de retrouver le zonage sélectionné.",
        "alert-danger"
      );
      return;
    }

    try {
      _serializeGeometry(feature);
    } catch (error) {
      mviewer.alert(error.message, "alert-danger");
      return;
    }

    if (!window.reactComponentManager?.openFilterModal) {
      mviewer.alert("La fenêtre de filtrage est indisponible.", "alert-danger");
      return;
    }

    const layerId = feature.get("mviewerid");
    const layerLabel =
      mviewer.getLayers?.()?.[layerId]?.name || "Zonage environnemental";
    const featureLabel = feature.get("nom_site") || layerLabel;
    clearSelection();
    selectedFeatureUid = _normalizeFeatureUid(featureUid);
    _highlightSelection(feature);
    selectionLayer?.setVisible?.(true);
    _watchSelectedLayer(layerId);

    const selectionContext = {
      featureUid: selectedFeatureUid,
      layerId,
      layerLabel,
      featureLabel,
    };
    const onSelectionSubmit = async (params, restitutionLayerId) => {
      try {
        await _loadResults(feature, featureUid, params, restitutionLayerId);
      } catch (error) {
        console.error("[ZONAGE] Impossible de charger les observations.", error);
        throw error;
      }
    };

    if (window.reactComponentManager.setZoningSelection) {
      window.reactComponentManager.setZoningSelection(
        selectionContext,
        onSelectionSubmit
      );
      return;
    }

    window.reactComponentManager.openFilterModal({
      activeLayerId: "communeSearch",
      filterProfile: null,
      selectionContext,
      onSelectionSubmit,
    });
  };

  const clearSelection = function () {
    _stopWatchingSelectedLayer();
    selectionLayer?.getSource?.()?.clear?.();
    overlayLayer?.getSource?.()?.clear?.();
    entityFeatures.clear();
    activeRequests.clear();

    if (selectedFeatureUid) {
      states.delete(selectedFeatureUid);
      window.dispatchEvent(
        new CustomEvent(STATE_EVENT, {
          detail: {
            featureUid: selectedFeatureUid,
            status: "cleared",
          },
        })
      );
    }
    selectedFeatureUid = null;
  };

  const setSelectionActive = function (active) {
    selectionLayer?.setVisible?.(Boolean(active));
  };

  const handleInfoPanelReady = function () {
    const filters = window.__filterAPI?.currentFilters;
    if (!filters?.selectionMode || !filters.selectedSelectionLayerId) {
      return;
    }

    const feature = (window.info?.getQueriedFeatures?.() || []).find(
      (candidate) =>
        candidate?.get?.("mviewerid") === filters.selectedSelectionLayerId
    );
    const featureUid = feature?.ol_uid || feature?.get?.("feature_ol_uid");
    if (!featureUid || _normalizeFeatureUid(featureUid) === selectedFeatureUid) {
      return;
    }

    open(featureUid);
  };

  if (typeof document !== "undefined") {
    document.addEventListener("infopanel-ready", handleInfoPanelReady);
  }

  return {
    open,
    clearSelection,
    setSelectionActive,
    selectEntity,
    getState: (featureUid) => states.get(_normalizeFeatureUid(featureUid)) || null,
    stateEvent: STATE_EVENT,
  };
})();
