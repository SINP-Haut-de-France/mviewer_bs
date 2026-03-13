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

    async _enrichMainFeatures(mainFeatures, params) {
      if (!this.detailsTypeName || mainFeatures.length === 0) {
        return mainFeatures;
      }

      const detailsOptions = this.buildRequestOptions(params, this.detailsTypeName);
      const detailsData = await this.fetchGeoServerData(detailsOptions);
      const detailsList = detailsData?.features?.map((f) => f.properties) || [];
      mainFeatures.forEach((feature) => feature.set("details", detailsList));
      return mainFeatures;
    }
  }

  const controller = new Grid10x10SearchControl();

  return {
    init: async function () {},
    submit: (filters) => controller.submit(filters),
    openFilterModal: function () {
      if (window.reactComponentManager?.openFilterModal) {
        window.reactComponentManager.openFilterModal({
          activeLayerId: "grid10x10search",
          onSubmit: (params) => controller.submit(params),
        });
      }
    },
    destroy: function () {},
  };
})();