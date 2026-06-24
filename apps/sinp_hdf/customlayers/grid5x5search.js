/**
 * LAYER GRILLE 5x5: GridSearch 5x5
 * ==================================
 * Recherche avancée par grille 5x5 en rendu WMS GeoServer uniquement.
 */

mviewer.customLayers.gridSearch5x5 = (function () {
  class GridSearch5x5Layer extends mviewer.customLayers.SinpBaseLayer {
    constructor() {
  super("gridSearch5x5", "fn_get_stats", {
    maxZoom: 12,
    serverRenderOnly: true,
    serverStyle: {
      enabled: true,
    },
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "rgba(0, 0, 0, 0.001)",
        width: 1,
      }),
      fill: new ol.style.Fill({
        color: "rgba(0, 0, 0, 0.001)",
      }),
    }),
  });
    }
  }

  const instance = new GridSearch5x5Layer();

  return {
    layer: instance.getLayer(),
    handle: false,
    get_datas: function (params, options) {
      return mviewer.customControls.gridSearch5x5.submit(params, options);
    },
    _instance: instance,
  };
})();
