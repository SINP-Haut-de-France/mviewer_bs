mviewer.customControls.gridSearch5x5 = (function () {
  class Grid5x5SearchControl extends SinpBaseCustom {
    constructor() {
      super({
        layerId: "gridSearch5x5",
        mainTypeName: "fn_get_stats",
        detailsTypeName: "fn_get_obs_detaillee",
        metadataTypeName: "fn_get_metadatas",
        targetLocCode: "7",
        entityCodeKeys: ["code_maille", "id_maille", "maille", "code"],
      });
    }

    _normalizeInputParams(params = {}) {
      return this._normalizeStandardFilters(params);
    }
  }

  const controller = new Grid5x5SearchControl();

  return {
    init: async function () {},
    submit: (filters) => controller.submit(filters),
    handle: (features) => controller.handle(features),
    ensureMetadataForFeatures: (features) => controller.ensureMetadataForFeatures(features),
    normalizeFilters: (selectedFilters) =>
      controller._normalizeInputParams(selectedFilters),
    openFilterModal: function () {
      controller.openReactFilterModal();
    },
    destroy: function () {},
  };
})();

mviewer.customControls.grid5x5search = mviewer.customControls.gridSearch5x5;
