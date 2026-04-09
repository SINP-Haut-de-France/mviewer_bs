mviewer.customControls.grid10x10search = (function () {
  class Grid10x10SearchControl extends SinpBaseCustom {
    constructor() {
      super({
        layerId: "grid10x10search",
        mainTypeName: "fn_get_stats_grille_10x10",
        detailsTypeName: "fn_get_obs_detaillee_grille",
      });
    }

    _normalizeInputParams(params = {}) {
      return this._normalizeStandardFilters(params);
    }

    async _enrichMainFeatures(mainFeatures, params) {
      return this._attachDetailsToFeatures(mainFeatures, params, {
        mode: "all",
      });
    }
  }

  const controller = new Grid10x10SearchControl();

  return {
    init: async function () {},
    submit: (filters) => controller.submit(filters),
    normalizeFilters: (selectedFilters) =>
      controller._normalizeInputParams(selectedFilters),
    openFilterModal: function () {
      controller.openReactFilterModal();
    },
    destroy: function () {},
  };
})();
