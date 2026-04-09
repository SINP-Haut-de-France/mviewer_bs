mviewer.customControls.gridSearch5x5 = (function () {
  class Grid5x5SearchControl extends SinpBaseCustom {
    constructor() {
      super({
        layerId: "gridSearch5x5",
        mainTypeName: "fn_get_stats_grille_5x5",
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

  const controller = new Grid5x5SearchControl();

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

mviewer.customControls.grid5x5search = mviewer.customControls.gridSearch5x5;
