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
    this.format = new ol.format.GeoJSON();
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

  _normalizeStandardFilters(params = {}) {
    const taxons = Array.isArray(params.filteredTaxons)
      ? params.filteredTaxons.map((taxon) =>
          typeof taxon === "object" && taxon?.cd_ref ? taxon.cd_ref : taxon
        )
      : params.taxons || [];

    return {
      communes: params.filteredCommunes || params.communes || [],
      departements: params.filteredDepartments || params.departements || [],
      groupes: params.filteredGroupes || params.groupes || [],
      taxons,
      dateDeb: params.dateDeb || null,
      dateFin: params.dateFin || null,
    };
  }

  async _loadDetailProperties(params, typeName = this.detailsTypeName) {
    if (!typeName) {
      return [];
    }

    const detailsOptions = this.buildRequestOptions(params, typeName);
    const detailsData = await this.fetchGeoServerData(detailsOptions);

    return detailsData?.features?.map((feature) => feature.properties || {}) || [];
  }

  async _attachDetailsToFeatures(mainFeatures, params, config = {}) {
    const {
      typeName = this.detailsTypeName,
      mode = "all",
      featureKey = null,
      detailKey = null,
      targetProperty = "details",
    } = config;

    if (!typeName || mainFeatures.length === 0) {
      return mainFeatures;
    }

    const detailProperties = await this._loadDetailProperties(params, typeName);

    if (!detailProperties.length) {
      return mainFeatures;
    }

    if (mode === "match" && featureKey && detailKey) {
      const getCandidateValue = (source, candidates, accessor) => {
        const candidateList = Array.isArray(candidates) ? candidates : [candidates];

        for (const candidate of candidateList) {
          const value = accessor(source, candidate);
          if (value !== undefined && value !== null && String(value) !== "") {
            return String(value);
          }
        }

        return "";
      };

      const detailsByEntityId = detailProperties.reduce((accumulator, properties) => {
        const key = getCandidateValue(properties, detailKey, (item, candidate) => {
          return item?.[candidate];
        });

        if (!key) {
          return accumulator;
        }

        if (!accumulator[key]) {
          accumulator[key] = [];
        }

        accumulator[key].push(properties);
        return accumulator;
      }, {});

      mainFeatures.forEach((feature) => {
        const key = getCandidateValue(feature, featureKey, (item, candidate) => {
          return item?.get(candidate);
        });

        feature.set(targetProperty, detailsByEntityId[key] || []);
      });

      return mainFeatures;
    }

    mainFeatures.forEach((feature) => feature.set(targetProperty, detailProperties));
    return mainFeatures;
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
    return mainFeatures;
  }

  async submit(params = {}) {
    const layerInstance = this.getLayerInstance();
    if (!layerInstance) {
      throw new Error(`Layer introuvable pour ${this.layerId}`);
    }

    const normalizedParams = this._normalizeInputParams(params);

    try {
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
      layerInstance.renderFeatures(enrichedFeatures);

      return mainData;
    } catch (error) {
      console.error(`[${this.layerId}] Error during search:`, error);
      layerInstance.clear();
      throw error;
    }
  }
}
