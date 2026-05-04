class SinpBaseCustom {
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
      const encodedViewParams = finalParams.VIEWPARAMS.replace(/\|/g, "%7C");
      url += `&VIEWPARAMS=${encodedViewParams}`;
    }

    return url;
  }

  buildRequestOptions(params, typeName = this.mainTypeName) {
    return sinpQueryBuilder.buildRequestOptions(params, typeName);
  }

  async fetchGeoServerData(options) {
    if (!options || !options.TYPENAME) {
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
      '<div style="font-size:16px;font-weight:700;">Recherche en cours</div>' +
      '<div style="font-size:13px;line-height:1.45;color:#475569;">Merci de patienter, le volume de données à remonter peut nécessiter quelques instants.</div>' +
      "</div>";

    document.body.appendChild(overlay);
    return overlay;
  }

  _setBlockingSearchOverlayVisible(visible) {
    const overlay = this._ensureBlockingSearchOverlay();
    overlay.style.display = visible ? "flex" : "none";
    overlay.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  _normalizeStandardFilters(params = {}) {
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
      communes: params.filteredCommunes || params.communes || [],
      departements: params.filteredDepartments || params.departements || [],
      epcis,
      groupes: params.filteredGroupes || params.groupes || [],
      taxons,
      dateDeb: params.dateDeb || null,
      dateFin: params.dateFin || null,
      targetLocCode: params.targetLocCode || this.targetLocCode || null,
    };
  }

  async _loadDetailProperties(params, typeName = this.detailsTypeName) {
    return this._fetchPropertiesWithCache(params, typeName);
  }

  async _loadMetadataProperties(params, typeName = this.metadataTypeName) {
    return this._fetchPropertiesWithCache(params, typeName);
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
          if (value !== undefined && value !== null && String(value) !== "") {
            const normalizedValue = String(value).trim();
            if (normalizedValue !== "" && !values.includes(normalizedValue)) {
              values.push(normalizedValue);
            }
          }
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
    const resolvedTargetLocCode = params.targetLocCode || this.targetLocCode || null;

    if (resolvedTargetLocCode === "2") {
      return {
        featureKey: ["code_insee", "code", "adm_id", "commune_id", "communeId"],
        detailKey: ["code_insee", "code", "adm_id", "commune_id", "communeId"],
      };
    }

    if (resolvedTargetLocCode === "6" || resolvedTargetLocCode === "7") {
      return {
        featureKey: ["code_maille", "id_maille", "maille", "code"],
        detailKey: ["code_maille", "id_maille", "maille", "code"],
      };
    }

    return null;
  }

  async _ensureEntityData(features = [], params = this._lastSearchParams || {}) {
    const normalizedFeatures = Array.isArray(features) ? features.filter(Boolean) : [];
    const joinConfig = this._getResultJoinConfig(params);

    await this._attachPropertiesToFeatures(
      normalizedFeatures,
      this._loadDetailProperties,
      params,
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
      return feature.get("jdd_data_loaded") !== true && feature.get("jdd_data_loading") !== true;
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
      const joinConfig = this._getResultJoinConfig(params);
      await this._attachPropertiesToFeatures(
        pendingFeatures,
        this._loadMetadataProperties,
        params,
        {
          typeName: this.metadataTypeName,
          mode: joinConfig ? "match" : "all",
          featureKey: joinConfig?.featureKey || null,
          detailKey: joinConfig?.detailKey || null,
          targetProperty: "jdd_details",
        }
      );

      if (
        joinConfig &&
        pendingFeatures.length === 1 &&
        (!Array.isArray(pendingFeatures[0].get("jdd_details")) ||
          pendingFeatures[0].get("jdd_details").length === 0)
      ) {
        await this._attachPropertiesToFeatures(
          pendingFeatures,
          this._loadMetadataProperties,
          params,
          {
            typeName: this.metadataTypeName,
            mode: "all",
            targetProperty: "jdd_details",
          }
        );
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

  async handle(features = []) {
    const layerInstance = this.getLayerInstance();
    if (!layerInstance) {
      throw new Error(`Layer introuvable pour ${this.layerId}`);
    }

    const normalizedFeatures = Array.isArray(features) ? features.filter(Boolean) : [];
    if (!normalizedFeatures.length) {
      return;
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
      return;
    }

    $("#loading-indicator").show();

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

      const mainOptions = this.buildRequestOptions(normalizedParams, this.mainTypeName);
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
