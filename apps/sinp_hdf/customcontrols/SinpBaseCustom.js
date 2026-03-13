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

      const enrichedFeatures = await this._enrichMainFeatures(mainFeatures, normalizedParams);
      layerInstance.renderFeatures(enrichedFeatures);

      return mainData;
    } catch (error) {
      console.error(`[${this.layerId}] Error during search:`, error);
      layerInstance.clear();
      throw error;
    }
  }

}