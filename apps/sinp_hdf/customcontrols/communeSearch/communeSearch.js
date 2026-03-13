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
      if (!detailsData?.features?.length) {
        return mainFeatures;
      }

      const detailsByCommuneId = detailsData.features.reduce((acc, feature) => {
        const properties = feature.properties || {};
        const key = String(properties.commune_id ?? properties.communeId ?? "");
        if (!key) {
          return acc;
        }
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(properties);
        return acc;
      }, {});

      mainFeatures.forEach((feature) => {
        const key = String(feature.get("commune_id") ?? feature.get("communeId") ?? "");
        feature.set("details", detailsByCommuneId[key] || []);
      });

      return mainFeatures;
    }
  }

  const controller = new CommuneSearchControl();

  const openFilterModal = function () {
    if (window.reactComponentManager?.openFilterModal) {
      window.reactComponentManager.openFilterModal({
        activeLayerId: "communeSearch",
        onSubmit: (params) => controller.submit(params),
      });
      return;
    }

    console.error("openFilterModal n'est pas disponible.");
  };

  return {
    init: async function () {},
    submit: (filters) => controller.submit(filters),
    openFilterModal,
    normalizeFilters: (selectedFilters) => controller._normalizeInputParams(selectedFilters),
    destroy: function () {},
  };
})();
