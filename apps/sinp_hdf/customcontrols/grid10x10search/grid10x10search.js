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
    }

    _normalizeInputParams(params = {}) {
      return this._normalizeStandardFilters(params);
    }
  }

  const controller = new Grid10x10SearchControl();

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
