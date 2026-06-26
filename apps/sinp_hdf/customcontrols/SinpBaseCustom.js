class SinpBaseCustom {
  static MAX_SELECTED_DEPARTMENTS = 1;

  static MAX_SELECTED_COMMUNES = 5;

  static SEARCH_RESULT_CACHE = new Map();

  static SEARCH_RESULT_REQUESTS = new Map();

  static DEFAULT_PARAMETERS = {
    BASEURL: `${mviewer.env?.[mviewer.env?.CURRENT_ENV]?.GEOSERVER_BASE_URL}/wfs`,
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    outputFormat: "application/json",
    srsName: "EPSG:2154",
  };

  static SEARCH_LAYER_IDS = [
    "communeSearch",
    "advancedSearch",
    "gridSearch5x5",
    "grid10x10search",
    "gridSearch10x10",
  ];

  constructor(config = {}) {
    this.layerId = config.layerId;
    this.mainTypeName = config.mainTypeName;
    this.detailsTypeName = config.detailsTypeName || null;
    this.metadataTypeName = config.metadataTypeName || config.jddDetailsTypeName || null;
    this.targetLocCode = config.targetLocCode || null;
    const defaultEntityCodeKeys = [
      "code_insee",
      "insee_com",
      "code_maille",
      "id_maille",
      "maille",
      "code",
      "codeLocali",
      "cd_sig",
      "adm_id",
      "commune_id",
      "communeId",
      "ref_dep",
    ];
    this.entityCodeKeys = Array.from(
      new Set([...(config.entityCodeKeys || []), ...defaultEntityCodeKeys])
    );
    this.format = new ol.format.GeoJSON();
    this._lastSearchParams = null;
    this._dataCache = new Map();
    this._dataRequests = new Map();
    this._featureInfoRenderToken = 0;
    this._selectionRequestInFlight = false;
    this._searchRequestInFlight = false;
    this._lastResultFeatures = [];
    this._activeSearchLoaderMessages = [];
    this._boundMapClickHandler = this._handleMapClick.bind(this);
    this._mapClickHandlerRegistered = false;
  }

  getLayerInstance() {
    return mviewer.customLayers?.[this.layerId]?._instance || null;
  }

  _activateSearchLayer() {
    const layerConfig = mviewer.getLayer?.(this.layerId);
    const layer = layerConfig?.layer;

    if (!layer) {
      return;
    }

    if (!layer.getVisible?.()) {
      if (typeof mviewer.addLayer === "function" && layerConfig.showintoc) {
        mviewer.addLayer(layerConfig);
      } else {
        layer.setVisible(true);
      }
    }
  }

  _clearOtherSearchLayers() {
    const currentLayerInstance = this.getLayerInstance();

    this.constructor.SEARCH_LAYER_IDS.forEach((layerId) => {
      if (layerId === this.layerId) {
        return;
      }

      const layerInstance = mviewer.customLayers?.[layerId]?._instance;
      if (!layerInstance || layerInstance === currentLayerInstance) {
        return;
      }

      layerInstance.clear?.();
    });
  }

  _buildQueryURL(options = {}) {
    const finalParams = { ...this.constructor.DEFAULT_PARAMETERS, ...options };
    let url = `${finalParams.BASEURL}?`;

    Object.keys(finalParams).forEach((key) => {
      if (key !== "BASEURL" && key !== "VIEWPARAMS") {
        url += `&${key}=${encodeURIComponent(finalParams[key])}`;
      }
    });

    if (finalParams.VIEWPARAMS) {
      const sanitizedViewParams = String(finalParams.VIEWPARAMS)
        .replace(/^;+|;+$/g, "")
        .replace(/;;+/g, ";");
      // Compat legacy: si un pipe subsiste dans VIEWPARAMS, on le conserve encodé.
      const encodedViewParams = sanitizedViewParams.replace(/\|/g, "%7C");
      url += `&VIEWPARAMS=${encodedViewParams}`;
    }

    return url;
  }

  buildRequestOptions(params, typeName = this.mainTypeName) {
    const resolvedTypeName = this._resolveRequestTypeName(typeName, this.mainTypeName);
    return sinpQueryBuilder.buildRequestOptions(params, resolvedTypeName);
  }

  async fetchGeoServerData(options) {
    const typenamePattern = sinpQueryBuilder?.qualifiedTypeNamePattern;
    if (
      !options ||
      !options.TYPENAME ||
      (typenamePattern && !typenamePattern.test(String(options.TYPENAME).trim()))
    ) {
      throw new Error(`[${this.layerId}] options de requete invalides`);
    }

    if (window.sinpRepository?.fetchGeoServerData) {
      return sinpRepository.fetchGeoServerData(options);
    }

    const url = this._buildQueryURL(options);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  _normalizeInputParams(params = {}) {
    return params;
  }

  _shouldFetchMainFeatures() {
    return !this.getLayerInstance()?.serverRenderOnly;
  }

  init() {
    const layerInstance = this.getLayerInstance();
    if (!layerInstance?.serverRenderOnly) {
      return;
    }

    layerInstance._ensureServerRenderLayer?.();

    const map = mviewer.getMap();
    if (!map || this._mapClickHandlerRegistered) {
      return;
    }

    map.on("singleclick", this._boundMapClickHandler);
    this._mapClickHandlerRegistered = true;
  }

  destroy() {
    const map = mviewer.getMap();
    if (map && this._mapClickHandlerRegistered) {
      map.un("singleclick", this._boundMapClickHandler);
    }

    this._mapClickHandlerRegistered = false;
    this._lastResultFeatures = [];
  }

  _resolveRequestTypeName(primaryTypeName, fallbackTypeName = null) {
    if (typeof primaryTypeName === "string" && primaryTypeName.trim() !== "") {
      return primaryTypeName.trim();
    }

    if (typeof fallbackTypeName === "string" && fallbackTypeName.trim() !== "") {
      return fallbackTypeName.trim();
    }

    return primaryTypeName;
  }

  async _handleMapClick(evt) {
    if (this._searchRequestInFlight) {
      return;
    }

    if (!Array.isArray(evt?.coordinate)) {
      return;
    }

    window.setTimeout(() => {
      this._querySelectedFeature(evt.coordinate);
    }, 0);
  }

  _deferFeatureInfoRender(layerInstance, features = []) {
    const renderToken = ++this._featureInfoRenderToken;
    window.setTimeout(() => {
      if (renderToken !== this._featureInfoRenderToken) {
        return;
      }

      layerInstance.showFeatureInfo(features);
    }, 0);
  }

  _resetDataCache() {
    this._dataCache.clear();
    this._dataRequests.clear();
  }

  _normalizeCacheValue(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => this._normalizeCacheValue(item))
        .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    }

    if (value && typeof value === "object") {
      return Object.keys(value)
        .sort()
        .reduce((accumulator, key) => {
          if (key === "forceRefresh" || key === "__forceRefresh") {
            return accumulator;
          }

          accumulator[key] = this._normalizeCacheValue(value[key]);
          return accumulator;
        }, {});
    }

    return value;
  }

  _getSearchResultCacheKey(params = {}, mainOptions = {}) {
    return JSON.stringify({
      layerId: this.layerId,
      typeName: mainOptions?.TYPENAME || this.mainTypeName || "",
      viewParams: mainOptions?.VIEWPARAMS || "",
      cqlFilter: mainOptions?.CQL_FILTER || "",
      params: this._normalizeCacheValue(params),
    });
  }

  _shouldForceSearchRefresh(params = {}, options = {}) {
    return (
      options.forceRefresh === true ||
      params.forceRefresh === true ||
      params.__forceRefresh === true
    );
  }

  _getCachedSearchResult(cacheKey, forceRefresh = false) {
    if (!cacheKey || forceRefresh) {
      return null;
    }

    return this.constructor.SEARCH_RESULT_CACHE.get(cacheKey) || null;
  }

  _setCachedSearchResult(cacheKey, result) {
    if (!cacheKey) {
      return;
    }

    this.constructor.SEARCH_RESULT_CACHE.set(cacheKey, result);
  }

  _getSearchResultRequest(cacheKey, forceRefresh = false) {
    if (!cacheKey || forceRefresh) {
      return null;
    }

    return this.constructor.SEARCH_RESULT_REQUESTS.get(cacheKey) || null;
  }

  _setSearchResultRequest(cacheKey, request) {
    if (!cacheKey) {
      return;
    }

    this.constructor.SEARCH_RESULT_REQUESTS.set(cacheKey, request);
  }

  _clearSearchResultRequest(cacheKey) {
    if (!cacheKey) {
      return;
    }

    this.constructor.SEARCH_RESULT_REQUESTS.delete(cacheKey);
  }

  _setLastResultFeatures(features = []) {
    this._lastResultFeatures = Array.isArray(features) ? features.filter(Boolean) : [];
  }

  _getLastResultFeatures() {
    return this._lastResultFeatures;
  }

  _getDataRequestCacheKey(params = {}, typeName) {
    if (!typeName) {
      return null;
    }

    const options = this.buildRequestOptions(params, typeName);
    return JSON.stringify({
      typeName,
      viewParams: options?.VIEWPARAMS || "",
      cqlFilter: options?.CQL_FILTER || "",
    });
  }

  async _fetchPropertiesWithCache(params, typeName) {
    if (!typeName) {
      return [];
    }

    const cacheKey = this._getDataRequestCacheKey(params, typeName);

    if (cacheKey && this._dataCache.has(cacheKey)) {
      return this._dataCache.get(cacheKey);
    }

    if (cacheKey && this._dataRequests.has(cacheKey)) {
      return this._dataRequests.get(cacheKey);
    }

    const request = this.fetchGeoServerData(this.buildRequestOptions(params, typeName))
      .then((data) => {
        const properties =
          data?.features?.map((feature) => feature.properties || {}) || [];

        if (cacheKey) {
          this._dataCache.set(cacheKey, properties);
          this._dataRequests.delete(cacheKey);
        }

        return properties;
      })
      .catch((error) => {
        if (cacheKey) {
          this._dataRequests.delete(cacheKey);
        }
        throw error;
      });

    if (cacheKey) {
      this._dataRequests.set(cacheKey, request);
    }

    return request;
  }

  _setBlockingSearchOverlayVisible(visible, options = {}) {
    const loader = mviewer.customLayers?.SinpBaseLayer;
    if (!loader) {
      return;
    }

    const message = options.message || "Chargement des données de recherche…";

    if (visible) {
      this._activeSearchLoaderMessages.push(message);
      loader._startServerRenderLoad({
        blockMap: true,
        message,
      });
      return;
    }

    loader._finishServerRenderLoad({
      blockMap: true,
      message: this._activeSearchLoaderMessages.pop() || message,
    });
  }

  _normalizeStandardFilters(params = {}) {
    const departements = this._normalizeDepartmentCodes(
      params.filteredDepartments || params.departements || []
    );
    const communes = this._normalizeCommuneCodes(
      params.filteredCommunes || params.communes || []
    );

    if (departements.length > this.constructor.MAX_SELECTED_DEPARTMENTS) {
      throw new Error("Un seul département peut être sélectionné.");
    }

    if (communes.length > this.constructor.MAX_SELECTED_COMMUNES) {
      throw new Error("Vous pouvez sélectionner au maximum 5 communes.");
    }

    const epcis =
      params.filteredEpcis ||
      params.filteredEPCI ||
      params.filteredEPCIIds ||
      params.filteredEpciIds ||
      params.epcis ||
      params.epciIds ||
      params.EPCI_IDS ||
      [];

    const taxons = Array.isArray(params.filteredTaxons)
      ? params.filteredTaxons.map((taxon) =>
          typeof taxon === "object" && taxon?.cd_ref ? taxon.cd_ref : taxon
        )
      : params.taxons || [];

    return {
      communes,
      departements,
      epcis,
      groupes: params.filteredGroupes || params.groupes || [],
      taxons,
      dateDeb: params.dateDeb || null,
      dateFin: params.dateFin || null,
      targetLocCode: params.targetLocCode || this.targetLocCode || null,
    };
  }

  _normalizeCodeList(values, normalizer) {
    const sourceValues = Array.isArray(values) ? values : [values];
    const normalizedValues = [];
    const seenValues = new Set();

    sourceValues.forEach((value) => {
      const normalizedValue = normalizer.call(this, value);
      if (normalizedValue && !seenValues.has(normalizedValue)) {
        seenValues.add(normalizedValue);
        normalizedValues.push(normalizedValue);
      }
    });

    return normalizedValues;
  }

  _extractDepartmentCode(value) {
    if (value === undefined || value === null) {
      return null;
    }

    const rawValue =
      typeof value === "object" && value?.code_dpt !== undefined ? value.code_dpt : value;
    const normalizedValue = String(rawValue).trim().toUpperCase();

    if (normalizedValue === "") {
      return null;
    }

    return /^(?:\d{2,3}|2A|2B)$/.test(normalizedValue) ? normalizedValue : null;
  }

  _normalizeDepartmentCodes(values) {
    return this._normalizeCodeList(values, this._extractDepartmentCode);
  }

  _normalizeCommuneCodes(values) {
    return this._normalizeCodeList(values, (value) => {
      const rawValue =
        typeof value === "object" && value?.code_insee !== undefined
          ? value.code_insee
          : value;
      return this._extractCommuneCode(rawValue);
    });
  }

  _normalizeGridCodes(values) {
    return this._normalizeCodeList(values, this._extractGridCode);
  }

  _getResolvedTargetLocCode(params = {}) {
    return params.targetLocCode || this.targetLocCode || null;
  }

  _extractGridCode(value) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = String(value).trim();
    if (normalizedValue === "") {
      return null;
    }

    return normalizedValue;
  }

  _extractCommuneCode(value) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = String(value).trim().toUpperCase();
    if (normalizedValue === "") {
      return null;
    }

    return /^(?:\d{5}|2A\d{3}|2B\d{3})$/.test(normalizedValue) ? normalizedValue : null;
  }

  _expandEntityKeyVariants(value, params = {}) {
    if (value === undefined || value === null) {
      return [];
    }

    const normalizedValue = String(value).trim();
    if (normalizedValue === "") {
      return [];
    }

    const resolvedTargetLocCode = this._getResolvedTargetLocCode(params);
    const variants = [];
    const addVariant = (candidate) => {
      if (
        candidate !== undefined &&
        candidate !== null &&
        candidate !== "" &&
        !variants.includes(candidate)
      ) {
        variants.push(candidate);
      }
    };

    addVariant(normalizedValue);
    addVariant(normalizedValue.toUpperCase());

    if (resolvedTargetLocCode === "6" || resolvedTargetLocCode === "7") {
      addVariant(this._extractGridCode(normalizedValue));
    }

    return variants;
  }

  _getEntityJoinValues(source, candidates, accessor, params = {}) {
    const candidateList = Array.isArray(candidates) ? candidates : [candidates];
    const values = [];

    for (const candidate of candidateList) {
      const value = accessor(source, candidate);
      this._expandEntityKeyVariants(value, params).forEach((normalizedValue) => {
        if (!values.includes(normalizedValue)) {
          values.push(normalizedValue);
        }
      });
    }

    return values;
  }

  _getDetailRequestScopeConfig(params = {}) {
    const resolvedTargetLocCode = this._getResolvedTargetLocCode(params);

    if (resolvedTargetLocCode === "2") {
      return {
        paramName: "communes",
        featureKeys: ["code_insee", "code"],
        normalizeValue: (value) => this._extractCommuneCode(value),
      };
    }

    if (resolvedTargetLocCode === "6" || resolvedTargetLocCode === "7") {
      return {
        paramName: "mailles",
        featureKeys: [
          "code_maille",
          "id_maille",
          "maille",
          "code",
          "codeLocali",
          "cd_sig",
        ],
        normalizeValue: (value) => this._extractGridCode(value),
      };
    }

    return null;
  }

  _normalizeSelectedFeature(feature, params = this._lastSearchParams || {}) {
    if (!feature?.getProperties || !feature?.getGeometry) {
      return feature;
    }

    const scopeConfig = this._getDetailRequestScopeConfig(params);
    const properties = feature.getProperties();
    const normalizedFeature = new ol.Feature({
      ...properties,
      geometry: feature.getGeometry()?.clone?.() || feature.getGeometry(),
    });

    if (!scopeConfig) {
      return normalizedFeature;
    }

    const selectedCode = this._extractSelectedEntityCode(feature, params);
    if (!selectedCode) {
      return normalizedFeature;
    }

    if (scopeConfig.paramName === "communes") {
      normalizedFeature.set("code_insee", selectedCode);
      normalizedFeature.set("code", selectedCode);
      return normalizedFeature;
    }

    if (scopeConfig.paramName === "mailles") {
      normalizedFeature.set("code_maille", selectedCode);
      normalizedFeature.set("maille", selectedCode);
      normalizedFeature.set("code", selectedCode);
    }

    return normalizedFeature;
  }

  _extractSelectedEntityCode(feature, params = this._lastSearchParams || {}) {
    if (!feature?.get) {
      return null;
    }

    const scopeConfig = this._getDetailRequestScopeConfig(params);
    if (!scopeConfig) {
      return null;
    }

    for (const key of this.entityCodeKeys) {
      const normalizedValue = scopeConfig.normalizeValue(feature.get(key));
      if (normalizedValue) {
        return normalizedValue;
      }
    }

    return null;
  }

  async _fetchSelectionFeatures(coordinate) {
    const layerInstance = this.getLayerInstance();
    if (!layerInstance?.fetchServerRenderFeatures) {
      return [];
    }

    return layerInstance.fetchServerRenderFeatures(coordinate);
  }

  async _querySelectedFeature(coordinate) {
    const layerInstance = this.getLayerInstance();
    if (
      this._searchRequestInFlight ||
      !layerInstance?._canQueryServerRender() ||
      !this._lastSearchParams
    ) {
      return;
    }

    try {
      layerInstance.showFeatureInfoLoading?.();
      const features = await this._fetchSelectionFeatures(coordinate);

      if (!features.length) {
        layerInstance.setSelectedFeatures([]);
        layerInstance.setFeatureInfoFeatures?.([]);
        layerInstance.showSelectionPromptPanel?.();
        return;
      }

      const selectedFeature = this._findCachedResultFeature(
        this._normalizeSelectedFeature(features[0], this._lastSearchParams),
        this._lastSearchParams
      );
      const detailParams = this._buildDetailRequestParams(
        [selectedFeature],
        this._lastSearchParams,
        {
          preferFeatureScope: true,
        }
      );

      if (detailParams === this._lastSearchParams) {
        layerInstance.setSelectedFeatures([]);
        layerInstance.setFeatureInfoFeatures?.([]);
        layerInstance.showSelectionPromptPanel?.();
        return;
      }

      const previousParams = this._lastSearchParams;
      this._lastSearchParams = detailParams;

      try {
        await this.handle([selectedFeature]);
      } finally {
        this._lastSearchParams = previousParams;
      }
    } catch (error) {
      console.error(`[${this.layerId}] Error during WMS GetFeatureInfo:`, error);
      if (typeof mviewer.alert === "function") {
        mviewer.alert(
          "Impossible d'interroger la couche GeoServer pour cette sélection.",
          "alert-danger"
        );
      }
    }
  }

  _findCachedResultFeature(feature, params = this._lastSearchParams || {}) {
    if (!feature?.get) {
      return feature;
    }

    const joinConfig = this._getResultJoinConfig(params);
    if (!joinConfig) {
      return feature;
    }

    const featureKeys = this._getEntityJoinValues(
      feature,
      joinConfig.featureKey,
      (source, candidate) => source?.get(candidate),
      params
    );
    if (!featureKeys.length) {
      return feature;
    }

    const featureKeySet = new Set(featureKeys);
    const cachedFeature =
      this._getLastResultFeatures().find((candidateFeature) => {
        const candidateKeys = this._getEntityJoinValues(
          candidateFeature,
          joinConfig.featureKey,
          (source, candidate) => source?.get(candidate),
          params
        );

        return candidateKeys.some((candidateKey) => featureKeySet.has(candidateKey));
      }) || null;

    return cachedFeature || feature;
  }

  _buildDetailRequestParams(features = [], params = {}, options = {}) {
    const scopeConfig = this._getDetailRequestScopeConfig(params);
    if (!scopeConfig) {
      return params;
    }

    const preferFeatureScope = options.preferFeatureScope === true;
    const explicitScopedValues =
      scopeConfig.paramName === "communes"
        ? this._normalizeCommuneCodes(params.communes || [])
        : this._normalizeGridCodes(params.mailles || []);

    if (explicitScopedValues.length > 0 && !preferFeatureScope) {
      const scopedParams =
        scopeConfig.paramName === "mailles"
          ? {
              ...params,
              departements: [],
              communes: [],
            }
          : { ...params };

      return {
        ...scopedParams,
        [scopeConfig.paramName]: explicitScopedValues,
      };
    }

    const scopedValues = [];
    const seenValues = new Set();

    features.forEach((feature) => {
      if (!feature?.get) {
        return;
      }

      scopeConfig.featureKeys.forEach((key) => {
        const value = feature.get(key);
        const normalizedValue = scopeConfig.normalizeValue(value);
        if (normalizedValue && !seenValues.has(normalizedValue)) {
          seenValues.add(normalizedValue);
          scopedValues.push(normalizedValue);
        }
      });
    });

    if (!scopedValues.length) {
      return params;
    }

    const scopedParams =
      scopeConfig.paramName === "mailles"
        ? {
            ...params,
            departements: [],
            communes: [],
          }
        : { ...params };

    return {
      ...scopedParams,
      [scopeConfig.paramName]: scopedValues,
    };
  }

  async _loadDetailProperties(params, typeName = this.detailsTypeName) {
    return this._fetchPropertiesWithCache(params, typeName);
  }

  async _loadMetadataProperties(params, typeName = this.metadataTypeName) {
    return this._fetchPropertiesWithCache(params, typeName);
  }

  _normalizeJddIds(value) {
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => this._normalizeJddIds(item))
        .filter((item, index, values) => values.indexOf(item) === index);
    }

    if (value === undefined || value === null) {
      return [];
    }

    return String(value)
      .split(/[|_,]/)
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }

  _getFeatureJddIds(feature) {
    if (!feature?.get) {
      return [];
    }

    const rawValue =
      feature.get("jdd_ids") ??
      feature.get("jddIds") ??
      feature.get("idJdds") ??
      feature.get("id_jdds");

    return Array.from(new Set(this._normalizeJddIds(rawValue)));
  }

  _buildMetadataRequestParams(features = []) {
    const jddIds = [];
    const seenIds = new Set();

    features.forEach((feature) => {
      this._getFeatureJddIds(feature).forEach((jddId) => {
        if (!seenIds.has(jddId)) {
          seenIds.add(jddId);
          jddIds.push(jddId);
        }
      });
    });

    return { jddIds };
  }

  _attachMetadataPropertiesToFeatures(features = [], metadataProperties = []) {
    const propertiesByJddId = metadataProperties.reduce((accumulator, item) => {
      const jddId =
        item?.idJdd === undefined || item?.idJdd === null
          ? null
          : String(item.idJdd).trim();

      if (!jddId) {
        return accumulator;
      }

      if (!accumulator[jddId]) {
        accumulator[jddId] = [];
      }

      accumulator[jddId].push(item);
      return accumulator;
    }, {});

    features.forEach((feature) => {
      const matches = [];
      const seenMatches = new Set();

      this._getFeatureJddIds(feature).forEach((jddId) => {
        (propertiesByJddId[jddId] || []).forEach((item) => {
          if (!seenMatches.has(item)) {
            seenMatches.add(item);
            matches.push(item);
          }
        });
      });

      feature.set("jdd_details", matches);
    });

    return features;
  }

  async _attachPropertiesToFeatures(mainFeatures, propertiesLoader, params, config = {}) {
    const {
      typeName = null,
      mode = "all",
      featureKey = null,
      detailKey = null,
      targetProperty = "details",
    } = config;

    if (!typeName || mainFeatures.length === 0) {
      return mainFeatures;
    }

    const properties = await propertiesLoader.call(this, params, typeName);

    return this._attachResolvedPropertiesToFeatures(mainFeatures, properties, params, {
      mode,
      featureKey,
      detailKey,
      targetProperty,
    });
  }

  _attachResolvedPropertiesToFeatures(mainFeatures, properties = [], params, config = {}) {
    const {
      mode = "all",
      featureKey = null,
      detailKey = null,
      targetProperty = "details",
    } = config;

    if (!properties.length) {
      return mainFeatures;
    }

    if (mode === "match" && featureKey && detailKey) {
      const propertiesByEntityId = properties.reduce((accumulator, item) => {
        const keys = this._getEntityJoinValues(
          item,
          detailKey,
          (source, candidate) => source?.[candidate],
          params
        );

        if (!keys.length) {
          return accumulator;
        }

        keys.forEach((key) => {
          if (!accumulator[key]) {
            accumulator[key] = [];
          }

          accumulator[key].push(item);
        });

        return accumulator;
      }, {});

      mainFeatures.forEach((feature) => {
        const keys = this._getEntityJoinValues(
          feature,
          featureKey,
          (source, candidate) => source?.get(candidate),
          params
        );
        const matches = [];
        const seenMatches = new Set();

        keys.forEach((key) => {
          (propertiesByEntityId[key] || []).forEach((item) => {
            if (!seenMatches.has(item)) {
              seenMatches.add(item);
              matches.push(item);
            }
          });
        });

        feature.set(targetProperty, matches);
      });

      return mainFeatures;
    }

    mainFeatures.forEach((feature) => feature.set(targetProperty, properties));
    return mainFeatures;
  }

  _initializeFeatureCollections(mainFeatures = []) {
    mainFeatures.forEach((feature) => {
      if (!Array.isArray(feature.get("details"))) {
        feature.set("details", []);
      }
      if (!Array.isArray(feature.get("jdd_details"))) {
        feature.set("jdd_details", []);
      }
      feature.set("entity_data_loading", false);
      feature.set("entity_data_error", null);
      feature.set("entity_data_loaded", false);
      feature.set("jdd_data_loading", false);
      feature.set("jdd_data_error", null);
      feature.set("jdd_data_loaded", false);
    });

    return mainFeatures;
  }

  _shouldLoadEntityDataImmediately(params = {}) {
    return false;
  }

  _shouldPrefetchEntityDataOnSubmit(params = {}) {
    return false;
  }

  _shouldUseBlockingSearchOverlay(params = {}) {
    const hasCommunes = Array.isArray(params.communes) && params.communes.length > 0;
    const hasEpcis = Array.isArray(params.epcis) && params.epcis.length > 0;
    const hasDepartments =
      Array.isArray(params.departements) && params.departements.length > 0;

    return hasDepartments || (!hasCommunes && !hasEpcis);
  }

  _getResultJoinConfig(params = {}) {
    const resolvedTargetLocCode = this._getResolvedTargetLocCode(params);

    if (resolvedTargetLocCode === "2") {
      return {
        featureKey: ["code_insee", "code", "adm_id", "commune_id", "communeId"],
        detailKey: ["code_insee", "code", "adm_id", "commune_id", "communeId"],
      };
    }

    if (resolvedTargetLocCode === "6" || resolvedTargetLocCode === "7") {
      return {
        featureKey: [
          "code_maille",
          "id_maille",
          "maille",
          "code",
          "adm_id",
          "codeLocali",
          "cd_sig",
        ],
        detailKey: [
          "code_maille",
          "id_maille",
          "maille",
          "code",
          "adm_id",
          "codeLocali",
          "cd_sig",
        ],
      };
    }

    return null;
  }

  async _ensureEntityData(features = [], params = this._lastSearchParams || {}) {
    const normalizedFeatures = Array.isArray(features) ? features.filter(Boolean) : [];
    const detailParams = this._buildDetailRequestParams(normalizedFeatures, params);
    const joinConfig = this._getResultJoinConfig(detailParams);

    await this._attachPropertiesToFeatures(
      normalizedFeatures,
      this._loadDetailProperties,
      detailParams,
      {
        typeName: this.detailsTypeName,
        mode: joinConfig ? "match" : "all",
        featureKey: joinConfig?.featureKey || null,
        detailKey: joinConfig?.detailKey || null,
        targetProperty: "details",
      }
    );

    normalizedFeatures.forEach((feature) => {
      feature.set("entity_data_loading", false);
      feature.set("entity_data_error", null);
      feature.set("entity_data_loaded", true);
    });

    return normalizedFeatures;
  }

  async _prefetchEntityDataForSearch(
    features = [],
    params = this._lastSearchParams || {},
    prefetchedProperties = null
  ) {
    const normalizedFeatures = Array.isArray(features) ? features.filter(Boolean) : [];
    if (!normalizedFeatures.length || !this._shouldPrefetchEntityDataOnSubmit(params)) {
      return normalizedFeatures;
    }

    const joinConfig = this._getResultJoinConfig(params);
    const properties =
      prefetchedProperties ??
      (await this._loadDetailProperties(params, this.detailsTypeName));

    this._attachResolvedPropertiesToFeatures(normalizedFeatures, properties || [], params, {
      mode: joinConfig ? "match" : "all",
      featureKey: joinConfig?.featureKey || null,
      detailKey: joinConfig?.detailKey || null,
      targetProperty: "details",
    });

    normalizedFeatures.forEach((feature) => {
      feature.set("entity_data_loading", false);
      feature.set("entity_data_error", null);
      feature.set("entity_data_loaded", true);
    });

    return normalizedFeatures;
  }

  async ensureMetadataForFeatures(features = [], params = this._lastSearchParams || {}) {
    const normalizedFeatures = Array.isArray(features) ? features.filter(Boolean) : [];
    if (!normalizedFeatures.length || !this.metadataTypeName) {
      return normalizedFeatures;
    }

    const pendingFeatures = normalizedFeatures.filter((feature) => {
      return (
        feature.get("jdd_data_loaded") !== true &&
        feature.get("jdd_data_loading") !== true
      );
    });

    if (!pendingFeatures.length) {
      return normalizedFeatures;
    }

    pendingFeatures.forEach((feature) => {
      feature.set("jdd_details", []);
      feature.set("jdd_data_loading", true);
      feature.set("jdd_data_error", null);
      feature.set("jdd_data_loaded", false);
    });

    try {
      const metadataParams = this._buildMetadataRequestParams(pendingFeatures, params);
      const metadataProperties =
        metadataParams.jddIds.length > 0
          ? await this._loadMetadataProperties(metadataParams, this.metadataTypeName)
          : [];

      if (metadataProperties.length > 0) {
        this._attachMetadataPropertiesToFeatures(pendingFeatures, metadataProperties);
      }

      pendingFeatures.forEach((feature) => {
        feature.set("jdd_data_loading", false);
        feature.set("jdd_data_error", null);
        feature.set("jdd_data_loaded", true);
      });
    } catch (error) {
      pendingFeatures.forEach((feature) => {
        feature.set("jdd_data_loading", false);
        feature.set(
          "jdd_data_error",
          "Impossible de charger les jeux de donnees pour cette entite."
        );
        feature.set("jdd_data_loaded", false);
      });
      throw error;
    }

    return normalizedFeatures;
  }

  async _enrichSearchFeatures(mainFeatures, params, context = {}) {
    this._initializeFeatureCollections(mainFeatures);

    if (!this._shouldLoadEntityDataImmediately(params)) {
      if (!this._shouldPrefetchEntityDataOnSubmit(params)) {
        return mainFeatures;
      }

      return this._prefetchEntityDataForSearch(
        mainFeatures,
        params,
        context.prefetchedDetails ?? null
      );
    }

    return this._ensureEntityData(mainFeatures, params);
  }

  openReactFilterModal(options = {}) {
    if (!window.reactComponentManager?.openFilterModal) {
      console.error("openFilterModal n'est pas disponible.");
      return;
    }

    window.reactComponentManager.openFilterModal({
      activeLayerId: this.layerId,
      onSubmit: (params) => this.submit(params),
      ...options,
    });
  }

  async _enrichMainFeatures(mainFeatures, params, context = {}) {
    return this._enrichSearchFeatures(mainFeatures, params, context);
  }

  _prefetchMetadataForFeatures(layerInstance, features = []) {
    if (!this.metadataTypeName) {
      return;
    }

    Promise.resolve(this.ensureMetadataForFeatures(features, this._lastSearchParams))
      .catch((error) => {
        console.error(`[${this.layerId}] Error during metadata loading:`, error);
      })
      .finally(() => {
        this._deferFeatureInfoRender(layerInstance, features);
      });
  }

  async handle(features = []) {
    const layerInstance = this.getLayerInstance();
    if (!layerInstance) {
      throw new Error(`Layer introuvable pour ${this.layerId}`);
    }

    const normalizedFeatures = Array.isArray(features) ? features.filter(Boolean) : [];
    if (!normalizedFeatures.length) {
      return;
    }

    if (this._selectionRequestInFlight) {
      return;
    }

    layerInstance.setSelectedFeatures?.(normalizedFeatures);
    if (layerInstance.serverRenderOnly) {
      layerInstance.setFeatureInfoFeatures?.(normalizedFeatures);
    }

    if (!this._lastSearchParams) {
      this._deferFeatureInfoRender(layerInstance, normalizedFeatures);
      return;
    }

    const alreadyLoaded = normalizedFeatures.every((feature) => {
      return (
        feature.get("entity_data_loaded") === true &&
        feature.get("entity_data_loading") !== true &&
        !feature.get("entity_data_error")
      );
    });

    if (alreadyLoaded) {
      this._deferFeatureInfoRender(layerInstance, normalizedFeatures);
      this._prefetchMetadataForFeatures(layerInstance, normalizedFeatures);
      return;
    }

    this._selectionRequestInFlight = true;

    try {
      normalizedFeatures.forEach((feature) => {
        feature.set("details", []);
        feature.set("entity_data_loading", true);
        feature.set("entity_data_error", null);
        feature.set("entity_data_loaded", false);
      });
      this._deferFeatureInfoRender(layerInstance, normalizedFeatures);

      await this._ensureEntityData(normalizedFeatures, this._lastSearchParams);
      this._deferFeatureInfoRender(layerInstance, normalizedFeatures);
      this._prefetchMetadataForFeatures(layerInstance, normalizedFeatures);
    } catch (error) {
      normalizedFeatures.forEach((feature) => {
        feature.set("entity_data_loading", false);
        feature.set(
          "entity_data_error",
          "Impossible de charger le detail pour cette entite."
        );
        feature.set("entity_data_loaded", false);
      });
      this._deferFeatureInfoRender(layerInstance, normalizedFeatures);
      throw error;
    } finally {
      this._selectionRequestInFlight = false;
    }
  }

  async _renderSearchResult(layerInstance, features = [], mainOptions = {}, mainData = null) {
    const normalizedFeatures = Array.isArray(features) ? features.filter(Boolean) : [];

    this._setLastResultFeatures(normalizedFeatures);

    if (normalizedFeatures.length === 0) {
      layerInstance.clear();
      return mainData;
    }

    if (layerInstance.serverRenderOnly) {
      layerInstance.fitToFeatures?.(normalizedFeatures);
      await layerInstance.renderServerOnly(mainOptions);
      return mainData;
    }

    if (this._shouldLoadEntityDataImmediately(this._lastSearchParams || {})) {
      await layerInstance.renderFeatures(normalizedFeatures, mainOptions);
      return mainData;
    }

    await layerInstance.showSelectionPrompt(normalizedFeatures, mainOptions);
    return mainData;
  }

  async _loadSearchResultInMemory(params = {}, options = {}) {
    const layerInstance = this.getLayerInstance();
    if (!layerInstance) {
      throw new Error(`Layer introuvable pour ${this.layerId}`);
    }

    const normalizedParams = this._normalizeInputParams(params);
    const mainTypeName = this._resolveRequestTypeName(
      this.mainTypeName,
      layerInstance?.typeName
    );
    const mainOptions = this.buildRequestOptions(normalizedParams, mainTypeName);
    const forceRefresh = this._shouldForceSearchRefresh(params, options);
    const cacheKey = this._getSearchResultCacheKey(normalizedParams, mainOptions);
    const cachedResult = this._getCachedSearchResult(cacheKey, forceRefresh);

    if (cachedResult) {
      return cachedResult;
    }

    const pendingRequest = this._getSearchResultRequest(cacheKey, forceRefresh);
    if (pendingRequest) {
      return pendingRequest;
    }

    const request = (async () => {
      const mainDataPromise = this.fetchGeoServerData(mainOptions);
      const mainData = await mainDataPromise;
      const mainFeatures = this.format.readFeatures(
        mainData || { type: "FeatureCollection", features: [] }
      );
      const enrichedFeatures =
        mainFeatures.length > 0
          ? await this._enrichMainFeatures(mainFeatures, normalizedParams)
          : [];
      const result = {
        mainData,
        features: enrichedFeatures,
      };

      this._setCachedSearchResult(cacheKey, result);
      return result;
    })()
      .catch((error) => {
        this._clearSearchResultRequest(cacheKey);
        throw error;
      })
      .finally(() => {
        this._clearSearchResultRequest(cacheKey);
      });

    this._setSearchResultRequest(cacheKey, request);
    return request;
  }

  async submit(params = {}, options = {}) {
    const layerInstance = this.getLayerInstance();
    if (!layerInstance) {
      throw new Error(`Layer introuvable pour ${this.layerId}`);
    }

    const normalizedParams = this._normalizeInputParams(params);
    const mainTypeName = this._resolveRequestTypeName(
      this.mainTypeName,
      layerInstance?.typeName
    );
    const mainOptions = this.buildRequestOptions(normalizedParams, mainTypeName);
    const useSearchLoader = true;

    try {
      this._searchRequestInFlight = true;
      this._lastSearchParams = normalizedParams;
      this._setLastResultFeatures([]);
      this._setBlockingSearchOverlayVisible(useSearchLoader);
      this._activateSearchLayer();
      this._clearOtherSearchLayers();
      layerInstance.beforeLoad();

      const result = await this._loadSearchResultInMemory(normalizedParams, options);
      return this._renderSearchResult(
        layerInstance,
        result.features,
        mainOptions,
        result.mainData
      );
    } catch (error) {
      console.error(`[${this.layerId}] Error during search:`, error);
      layerInstance.clear();
      throw error;
    } finally {
      this._searchRequestInFlight = false;
      if (useSearchLoader) {
        this._setBlockingSearchOverlayVisible(false);
      }
    }
  }
}
