/**
 * LAYER COMMUNE: AdvancedSearch
 * ==============================
 * Recherche avancée par communes en rendu WMS GeoServer uniquement.
 *
 * Les filtres métier sont transmis uniquement via VIEWPARAMS:
 * - DATE_DEB / DATE_FIN
 * - DEPT_IDS / CODE_INSEES / EPCI_IDS
 * - CD_REF / GRP_IDS
 * - TARGET_LOC_CODE (agrégation)
 */

mviewer.customLayers.communeSearch = (function () {
  class CommuneSearchLayer extends mviewer.customLayers.SinpBaseLayer {
    constructor() {
      super("communeSearch", "fn_get_stats", {
        maxZoom: 15,
        serverRenderOnly: true,
        serverStyle: {
          enabled: true,
        },
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "rgba(45, 64, 89, 0.001)",
            width: 1,
          }),
          fill: new ol.style.Fill({
            color: "rgba(0, 0, 0, 0.001)",
          }),
        }),
      });
    }
  }

  const instance = new CommuneSearchLayer();

  return {
    layer: instance.getLayer(),
    handle: false,
    get_datas: function (params, options) {
      return mviewer.customControls.communeSearch.submit(params, options);
    },
    _instance: instance,
  };
})();
