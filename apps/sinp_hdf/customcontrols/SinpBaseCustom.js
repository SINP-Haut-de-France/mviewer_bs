class SinpBaseCustom {
  static MAX_SELECTED_DEPARTMENTS = 1;

  static MAX_SELECTED_COMMUNES = 5;

  static DEFAULT_PARAMETERS = {
    BASEURL: `${mviewer.env?.[mviewer.env?.CURRENT_ENV]?.GEOSERVER_BASE_URL}/wfs`,
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    outputFormat: "application/json",
    srsName: "EPSG:2154",
  };

  constructor(config = {}) {
    this.layerId = config.layerId;
    this.mainTypeName = config.mainTypeName;
    this.detailsTypeName = config.detailsTypeName || null;
    this.metadataTypeName = config.metadataTypeName || config.jddDetailsTypeName || null;
    this.targetLocCode = config.targetLocCode || null;
    this.entityCodeKeys = config.entityCodeKeys || [
      "code_insee",
      "code_maille",
      "id_maille",
      "maille",
      "code",
      "adm_id",
      "commune_id",
      "communeId",
      "ref_dep",
    ];
    this.format = new ol.format.GeoJSON();
    this._lastSearchParams = null;
    this._dataCache = new Map();
    this._dataRequests = new Map();
    this._featureInfoRenderToken = 0;
    this._selectionRequestInFlight = false;
  }

  getLayerInstance() {
    return mviewer.customLayers?.[this.layerId]?._instance || null;
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

  _resolveRequestTypeName(primaryTypeName, fallbackTypeName = null) {
    if (typeof primaryTypeName === "string" && primaryTypeName.trim() !== "") {
      return primaryTypeName.trim();
    }

    if (typeof fallbackTypeName === "string" && fallbackTypeName.trim() !== "") {
      return fallbackTypeName.trim();
    }

    return primaryTypeName;
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

  _ensureBlockingSearchOverlay() {
    let overlay = document.getElementById("mv-search-blocking-overlay");
    if (overlay) {
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = "mv-search-blocking-overlay";
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "100000",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(15, 23, 42, 0.45)",
      backdropFilter: "blur(1px)",
      pointerEvents: "all",
    });

    overlay.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;max-width:420px;padding:24px 28px;border-radius:12px;background:#ffffff;box-shadow:0 18px 40px rgba(15,23,42,.25);text-align:center;color:#0f172a;">' +
      '<i class="fas fa-spinner fa-spin" aria-hidden="true" style="font-size:32px;color:#0b3a6e;"></i>' +
      '<div id="mv-search-blocking-overlay-title" style="font-size:16px;font-weight:700;">Recherche en cours</div>' +
      '<div id="mv-search-blocking-overlay-message" style="font-size:13px;line-height:1.45;color:#475569;">Merci de patienter, le volume de données à remonter peut nécessiter quelques instants.</div>' +
      "</div>";

    document.body.appendChild(overlay);
    return overlay;
  }

  _setBlockingSearchOverlayVisible(visible, options = {}) {
    const overlay = this._ensureBlockingSearchOverlay();
    const titleElement = overlay.querySelector("#mv-search-blocking-overlay-title");
    const messageElement = overlay.querySelector("#mv-search-blocking-overlay-message");

    if (titleElement) {
      titleElement.textContent = options.title || "Recherche en cours";
    }
    if (messageElement) {
      messageElement.textContent =
        options.message ||
        "Merci de patienter, le volume de données à remonter peut nécessiter quelques instants.";
    }

    overlay.style.display = visible ? "flex" : "none";
    overlay.setAttribute("aria-hidden", visible ? "false" : "true");
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

  _buildDetailRequestParams(features = [], params = {}) {
    const scopeConfig = this._getDetailRequestScopeConfig(params);
    if (!scopeConfig) {
      return params;
    }

    const explicitScopedValues =
      scopeConfig.paramName === "communes"
        ? this._normalizeCommuneCodes(params.communes || [])
        : this._normalizeGridCodes(params.mailles || []);

    if (explicitScopedValues.length > 0) {
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

    if (!properties.length) {
      return mainFeatures;
    }

    if (mode === "match" && featureKey && detailKey) {
      const getCandidateValues = (source, candidates, accessor) => {
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
      };

      const propertiesByEntityId = properties.reduce((accumulator, item) => {
        const keys = getCandidateValues(item, detailKey, (source, candidate) => {
          return source?.[candidate];
        });

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
        const keys = getCandidateValues(feature, featureKey, (source, candidate) => {
          return source?.get(candidate);
        });
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
    return (
      params.targetLocCode === "2" &&
      Array.isArray(params.communes) &&
      params.communes.length === 1
    );
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

  async _enrichSearchFeatures(mainFeatures, params) {
    this._initializeFeatureCollections(mainFeatures);

    if (!this._shouldLoadEntityDataImmediately(params)) {
      return mainFeatures;
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

  async _enrichMainFeatures(mainFeatures, params) {
    return this._enrichSearchFeatures(mainFeatures, params);
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

    $("#loading-indicator").show();
    this._selectionRequestInFlight = true;
    this._setBlockingSearchOverlayVisible(true, {
      title: "Chargement de la selection",
      message:
        "Merci de patienter, le detail de l'entite selectionnee est en cours de chargement.",
    });

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
      this._setBlockingSearchOverlayVisible(false);
      $("#loading-indicator").hide();
    }
  }

  async submit(params = {}) {
    const layerInstance = this.getLayerInstance();
    if (!layerInstance) {
      throw new Error(`Layer introuvable pour ${this.layerId}`);
    }

    const normalizedParams = this._normalizeInputParams(params);
    const useBlockingOverlay = this._shouldUseBlockingSearchOverlay(normalizedParams);

    try {
      this._lastSearchParams = normalizedParams;
      this._resetDataCache();
      if (useBlockingOverlay) {
        this._setBlockingSearchOverlayVisible(true);
      }
      layerInstance.beforeLoad();

      const mainTypeName = this._resolveRequestTypeName(
        this.mainTypeName,
        layerInstance?.typeName
      );
      const mainOptions = this.buildRequestOptions(normalizedParams, mainTypeName);
      const mainData = await this.fetchGeoServerData(mainOptions);
      const mainFeatures = this.format.readFeatures(
        mainData || { type: "FeatureCollection", features: [] }
      );

      if (mainFeatures.length === 0) {
        layerInstance.clear();
        return mainData;
      }

      const enrichedFeatures = await this._enrichMainFeatures(
        mainFeatures,
        normalizedParams
      );
      if (this._shouldLoadEntityDataImmediately(normalizedParams)) {
        await layerInstance.renderFeatures(enrichedFeatures, mainOptions);
      } else {
        await layerInstance.showSelectionPrompt(enrichedFeatures, mainOptions);
      }

      return mainData;
    } catch (error) {
      console.error(`[${this.layerId}] Error during search:`, error);
      layerInstance.clear();
      throw error;
    } finally {
      if (useBlockingOverlay) {
        this._setBlockingSearchOverlayVisible(false);
      }
    }
  }
}
