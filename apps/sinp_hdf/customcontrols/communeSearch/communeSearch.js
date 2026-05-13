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
          "code",
          "adm_id",
          "commune_id",
          "communeId",
          "ref_dep",
        ],
      });
    }

    _normalizeInputParams(params = {}) {
      return this._normalizeStandardFilters(params);
    }
  }

  const controller = new CommuneSearchControl();

  const openFilterModal = function () {
    controller.openReactFilterModal();
  };

  return {
    init: async function () {},
    submit: (filters) => controller.submit(filters),
    handle: (features) => controller.handle(features),
    ensureMetadataForFeatures: (features) => controller.ensureMetadataForFeatures(features),
    openFilterModal,
    normalizeFilters: (selectedFilters) =>
      controller._normalizeInputParams(selectedFilters),
    destroy: function () {},
  };
})();
