mviewer.customControls.communeSearch = (function () {
  class CommuneSearchControl extends SinpBaseCustom {
    constructor() {
      super({
        layerId: "communeSearch",
        mainTypeName: "fn_get_stats_communes",
        detailsTypeName: "fn_get_obs_detaillee_by_entities",
      });
    }

    _normalizeInputParams(params = {}) {
      return this._normalizeStandardFilters(params);
    }

    async _enrichMainFeatures(mainFeatures, params) {
      return this._attachDetailsToFeatures(mainFeatures, params, {
        mode: "match",
        featureKey: ["commune_id", "communeId", "code_insee"],
        detailKey: ["commune_id", "communeId", "code_insee"],
      });
    }
  }

  const controller = new CommuneSearchControl();

  const openFilterModal = function () {
    controller.openReactFilterModal();
  };

  return {
    init: async function () {},
    submit: (filters) => controller.submit(filters),
    openFilterModal,
    normalizeFilters: (selectedFilters) =>
      controller._normalizeInputParams(selectedFilters),
    destroy: function () {},
  };
})();
