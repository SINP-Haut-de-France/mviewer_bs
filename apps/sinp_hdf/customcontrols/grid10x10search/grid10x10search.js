mviewer.customControls.grid10x10search = (function () {
  class Grid10x10SearchControl extends SinpBaseCustom {
    constructor() {
      super({
        layerId: "grid10x10search",
        mainTypeName: "fn_get_stats",
        detailsTypeName: "fn_get_obs_detaillee",
        metadataTypeName: "fn_get_metadatas",
        targetLocCode: "6",
        entityCodeKeys: ["code_maille", "id_maille", "maille", "code"],
      });
      this._gridReferenceSource = null;
    }

    _normalizeInputParams(params = {}) {
      return this._normalizeStandardFilters(params);
    }

    _getGridReferenceLayer() {
      const layers = mviewer.getLayers?.() || {};
      return (
        layers.grid10x10Reference ||
        layers.v_grille_10x10 ||
        layers.dev_sinpv_grille_10x10 ||
        null
      );
    }

    _getGridReferenceSource() {
      if (this._gridReferenceSource) {
        return this._gridReferenceSource;
      }

      const referenceLayer = this._getGridReferenceLayer();
      const existingSource = referenceLayer?.layer?.getSource?.();
      if (existingSource?.getFeatureInfoUrl) {
        this._gridReferenceSource = existingSource;
        return this._gridReferenceSource;
      }

      const geoserverBaseUrl =
        mviewer.env?.[mviewer.env?.CURRENT_ENV]?.GEOSERVER_BASE_URL;
      const sourceUrl = referenceLayer?.url || `${geoserverBaseUrl}/wms`;
      const layerName = referenceLayer?.layername || "dev_sinp:v_grille_10x10";

      if (!sourceUrl || !layerName) {
        return null;
      }

      this._gridReferenceSource = new ol.source.ImageWMS({
        url: sourceUrl,
        params: {
          LAYERS: layerName,
          QUERY_LAYERS: layerName,
        },
        ratio: 1,
        serverType: "geoserver",
      });

      return this._gridReferenceSource;
    }

    async _fetchSelectionFeatures(coordinate) {
      const source = this._getGridReferenceSource();
      const map = mviewer.getMap();
      if (!source?.getFeatureInfoUrl || !map || !Array.isArray(coordinate)) {
        return super._fetchSelectionFeatures(coordinate);
      }

      const url = source.getFeatureInfoUrl(
        coordinate,
        map.getView().getResolution(),
        map.getView().getProjection(),
        {
          INFO_FORMAT: "application/json",
          FEATURE_COUNT: 1,
        }
      );

      if (!url) {
        return [];
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const payload = await response.json();
      return new ol.format.GeoJSON().readFeatures(
        payload || { type: "FeatureCollection", features: [] }
      );
    }
  }

  const controller = new Grid10x10SearchControl();

  return {
    init: () => controller.init(),
    submit: (filters) => controller.submit(filters),
    handle: (features) => controller.handle(features),
    ensureMetadataForFeatures: (features) => controller.ensureMetadataForFeatures(features),
    normalizeFilters: (selectedFilters) =>
      controller._normalizeInputParams(selectedFilters),
    openFilterModal: function () {
      controller.openReactFilterModal();
    },
    destroy: () => controller.destroy(),
  };
})();
