mviewer.customControls.communeSearch = (function () {
  class CommuneSearchControl extends SinpBaseCustom {
    constructor() {
      super({
        layerId: "communeSearch",
        mainTypeName: "fn_get_stats",
        detailsTypeName: "fn_get_obs_detaillee",
        metadataTypeName: "fn_get_metadatas",
        targetLocCode: "2",
        entityCodeKeys: [
          "code_insee",
          "insee_com",
          "code",
          "adm_id",
          "commune_id",
          "communeId",
          "ref_dep",
        ],
      });
      this._communeReferenceSource = null;
    }

    _normalizeInputParams(params = {}) {
      return this._normalizeStandardFilters(params);
    }

    _getCommuneReferenceSource() {
      if (this._communeReferenceSource) {
        return this._communeReferenceSource;
      }

      const communeLayer = mviewer.getLayers?.()?.communes || {};
      const existingSource = communeLayer.layer?.getSource?.();
      if (existingSource?.getFeatureInfoUrl) {
        this._communeReferenceSource = existingSource;
        return this._communeReferenceSource;
      }

      const layerName = communeLayer.layername || communeLayer.id || "communes";
      const sourceUrl = communeLayer.url || "https://www.geo2france.fr/geoserver/spld/ows";

      this._communeReferenceSource = new ol.source.ImageWMS({
        url: sourceUrl,
        params: {
          LAYERS: layerName,
          QUERY_LAYERS: layerName,
        },
        ratio: 1,
        serverType: "geoserver",
      });

      return this._communeReferenceSource;
    }

    async _fetchSelectionFeatures(coordinate) {
      const source = this._getCommuneReferenceSource();
      const map = mviewer.getMap();
      if (!source?.getFeatureInfoUrl || !map || !Array.isArray(coordinate)) {
        return [];
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
      return new ol.format.GeoJSON().readFeatures(payload || { type: "FeatureCollection", features: [] });
    }
  }

  const controller = new CommuneSearchControl();

  const openFilterModal = function () {
    controller.openReactFilterModal();
  };

  return {
    init: () => controller.init(),
    submit: (filters) => controller.submit(filters),
    handle: (features) => controller.handle(features),
    ensureMetadataForFeatures: (features) => controller.ensureMetadataForFeatures(features),
    openFilterModal,
    normalizeFilters: (selectedFilters) =>
      controller._normalizeInputParams(selectedFilters),
    destroy: () => controller.destroy(),
  };
})();
