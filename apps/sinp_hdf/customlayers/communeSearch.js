/**
 * LAYER COMMUNE: AdvancedSearch
 * ==============================
 * Recherche avancée par communes avec détails d'observations.
 *
 * Les filtres métier sont transmis uniquement via VIEWPARAMS:
 * - DATE_DEB / DATE_FIN
 * - DEPT_IDS / CODE_INSEES
 * - CD_REF / GRP_IDS
 */

mviewer.customLayers.communeSearch = (function () {
  class CommuneSearchLayer extends mviewer.customLayers.SinpBaseLayer {
    constructor() {
      super("communeSearch", "fn_get_stats_communes", {
        maxZoom: 15,
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "rgba(45, 64, 89, 255)",
            width: 1.5,
          }),
          fill: new ol.style.Fill({
            color: "rgba(0, 0, 0, 0)",
          }),
        }),
      });
    }
  }

  const instance = new CommuneSearchLayer();

  return {
    layer: instance.getLayer(),
    handle: false,
    get_datas: function (params) {
      return mviewer.customControls.communeSearch.submit(params);
    },
    _instance: instance,
  };
})();
